import type { Language, Level } from "./curriculum";

export type StudyMinutes = 20 | 45 | 60 | 90;
export type CoachTheme = "system" | "light" | "dark";
export type Skill = "listen" | "read" | "speak" | "write" | "chunks" | "grammar" | "pronunciation" | "exam";
export type Difficulty = "easy" | "okay" | "difficult";
export type CoachPreferences = { goal: string; targetLevel: Level; dailyMinutes: StudyMinutes; currentLevel?: Level };
export type Chunk = { id: string; expression: string; meaning: string; example: string; context: string; language: Language; level: Level; mastery: number; lastReviewed: number | null; dueAt: number; updatedAt: number };
export type LearningSession = { id: string; language: Language; skill: Skill; seconds: number; date: string; completedAt: number; rating?: Difficulty; activityId?: string };
export type CoachState = { version: 1; preferences: Record<Language, CoachPreferences>; chunks: Chunk[]; sessions: LearningSession[]; drafts: Record<string, string>; onboarded: boolean; theme: CoachTheme };
export type PlanActivity = { id: string; skill: Skill; title: string; instruction: string; minutes: number };
export type SaveChunkInput = Pick<Chunk, "expression" | "meaning" | "example" | "context" | "language" | "level">;
export type RecordSessionInput = Pick<LearningSession, "language" | "skill" | "seconds" | "rating" | "activityId">;
export type CoachOperation = { id: string; createdAt: number } & (
  | { kind: "preferences"; language: Language; patch: Partial<CoachPreferences> }
  | { kind: "chunk"; chunk: Chunk }
  | { kind: "review"; chunkId: string; rating: Difficulty }
  | { kind: "session"; session: LearningSession }
  | { kind: "draft"; key: string; value: string }
  | { kind: "onboarded" }
  | { kind: "theme"; theme: CoachTheme }
);
export const COACH_CACHE_KEY = "phrase-coach-v1";
export const COACH_OUTBOX_KEY = "phrase-coach-outbox-v1";
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const SKILLS: readonly Skill[] = ["listen", "read", "speak", "write", "chunks", "grammar", "pronunciation", "exam"];

export function createCoachState(levels: Partial<Record<Language, Level>> = {}): CoachState {
  const preference = (language: Language): CoachPreferences => ({ goal: "near-native", currentLevel: levels[language] ?? "B1", targetLevel: "C2", dailyMinutes: 60 });
  return { version: 1, preferences: { en: preference("en"), de: preference("de") }, chunks: [], sessions: [], drafts: {}, onboarded: false, theme: "system" };
}

/** Preserve Phrase's existing Berlin calendar convention, including DST. */
export function coachDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin" }).format(date);
}

const weeklySkills: readonly (readonly [Skill, Skill, Skill, Skill])[] = [
  ["listen", "read", "speak", "chunks"],
  ["read", "listen", "write", "pronunciation"],
  ["listen", "read", "speak", "grammar"],
  ["read", "listen", "write", "chunks"],
  ["listen", "read", "speak", "pronunciation"],
  ["read", "listen", "write", "exam"],
  ["listen", "read", "speak", "chunks"],
];

const titles: Record<Language, Record<Skill, string>> = {
  en: { listen: "Real English", read: "Reading", speak: "Speak & think", write: "Writing", chunks: "Useful chunks", grammar: "One weak point", pronunciation: "Shadowing", exam: "Exam practice" },
  de: { listen: "Echtes Deutsch", read: "Lesen", speak: "Sprechen & denken", write: "Schreiben", chunks: "Nützliche Wendungen", grammar: "Ein Schwachpunkt", pronunciation: "Shadowing", exam: "Klausurtraining" },
};

function instruction(language: Language, level: Level, skill: Skill, goal: string): string {
  const advanced = level === "C1" || level === "C2";
  const beginner = level === "A1" || level === "A2";
  const en: Record<Skill, string> = {
    listen: beginner ? "Listen for the main idea. Then hear it again." : advanced ? "Listen without subtitles. Notice tone and implied meaning." : "Listen without subtitles. Catch the main idea.",
    read: beginner ? "Read a short text for meaning." : advanced ? "Read for meaning. Collect five precise, useful expressions." : "Read naturally. Collect three useful expressions.",
    speak: beginner ? "Describe your day in simple sentences." : advanced ? "Explain your view. Consider a convincing counterargument." : "Explain something you learned today.",
    write: beginner ? "Write a few sentences about your day." : advanced ? "Write a short argument. Make each sentence earn its place." : "Write a short opinion and support it with an example.",
    chunks: "Recall useful expressions. Say them in your own sentences.",
    grammar: "Revisit a repeated mistake. Try three clear examples.",
    pronunciation: "Listen. Repeat. Match the rhythm and sentence stress.",
    exam: goal.toLowerCase().includes("ielts") ? "Practise one IELTS task. Focus on clarity and structure." : "Practise a summary, analysis or short comment.",
  };
  const de: Record<Skill, string> = {
    listen: beginner ? "Höre auf die Hauptidee. Höre dann noch einmal." : advanced ? "Höre ohne Untertitel. Achte auf Tonfall und Zwischentöne." : "Höre ohne Untertitel. Erfasse die Hauptidee.",
    read: beginner ? "Lies einen kurzen Text und erfasse den Sinn." : advanced ? "Lies für den Inhalt. Sammle fünf präzise Wendungen." : "Lies natürlich. Sammle drei nützliche Wendungen.",
    speak: beginner ? "Beschreibe deinen Tag in einfachen Sätzen." : advanced ? "Begründe deine Position. Berücksichtige ein Gegenargument." : "Erkläre etwas, das du heute gelernt hast.",
    write: beginner ? "Schreibe ein paar Sätze über deinen Tag." : advanced ? "Schreibe eine kurze Argumentation. Formuliere präzise." : "Schreibe deine Meinung mit einem passenden Beispiel.",
    chunks: "Rufe Wendungen ab. Verwende sie in eigenen Sätzen.",
    grammar: "Übe einen wiederkehrenden Fehler mit drei Beispielen.",
    pronunciation: "Hören. Nachsprechen. Rhythmus und Betonung übernehmen.",
    exam: "Übe eine Analyse, Interpretation oder kurze Erörterung.",
  };
  return (language === "en" ? en : de)[skill];
}

/** A deterministic daily plan. Exposure leads; output follows; technique rotates. */
export function makePlan(language: Language, level: Level, minutes: StudyMinutes, date: Date | string = new Date(), goal = "near-native", sessions: LearningSession[] = []): PlanActivity[] {
  const day = typeof date === "string" ? date : coachDate(date);
  const timestamp = Date.parse(`${day}T12:00:00Z`);
  if (!Number.isFinite(timestamp)) throw new Error("Choose a valid learning date.");
  if (![20, 45, 60, 90].includes(minutes)) throw new Error("Choose 20, 45, 60 or 90 minutes.");
  const weekday = (new Date(timestamp).getUTCDay() + 6) % 7;
  const skills = [...weeklySkills[weekday]];
  const totals = Object.fromEntries(SKILLS.map(skill => [skill, 0])) as Record<Skill, number>;
  for (const session of sessions) {
    const age = timestamp - Date.parse(`${session.date}T12:00:00Z`);
    if (session.language === language && age > 0 && age <= 7 * 86400000) totals[session.skill] += session.seconds;
  }
  // Adapt only to substantial gaps; a single short session must not reshuffle a day.
  if (Math.abs(totals.listen - totals.read) > 30 * 60) {
    skills[0] = totals.listen < totals.read ? "listen" : "read";
    skills[1] = skills[0] === "listen" ? "read" : "listen";
  }
  if (Math.abs(totals.speak - totals.write) > 20 * 60) skills[2] = totals.speak < totals.write ? "speak" : "write";
  if (skills[3] === "exam" && !/ielts|school|schule|klausur/i.test(goal)) skills[3] = "grammar";
  const selected = minutes === 20 ? [skills[0], skills[2]] : skills;
  // Round the two exposure blocks together, so the selected budget is always exact.
  const allocations = minutes === 20 ? [15, 5] : (() => {
    const exposure = Math.round(minutes * 7 / 10);
    const output = Math.round(minutes * 2 / 10);
    const first = Math.round(exposure * .58);
    return [first, exposure - first, output, minutes - exposure - output];
  })();
  return selected.map((skill, index) => ({ id: `${language}:${day}:${skill}`, skill, title: titles[language][skill], instruction: instruction(language, level, skill, goal), minutes: allocations[index] }));
}

export function reviewSchedule(chunk: Chunk, rating: Difficulty, now: number): Pick<Chunk, "mastery" | "lastReviewed" | "dueAt" | "updatedAt"> {
  const mastery = rating === "difficult" ? Math.max(0, chunk.mastery - 1) : Math.min(5, chunk.mastery + (rating === "easy" ? 2 : 1));
  const days = rating === "difficult" ? 0 : [0, 1, 3, 7, 14, 30][mastery];
  return { mastery, lastReviewed: now, dueAt: now + (rating === "difficult" ? 10 * 60000 : days * 86400000), updatedAt: now };
}

export function applyCoachOperation(state: CoachState, operation: CoachOperation): CoachState {
  switch (operation.kind) {
    case "preferences": return { ...state, preferences: { ...state.preferences, [operation.language]: { ...state.preferences[operation.language], ...operation.patch } } };
    case "chunk": {
      const previous = state.chunks.find(chunk => chunk.id === operation.chunk.id);
      if (previous && previous.updatedAt > operation.createdAt) return state;
      const chunk = previous ? { ...operation.chunk, mastery: previous.mastery, lastReviewed: previous.lastReviewed, dueAt: previous.dueAt } : operation.chunk;
      return { ...state, chunks: [...state.chunks.filter(item => item.id !== chunk.id), chunk] };
    }
    case "review": return { ...state, chunks: state.chunks.map(chunk => chunk.id === operation.chunkId && chunk.updatedAt < operation.createdAt ? { ...chunk, ...reviewSchedule(chunk, operation.rating, operation.createdAt) } : chunk) };
    case "session": return state.sessions.some(session => session.id === operation.session.id) ? state : { ...state, sessions: [...state.sessions, operation.session] };
    case "draft": return { ...state, drafts: { ...state.drafts, [operation.key]: operation.value } };
    case "onboarded": return { ...state, onboarded: true };
    case "theme": return { ...state, theme: operation.theme };
  }
}

/** Rebase unsent changes onto server state without discarding either language. */
export function rebaseCoachState(server: CoachState, pending: CoachOperation[]): CoachState {
  return pending.reduce(applyCoachOperation, server);
}

function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function language(value: unknown): value is Language { return value === "en" || value === "de"; }
function level(value: unknown): value is Level { return LEVELS.includes(value as typeof LEVELS[number]); }
function finite(value: unknown, max = Number.MAX_SAFE_INTEGER): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max; }
function bounded(value: unknown, max: number, required = false): value is string { return typeof value === "string" && value.length <= max && (!required || value.trim().length > 0); }
function rating(value: unknown): value is Difficulty { return value === "easy" || value === "okay" || value === "difficult"; }
function validPreference(value: unknown, partial = false): boolean {
  if (!object(value) || Object.keys(value).some(key => !["goal", "targetLevel", "dailyMinutes", "currentLevel"].includes(key))) return false;
  return (partial || Object.keys(value).length >= 3) && (!Object.hasOwn(value, "goal") ? partial : bounded(value.goal, 80, true)) && (!Object.hasOwn(value, "targetLevel") ? partial : level(value.targetLevel)) && (!Object.hasOwn(value, "dailyMinutes") ? partial : [20, 45, 60, 90].includes(Number(value.dailyMinutes)) && typeof value.dailyMinutes === "number") && (!Object.hasOwn(value, "currentLevel") || level(value.currentLevel));
}
function validChunk(value: unknown): value is Chunk {
  return object(value) && bounded(value.id, 160, true) && bounded(value.expression, 500, true) && bounded(value.meaning, 2000) && bounded(value.example, 4000) && bounded(value.context, 2000) && language(value.language) && level(value.level) && finite(value.mastery, 5) && (value.lastReviewed === null || finite(value.lastReviewed)) && finite(value.dueAt) && finite(value.updatedAt);
}
function validSession(value: unknown): value is LearningSession {
  return object(value) && bounded(value.id, 160, true) && language(value.language) && SKILLS.includes(value.skill as Skill) && finite(value.seconds, 86400) && bounded(value.date, 10, true) && /^\d{4}-\d{2}-\d{2}$/.test(value.date) && Number.isFinite(Date.parse(`${value.date}T12:00:00Z`)) && finite(value.completedAt) && (value.rating === undefined || rating(value.rating)) && (value.activityId === undefined || bounded(value.activityId, 200, true));
}
export function isCoachState(value: unknown): value is CoachState {
  return object(value) && value.version === 1 && object(value.preferences) && validPreference(value.preferences.en) && validPreference(value.preferences.de) && Array.isArray(value.chunks) && value.chunks.every(validChunk) && Array.isArray(value.sessions) && value.sessions.every(validSession) && object(value.drafts) && Object.entries(value.drafts).every(([key, draft]) => bounded(key, 200, true) && bounded(draft, 40000)) && typeof value.onboarded === "boolean" && ["system", "light", "dark"].includes(String(value.theme));
}
export function isCoachOperation(value: unknown): value is CoachOperation {
  if (!object(value) || !bounded(value.id, 160, true) || !finite(value.createdAt)) return false;
  switch (value.kind) {
    case "preferences": return language(value.language) && validPreference(value.patch, true) && Object.keys(value.patch as object).length > 0;
    case "chunk": return validChunk(value.chunk) && value.chunk.updatedAt === value.createdAt;
    case "review": return bounded(value.chunkId, 160, true) && rating(value.rating);
    case "session": return validSession(value.session) && value.session.completedAt === value.createdAt;
    case "draft": return bounded(value.key, 200, true) && bounded(value.value, 40000) && value.key !== "__proto__" && value.key !== "constructor" && value.key !== "prototype";
    case "onboarded": return true;
    case "theme": return ["system", "light", "dark"].includes(String(value.theme));
    default: return false;
  }
}

export type CoachCache = { state: CoachState; pending: CoachOperation[] };
/** One atomic browser entry prevents a cached edit from losing its matching outbox operation. */
export function readCoachCache(raw: string | null): CoachCache | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (isCoachState(value)) return { state: value, pending: [] };
    if (object(value) && isCoachState(value.state) && Array.isArray(value.pending) && value.pending.every(isCoachOperation)) return { state: value.state, pending: value.pending };
  } catch { /* A corrupt browser cache must not touch server data. */ }
  return null;
}
