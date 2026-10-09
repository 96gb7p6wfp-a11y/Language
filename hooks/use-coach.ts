"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/curriculum";
import { applyCoachOperation, coachDate, COACH_CACHE_KEY, COACH_OUTBOX_KEY, createCoachState, isCoachOperation, isCoachState, readCoachCache, rebaseCoachState } from "@/lib/coach";
import type { CoachOperation, CoachPreferences, CoachState, CoachTheme, Difficulty, RecordSessionInput, SaveChunkInput } from "@/lib/coach";

export type CoachSyncStatus = "loading" | "syncing" | "saved" | "offline" | "local";
type SyncResponse = { state: CoachState; acknowledged?: string[] };
type OperationInput = CoachOperation extends infer O ? O extends CoachOperation ? Omit<O, "id" | "createdAt"> : never : never;
function identifier() { return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }

export function useCoach() {
  const [state, setState] = useState<CoachState>(createCoachState);
  const [ready, setReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CoachSyncStatus>("loading");
  const [error, setError] = useState("");
  const current = useRef(state);
  const pending = useRef<CoachOperation[]>([]);
  const mounted = useRef(false);
  const syncing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTimestamp = useRef(0);
  const runSync = useRef<() => Promise<void>>(async () => {});

  const cache = useCallback((next: CoachState) => {
    current.current = next;
    if (mounted.current) setState(next);
    try { localStorage.setItem(COACH_CACHE_KEY, JSON.stringify({ state: next, pending: pending.current })); return true; }
    catch { if (mounted.current) setError("Browser storage is full. Keep this page open until your changes sync."); return false; }
  }, []);

  const synchronize = useCallback(async () => {
    if (!mounted.current || syncing.current) return;
    if (!navigator.onLine) { setSyncStatus("offline"); return; }
    syncing.current = true;
    setSyncStatus("syncing");
    try {
      const request = async (operations?: CoachOperation[]): Promise<SyncResponse> => {
        const response = await fetch("/api/coach", { method: operations ? "POST" : "GET", cache: "no-store", headers: operations ? { "Content-Type": "application/json" } : undefined, body: operations ? JSON.stringify({ operations }) : undefined, signal: AbortSignal.timeout(20000) });
        if (!response.ok) throw new Error("Your changes are saved on this device. Sync is unavailable; try again.");
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !isCoachState((result as SyncResponse).state)) throw new Error("Your changes are saved on this device. The sync response could not be read.");
        const value = result as SyncResponse;
        if (operations && (!Array.isArray(value.acknowledged) || value.acknowledged.some(id => typeof id !== "string"))) throw new Error("Sync could not confirm your changes. They remain saved on this device.");
        return value;
      };
      const server = await request();
      if (!mounted.current) return;
      cache(rebaseCoachState(server.state, pending.current));
      // Mutations are individual operations. An empty local cache never replaces server data.
      while (mounted.current && pending.current.length) {
        const batch = pending.current.slice(0, 100);
        const response = await request(batch);
        if (!mounted.current) return;
        const acknowledged = new Set(response.acknowledged);
        if (batch.some(operation => !acknowledged.has(operation.id))) throw new Error("Some changes could not sync. They remain saved on this device.");
        pending.current = pending.current.filter(operation => !acknowledged.has(operation.id));
        cache(rebaseCoachState(response.state, pending.current));
      }
      if (mounted.current) { setSyncStatus("saved"); setError(""); }
    } catch (cause) {
      if (mounted.current) { setSyncStatus(navigator.onLine ? "local" : "offline"); setError(cause instanceof Error ? cause.message : "Your changes are saved on this device. Try syncing again."); }
    } finally { syncing.current = false; }
  }, [cache]);
  useEffect(() => { runSync.current = synchronize; }, [synchronize]);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void runSync.current(); }, 700);
  }, []);

  useEffect(() => {
    mounted.current = true;
    try {
      const saved = readCoachCache(localStorage.getItem(COACH_CACHE_KEY));
      if (saved) { pending.current = saved.pending; current.current = saved.state; }
      // Recognise an earlier separate outbox, without modifying Phrase's language or gloss preferences.
      const previous: unknown = JSON.parse(localStorage.getItem(COACH_OUTBOX_KEY) ?? "[]");
      if (Array.isArray(previous)) {
        for (const operation of previous) if (isCoachOperation(operation) && !pending.current.some(item => item.id === operation.id)) { pending.current.push(operation); current.current = applyCoachOperation(current.current, operation); }
      }
      lastTimestamp.current = Math.max(0, ...pending.current.map(operation => operation.createdAt));
      if (cache(current.current)) localStorage.removeItem(COACH_OUTBOX_KEY);
    } catch { /* Network sync still restores server data if the browser denies storage. */ }
    setState(current.current);
    setReady(true);
    void runSync.current();
    const online = () => { void runSync.current(); };
    const visible = () => { if (document.visibilityState === "visible") void runSync.current(); };
    const leaving = () => {
      if (!pending.current.length) return;
      // Best effort only. The durable outbox remains until a response confirms the IDs.
      void fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operations: pending.current.slice(0, 100) }), keepalive: true }).catch(() => {});
    };
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pagehide", leaving);
    return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); window.removeEventListener("online", online); document.removeEventListener("visibilitychange", visible); window.removeEventListener("pagehide", leaving); };
  }, [cache]);

  const enqueue = useCallback((input: OperationInput) => {
    const createdAt = Math.max(Date.now(), lastTimestamp.current + 1);
    lastTimestamp.current = createdAt;
    const operation = { ...input, id: identifier(), createdAt } as CoachOperation;
    if (operation.kind === "chunk") operation.chunk = { ...operation.chunk, updatedAt: createdAt };
    if (operation.kind === "session") operation.session = { ...operation.session, completedAt: createdAt };
    if (!isCoachOperation(operation)) throw new Error("This learning change is invalid.");
    // Coalesce unsent drafts. The newest timestamp wins if an older in-flight request arrives later.
    if (operation.kind === "draft") pending.current = pending.current.filter(item => item.kind !== "draft" || item.key !== operation.key);
    pending.current.push(operation);
    cache(applyCoachOperation(current.current, operation));
    setSyncStatus(navigator.onLine ? "syncing" : "offline");
    schedule();
    return operation;
  }, [cache, schedule]);

  const updatePreferences = useCallback((language: Language, patch: Partial<CoachPreferences>) => { enqueue({ kind: "preferences", language, patch }); }, [enqueue]);
  const saveChunk = useCallback((input: SaveChunkInput) => {
    const expression = input.expression.trim();
    const existing = current.current.chunks.find(chunk => chunk.language === input.language && chunk.expression.normalize("NFKC").toLocaleLowerCase().trim() === expression.normalize("NFKC").toLocaleLowerCase());
    const now = Date.now();
    const chunk = { ...input, expression, meaning: input.meaning || existing?.meaning || "", example: input.example || existing?.example || "", context: input.context || existing?.context || "", id: existing?.id ?? identifier(), mastery: existing?.mastery ?? 0, lastReviewed: existing?.lastReviewed ?? null, dueAt: existing?.dueAt ?? now, updatedAt: now };
    enqueue({ kind: "chunk", chunk });
    return chunk.id;
  }, [enqueue]);
  const reviewChunk = useCallback((chunkId: string, rating: Difficulty) => { if (current.current.chunks.some(chunk => chunk.id === chunkId)) enqueue({ kind: "review", chunkId, rating }); }, [enqueue]);
  const recordSession = useCallback((input: RecordSessionInput) => { const now = Date.now(); const session = { ...input, seconds: Math.max(0, Math.min(86400, Math.round(input.seconds))), id: identifier(), date: coachDate(new Date(now)), completedAt: now }; enqueue({ kind: "session", session }); return session.id; }, [enqueue]);
  const setDraft = useCallback((key: string, value: string) => { if (current.current.drafts[key] !== value) enqueue({ kind: "draft", key, value }); }, [enqueue]);
  const finishOnboarding = useCallback(() => { enqueue({ kind: "onboarded" }); }, [enqueue]);
  const setTheme = useCallback((theme: CoachTheme) => { enqueue({ kind: "theme", theme }); }, [enqueue]);
  const retry = useCallback(() => { void synchronize(); }, [synchronize]);

  return { state, ready, syncStatus, error, updatePreferences, saveChunk, reviewChunk, recordSession, setDraft, finishOnboarding, setTheme, retry };
}
