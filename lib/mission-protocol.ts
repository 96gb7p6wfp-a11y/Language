import type { Language, Level } from "./curriculum";
import type { MissionBrief, MissionDifficulty, MissionFeedback, MissionPreferences, MissionRun, MissionSummary, MissionTurn } from "./missions";

export const MISSION_DAILY_LIMIT = 30;
export const MISSION_SITE_DAILY_LIMIT = 100;
export const TRANSCRIPTION_DAILY_LIMIT = 8;
export const TRANSCRIPTION_SITE_DAILY_LIMIT = 24;
export const MISSION_BURST_LIMIT = 3;
export const MISSION_MAX_AUDIO_BYTES = 2 * 1024 * 1024;
export const MISSION_ANSWER_LIMIT = 1800;
export const MISSION_REQUEST_LOCK_MS = 45000;
const topics = ["entrepreneurship", "technology", "volleyball", "university", "business", "society", "everyday"] as const;
const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];

export class MissionProtocolError extends Error {
  code: string; status: number; retryAfter?: number;
  constructor(code: string, message: string, status = 400, retryAfter?: number) { super(message); this.name = "MissionProtocolError"; this.code = code; this.status = status; this.retryAfter = retryAfter; }
}
export function isRecord(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function isIdentifier(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{7,119}$/.test(value); }
export function isMissionLanguage(value: unknown): value is Language { return value === "en" || value === "de"; }
export function isMissionLevel(value: unknown): value is Level { return typeof value === "string" && levels.includes(value); }
export function emptyMissionPreferences(): MissionPreferences { return { likedTopics: [], dislikedTopics: [], rejectedTemplateIds: [] }; }
export function validateMissionPreferences(value: unknown): MissionPreferences {
  if (!isRecord(value) || Object.keys(value).some(key => !["likedTopics", "dislikedTopics", "rejectedTemplateIds"].includes(key))) throw new MissionProtocolError("invalid_preferences", "Choose valid challenge topics.");
  for (const key of ["likedTopics", "dislikedTopics"] as const) if (!Array.isArray(value[key]) || (value[key] as unknown[]).length > 7 || !(value[key] as unknown[]).every(topic => topics.includes(topic as typeof topics[number]))) throw new MissionProtocolError("invalid_preferences", "Choose valid challenge topics.");
  if (!Array.isArray(value.rejectedTemplateIds) || value.rejectedTemplateIds.length > 50 || !value.rejectedTemplateIds.every(id => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id))) throw new MissionProtocolError("invalid_preferences", "Choose valid challenge topics.");
  const likedTopics = [...new Set(value.likedTopics as MissionPreferences["likedTopics"])] as MissionPreferences["likedTopics"];
  const dislikedTopics = [...new Set(value.dislikedTopics as MissionPreferences["dislikedTopics"])] as MissionPreferences["dislikedTopics"];
  if (likedTopics.some(topic => dislikedTopics.includes(topic))) throw new MissionProtocolError("invalid_preferences", "A topic cannot be both liked and disliked.");
  return { likedTopics, dislikedTopics, rejectedTemplateIds: [...new Set(value.rejectedTemplateIds)] as string[] };
}
export type MissionAction =
 | { action: "start"; id: string; templateId: string; language: Language; level: Level }
 | { action: "respond"; runId: string; requestId: string; answer: string; inputMode: "text" | "voice"; expectedUpdatedAt?: number }
 | { action: "continue" | "finish"; runId: string; requestId: string; expectedUpdatedAt?: number }
 | { action: "preferences"; language: Language; preferences: MissionPreferences };
export function validateMissionAction(value: unknown): MissionAction {
  if (!isRecord(value)) throw new MissionProtocolError("invalid_request", "Choose a valid challenge action.");
  const keys: Record<string, string[]> = { start: ["action", "id", "templateId", "language", "level"], respond: ["action", "runId", "requestId", "answer", "inputMode", "expectedUpdatedAt"], continue: ["action", "runId", "requestId", "expectedUpdatedAt"], finish: ["action", "runId", "requestId", "expectedUpdatedAt"], preferences: ["action", "language", "preferences"] };
  const allowed = keys[String(value.action)];
  if (!allowed || Object.keys(value).some(key => !allowed.includes(key))) throw new MissionProtocolError("invalid_request", "Choose a valid challenge action.");
  if (value.action === "preferences") { if (!isMissionLanguage(value.language)) throw new MissionProtocolError("invalid_language", "Choose English or German."); return { action: "preferences", language: value.language, preferences: validateMissionPreferences(value.preferences) }; }
  if (value.action === "start") {
    if (!isIdentifier(value.id) || typeof value.templateId !== "string" || !/^[a-z0-9-]{1,80}$/.test(value.templateId) || !isMissionLanguage(value.language) || !isMissionLevel(value.level)) throw new MissionProtocolError("invalid_request", "Choose a valid challenge, language and level.");
    return { action: "start", id: value.id, templateId: value.templateId, language: value.language, level: value.level };
  }
  if (!isIdentifier(value.runId) || !isIdentifier(value.requestId)) throw new MissionProtocolError("invalid_request", "Choose a saved challenge and a valid request ID.");
  if (value.expectedUpdatedAt !== undefined && (typeof value.expectedUpdatedAt !== "number" || !Number.isSafeInteger(value.expectedUpdatedAt) || value.expectedUpdatedAt < 0)) throw new MissionProtocolError("invalid_request", "Reload the saved challenge before trying again.");
  const expected = value.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: value.expectedUpdatedAt as number };
  if (value.action === "respond") {
    if (typeof value.answer !== "string" || !value.answer.trim() || value.answer.length > MISSION_ANSWER_LIMIT || !["text", "voice"].includes(String(value.inputMode))) throw new MissionProtocolError("invalid_answer", `Write or transcribe an answer of up to ${MISSION_ANSWER_LIMIT} characters.`);
    return { action: "respond", runId: value.runId, requestId: value.requestId, answer: value.answer.trim(), inputMode: value.inputMode as "text" | "voice", ...expected };
  }
  return { action: value.action as "continue" | "finish", runId: value.runId, requestId: value.requestId, ...expected };
}
export function createMissionRun(id: string, brief: MissionBrief, language: Language, now: number): MissionRun {
  return { id, templateId: brief.id, language, level: brief.level, difficulty: brief.difficulty, status: "active", phase: "challenge", round: 1, currentChallenge: brief.opening, opening: brief.opening, turns: [], createdAt: now, updatedAt: now };
}
export function expectedMissionAttempt(run: MissionRun): 1 | 2 {
  if (run.status !== "active") throw new MissionProtocolError("mission_complete", "This challenge is already complete.", 409);
  if (run.phase === "challenge") return 1;
  if (run.phase === "feedback") return 2;
  throw new MissionProtocolError("invalid_progression", "Continue to the next challenge before sending another answer.", 409);
}
export function appendMissionFeedback(run: MissionRun, input: { id: string; answer: string; inputMode: "text" | "voice"; characterReply: string; feedback: MissionFeedback }, now: number): MissionRun {
  const attempt = expectedMissionAttempt(run);
  if (run.turns.some(turn => turn.id === input.id)) return run;
  const turn: MissionTurn = { id: input.id, round: run.round, attempt, answer: input.answer, inputMode: input.inputMode, characterReply: input.characterReply, feedback: input.feedback, challenge: run.currentChallenge, createdAt: now };
  // Adapt challenge complexity only, never the learner's saved CEFR level.
  const difficulty = Math.min(3, Math.max(1, run.difficulty + (input.feedback.adaptation === "harder" ? 1 : input.feedback.adaptation === "scaffold" ? -1 : 0))) as MissionDifficulty;
  return { ...run, turns: [...run.turns, turn], difficulty, phase: attempt === 1 ? "feedback" : "retry", updatedAt: Math.max(now,run.updatedAt+1), outcome: input.feedback.outcome };
}
export function summarizeMission(run: MissionRun): MissionSummary {
  const latest = run.turns.at(-1)?.feedback;
  const didWell = [...new Set(run.turns.flatMap(turn => turn.feedback.strengths))].slice(-3);
  const weaknesses = [...new Set((latest?.improvements ?? []).map(improvement => improvement.why))].slice(0, 3);
  const betterExpressions = (latest?.phrases ?? []).slice(0, 2);
  const retryImprovements: string[] = [];
  for (const retry of run.turns.filter(turn => turn.attempt === 2)) {
    const original = run.turns.find(turn => turn.round === retry.round && turn.attempt === 1);
    if (!original) continue;
    for (const improvement of original.feedback.improvements) {
      if (retry.answer.toLocaleLowerCase().includes(improvement.improved.toLocaleLowerCase()) && !original.answer.toLocaleLowerCase().includes(improvement.improved.toLocaleLowerCase())) retryImprovements.push(`“${improvement.original}” → “${improvement.improved}”`);
    }
  }
  return { didWell, weaknesses, betterExpressions, retryImprovements: [...new Set(retryImprovements)].slice(0, 3) };
}
export function finishMission(run: MissionRun, now: number): MissionRun {
  if (run.status === "complete") return run;
  if (run.phase !== "retry" || !run.turns.some(turn => turn.round === run.round && turn.attempt === 2)) throw new MissionProtocolError("retry_required", "Retry your answer before finishing the challenge.", 409);
  const originalOutcome = run.turns.at(-1)!.feedback.outcome;
  const outcome = originalOutcome.state === "in_progress" ? { ...originalOutcome, state: "partial" as const } : originalOutcome;
  return { ...run, status: "complete", phase: "summary", completedAt: Math.max(now,run.updatedAt+1), updatedAt: Math.max(now,run.updatedAt+1), outcome, summary: summarizeMission(run) };
}
export function continueMission(run: MissionRun, now: number): MissionRun {
  if (run.status !== "active" || run.phase !== "retry") throw new MissionProtocolError("retry_required", "Retry your answer before continuing.", 409);
  if (run.round >= 3) return finishMission(run, now);
  const challenge = run.turns.at(-1)?.feedback.nextChallenge;
  if (!challenge?.trim()) throw new MissionProtocolError("missing_challenge", "The next challenge could not be read. Keep your saved answer and try again.", 502);
  return { ...run, round: run.round + 1, phase: "challenge", currentChallenge: challenge, updatedAt: Math.max(now,run.updatedAt+1) };
}
export function missionUsageDay(now = Date.now()): string { return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(now)); }
