"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, GripVertical, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COLUMN_TYPE_INFO, type ColumnDef, type ColumnType, type SchemaDefinition } from "@/lib/data/schema";
import { SectionLoading } from "@/components/dashboard/widgets/common";
import { FieldInspector, type DraftColumn } from "@/components/dashboard/data/field-inspector";

type TablePayload = {
  table: {
    id: string;
    name: string;
    displayName: string | null;
    schemaDefinition: SchemaDefinition;
    status: string;
    environment: { id: string; name: string; projectId: string };
  };
  total: number;
};

type TableList = {
  tables: Array<{ id: string; name: string; environment: { id: string } }>;
};

export function TableDesigner({ projectId, tableId }: { projectId: string; tableId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<TablePayload>({
    queryKey: ["data-table", projectId, tableId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/data-tables/${tableId}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "جدول یافت نشد");
      return json.data;
    },
  });

  if (isLoading) return <SectionLoading />;
  if (error || !data) {
    return <div className="p-8 text-center text-muted-foreground">{error instanceof Error ? error.message : "جدول یافت نشد."}</div>;
  }

  return (
    <DesignerBody
      key={`${data.table.id}-${data.table.name}-${data.table.schemaDefinition.columns.map((c) => c.name).join(",")}`}
      projectId={projectId}
      table={data.table}
      recordCount={data.total}
      onSaved={() => {
        qc.invalidateQueries({ queryKey: ["data-table", projectId, tableId] });
        qc.invalidateQueries({ queryKey: ["project-data-tables", projectId] });
      }}
      onBack={() => {
        const params = new URLSearchParams();
        const org = searchParams.get("org");
        if (org) params.set("org", org);
        params.set("tab", "data");
        if (data.table.environment.id) params.set("env", data.table.environment.id);
        router.push(`/dashboard/projects/${projectId}?${params.toString()}`);
      }}
      onOpenSchema={() => {
        const params = new URLSearchParams();
        const org = searchParams.get("org");
        if (org) params.set("org", org);
        params.set("env", data.table.environment.id);
        router.push(`/dashboard/projects/${projectId}/schema?${params.toString()}`);
      }}
    />
  );
}

function DesignerBody({
  projectId,
  table,
  recordCount,
  onSaved,
  onBack,
  onOpenSchema,
}: {
  projectId: string;
  table: TablePayload["table"];
  recordCount: number;
  onSaved: () => void;
  onBack: () => void;
  onOpenSchema: () => void;
}) {
  const [name, setName] = useState(table.name);
  const [displayName, setDisplayName] = useState(table.displayName ?? "");
  const [columns, setColumns] = useState<DraftColumn[]>(() =>
    table.schemaDefinition.columns.map((column, index) => ({ ...column, id: `${column.name}-${index}` }))
  );
  const [selectedId, setSelectedId] = useState<string | null>(columns[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [draggingType, setDraggingType] = useState<ColumnType | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { data: siblings } = useQuery<TableList>({
    queryKey: ["project-data-tables", projectId, table.environment.id],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/data-tables?envId=${table.environment.id}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message);
      return json.data;
    },
  });

  const selected = columns.find((column) => column.id === selectedId) ?? null;
  const referenceTables = (siblings?.tables ?? []).map((item) => ({ name: item.name }));

  function addColumn(type: ColumnType, index = columns.length) {
    const column: DraftColumn = {
      id: `new-${Date.now()}-${type}`,
      name: `${type}_${columns.length + 1}`,
      type,
      required: false,
      ...(type === "uuid" ? { default: "uuid()" } : {}),
      ...(type === "enum" ? { enumValues: ["value"] } : {}),
    };
    const next = [...columns];
    next.splice(index, 0, column);
    setColumns(next);
    setSelectedId(column.id);
  }

  function patchColumn(id: string, patch: Partial<ColumnDef>) {
    setColumns((current) => current.map((column) => (column.id === id ? { ...column, ...patch } : column)));
  }

  function onDragEnd(event: DragEndEvent) {
    setDraggingType(null);
    const activeId = String(event.active.id);
    if (activeId.startsWith("palette:")) {
      if (!event.over) return;
      const type = activeId.slice("palette:".length) as ColumnType;
      const overId = String(event.over.id);
      const index = columns.findIndex((column) => column.id === overId);
      addColumn(type, index === -1 ? columns.length : index);
      return;
    }
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = columns.findIndex((column) => column.id === event.active.id);
    const newIndex = columns.findIndex((column) => column.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setColumns(arrayMove(columns, oldIndex, newIndex));
  }

  async function save() {
    if (saving) return;
    const names = columns.map((column) => column.name);
    if (names.some((item) => !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(item))) {
      toast.error("نام فیلدها باید لاتین و بدون فاصله باشد");
      return;
    }
    if (new Set(names).size !== names.length) {
      toast.error("نام فیلدها نباید تکراری باشد");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/data-tables/${table.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          displayName: displayName.trim() ? displayName.trim() : null,
          schemaDefinition: { columns: columns.map(({ id: _id, ...column }) => column) },
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        toast.error(json.error?.message ?? "ذخیره نشد");
        return;
      }
      toast.success("جدول ذخیره شد");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const hits = pointerWithin(args);
        return hits.length ? hits : closestCenter(args);
      }}
      onDragStart={(event) => {
        const id = String(event.active.id);
        setDraggingType(id.startsWith("palette:") ? id.slice("palette:".length) as ColumnType : null);
      }}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingType(null)}
    >
      <div className="h-[calc(100svh-4rem)] flex flex-col">
        <div className="h-14 shrink-0 border-b border-border px-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
            <ArrowRight className="size-4" /> داده
          </Button>
          <div className="min-w-0">
            <div className="font-semibold truncate">{displayName || name}</div>
            <div className="text-[11px] text-muted-foreground">{table.environment.name} · {recordCount} رکورد</div>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={onOpenSchema}>
            نقشه جدول‌ها
          </Button>
          <Button size="sm" className="gap-1.5" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیره
          </Button>
        </div>
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="border-l border-border p-3 overflow-y-auto">
            <div className="text-xs font-medium text-muted-foreground mb-2">فیلد را بکشید روی بوم</div>
            <div className="space-y-1.5">
              {(Object.keys(COLUMN_TYPE_INFO) as ColumnType[]).map((type) => (
                <PaletteChip key={type} type={type} onAdd={() => addColumn(type)} />
              ))}
            </div>
          </aside>
          <Canvas columns={columns} selectedId={selectedId} onSelect={setSelectedId} onRemove={(id) => {
            setColumns((current) => current.filter((column) => column.id !== id));
            if (selectedId === id) setSelectedId(null);
          }} />
          <aside className="border-r border-border p-4 overflow-y-auto space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs">نام API</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={recordCount > 0} className="mt-1.5 bg-card/40 font-mono" />
                {recordCount > 0 && <p className="text-[11px] text-muted-foreground mt-1">به‌خاطر وجود رکورد، نام API قفل است.</p>}
              </div>
              <div>
                <Label className="text-xs">نام نمایشی</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5 bg-card/40" />
              </div>
            </div>
            <div className="border-t border-border pt-4">
              {selected ? (
                <FieldInspector
                  column={selected}
                  tables={referenceTables}
                  onChange={(patch) => patchColumn(selected.id, patch)}
                />
              ) : (
                <p className="text-sm text-muted-foreground">یک فیلد را انتخاب کنید یا از فهرست کنار بکشید.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
      <DragOverlay>
        {draggingType ? (
          <div className="rounded-lg border border-primary bg-card px-3 py-2 text-sm shadow-none">{COLUMN_TYPE_INFO[draggingType].label}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function PaletteChip({ type, onAdd }: { type: ColumnType; onAdd: () => void }) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `palette:${type}` });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="w-full text-right rounded-lg border border-border/70 bg-card/40 px-3 py-2 text-xs hover:border-primary/50"
      onClick={onAdd}
      {...listeners}
      {...attributes}
    >
      {COLUMN_TYPE_INFO[type].label}
    </button>
  );
}

function Canvas({
  columns,
  selectedId,
  onSelect,
  onRemove,
}: {
  columns: DraftColumn[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  return (
    <div ref={setNodeRef} className={`min-h-0 overflow-y-auto p-6 ${isOver ? "bg-primary/5" : ""}`}>
      <SortableContext items={columns.map((column) => column.id)} strategy={verticalListSortingStrategy}>
        {columns.length === 0 ? (
          <div className="h-full min-h-64 border border-dashed border-border rounded-2xl flex items-center justify-center text-sm text-muted-foreground">
            فیلد را از کنار به اینجا بکشید
          </div>
        ) : (
          <div className="max-w-xl mx-auto space-y-2">
            {columns.map((column) => (
              <FieldCard
                key={column.id}
                column={column}
                selected={column.id === selectedId}
                onSelect={() => onSelect(column.id)}
                onRemove={() => onRemove(column.id)}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </div>
  );
}

function FieldCard({
  column,
  selected,
  onSelect,
  onRemove,
}: {
  column: DraftColumn;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border px-3 py-3 bg-card ${selected ? "border-primary" : "border-border"} ${isDragging ? "opacity-60" : ""}`}
      onClick={onSelect}
    >
      <button type="button" className="text-muted-foreground cursor-grab" {...attributes} {...listeners} aria-label="جابه‌جایی">
        <GripVertical className="size-4" />
      </button>
      <div className="flex-1 min-w-0 text-right">
        <div className="font-mono text-sm truncate">{column.name}</div>
        <div className="text-[11px] text-muted-foreground">{COLUMN_TYPE_INFO[column.type].label}{column.required ? " · اجباری" : ""}{column.unique ? " · یکتا" : ""}</div>
      </div>
      <button type="button" className="text-muted-foreground hover:text-destructive" onClick={(event) => { event.stopPropagation(); onRemove(); }} aria-label="حذف فیلد">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
