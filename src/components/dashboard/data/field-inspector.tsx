"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COLUMN_TYPE_INFO, type ColumnDef, type ColumnType } from "@/lib/data/schema";

export type DraftColumn = ColumnDef & { id: string };

export function FieldInspector({
  column,
  tables,
  onChange,
}: {
  column: DraftColumn;
  tables: Array<{ name: string }>;
  onChange: (patch: Partial<ColumnDef>) => void;
}) {
  const info = COLUMN_TYPE_INFO[column.type];

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">نام فیلد</Label>
        <Input
          value={column.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="mt-1.5 bg-card/40 font-mono"
        />
      </div>
      <div>
        <Label className="text-xs">نوع</Label>
        <Select
          value={column.type}
          onValueChange={(value: ColumnType) => {
            const patch: Partial<ColumnDef> = {
              type: value,
              default: undefined,
              maxLength: undefined,
              enumValues: undefined,
              referenceTable: undefined,
              referenceCascade: undefined,
            };
            if (value === "uuid") patch.default = "uuid()";
            if (value === "enum") patch.enumValues = ["value"];
            onChange(patch);
          }}
        >
          <SelectTrigger className="mt-1.5 bg-card/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {(Object.keys(COLUMN_TYPE_INFO) as ColumnType[]).map((type) => (
              <SelectItem key={type} value={type}>{COLUMN_TYPE_INFO[type].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1.5">{info.description}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs">اجباری</Label>
        <Switch checked={!!column.required} onCheckedChange={(checked) => onChange({ required: checked })} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Label className="text-xs">یکتا</Label>
        <Switch checked={!!column.unique} onCheckedChange={(checked) => onChange({ unique: checked })} />
      </div>
      {(column.type === "string" || column.type === "text") && (
        <div>
          <Label className="text-xs">حداکثر طول</Label>
          <Input
            type="number"
            value={column.maxLength ?? ""}
            onChange={(e) => onChange({ maxLength: e.target.value ? Number(e.target.value) : undefined })}
            className="mt-1.5 bg-card/40"
          />
        </div>
      )}
      {column.type === "enum" && (
        <div>
          <Label className="text-xs">مقادیر مجاز</Label>
          <Input
            value={column.enumValues?.join(", ") ?? ""}
            onChange={(e) => {
              const vals = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
              onChange({ enumValues: vals.length ? vals : undefined });
            }}
            placeholder="pending, active"
            className="mt-1.5 bg-card/40 font-mono"
          />
        </div>
      )}
      {column.type === "reference" && (
        <>
          <div>
            <Label className="text-xs">جدول مرجع</Label>
            <Select
              value={column.referenceTable}
              onValueChange={(value) => onChange({ referenceTable: value })}
            >
              <SelectTrigger className="mt-1.5 bg-card/40">
                <SelectValue placeholder="انتخاب جدول" />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.name} value={table.name}>{table.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-xs">حذف آبشاری</Label>
            <Switch
              checked={!!column.referenceCascade}
              onCheckedChange={(checked) => onChange({ referenceCascade: checked })}
            />
          </div>
        </>
      )}
      <div>
        <Label className="text-xs">مقدار پیش‌فرض</Label>
        <DefaultField column={column} onChange={(value) => onChange({ default: value })} />
      </div>
      <div>
        <Label className="text-xs">توضیح</Label>
        <Input
          value={column.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          className="mt-1.5 bg-card/40"
        />
      </div>
    </div>
  );
}

function DefaultField({
  column,
  onChange,
}: {
  column: DraftColumn;
  onChange: (value: unknown) => void;
}) {
  if (column.type === "boolean") {
    const value = column.default === true ? "true" : column.default === false ? "false" : "none";
    return (
      <Select value={value} onValueChange={(next) => onChange(next === "true" ? true : next === "false" ? false : undefined)}>
        <SelectTrigger className="mt-1.5 bg-card/40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          <SelectItem value="true">true</SelectItem>
          <SelectItem value="false">false</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (column.type === "datetime" || column.type === "date" || column.type === "uuid") {
    const expr = column.type === "uuid" ? "uuid()" : "now()";
    const value = column.default === expr ? expr : "none";
    return (
      <Select value={value} onValueChange={(next) => onChange(next === "none" ? undefined : next)}>
        <SelectTrigger className="mt-1.5 bg-card/40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">بدون پیش‌فرض</SelectItem>
          <SelectItem value={expr}>{expr}</SelectItem>
        </SelectContent>
      </Select>
    );
  }
  if (column.type === "integer" || column.type === "decimal") {
    return (
      <Input
        type="number"
        value={typeof column.default === "number" ? String(column.default) : ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        className="mt-1.5 bg-card/40"
      />
    );
  }
  return (
    <Input
      value={typeof column.default === "string" ? column.default : ""}
      onChange={(e) => onChange(e.target.value || undefined)}
      className="mt-1.5 bg-card/40"
    />
  );
}
