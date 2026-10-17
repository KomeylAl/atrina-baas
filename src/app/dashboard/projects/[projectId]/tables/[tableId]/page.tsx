"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { TableDesigner } from "@/components/dashboard/data/table-designer";

function TablePageInner() {
  const params = useParams<{ projectId: string; tableId: string }>();
  return <TableDesigner projectId={params.projectId} tableId={params.tableId} />;
}

export default function TablePage() {
  return (
    <Suspense fallback={null}>
      <TablePageInner />
    </Suspense>
  );
}
