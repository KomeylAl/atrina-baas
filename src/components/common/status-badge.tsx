import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertCircle, XCircle, Clock } from "lucide-react";

const VARIANTS: Record<
  string,
  {
    label: string;
    className: string;
    dotClass: string;
    icon?: React.ComponentType<{ className?: string }>;
  }
> = {
  // Org / project / environment / credential status
  active: {
    label: "فعال",
    className: "bg-success/12 text-success border-success/25",
    dotClass: "bg-success",
    icon: CheckCircle2,
  },
  suspended: {
    label: "تعلیق‌شده",
    className: "bg-warning/12 text-warning border-warning/25",
    dotClass: "bg-warning",
    icon: Clock,
  },
  archived: {
    label: "بایگانی",
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
    icon: Circle,
  },
  revoked: {
    label: "ابطال‌شده",
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
    icon: XCircle,
  },
  expired: {
    label: "منقضی",
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
    icon: AlertCircle,
  },
  pending: {
    label: "در انتظار",
    className: "bg-warning/12 text-warning border-warning/25",
    dotClass: "bg-warning",
    icon: Clock,
  },
  invited: {
    label: "دعوت‌شده",
    className: "bg-info/12 text-info border-info/25",
    dotClass: "bg-info",
  },
  deleted: {
    label: "حذف‌شده",
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
    icon: XCircle,
  },
  // Roles
  owner: {
    label: "مالک",
    className: "bg-primary/15 text-primary border-primary/30",
    dotClass: "bg-primary",
  },
  admin: {
    label: "مدیر",
    className: "bg-info/15 text-info border-info/30",
    dotClass: "bg-info",
  },
  developer: {
    label: "توسعه‌دهنده",
    className: "bg-secondary text-secondary-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
  billing: {
    label: "مالی",
    className: "bg-warning/15 text-warning border-warning/30",
    dotClass: "bg-warning",
  },
  viewer: {
    label: "مشاهده‌گر",
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
  // Credential kinds
  publishable: {
    label: "عمومی",
    className: "bg-info/12 text-info border-info/25",
    dotClass: "bg-info",
  },
  server_secret: {
    label: "سرور",
    className: "bg-warning/12 text-warning border-warning/25",
    dotClass: "bg-warning",
  },
  admin: {
    label: "مدیر",
    className: "bg-destructive/12 text-destructive border-destructive/25",
    dotClass: "bg-destructive",
  },
  // Environment types
  development: {
    label: "توسعه",
    className: "bg-info/12 text-info border-info/25",
    dotClass: "bg-info",
  },
  staging: {
    label: "پیش‌تولید",
    className: "bg-warning/12 text-warning border-warning/25",
    dotClass: "bg-warning",
  },
  production: {
    label: "تولید",
    className: "bg-success/12 text-success border-success/25",
    dotClass: "bg-success",
  },
  custom: {
    label: "سفارشی",
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  },
};

export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const variant = VARIANTS[value] ?? {
    label: value,
    className: "bg-muted text-muted-foreground border-border",
    dotClass: "bg-muted-foreground",
  };
  const Icon = variant.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        variant.className,
        className
      )}
    >
      {Icon ? <Icon className="size-3" /> : <span className={cn("size-1.5 rounded-full", variant.dotClass)} />}
      {variant.label}
    </span>
  );
}
