import { Suspense } from "react";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DashboardChrome>{children}</DashboardChrome>
    </Suspense>
  );
}
