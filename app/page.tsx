"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowUpRight, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock3, Headphones, Layers, MessageCircle, Mic, PenLine, Settings2, Sparkles, Sun, Target, GraduationCap, ChartNoAxesCombined, CalendarDays, Volume2, Plus, X } from "lucide-react";
import { exercises, type Language, type Level, type Category } from "@/lib/curriculum";
import { emptyProgress, localDate, type ProgressState } from "@/lib/progress";
import { makePlan, type PlanActivity, type Skill } from "@/lib/coach";
import { useCoach } from "@/hooks/use-coach";
import { getInput } from "@/lib/fluency-content";
import FluencySession from "@/app/components/fluency-session";
import ExercisePractice from "@/app/components/exercise-practice";
import ChunksWorkspace from "@/app/components/chunks-workspace";
import GrammarWorkspace from "@/app/components/grammar-workspace";
import ExamWorkspace from "@/app/components/exam-workspace";

const levels: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const times = [20, 45, 60, 90] as const;
const goals = [{ value: "natural", label: "Speak naturally" }, { value: "near-native", label: "Near-native" }, { value: "school", label: "School" }, { value: "ielts", label: "IELTS" }, { value: "work", label: "Work / university" }];
const skillIcons = { listen: Headphones, read: BookOpen, speak: MessageCircle, write: PenLine, chunks: Layers, grammar: Sparkles, pronunciation: Mic, exam: GraduationCap };
const shortInstructions: Record<Language, Record<Skill, string>> = {
  en: {listen:"Listen without subtitles.", read:"Read naturally. Collect useful expressions.", speak:"Give your view. Add an example.", write:"Write a short argument.", chunks:"Recall useful expressions.", grammar:"Work on one repeated mistake.", pronunciation:"Listen. Repeat. Match the rhythm.", exam:"Practise one task."},
  de: {listen:"Höre ohne Untertitel.", read:"Lies und sammle Wendungen.", speak:"Erkläre deine Meinung.", write:"Schreibe eine kurze Position.", chunks:"Rufe Wendungen ab.", grammar:"Übe einen Fehler.", pronunciation:"Hören. Nachsprechen. Rhythmus.", exam:"Übe eine Aufgabe."}
};
const skillNames: Record<string, string> = { listen: "Listening", read: "Reading", speak: "Speaking", write: "Writing", chunks: "Chunks", grammar: "Grammar", pronunciation: "Pronunciation", exam: "Exam Mode" };
const practiceItems = [{ skill: "speak", label: "Speak" }, { skill: "listen", label: "Listen" }, { skill: "read", label: "Read" }, { skill: "write", label: "Write" }, { skill: "chunks", label: "Chunks" }, { skill: "grammar", label: "Grammar" }, { skill: "pronunciation", label: "Pronunciation" }, { skill: "exam", label: "Exam Mode" }] as const;
type View = "today" | "practice" | "progress" | "settings";
type Active = { skill: Skill; minutes: number; activityId?: string; mode?: Category | "mixed" | "review"; rules?: string[] };

export default function Home() {
  const coach = useCoach();
  const { state, ready } = coach;
  const [language, setLanguage] = useState<Language>("en");
  const [view, setView] = useState<View>("today");
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [legacyError, setLegacyError] = useState("");
  const [active, setActive] = useState<Active | null>(null);
  const [glosses, setGlosses] = useState(false);
  const [notice, setNotice] = useState("");
  const [setup, setSetup] = useState(false);
  const [setupLanguages, setSetupLanguages] = useState<"en" | "de" | "both">("both");
  const [examVisited, setExamVisited] = useState(false);
  const [examTrack, setExamTrack] = useState<"ielts" | "school">("ielts");
  const [install, setInstall] = useState(false);
  const [date, setDate] = useState(localDate());
  const pref = state.preferences[language];
  const level = pref.currentLevel ?? progress.settings[language];
  const plan = makePlan(language, level, pref.dailyMinutes, date, pref.goal, state.sessions);
  const languageSessions = state.sessions.filter(s => s.language === language);
  const chunks = state.chunks.filter(c => c.language === language);
  const completeIds = new Set(languageSessions.filter(s => s.date === date && s.activityId).map(s => s.activityId));
  const completeCount = plan.filter(a => completeIds.has(a.id)).length;
  const nextActivity = plan.find(a => !completeIds.has(a.id));
  const input = getInput(language, level, Math.floor(new Date(date + "T12:00:00Z").getTime() / 86400000));
  const featured = input.expressions[0];
  const navRef = useRef<HTMLElement>(null);
  const screenRef = useRef<HTMLElement>(null);

  const refreshProgress = useCallback(async () => {
    try {
      const r = await fetch("/api/progress", { cache: "no-store" });
      const data = await r.json() as ProgressState & {error?: string};
      if (!r.ok) throw new Error(data.error ?? "Previous exercise progress could not load.");
      setProgress(data); setLegacyError("");
    } catch (e) { setLegacyError((e as Error).message); }
  }, []);
  useEffect(() => {
    void refreshProgress();
    try { if (localStorage.getItem("phrase-language") === "de") setLanguage("de"); setGlosses(localStorage.getItem("phrase-glosses") === "true"); } catch {}
    const update = () => setDate(localDate());
    const id = window.setInterval(update, 60000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", update); };
  }, [refreshProgress]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 4000); return () => clearTimeout(id); }, [notice]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); screenRef.current?.focus({ preventScroll: true }); }, [view, active?.skill, language, setup]);

  function switchLanguage(l: Language) {
    window.speechSynthesis?.cancel(); setLanguage(l); setActive(null); setSetup(false); setNotice("");
    try { localStorage.setItem("phrase-language", l); } catch {}
  }
  function go(v: View) { setActive(null); setSetup(false); setView(v); window.speechSynthesis?.cancel(); }
  function start(skill: Skill, activity?: PlanActivity) {
    if (skill === "exam") setExamVisited(true);
    setActive({ skill, minutes: activity?.minutes ?? (skill === "speak" ? 5 : 10), activityId: activity?.id });
  }
  function finish(seconds: number, rating?: "easy" | "okay" | "difficult") {
    if (!active) return;
    coach.recordSession({ language, skill: active.skill, seconds: Math.max(1, Math.round(seconds)), ...(rating ? { rating } : {}), ...(active.activityId ? { activityId: active.activityId } : {}) });
    setNotice("Practice saved. A little more fluent."); setActive(null); if (active.activityId) setView("today");
  }
  function startQuiz(mode: Category | "mixed" | "review", rules?: string[]) {
    setActive({ skill: mode === "exam" ? "exam" : "grammar", minutes: 10, mode, rules });
  }
  const actions = useRef({ language, progress, active, startQuiz, switchLanguage });
  actions.current = { language, progress, active, startQuiz, switchLanguage };
  useEffect(() => {
    type Tool = { name: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: Record<string, unknown>) => unknown };
    const context = (document as Document & { modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    const specs: Tool[] = [
      { name: "get_practice_state", description: "Read selected language, saved exercise progress and active practice.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute(input) { if (Object.keys(input).length) throw new Error("No parameters accepted"); return { language: actions.current.language, progress: actions.current.progress, session: actions.current.active }; } },
      { name: "start_practice", description: "Open an existing English or German exercise session. Does not submit answers.", inputSchema: { type: "object", properties: { language: { type: "string", enum: ["en", "de"] }, category: { type: "string", enum: ["mixed", "vocabulary", "grammar", "sentences", "daily", "exam", "review"] } }, required: ["language", "category"], additionalProperties: false }, annotations: { readOnlyHint: false }, execute(input) { if (Object.keys(input).some(k => !["language", "category"].includes(k)) || !["en", "de"].includes(String(input.language)) || !["mixed", "vocabulary", "grammar", "sentences", "daily", "exam", "review"].includes(String(input.category))) throw new Error("Choose a supported language and category"); if (actions.current.active) throw new Error("Close current practice first"); actions.current.switchLanguage(input.language as Language); actions.current.startQuiz(input.category as Category); return { started: true, language: input.language, category: input.category }; } }
    ];
    for (const tool of specs) { try { void Promise.resolve(context.registerTool(tool, { signal: controller.signal })).catch(() => {}); } catch {} }
    return () => controller.abort();
  }, []);

  function saveFeatured() {
    coach.saveChunk({ ...featured, context: featured.context ?? input.title, language, level }); setNotice("Saved to your chunks.");
  }
  async function exportData() {
    let examDrafts: unknown = null;
    try { const response = await fetch("/api/writing", {cache:"no-store"}); if (response.ok) examDrafts = await response.json(); } catch {}
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), coach: state, exerciseProgress: progress, examDrafts, preferences: {language, chineseHints: glosses} }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "phrase-learning-backup.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const firstWeekDay = new Date(date + "T12:00:00Z"); firstWeekDay.setUTCDate(firstWeekDay.getUTCDate() - (firstWeekDay.getUTCDay() + 6) % 7);
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(firstWeekDay); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  const weekly = languageSessions.filter(s => weekDates.includes(s.date));
  const weeklyMinutes = Math.round(weekly.reduce((t, s) => t + s.seconds, 0) / 60);
  const daysPracticed = new Set([...languageSessions.map(s => s.date), ...progress.days.filter(d => d.language === language && d.attempts > 0).map(d => d.date)]).size;
  const studiedChunks = chunks.filter(c => c.mastery > 0).length;
  const draftKey = `${language}:${level}:${active?.skill ?? "write"}:${date}`;
  const preferenceForm = (l: Language, compact = false) => {
    const p = state.preferences[l];
    return <section key={l} className={compact ? "setup-language" : "settings-group"}>
      <div className="group-heading"><h2>{l === "en" ? "English" : "Deutsch"}</h2><span>Your own pace</span></div>
      <div className="settings-fields">
        <label className="form-field">Current level<select value={p.currentLevel ?? progress.settings[l]} onChange={e => { coach.updatePreferences(l, { currentLevel: e.target.value as Level }); setProgress(old => ({ ...old, settings: { ...old.settings, [l]: e.target.value as Level } })); }}>{levels.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="form-field">Target level<select value={p.targetLevel} onChange={e => coach.updatePreferences(l, { targetLevel: e.target.value as Level })}>{levels.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="form-field">Main goal<select value={p.goal} onChange={e => coach.updatePreferences(l, { goal: e.target.value })}>{goals.filter(g => l === "en" || g.value !== "ielts").map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
        <label className="form-field">Daily time<select value={p.dailyMinutes} onChange={e => coach.updatePreferences(l, { dailyMinutes: Number(e.target.value) as 20 | 45 | 60 | 90 })}>{times.map(x => <option key={x} value={x}>{x} min</option>)}</select></label>
      </div>
    </section>;
  };

  return <div className="coach-app">
    <header className="coach-header">
      <button className="coach-brand" onClick={() => go("today")} aria-label="Phrase home"><span className="coach-logo">p<span/></span><span>phrase<span className="brand-dot">.</span></span></button>
      <div className="language-control" aria-label="Learning language"><button aria-pressed={language === "en"} onClick={() => switchLanguage("en")}>English</button><button aria-pressed={language === "de"} onClick={() => switchLanguage("de")}>Deutsch</button></div>
    </header>
    <main className={`coach-main ${active ? "has-session" : ""}`} ref={screenRef} tabIndex={-1}>
      {(coach.error || legacyError) && <div className="coach-alert" role="alert"><span>{coach.error || legacyError}</span><button onClick={() => { coach.retry(); void refreshProgress(); }}>Retry</button></div>}
      {notice && <div className="coach-toast" role="status"><Check size={16}/>{notice}</div>}
      {setup ? <div className="setup-screen"><button className="back-link" onClick={() => setSetup(false)}><ArrowLeft size={18}/>Back</button><span className="eyebrow">YOUR PERSONAL COACH</span><h1>A plan that fits you.</h1><p className="page-description">Set a starting point. You can change it anytime.</p><label className="form-field setup-select">I’m learning<select value={setupLanguages} onChange={e => setSetupLanguages(e.target.value as "en" | "de" | "both")}><option value="both">English & German</option><option value="en">English</option><option value="de">German</option></select></label>{(setupLanguages === "both" ? ["en", "de"] as const : [setupLanguages] as const).map(l => preferenceForm(l, true))}<button className="primary-button wide" onClick={() => { coach.finishOnboarding(); if (setupLanguages !== "both") switchLanguage(setupLanguages); setSetup(false); setView("today"); }}>Start my plan<ArrowRight size={18}/></button></div> : <>
        {active?.mode ? <ExercisePractice language={language} level={level} progress={progress} onProgress={setProgress} mode={active.mode} rules={active.rules} onClose={() => setActive(null)} onSaveExpression={coach.saveChunk} onComplete={seconds => finish(seconds)} /> : active && ["listen", "read", "speak", "write", "pronunciation"].includes(active.skill) ? <FluencySession key={`${language}:${active.activityId ?? active.skill}`} language={language} level={level} skill={active.skill as "listen" | "read" | "speak" | "write" | "pronunciation"} minutes={active.minutes} activityId={active.activityId} draft={state.drafts[draftKey] ?? ""} onDraftChange={v => coach.setDraft(draftKey, v)} onSaveChunk={coach.saveChunk} onComplete={r => finish(r.seconds, r.rating)} onClose={() => setActive(null)} /> : active?.skill === "chunks" ? <ChunksWorkspace language={language} level={level} chunks={chunks} glosses={glosses} onSave={coach.saveChunk} onReview={coach.reviewChunk} onClose={() => setActive(null)} onComplete={finish}/> : active?.skill === "grammar" ? <GrammarWorkspace language={language} level={level} progress={progress} glosses={glosses} onPractice={(mode, rules) => setActive(a => a ? { ...a, mode, rules } : null)} onClose={() => setActive(null)}/> : !active && <>
          {view === "today" && <div className="today-layout">
            <div className="today-primary">
              <div className="today-overline"><span>{new Intl.DateTimeFormat("en", { weekday: "long", month: "short", day: "numeric" }).format(new Date(date + "T12:00:00Z"))}</span><span className="level-pill">{level}<ArrowRight size={12}/>{pref.targetLevel}</span></div>
              <div className="today-heading"><h1>Today<span className="heading-dot">.</span></h1><div className="daily-budget"><strong>{pref.dailyMinutes}</strong><span>min for you</span></div></div>
              <p className="today-subtitle">A little closer to natural {language === "en" ? "English" : "German"}.</p>
              <div className="time-selector"><span>I have</span><div className="segmented" aria-label="Available study time">{times.map(t => <button key={t} aria-pressed={pref.dailyMinutes === t} onClick={() => coach.updatePreferences(language, { dailyMinutes: t })}>{t}<span> min</span></button>)}</div></div>
              <section className="daily-plan" aria-label="Today's learning plan">{plan.map((a, i) => {
                const Icon = skillIcons[a.skill]; const done = completeIds.has(a.id);
                return <button key={a.id} className={`activity-row ${done ? "activity-done" : ""}`} onClick={() => start(a.skill, a)} disabled={!ready}>
                  <span className={`activity-icon activity-icon-${a.skill}`}>{done ? <Check size={21}/> : <Icon size={21}/>}</span><span className="activity-copy"><span className="activity-label">{String(i + 1).padStart(2, "0")}<span>{a.minutes} min</span></span><strong>{a.title}</strong><span className="activity-instruction">{shortInstructions[language][a.skill]}</span></span><ChevronRight size={18} className="row-chevron"/>
                </button>;
              })}</section>
              <button className="primary-button start-today" disabled={!ready} onClick={() => nextActivity ? start(nextActivity.skill, nextActivity) : go("practice")}><PlayIcon/>{!ready ? "Loading your plan…" : completeCount === plan.length ? "Explore practice" : completeCount ? "Continue today" : "Start today"}<ArrowRight size={19}/></button>
              <div className="plan-footnote"><span>{completeCount ? `${completeCount} of ${plan.length} activities completed` : "Your plan changes each day."}</span><span><span className="tiny-dot"/>Made for fluency</span></div>
            </div>
            <aside className="today-aside"><section className="daily-expression"><div className="expression-top"><span className="eyebrow">TAKE THIS WITH YOU</span><Layers size={19}/></div><h2 lang={language}>{featured.expression}</h2><p>{featured.meaning}</p><blockquote lang={language}>{featured.example}</blockquote><button className="expression-save" onClick={saveFeatured} disabled={!ready || chunks.some(c => c.expression.toLowerCase() === featured.expression.toLowerCase())}>{chunks.some(c => c.expression.toLowerCase() === featured.expression.toLowerCase()) ? <><Check size={17}/>In your chunks</> : <><Plus size={17}/>Save expression</>}</button></section><div className="coach-thought"><span className="thought-line"/><p>Understand more.<br/>Translate less.<br/><strong>Make it your language.</strong></p></div>{!state.onboarded && ready && <button className="setup-invite" onClick={() => setSetup(true)}><span><strong>Make it yours</strong><small>Choose your level, goal and pace.</small></span><ArrowUpRight size={19}/></button>}</aside>
          </div>}
          {view === "practice" && <div className="standard-screen"><span className="eyebrow">FOLLOW YOUR CURIOSITY</span><h1>Practice<span className="heading-dot">.</span></h1><p className="page-description">One skill. Your full attention.</p><div className="practice-grid">{practiceItems.map(({ skill, label }, i) => { const Icon = skillIcons[skill]; return <button key={skill} onClick={() => start(skill)} disabled={!ready}><span className="practice-item-number">0{i + 1}</span><Icon size={27} strokeWidth={1.5}/><strong>{label}</strong><ArrowUpRight size={17} className="practice-arrow"/></button>; })}</div></div>}
          {view === "progress" && <div className="standard-screen progress-screen"><span className="eyebrow">{language === "en" ? "YOUR ENGLISH" : "DEIN DEUTSCH"}</span><h1>Keep showing up<span className="heading-dot">.</span></h1><div className="progress-level"><span className="level-large">{level}</span><div><strong>Current level</strong><p>Self-selected · working towards {pref.targetLevel}</p></div></div><section className="weekly-section"><div className="group-heading"><h2>This week</h2><span><strong>{weeklyMinutes}</strong> active min</span></div><div className="week-bars" aria-label="Active minutes this week">{weekDates.map((d, i) => { const min = Math.round(weekly.filter(s => s.date === d).reduce((t, s) => t + s.seconds, 0) / 60); return <div key={d} className={d === date ? "week-current" : ""}><span className="week-minutes">{min || "—"}</span><div className="week-track"><span style={{ height: `${Math.min(100, min / Math.max(pref.dailyMinutes, 1) * 100)}%` }}/></div><span>{["M", "T", "W", "T", "F", "S", "S"][i]}</span></div>; })}</div></section><div className="progress-facts"><div><strong>{daysPracticed}</strong><span>days practiced</span></div><div><strong>{studiedChunks}</strong><span>expressions reviewed</span></div><div><strong>{languageSessions.filter(s => s.skill === "speak").length}</strong><span>speaking sessions</span></div><div><strong>{languageSessions.filter(s => s.skill === "write").length}</strong><span>writing sessions</span></div></div><section className="skill-activity"><div className="group-heading"><h2>Your practice balance</h2><span>This week</span></div>{(["listen", "speak", "read", "write", "chunks", "grammar"] as const).map(s => { const seconds = weekly.filter(x => x.skill === s).reduce((t, x) => t + x.seconds, 0); const total = weekly.filter(x => x.skill !== "exam").reduce((t, x) => t + x.seconds, 0); return <div className="skill-activity-row" key={s}><div><span>{s === "chunks" ? "Vocabulary / Chunks" : skillNames[s]}</span><span>{Math.round(seconds / 60)} min</span></div><div className="activity-bar"><span style={{ width: `${total ? seconds / total * 100 : 0}%` }}/></div></div>; })}<p className="coach-note">These show practice activity, not measured proficiency. Your level changes when you choose it.</p></section><details className="quiet-details"><summary>Exam & earlier exercise activity</summary><p className="coach-note">Exam sessions: {languageSessions.filter(s => s.skill === "exam").length}. This is separate from your language level.</p><p className="coach-note">Earlier exercises: {Object.values(progress.records).filter(r => r.exercise_id.startsWith(language + "-")).reduce((t, r) => t + r.attempts, 0)} attempts. Saved review history is preserved.</p></details></div>}
          {view === "settings" && <div className="standard-screen settings-screen"><span className="eyebrow">ON YOUR TERMS</span><h1>Settings<span className="heading-dot">.</span></h1><p className="page-description">A separate plan for each language.</p>{preferenceForm("en")}{preferenceForm("de")}<section className="settings-group"><div className="group-heading"><h2>Appearance & support</h2></div><label className="form-field">Appearance<select value={state.theme} onChange={e => coach.setTheme(e.target.value as "system" | "light" | "dark")}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="toggle-row"><span>Chinese hints<small>Keep extra support in exercise practice.</small></span><input type="checkbox" checked={glosses} onChange={e => { setGlosses(e.target.checked); try { localStorage.setItem("phrase-glosses", String(e.target.checked)); } catch {} }}/></label><button className="list-row" onClick={() => setInstall(!install)} aria-expanded={install}><span><strong>Add to Home Screen</strong><small>Open Phrase like an app on your iPhone.</small></span><ChevronRight size={18}/></button>{install && <p className="coach-note install-note">Open this site in Safari, tap Share, then Add to Home Screen. The same account keeps your saved learning data.</p>}<button className="list-row" onClick={() => setSetup(true)}><span>Set up my plan</span><ChevronRight size={18}/></button></section><section className="settings-group"><div className="group-heading"><h2>Your learning data</h2><span className="sync-state">{coach.syncStatus === "saved" ? "Saved" : coach.syncStatus === "offline" || coach.syncStatus === "local" ? "Saved on this device" : "Syncing…"}</span></div><p className="coach-note">Levels, exercises and exam drafts stay in Phrase. New chunks, writing and practice sessions also save here.</p><button className="secondary-button" onClick={() => void exportData()}>Download learning backup<ArrowUpRight size={16}/></button><p className="coach-note">Speaking recordings stay on your device for the session. Writing feedback uses self-review and examples.</p></section></div>}
        </>}
        {examVisited && <div hidden={active?.skill !== "exam" || !!active.mode} className="exam-screen"><button className="back-link" onClick={() => setActive(null)}><ArrowLeft size={18}/>Practice</button><span className="eyebrow">WHEN YOU NEED IT</span><h1>Exam Mode<span className="heading-dot">.</span></h1><p className="page-description">Prepare for the task. Keep language learning first.</p>{language === "en" && <div className="segmented exam-track"><button aria-pressed={examTrack === "ielts"} onClick={() => setExamTrack("ielts")}>IELTS</button><button aria-pressed={examTrack === "school"} onClick={() => setExamTrack("school")}>School / Klausur</button></div>}<ExamWorkspace language={language} track={language === "de" ? "school" : examTrack} active={active?.skill === "exam" && !active.mode} onStartDrills={() => startQuiz("exam")} onComplete={finish}/></div>}
      </>}
    </main>
    <nav className="bottom-nav" aria-label="Main navigation" ref={navRef}>{([{ value: "today", label: "Today", Icon: CalendarDays }, { value: "practice", label: "Practice", Icon: Layers }, { value: "progress", label: "Progress", Icon: ChartNoAxesCombined }, { value: "settings", label: "Settings", Icon: Settings2 }] as const).map(({ value, label, Icon }) => <button key={value} onClick={() => go(value)} aria-current={view === value && !active ? "page" : undefined} className={(active ? "practice" : view) === value ? "nav-active" : ""}><Icon size={21} strokeWidth={1.75}/><span>{label}</span></button>)}</nav>
    <footer className="coach-footer"><span>phrase · a little, every day.</span><span>{language === "en" ? "English" : "Deutsch"} · {level}</span></footer>
  </div>;
}
function PlayIcon() { return <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true"><path d="M5 3.5L13 8.5L5 13.5V3.5Z" fill="currentColor"/></svg>; }
