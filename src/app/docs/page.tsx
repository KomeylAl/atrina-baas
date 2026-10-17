import type { Metadata } from "next";
import { DocsPage } from "@/components/docs/docs-page";

export const metadata: Metadata = {
  title: "مستندات — Atrina BaaS",
  description:
    "راهنمای کار با Atrina BaaS: سازمان و پروژه، جدول داده، کلید API، کاربران نهایی و فراخوانی /api/v1.",
};

export default function DocsRoute() {
  return <DocsPage />;
}
