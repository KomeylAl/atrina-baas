"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/stores/auth-store";
import { LandingPage } from "@/components/landing-page";
import { AuthScreen } from "@/components/auth/auth-screen";

export function HomeRoot() {
  const [ready, setReady] = useState(false);
  const user = useAuth((s) => s.user);
  const fetchUser = useAuth((s) => s.fetchUser);

  useEffect(() => {
    let active = true;
    fetchUser().finally(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, [fetchUser]);

  if (!ready) return <FullScreenLoader />;
  if (user) return <LandingPage signedIn onGetStarted={() => undefined} onLogin={() => undefined} />;
  return <HomeUnauthed />;
}

function HomeUnauthed() {
  const requested = useSearchParams().get("view");
  const initial = requested === "login" || requested === "signup" ? requested : "landing";
  const [view, setView] = useState<"landing" | "login" | "signup">(initial);
  if (view === "landing") {
    return <LandingPage onGetStarted={() => setView("signup")} onLogin={() => setView("login")} />;
  }
  return (
    <AuthScreen
      initialMode={view === "login" ? "login" : "signup"}
      onSwitch={(m) => setView(m)}
      onBackHome={() => setView("landing")}
    />
  );
}

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center grid-bg">
      <div className="flex flex-col items-center gap-3">
        <div className="size-12 rounded-xl brand-gradient animate-pulse" />
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      </div>
    </div>
  );
}
