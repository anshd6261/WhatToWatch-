"use client";

import { createContext, useContext } from "react";
import { type Backend, localBackend } from "./backends";

export type BackendInfo = {
  backend: Backend;
  mode: "local" | "cloud";
  email?: string;
  signOut?: () => void;
};

export const BackendContext = createContext<BackendInfo | null>(null);

let fallback: BackendInfo | null = null;

export function useBackend(): BackendInfo {
  const ctx = useContext(BackendContext);
  if (ctx) return ctx;
  if (!fallback) fallback = { backend: localBackend(), mode: "local" };
  return fallback;
}
