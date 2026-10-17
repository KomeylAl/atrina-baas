"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionLoading({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="size-5 animate-spin ml-2" />
      {label ?? "در حال بارگذاری…"}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="size-12 rounded-lg bg-muted/30 flex items-center justify-center mx-auto mb-3">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

export function EnvPicker({
  environments,
  value,
  onChange,
  className,
}: {
  environments: Array<{ id: string; name: string }>;
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 overflow-x-auto pb-1", className)}>
      {environments.map((e) => (
        <button
          key={e.id}
          onClick={() => onChange(e.id)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors border",
            value === e.id
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card/40 text-muted-foreground border-border hover:bg-muted/30"
          )}
        >
          {e.name}
        </button>
      ))}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
