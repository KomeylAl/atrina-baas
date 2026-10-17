"use client";

import { create } from "zustand";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  memberships: Array<{
    id: string;
    role: string;
    status: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
  }>;
};

type AuthState = {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (input: SignupInput) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

type SignupInput = {
  email: string;
  password: string;
  displayName?: string;
  organizationName?: string;
};

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        set({ user: null, loading: false });
        return;
      }
      const json = await res.json();
      set({ user: json.data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        set({ loading: false, error: json.error?.message ?? "خطا" });
        return { ok: false, error: json.error?.message };
      }
      await useAuth.getState().fetchUser();
      set({ loading: false });
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      set({ loading: false, error: msg });
      return { ok: false, error: msg };
    }
  },
  signup: async (input) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        set({ loading: false, error: json.error?.message ?? "خطا" });
        return { ok: false, error: json.error?.message };
      }
      await useAuth.getState().fetchUser();
      set({ loading: false });
      return { ok: true };
    } catch (e) {
      const msg = (e as Error).message;
      set({ loading: false, error: msg });
      return { ok: false, error: msg };
    }
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },
}));
