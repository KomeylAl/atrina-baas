"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { COLUMN_TYPE_INFO, type ColumnDef, type SchemaDefinition } from "@/lib/data/schema";
import { EnvPicker, SectionLoading } from "@/components/dashboard/widgets/common";
import { FieldInspector, type DraftColumn } from "@/components/dashboard/data/field-inspector";

type TableRow = {
  id: string;
  name: string;
  displayName: string | null;
  schemaDefinition: SchemaDefinition;
  environment: { id: string; name: string };
  recordsCount: number;
};

type DraftTable = {
  id: string;
  name: string;
  displayName: string;
  columns: DraftColumn[];
  dirty: boolean;
};

const CARD_W = 240;
const HEADER_H = 58;
const FIELD_H = 30;

export function SchemaMap({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const orgId = searchParams.get("org");
  const [envId, setEnvId] = useState<string | null>(searchParams.get("env"));
  const { data, isLoading } = useQuery<{ tables: TableRow[] }>({
    queryKey: ["project-data-tables", projectId, "schema-map"],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/data-tables`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message);
      return { tables: json.data.tables };
    },
  });

  const environments = useMemo(() => {
    const map = new Map<string, string>();
    for (const table of data?.tables ?? []) map.set(table.environment.id, table.environment.name);
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [data]);
  const activeEnv = envId ?? environments[0]?.id ?? null;
  const visible = (data?.tables ?? []).filter((table) => !activeEnv || table.environment.id === activeEnv);

  function back() {
    const params = new URLSearchParams();
    if (orgId) params.set("org", orgId);
    params.set("tab", "data");
    if (activeEnv) params.set("env", activeEnv);
    router.push(`/dashboard/projects/${projectId}?${params.toString()}`);
  }

  return (
    <div className="h-[calc(100svh-4rem)] flex flex-col">
      <div className="h-14 shrink-0 border-b border-border px-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" className="gap-1" onClick={back}>
          <ArrowRight className="size-4" /> داده
        </Button>
        <div>
          <div className="font-semibold">نقشه جدول‌ها</div>
          <div className="text-[11px] text-muted-foreground">فیلدها و کلیدهای خارجی</div>
        </div>
        <EnvPicker environments={environments} value={activeEnv} onChange={setEnvId} />
      </div>
      {isLoading ? (
        <SectionLoading />
      ) : (
        <MapCanvas
          key={activeEnv ?? "all"}
          projectId={projectId}
          orgId={orgId}
          tables={visible}
          onSaved={() => qc.invalidateQueries({ queryKey: ["project-data-tables", projectId] })}
        />
      )}
    </div>
  );
}

function MapCanvas({
  projectId,
  orgId,
  tables,
  onSaved,
}: {
  projectId: string;
  orgId: string | null;
  tables: TableRow[];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<DraftTable[]>(() =>
    tables.map((table) => ({
      id: table.id,
      name: table.name,
      displayName: table.displayName ?? "",
      dirty: false,
      columns: table.schemaDefinition.columns.map((column, index) => ({ ...column, id: `${table.id}-${column.name}-${index}` })),
    }))
  );
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() => layoutTables(tables));
  const [selected, setSelected] = useState<{ tableId: string; columnId: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedColumn = drafts.flatMap((table) => table.columns.map((column) => ({ table, column }))).find((item) => item.table.id === selected?.tableId && item.column.id === selected.columnId);

  function patchColumn(tableId: string, columnId: string, patch: Partial<ColumnDef>) {
    setDrafts((current) => current.map((table) => table.id === tableId
      ? { ...table, dirty: true, columns: table.columns.map((column) => column.id === columnId ? { ...column, ...patch } : column) }
      : table));
  }

  function patchTable(tableId: string, displayName: string) {
    setDrafts((current) => current.map((table) => table.id === tableId ? { ...table, displayName, dirty: true } : table));
  }

  function addColumn(tableId: string) {
    const table = drafts.find((item) => item.id === tableId);
    const used = new Set(table?.columns.map((column) => column.name) ?? []);
    let name = "field";
    let index = 2;
    while (used.has(name)) name = `field_${index++}`;
    const column: DraftColumn = { id: `new-${Date.now()}`, name, type: "string", required: false };
    setDrafts((current) => current.map((item) => item.id === tableId ? { ...item, dirty: true, columns: [...item.columns, column] } : item));
    setSelected({ tableId, columnId: column.id });
  }

  function removeColumn(tableId: string, columnId: string) {
    setDrafts((current) => current.map((table) => table.id === tableId
      ? { ...table, dirty: true, columns: table.columns.filter((column) => column.id !== columnId) }
      : table));
    if (selected?.tableId === tableId && selected.columnId === columnId) setSelected(null);
  }

  async function save() {
    const dirty = drafts.filter((table) => table.dirty);
    if (!dirty.length || saving) return;
    setSaving(true);
    try {
      for (const table of dirty) {
        const response = await fetch(`/api/projects/${projectId}/data-tables/${table.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            displayName: table.displayName.trim() ? table.displayName.trim() : null,
            schemaDefinition: { columns: table.columns.map(({ id: _id, ...column }) => column) },
          }),
        });
        const json = await response.json();
        if (!response.ok) {
          toast.error(json.error?.message ?? `ذخیره ${table.name} نشد`);
          return;
        }
      }
      toast.success("نقشه ذخیره شد");
      setDrafts((current) => current.map((item) => ({ ...item, dirty: false })));
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const bounds = drafts.reduce((acc, table) => {
    const pos = positions[table.id] ?? { x: 24, y: 24 };
    const height = HEADER_H + table.columns.length * FIELD_H + 36;
    return { width: Math.max(acc.width, pos.x + CARD_W + 80), height: Math.max(acc.height, pos.y + height + 80) };
  }, { width: 800, height: 500 });

  const edges = drafts.flatMap((table) => {
    const from = positions[table.id];
    if (!from) return [];
    return table.columns.flatMap((column, index) => {
      if (column.type !== "reference" || !column.referenceTable) return [];
      const target = drafts.find((item) => item.name === column.referenceTable && item.id !== table.id) ?? drafts.find((item) => item.name === column.referenceTable);
      if (!target) return [];
      const to = positions[target.id];
      if (!to) return [];
      const y1 = from.y + HEADER_H + index * FIELD_H + FIELD_H / 2;
      const y2 = to.y + 28;
      const x1 = from.x + CARD_W;
      const x2 = to.x;
      const curve = Math.max(40, Math.abs(x2 - x1) / 2);
      return [{ id: `${table.id}-${column.id}`, d: `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}` }];
    });
  });

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="relative overflow-auto bg-muted/10">
        <div className="absolute top-3 left-3 z-10">
          <Button size="sm" className="gap-1.5" onClick={save} disabled={saving || !drafts.some((table) => table.dirty)}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            ذخیره تغییرات
          </Button>
        </div>
        <div className="relative" style={{ width: bounds.width, height: bounds.height }}>
          <svg className="absolute inset-0 pointer-events-none" width={bounds.width} height={bounds.height}>
            {edges.map((edge) => (
              <path key={edge.id} d={edge.d} fill="none" stroke="currentColor" className="text-primary/70" strokeWidth={1.5} />
            ))}
          </svg>
          {drafts.map((table) => {
            const pos = positions[table.id] ?? { x: 24, y: 24 };
            return (
              <article
                key={table.id}
                className="absolute rounded-xl border border-border bg-card"
                style={{ width: CARD_W, left: pos.x, top: pos.y }}
              >
                <header
                  className="px-3 py-2 border-b border-border cursor-grab"
                  onPointerDown={(event) => {
                    const startX = event.clientX;
                    const startY = event.clientY;
                    const origin = pos;
                    function move(ev: PointerEvent) {
                      setPositions((current) => ({
                        ...current,
                        [table.id]: { x: Math.max(8, origin.x + ev.clientX - startX), y: Math.max(8, origin.y + ev.clientY - startY) },
                      }));
                    }
                    function up() {
                      window.removeEventListener("pointermove", move);
                      window.removeEventListener("pointerup", up);
                    }
                    window.addEventListener("pointermove", move);
                    window.addEventListener("pointerup", up);
                  }}
                >
                  <button
                    type="button"
                    className="font-mono text-sm font-semibold hover:text-primary"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (orgId) params.set("org", orgId);
                      router.push(`/dashboard/projects/${projectId}/tables/${table.id}?${params.toString()}`);
                    }}
                  >
                    {table.name}
                  </button>
                  <input
                    value={table.displayName}
                    onPointerDown={(event) => event.stopPropagation()}
                    onChange={(event) => patchTable(table.id, event.target.value)}
                    placeholder="نام نمایشی"
                    className="w-full bg-transparent text-[11px] text-muted-foreground outline-none"
                  />
                </header>
                <div>
                  {table.columns.map((column) => {
                    const active = selected?.tableId === table.id && selected.columnId === column.id;
                    return (
                      <button
                        key={column.id}
                        type="button"
                        onClick={() => setSelected({ tableId: table.id, columnId: column.id })}
                        className={`w-full h-[30px] px-3 flex items-center justify-between text-[11px] font-mono border-b border-border/50 ${active ? "bg-primary/10 text-primary" : "hover:bg-muted/40"}`}
                      >
                        <span className="truncate">{column.name}</span>
                        <span className="text-muted-foreground">{column.type === "reference" ? column.referenceTable ?? "fk" : COLUMN_TYPE_INFO[column.type].label.split(" ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="w-full text-xs text-muted-foreground py-2 flex items-center justify-center gap-1 hover:text-foreground" onClick={() => addColumn(table.id)}>
                  <Plus className="size-3" /> فیلد
                </button>
              </article>
            );
          })}
        </div>
      </div>
      <aside className="border-r border-border p-4 overflow-y-auto">
        {selectedColumn ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-muted-foreground">فیلد جدول</div>
                <div className="font-mono text-sm truncate">{selectedColumn.table.name}</div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => removeColumn(selectedColumn.table.id, selectedColumn.column.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <FieldInspector
              column={selectedColumn.column}
              tables={drafts.map((table) => ({ name: table.name }))}
              onChange={(patch) => patchColumn(selectedColumn.table.id, selectedColumn.column.id, patch)}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">یک فیلد را انتخاب کنید تا ویژگی‌هایش را همین‌جا تغییر دهید. خط‌ها کلید خارجی هستند. عنوان جدول را بکشید تا جابه‌جا شود.</p>
        )}
      </aside>
    </div>
  );
}

function layoutTables(tables: TableRow[]) {
  const heights = [24, 24, 24];
  const positions: Record<string, { x: number; y: number }> = {};
  tables.forEach((table, index) => {
    const column = index % 3;
    positions[table.id] = { x: 24 + column * 300, y: heights[column] };
    heights[column] += HEADER_H + Math.max(table.schemaDefinition.columns.length, 1) * FIELD_H + 70;
  });
  return positions;
}
