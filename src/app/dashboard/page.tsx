"use client";

import { OverviewView } from "@/components/dashboard/views/overview-view";
import { useDashboardNavigate } from "@/components/dashboard/dashboard-chrome";

export default function DashboardHomePage() {
  const navigate = useDashboardNavigate();
  return <OverviewView onNavigate={navigate} />;
}
