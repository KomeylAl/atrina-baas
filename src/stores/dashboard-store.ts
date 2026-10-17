"use client";

import { useState } from "react";
import { create } from "zustand";
import type { View } from "@/components/dashboard/dashboard-shell";

type DashboardState = {
  // Not strictly necessary; reserved for future global state
  _: number;
};

export const useDashboardStore = create<DashboardState>(() => ({ _: 0 }));

// Suppress unused warning while keeping the import site stable.
void useState;
