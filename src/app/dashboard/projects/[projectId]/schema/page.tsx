"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { SchemaMap } from "@/components/dashboard/data/schema-map";

function SchemaPageInner() {
  const params = useParams<{ projectId: string }>();
  return <SchemaMap projectId={params.projectId} />;
}

export default function SchemaPage() {
  return (
    <Suspense fallback={null}>
      <SchemaPageInner />
    </Suspense>
  );
}
