"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileIcon, Trash2, Loader2, HardDrive } from "lucide-react";
import { toast } from "sonner";
import { SectionLoading, EmptyState, EnvPicker, SectionHeader } from "@/components/dashboard/widgets/common";
import { formatNumber } from "@/lib/utils/format";
import { timeAgo } from "@/lib/utils/format";
import { useState, useRef } from "react";

type ObjectRow = {
  id: string;
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  ownerUserId: string | null;
  environment: { id: string; name: string };
  createdAt: string;
};

export function StorageSection({ projectId, environments, apiKey }: { projectId: string; environments: Array<{ id: string; name: string }>; apiKey?: string | null }) {
  const qc = useQueryClient();
  const [envId, setEnvId] = useState<string | null>(environments[0]?.id ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery<{ objects: ObjectRow[]; totalBytes: number; count: number }>({
    queryKey: ["project-storage", projectId, envId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (envId) params.set("envId", envId);
      const r = await fetch(`/api/projects/${projectId}/storage/objects?${params.toString()}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json.error?.message);
      return json.data;
    },
    staleTime: 0,
    refetchOnMount: true,
    retry: 1,
  });

  async function handleUpload(file: File) {
    if (!envId) return toast.error("یک محیط انتخاب کنید");
    if (!apiKey) return toast.error("یک کلید publishable برای آپلود لازم است (در تب کلیدها بسازید)");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const r = await fetch("/api/v1/storage/upload", {
        method: "POST",
        headers: { "x-atrina-key": apiKey },
        body: formData,
      });
      const json = await r.json();
      if (!r.ok) return toast.error(json.error?.message ?? "خطا در آپلود");
      toast.success("فایل آپلود شد");
      qc.invalidateQueries({ queryKey: ["project-storage", projectId, envId] });
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(objectId: string) {
    const r = await fetch(`/api/projects/${projectId}/storage/objects/${objectId}`, { method: "DELETE" });
    if (!r.ok) {
      const j = await r.json();
      return toast.error(j.error?.message ?? "خطا");
    }
    toast.success("فایل حذف شد");
    qc.invalidateQueries({ queryKey: ["project-storage", projectId, envId] });
  }

  const objects = data?.objects ?? [];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="ذخیره‌سازی"
        description="مدیریت فایل‌های پروژه — آپلود، مشاهده و حذف"
        action={
          <div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            <Button size="sm" className="gap-2" disabled={!envId || !apiKey || uploading} onClick={() => fileInputRef.current?.click()}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              آپلود فایل
            </Button>
          </div>
        }
      />

      <EnvPicker environments={environments} value={envId} onChange={setEnvId} />

      {isLoading ? <SectionLoading /> : objects.length === 0 ? (
        <EmptyState icon={HardDrive} title="فایلی وجود ندارد" description="برای آپلود، یک فایل را انتخاب کنید." />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-card/40 border-border/60">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">تعداد فایل</div>
                <div className="text-2xl font-bold">{formatNumber(data?.count ?? 0)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/40 border-border/60">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground">حجم کل</div>
                <div className="text-2xl font-bold">{formatBytes(data?.totalBytes ?? 0)}</div>
              </CardContent>
            </Card>
          </div>
          <Card className="bg-card/40 border-border/60">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs text-muted-foreground">
                    <th className="text-right px-4 py-3 font-medium">نام</th>
                    <th className="text-right px-4 py-3 font-medium">نوع</th>
                    <th className="text-right px-4 py-3 font-medium">حجم</th>
                    <th className="text-right px-4 py-3 font-medium">زمان</th>
                    <th className="text-right px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {objects.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileIcon className="size-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{o.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{o.contentType}</td>
                      <td className="px-4 py-3 text-xs">{formatBytes(o.size)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="ghost" className="text-destructive h-7" onClick={() => handleDelete(o.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "۰";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${formatNumber(parseFloat((bytes / Math.pow(1024, i)).toFixed(2)))} ${units[i]}`;
}
