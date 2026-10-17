"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, AlertCircle, ChevronUp, ChevronDown } from "lucide-react";
import { COLUMN_TYPE_INFO, type ColumnDef, type ColumnType, type SchemaDefinition } from "@/lib/data/schema";

export type SchemaBuilderColumn = ColumnDef & {
  // Local-only id for React keys when name is empty
  _localId: string;
};

let _localIdCounter = 0;
function nextLocalId(): string {
  _localIdCounter += 1;
  return `col_${Date.now()}_${_localIdCounter}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Visual schema builder for data tables.
 *
 * Supports all column types from COLUMN_TYPE_INFO with type-specific
 * configuration (maxLength for string, enumValues for enum, referenceTable
 * for reference, default expressions like now() and uuid()).
 *
 * The `value` prop is only used for initial population when the component
 * mounts. The component emits changes via `onChange` with a clean
 * SchemaDefinition (stripped of internal `_localId`).
 *
 * The `availableTables` prop lets the user pick a target table for
 * `reference` columns.
 */
export function SchemaBuilder({
  value,
  onChange,
  availableTables = [],
}: {
  value: SchemaDefinition;
  onChange: (next: SchemaDefinition) => void;
  availableTables?: Array<{ id: string; name: string }>;
}) {
  const [columns, setColumns] = useState<SchemaBuilderColumn[]>(() =>
    (value.columns ?? []).map((c) => ({ ...c, _localId: nextLocalId() }))
  );

  const emit = useCallback(
    (next: SchemaBuilderColumn[]) => {
      const clean: SchemaDefinition = {
        columns: next
          .map(({ _localId: _ignored, ...c }) => c)
          .filter((c) => c.name.length > 0),
      };
      onChange(clean);
    },
    [onChange]
  );

  function addColumn() {
    const newCol: SchemaBuilderColumn = {
      _localId: nextLocalId(),
      name: "",
      type: "string",
      required: false,
    };
    const next = [...columns, newCol];
    setColumns(next);
    emit(next);
  }

  function updateColumn(localId: string, patch: Partial<SchemaBuilderColumn>) {
    const next = columns.map((c) => (c._localId === localId ? { ...c, ...patch } : c));
    setColumns(next);
    emit(next);
  }

  function removeColumn(localId: string) {
    const next = columns.filter((c) => c._localId !== localId);
    setColumns(next);
    emit(next);
  }

  function moveColumn(localId: string, direction: "up" | "down") {
    const idx = columns.findIndex((c) => c._localId === localId);
    if (idx < 0) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setColumns(next);
    emit(next);
  }

  return (
    <div className="space-y-2">
      {columns.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <p className="text-sm text-muted-foreground">هیچ ستونی اضافه نشده. روی «افزودن ستون» بزنید.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {columns.map((c, idx) => {
            const nameError = validateColumnName(c.name, columns, idx);
            const info = COLUMN_TYPE_INFO[c.type];
            return (
              <div
                key={c._localId}
                className="border border-border/60 rounded-lg p-3 bg-card/30 space-y-2"
              >
                <div className="flex items-start gap-2">
                  <div className="flex flex-col gap-0.5 pt-7">
                    <button
                      type="button"
                      onClick={() => moveColumn(c._localId, "up")}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="بالا"
                    >
                      <ChevronUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveColumn(c._localId, "down")}
                      disabled={idx === columns.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="پایین"
                    >
                      <ChevronDown className="size-3" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    {/* Row 1: name + type + required */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-5">
                        <Label className="text-[11px] text-muted-foreground mb-1 block">نام ستون</Label>
                        <Input
                          value={c.name}
                          onChange={(e) => updateColumn(c._localId, { name: e.target.value })}
                          placeholder="title"
                          className={`bg-card/40 font-mono text-sm h-9 ${nameError ? "border-destructive" : ""}`}
                        />
                        {nameError && (
                          <div className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                            <AlertCircle className="size-3" /> {nameError}
                          </div>
                        )}
                      </div>
                      <div className="col-span-6 sm:col-span-5">
                        <Label className="text-[11px] text-muted-foreground mb-1 block">نوع</Label>
                        <Select
                          value={c.type}
                          onValueChange={(v: ColumnType) => {
                            // Reset type-specific fields when type changes
                            const patch: Partial<SchemaBuilderColumn> = {
                              type: v,
                              default: undefined,
                              maxLength: undefined,
                              enumValues: undefined,
                              referenceTable: undefined,
                              referenceCascade: undefined,
                            };
                            // Auto-set default expression for uuid
                            if (v === "uuid") {
                              patch.default = "uuid()";
                              patch.required = false; // auto-generated, so usually not required
                            }
                            updateColumn(c._localId, patch);
                          }}
                        >
                          <SelectTrigger className="bg-card/40 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-80">
                            <SelectItem value="string">{COLUMN_TYPE_INFO.string.label}</SelectItem>
                            <SelectItem value="text">{COLUMN_TYPE_INFO.text.label}</SelectItem>
                            <SelectItem value="integer">{COLUMN_TYPE_INFO.integer.label}</SelectItem>
                            <SelectItem value="decimal">{COLUMN_TYPE_INFO.decimal.label}</SelectItem>
                            <SelectItem value="boolean">{COLUMN_TYPE_INFO.boolean.label}</SelectItem>
                            <SelectItem value="datetime">{COLUMN_TYPE_INFO.datetime.label}</SelectItem>
                            <SelectItem value="date">{COLUMN_TYPE_INFO.date.label}</SelectItem>
                            <SelectItem value="time">{COLUMN_TYPE_INFO.time.label}</SelectItem>
                            <SelectItem value="email">{COLUMN_TYPE_INFO.email.label}</SelectItem>
                            <SelectItem value="url">{COLUMN_TYPE_INFO.url.label}</SelectItem>
                            <SelectItem value="uuid">{COLUMN_TYPE_INFO.uuid.label}</SelectItem>
                            <SelectItem value="enum">{COLUMN_TYPE_INFO.enum.label}</SelectItem>
                            <SelectItem value="reference">{COLUMN_TYPE_INFO.reference.label}</SelectItem>
                            <SelectItem value="json">{COLUMN_TYPE_INFO.json.label}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-6 sm:col-span-2 flex flex-col items-center justify-end pb-1">
                        <Label className="text-[11px] text-muted-foreground mb-1 block text-center w-full">اجباری</Label>
                        <Switch
                          checked={!!c.required}
                          onCheckedChange={(checked) => updateColumn(c._localId, { required: checked })}
                        />
                      </div>
                    </div>

                    {/* Type-specific config row */}
                    {renderTypeSpecific(c, availableTables, updateColumn)}

                    {/* Row 3: default + unique */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-12 sm:col-span-8">
                        <Label className="text-[11px] text-muted-foreground mb-1 block">مقدار پیش‌فرض</Label>
                        <DefaultInput
                          column={c}
                          onChange={(defaultVal) => updateColumn(c._localId, { default: defaultVal })}
                        />
                      </div>
                      <div className="col-span-12 sm:col-span-4 flex items-center justify-start gap-2 pt-6">
                        <Switch
                          checked={!!c.unique}
                          onCheckedChange={(checked) => updateColumn(c._localId, { unique: checked })}
                          id={`unique-${c._localId}`}
                        />
                        <Label htmlFor={`unique-${c._localId}`} className="text-xs text-muted-foreground cursor-pointer">
                          یکتا (unique)
                        </Label>
                      </div>
                    </div>

                    {/* Optional description */}
                    <div>
                      <Label className="text-[11px] text-muted-foreground mb-1 block">توضیحات (اختیاری، در مستندات API نمایش داده می‌شود)</Label>
                      <Input
                        value={c.description ?? ""}
                        onChange={(e) => updateColumn(c._localId, { description: e.target.value || undefined })}
                        placeholder="مثلاً: عنوان پست"
                        className="bg-card/40 text-sm h-9"
                      />
                    </div>

                    {/* Type info hint */}
                    <div className="text-[11px] text-muted-foreground bg-muted/20 border border-border/40 rounded px-2 py-1">
                      {info.description}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeColumn(c._localId)}
                    className="text-muted-foreground hover:text-destructive p-1.5 h-8 w-8 flex items-center justify-center rounded transition-colors mt-7"
                    aria-label="حذف ستون"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={addColumn} className="gap-1.5">
        <Plus className="size-3.5" /> افزودن ستون
      </Button>
    </div>
  );
}

/**
 * Render the type-specific configuration inputs based on the column's type.
 */
function renderTypeSpecific(
  c: SchemaBuilderColumn,
  availableTables: Array<{ id: string; name: string }>,
  updateColumn: (localId: string, patch: Partial<SchemaBuilderColumn>) => void,
): React.ReactNode {
  if (c.type === "string" || c.type === "text") {
    return (
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-6 sm:col-span-3">
          <Label className="text-[11px] text-muted-foreground mb-1 block">حداکثر طول</Label>
          <Input
            type="number"
            value={c.maxLength ?? (c.type === "string" ? 256 : 65535)}
            onChange={(e) => updateColumn(c._localId, { maxLength: e.target.value ? Number(e.target.value) : undefined })}
            className="bg-card/40 text-sm h-9"
          />
        </div>
      </div>
    );
  }
  if (c.type === "enum") {
    return (
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-12">
          <Label className="text-[11px] text-muted-foreground mb-1 block">مقادیر مجاز (با کاما جدا کنید)</Label>
          <Input
            value={c.enumValues?.join(", ") ?? ""}
            onChange={(e) => {
              const vals = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
              updateColumn(c._localId, { enumValues: vals.length > 0 ? vals : undefined });
            }}
            placeholder="pending, active, completed"
            className="bg-card/40 text-sm h-9 font-mono"
          />
        </div>
      </div>
    );
  }
  if (c.type === "reference") {
    return (
      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-6 sm:col-span-8">
          <Label className="text-[11px] text-muted-foreground mb-1 block">جدول مرجع</Label>
          <Select
            value={c.referenceTable ?? ""}
            onValueChange={(v) => updateColumn(c._localId, { referenceTable: v })}
          >
            <SelectTrigger className="bg-card/40 h-9">
              <SelectValue placeholder="یک جدول انتخاب کنید" />
            </SelectTrigger>
            <SelectContent>
              {availableTables.length === 0 ? (
                <SelectItem value="_none" disabled>ابتدا یک جدول بسازید</SelectItem>
              ) : (
                availableTables.map((t) => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-6 sm:col-span-4 flex items-center justify-start gap-2 pt-6">
          <Switch
            checked={!!c.referenceCascade}
            onCheckedChange={(checked) => updateColumn(c._localId, { referenceCascade: checked })}
            id={`cascade-${c._localId}`}
          />
          <Label htmlFor={`cascade-${c._localId}`} className="text-xs text-muted-foreground cursor-pointer">
            حذف متقابل (cascade)
          </Label>
        </div>
      </div>
    );
  }
  return null;
}

function DefaultInput({
  column,
  onChange,
}: {
  column: SchemaBuilderColumn;
  onChange: (defaultVal: unknown) => void;
}) {
  const v = column.default;

  // Expression defaults for datetime/date/uuid
  if (typeof v === "string" && (v === "now()" || v === "uuid()")) {
    return (
      <Select value={v} onValueChange={(s) => onChange(s === "none" ? undefined : s)}>
        <SelectTrigger className="bg-card/40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          {column.type === "datetime" && <SelectItem value="now()">now() — زمان فعلی</SelectItem>}
          {column.type === "date" && <SelectItem value="now()">now() — تاریخ فعلی</SelectItem>}
          {column.type === "uuid" && <SelectItem value="uuid()">uuid() — UUID تصادفی</SelectItem>}
        </SelectContent>
      </Select>
    );
  }

  // Allow setting expression defaults via select for datetime/date/uuid
  if (column.type === "datetime" || column.type === "date") {
    return (
      <Select
        value={typeof v === "string" ? "custom" : "none"}
        onValueChange={(s) => {
          if (s === "now") onChange("now()");
          else if (s === "none") onChange(undefined);
          else if (s === "custom") onChange(typeof v === "string" && v !== "now()" ? v : "");
        }}
      >
        <SelectTrigger className="bg-card/40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          <SelectItem value="now">now() — زمان فعلی</SelectItem>
          <SelectItem value="custom">مقدار ثابت</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (column.type === "uuid") {
    return (
      <Select
        value={typeof v === "string" && v !== "uuid()" ? "custom" : v === "uuid()" ? "uuid()" : "none"}
        onValueChange={(s) => {
          if (s === "uuid()") onChange("uuid()");
          else if (s === "none") onChange(undefined);
          else if (s === "custom") onChange(typeof v === "string" && v !== "uuid()" ? v : "");
        }}
      >
        <SelectTrigger className="bg-card/40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          <SelectItem value="uuid()">uuid() — خودکار ساخته شود</SelectItem>
          <SelectItem value="custom">مقدار ثابت</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Boolean default
  if (column.type === "boolean") {
    return (
      <Select
        value={v === true ? "true" : v === false ? "false" : "none"}
        onValueChange={(s) => onChange(s === "true" ? true : s === "false" ? false : undefined)}
      >
        <SelectTrigger className="bg-card/40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (column.type === "integer" || column.type === "decimal") {
    return (
      <Input
        type="number"
        value={typeof v === "number" ? String(v) : typeof v === "string" && v ? v : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        placeholder="—"
        className="bg-card/40 text-sm h-9"
      />
    );
  }
  if (column.type === "date") {
    return (
      <Input
        type="date"
        value={typeof v === "string" && v ? v.slice(0, 10) : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="—"
        className="bg-card/40 text-sm h-9"
      />
    );
  }
  if (column.type === "time") {
    return (
      <Input
        type="time"
        value={typeof v === "string" && v ? v.slice(0, 8) : ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        placeholder="—"
        className="bg-card/40 text-sm h-9"
      />
    );
  }
  if (column.type === "enum" && column.enumValues?.length) {
    return (
      <Select
        value={typeof v === "string" ? v : "none"}
        onValueChange={(s) => onChange(s === "none" ? undefined : s)}
      >
        <SelectTrigger className="bg-card/40 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          {column.enumValues.map((ev) => (
            <SelectItem key={ev} value={ev}>{ev}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (column.type === "reference" && column.referenceTable) {
    return (
      <Input
        value={(v as string) ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        placeholder="UUID رکورد مرجع"
        className="bg-card/40 text-sm h-9 font-mono"
      />
    );
  }
  if (column.type === "json") {
    return (
      <Input
        value={typeof v === "string" ? v : v === undefined ? "" : JSON.stringify(v)}
        onChange={(e) => {
          const txt = e.target.value;
          if (txt === "") return onChange(undefined);
          try {
            onChange(JSON.parse(txt));
          } catch {
            onChange(txt);
          }
        }}
        placeholder='{"key":"value"}'
        className="bg-card/40 text-sm h-9 font-mono"
      />
    );
  }
  // string/text/email/url default
  return (
    <Input
      value={(v as string) ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      placeholder="—"
      className="bg-card/40 text-sm h-9"
    />
  );
}

function validateColumnName(name: string, all: SchemaBuilderColumn[], idx: number): string | null {
  if (!name) return null;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    return "نام باید با حرف/آندرلاین شروع شود و فقط شامل حروف انگلیسی، عدد و _ باشد";
  }
  const dup = all.findIndex((c, i) => i !== idx && c.name === name);
  if (dup >= 0) return "نام ستون تکراری است";
  return null;
}
