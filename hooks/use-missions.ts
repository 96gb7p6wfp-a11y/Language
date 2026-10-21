"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, Level } from "@/lib/curriculum";
import type { MissionPreferences, MissionRun, MissionInputMode } from "@/lib/missions";

export type MissionService = {
  configured: boolean;
  model: string;
  remainingToday: number;
  dailyLimit: number;
  transcriptionRemainingToday?: number;
  transcriptionDailyLimit?: number;
};
type Preferences = Record<Language, MissionPreferences>;
type MissionResponse = { runs?: MissionRun[]; run?: MissionRun; preferences?: Preferences; service?: MissionService };
type PendingRequest = { id: string; createdAt: number };
const CACHE_KEY = "phrase-missions-v1";
const REQUEST_KEY = "phrase-mission-requests-v1";
const initialService: MissionService = { configured: false, model: "gpt-4.1-mini", remainingToday: 0, dailyLimit: 30 };
const freshPreferences = (): Preferences => ({ en: { likedTopics: [], dislikedTopics: [], rejectedTemplateIds: [] }, de: { likedTopics: [], dislikedTopics: [], rejectedTemplateIds: [] } });

function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function stringList(value: unknown): value is string[] { return Array.isArray(value) && value.every(item => typeof item === "string"); }
function validPhrase(value: unknown) { return object(value) && typeof value.expression === "string" && typeof value.meaning === "string" && typeof value.example === "string"; }
function validSummary(value: unknown) { return object(value) && stringList(value.didWell) && stringList(value.weaknesses) && stringList(value.retryImprovements) && Array.isArray(value.betterExpressions) && value.betterExpressions.every(validPhrase); }
export function validMissionRun(value: unknown): value is MissionRun {
  if (!object(value) || typeof value.id !== "string" || typeof value.templateId !== "string" || !["en", "de"].includes(String(value.language)) || !["A1", "A2", "B1", "B2", "C1", "C2"].includes(String(value.level)) || typeof value.difficulty !== "number" || ![1, 2, 3].includes(value.difficulty) || !["active", "complete"].includes(String(value.status)) || !["challenge", "feedback", "retry", "summary"].includes(String(value.phase)) || typeof value.round !== "number" || ![1, 2, 3].includes(value.round) || typeof value.currentChallenge !== "string" || typeof value.opening !== "string" || typeof value.createdAt !== "number" || !Number.isFinite(value.createdAt) || typeof value.updatedAt !== "number" || !Number.isFinite(value.updatedAt) || !Array.isArray(value.turns) || value.turns.length > 6 || (value.summary !== undefined && !validSummary(value.summary))) return false;
  return value.turns.every(turn => {
    if (!object(turn) || typeof turn.id !== "string" || typeof turn.answer !== "string" || typeof turn.characterReply !== "string" || typeof turn.attempt !== "number" || ![1, 2].includes(turn.attempt) || typeof turn.round !== "number" || ![1, 2, 3].includes(turn.round) || !["text", "voice"].includes(String(turn.inputMode)) || !object(turn.feedback)) return false;
    const feedback = turn.feedback;
    return stringList(feedback.strengths) && Array.isArray(feedback.improvements) && feedback.improvements.every(item => object(item) && ["grammar", "naturalness", "precision", "clarity", "register", "reasoning"].includes(String(item.dimension)) && typeof item.original === "string" && typeof item.improved === "string" && typeof item.why === "string") && Array.isArray(feedback.phrases) && feedback.phrases.every(validPhrase) && typeof feedback.retryPrompt === "string" && typeof feedback.nextChallenge === "string" && ["harder", "same", "scaffold"].includes(String(feedback.adaptation)) && object(feedback.outcome) && ["in_progress", "success", "partial", "not_yet"].includes(String(feedback.outcome.state)) && typeof feedback.outcome.label === "string" && typeof feedback.outcome.evidence === "string" && (feedback.summary === undefined || validSummary(feedback.summary));
  });
}
/** Unknown delivery and in-flight requests retain their IDs; known failures may be manually retried. */
export function keepMissionRequestId(code: string): boolean { return ["connection_error", "request_pending", "mission_unavailable"].includes(code); }
export function mergeMissionRuns(previous: MissionRun[], incoming: MissionRun[]): MissionRun[] {
  const byId = new Map(previous.map(run => [run.id, run]));
  for (const run of incoming) { const saved = byId.get(run.id); if (!saved || saved.updatedAt <= run.updatedAt) byId.set(run.id, run); }
  return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
export function missionRequestFingerprint(payload: Record<string, unknown>): string {
  const normalized = JSON.stringify(Object.keys(payload).sort().map(key => [key, payload[key]]));
  // Keep user answers out of the request ledger. The full draft is stored separately.
  let left = 2166136261; let right = 5381;
  for (const character of normalized) { left = Math.imul(left ^ character.charCodeAt(0), 16777619); right = Math.imul(right, 33) ^ character.charCodeAt(0); }
  return `${payload.action}:${payload.runId ?? payload.templateId ?? payload.language ?? ""}:${normalized.length}:${left >>> 0}:${right >>> 0}`;
}
function uuid() { return crypto.randomUUID(); }

export function useMissions() {
  const [runs, setRuns] = useState<MissionRun[]>([]);
  const [preferences, setPreferences] = useState<Preferences>(freshPreferences);
  const [service, setService] = useState<MissionService>(initialService);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [signinPath, setSigninPath] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const mounted = useRef(false);
  const currentRuns = useRef<MissionRun[]>([]);
  const currentPreferences = useRef<Preferences>(freshPreferences());
  const pending = useRef<Record<string, PendingRequest>>({});
  const controllers = useRef(new Set<AbortController>());
  const mutating = useRef(false);
  const revision = useRef(0);
  const lastFailure = useRef("");

  const saveCache = useCallback(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ version: 1, runs: currentRuns.current, preferences: currentPreferences.current })); }
    catch { /* A failed local cache never discards the authoritative server data. */ }
  }, []);
  const savePending = useCallback(() => {
    try { localStorage.setItem(REQUEST_KEY, JSON.stringify(pending.current)); } catch { /* IDs remain stable for this open session. */ }
  }, []);
  const accept = useCallback((data: MissionResponse, replace = false, preserveError = false) => {
    if (!mounted.current) return;
    if (data.runs) {
      const incoming = data.runs.filter(validMissionRun);
      // A GET is authoritative; only retain newer in-flight results for an included run.
      currentRuns.current = replace ? mergeMissionRuns(currentRuns.current.filter(run => incoming.some(item => item.id === run.id)), incoming) : mergeMissionRuns(currentRuns.current, incoming);
      setRuns(currentRuns.current);
    }
    if (data.run && validMissionRun(data.run)) { currentRuns.current = mergeMissionRuns(currentRuns.current, [data.run]); setRuns(currentRuns.current); }
    if (data.preferences?.en && data.preferences?.de) { currentPreferences.current = data.preferences; setPreferences(data.preferences); }
    if (data.service) setService(data.service);
    if (!preserveError) { setError(""); setErrorCode(""); setSigninPath(null); setRetryAfter(null); } saveCache();
  }, [saveCache]);

  const request = useCallback(async (payload?: Record<string, unknown>): Promise<MissionResponse | null> => {
    const controller = new AbortController(); controllers.current.add(controller);
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch("/api/missions", { cache: "no-store", method: payload ? "POST" : "GET", ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}), signal: controller.signal });
      const data = await response.json() as MissionResponse & { error?: string; code?: string; signinPath?: string; retryAfter?: number };
      if (!response.ok) {
        lastFailure.current = data.code ?? "request_failed";
        if (mounted.current) { setError(data.error ?? "The challenge could not connect. Your answer is kept here."); setErrorCode(data.code ?? "request_failed"); setSigninPath(data.signinPath?.startsWith("/signin-with-chatgpt") ? data.signinPath : null); setRetryAfter(typeof data.retryAfter === "number" ? data.retryAfter : null); }
        return null;
      }
      lastFailure.current = "";
      return data;
    } catch (cause) {
      lastFailure.current = "connection_error";
      if (mounted.current) { setError(cause instanceof DOMException && cause.name === "AbortError" ? "The reply took too long. Your answer is saved; try again." : "Connection lost. Your answer is saved; try again when you’re online."); setErrorCode("connection_error"); }
      return null;
    } finally { clearTimeout(timeout); controllers.current.delete(controller); }
  }, []);

  const refresh = useCallback(async (preserveError = false) => {
    const atRevision = revision.current;
    const data = await request();
    if (data && mounted.current && atRevision === revision.current) accept(data, true, preserveError);
    if (mounted.current) setReady(true);
  }, [request, accept]);

  useEffect(() => {
    mounted.current = true;
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as { version?: number; runs?: unknown[]; preferences?: Preferences } | null;
      if (cached?.version === 1 && Array.isArray(cached.runs)) { currentRuns.current = cached.runs.filter(validMissionRun); setRuns(currentRuns.current); if (cached.preferences?.en && cached.preferences?.de) { currentPreferences.current = cached.preferences; setPreferences(cached.preferences); } }
      const ledger = JSON.parse(localStorage.getItem(REQUEST_KEY) ?? "{}");
      if (object(ledger)) for (const [key, value] of Object.entries(ledger)) if (object(value) && typeof value.id === "string" && typeof value.createdAt === "number" && Date.now() - value.createdAt < 86400000) pending.current[key] = { id: value.id, createdAt: value.createdAt };
    } catch { /* Invalid device cache is ignored; GET restores server history. */ }
    void refresh();
    const online = () => { if (!mutating.current) void refresh(); };
    window.addEventListener("online", online);
    return () => { mounted.current = false; controllers.current.forEach(controller => controller.abort()); controllers.current.clear(); window.removeEventListener("online", online); };
  }, [refresh]);

  const mutate = useCallback(async (payload: Record<string, unknown>): Promise<MissionResponse | null> => {
    if (mutating.current || !mounted.current) return null;
    mutating.current = true; setLoading(true); setError(""); setErrorCode(""); revision.current += 1;
    const fingerprint = missionRequestFingerprint(payload);
    const entry = pending.current[fingerprint] ?? { id: uuid(), createdAt: Date.now() };
    pending.current[fingerprint] = entry;
    const keys = Object.keys(pending.current); if (keys.length > 40) for (const key of keys.slice(0, keys.length - 40)) delete pending.current[key];
    savePending();
    const body = payload.action === "preferences" ? payload : payload.action === "start" ? { ...payload, id: entry.id } : { ...payload, requestId: entry.id };
    try {
      const data = await request(body);
      if (data && mounted.current) { delete pending.current[fingerprint]; savePending(); accept(data); }
      else if (!data && !keepMissionRequestId(lastFailure.current)) { delete pending.current[fingerprint]; savePending(); }
      return data;
    } finally { mutating.current = false; if (mounted.current) setLoading(false); }
  }, [request, accept, savePending]);

  const start = useCallback(async (templateId: string, language: Language, level: Level) => (await mutate({ action: "start", templateId, language, level }))?.run ?? null, [mutate]);
  const respond = useCallback(async (runId: string, answer: string, inputMode: MissionInputMode = "text") => {
    const expectedUpdatedAt = currentRuns.current.find(run => run.id === runId)?.updatedAt;
    const data = await mutate({ action: "respond", runId, answer, inputMode, ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}) });
    if (!data && ["state_changed", "connection_error"].includes(lastFailure.current)) void refresh(true);
    return data?.run ?? null;
  }, [mutate, refresh]);
  const advance = useCallback(async (runId: string) => { const expectedUpdatedAt = currentRuns.current.find(run => run.id === runId)?.updatedAt; const data = await mutate({ action: "continue", runId, ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}) }); if (!data && ["state_changed", "connection_error"].includes(lastFailure.current)) void refresh(true); return data?.run ?? null; }, [mutate, refresh]);
  const finish = useCallback(async (runId: string) => { const expectedUpdatedAt = currentRuns.current.find(run => run.id === runId)?.updatedAt; const data = await mutate({ action: "finish", runId, ...(expectedUpdatedAt !== undefined ? { expectedUpdatedAt } : {}) }); if (!data && ["state_changed", "connection_error"].includes(lastFailure.current)) void refresh(true); return data?.run ?? null; }, [mutate, refresh]);
  const updatePreferences = useCallback(async (language: Language, value: MissionPreferences) => {
    const data = await mutate({ action: "preferences", language, preferences: value });
    return !!data;
  }, [mutate]);
  return { runs, preferences, service, ready, loading, error, errorCode, signinPath, retryAfter, refresh, start, respond, advance, finish, updatePreferences };
}
