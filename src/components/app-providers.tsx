"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useState, type ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <DirectionProvider dir="rtl">
        <TooltipProvider delayDuration={200}>
          {children}
          <SonnerToaster position="top-center" dir="rtl" />
        </TooltipProvider>
      </DirectionProvider>
    </QueryClientProvider>
  );
}
