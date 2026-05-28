"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Mail } from "lucide-react";
import { supabaseEnabled, getSupabase } from "@/lib/supabase";
import {
  localBackend,
  supabaseBackend,
  migrateLocalToCloud,
} from "@/lib/backends";
import { BackendContext } from "@/lib/backend-context";
import { Spinner } from "./atoms";

export function AuthGate({ children }: { children: React.ReactNode }) {
  if (!supabaseEnabled) {
    return (
      <BackendContext.Provider value={{ backend: localBackend(), mode: "local" }}>
        {children}
      </BackendContext.Provider>
    );
  }
  return <CloudGate>{children}</CloudGate>;
}

function CloudGate({ children }: { children: React.ReactNode }) {
  const sb = getSupabase()!;
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, [sb]);

  const backend = useMemo(
    () => (session ? supabaseBackend(session.user.id) : null),
    [session],
  );

  useEffect(() => {
    if (backend) migrateLocalToCloud(backend).catch(() => {});
  }, [backend]);

  if (session === undefined) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Connecting…" />
      </div>
    );
  }

  if (!session || !backend) return <SignIn />;

  return (
    <BackendContext.Provider
      value={{
        backend,
        mode: "cloud",
        email: session.user.email ?? undefined,
        signOut: () => sb.auth.signOut(),
      }}
    >
      {children}
    </BackendContext.Provider>
  );
}

function SignIn() {
  const sb = getSupabase()!;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo:
          typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm rounded-[38px] glass-strong p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">WhatToWatch</h1>
        <p className="mt-1 text-sm text-white/40">
          {sent ? "Check your inbox" : "Sign in to sync across devices"}
        </p>

        {sent ? (
          <p className="mt-6 text-sm leading-relaxed text-white/70">
            We sent a magic link to{" "}
            <span className="text-white">{email}</span>. Open it on any device to
            land right here.
          </p>
        ) : (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 rounded-full glass px-5 py-3.5">
              <Mail size={17} className="shrink-0 text-white/45" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="you@email.com"
                className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/30"
              />
            </div>
            <button
              type="button"
              onClick={send}
              disabled={busy}
              className="pill floaty w-full bg-white py-3 text-sm font-medium text-black disabled:opacity-60"
              data-active="true"
            >
              {busy ? "Sending…" : "Send magic link"}
            </button>
            {error && <p className="text-xs text-white/50">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
