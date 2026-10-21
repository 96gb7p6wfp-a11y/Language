"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Mic, Plus, Square, Volume2, X } from "lucide-react";
import type { Language, Level } from "@/lib/curriculum";
import { MISSION_MAX_ANSWER_LENGTH, MISSION_KIND_LABELS, type MissionRun, type MissionTemplate, type MissionPhrase, type MissionInputMode, type MissionTurn } from "@/lib/missions";
import type { MissionService } from "@/hooks/use-missions";

type PhraseInput = MissionPhrase & { context: string; language: Language; level: Level };
export type MissionSessionProps = {
  run: MissionRun;
  template: MissionTemplate;
  busy: boolean;
  error: string;
  service: MissionService;
  onRespond: (answer: string, inputMode: MissionInputMode) => Promise<unknown>;
  onAdvance: () => Promise<unknown>;
  onFinish: () => Promise<unknown>;
  onClose: () => void;
  onSavePhrase: (phrase: PhraseInput) => unknown;
};
const DRAFT_PREFIX = "phrase-mission-draft:";
const AUDIO_BYTES = 2 * 1024 * 1024;
const AUDIO_SECONDS = 90;
export function missionDraftKey(run: Pick<MissionRun, "id" | "round" | "phase">): string { return `${DRAFT_PREFIX}${run.id}:${run.round}:${run.phase === "feedback" ? 2 : 1}`; }
export function missionRoundPair(run: Pick<MissionRun, "turns">, round: number): { original?: MissionTurn; retry?: MissionTurn } {
  return { original: run.turns.find(turn => turn.round === round && turn.attempt === 1), retry: run.turns.find(turn => turn.round === round && turn.attempt === 2) };
}
function secondsLabel(value: number) { return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }

export default function MissionSession(props: MissionSessionProps) {
  // Each phase has its own saved draft and media lifecycle. An error keeps the
  // same component mounted, so a failed request cannot erase the learner's work.
  return <MissionBody key={`${props.run.id}:${props.run.round}:${props.run.phase}`} {...props} />;
}

function MissionBody({ run, template, busy, error, service, onRespond, onAdvance, onFinish, onClose, onSavePhrase }: MissionSessionProps) {
  const language = run.language;
  const german = language === "de";
  const text = (en: string, de: string) => german ? de : en;
  const complete = run.status === "complete" || run.phase === "summary";
  const firstFeedback = run.phase === "feedback";
  const afterRetry = run.phase === "retry";
  const pair = missionRoundPair(run, run.round);
  const latest = run.turns[run.turns.length - 1];
  const feedback = latest?.feedback;
  const canAnswer = !complete && (run.phase === "challenge" || firstFeedback);
  const draftStorageKey = missionDraftKey(run);
  const [draft, setDraft] = useState(() => {
    if (typeof window !== "undefined") { try { const stored = localStorage.getItem(draftStorageKey); if (stored !== null) return stored.slice(0, MISSION_MAX_ANSWER_LENGTH); } catch {} }
    return firstFeedback ? pair.original?.answer ?? "" : "";
  });
  const [mode, setMode] = useState<MissionInputMode>("text");
  const [status, setStatus] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [recordingState, setRecordingState] = useState<"idle" | "requesting" | "recording" | "ready" | "transcribing">("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceError, setVoiceError] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [comparisonRound, setComparisonRound] = useState(run.round);
  const playback = useRef<HTMLAudioElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const media = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRequest = useRef<AbortController | null>(null);
  const transcriptRequestId = useRef("");
  const blobURL = useRef<string | null>(null);
  const recordingStarted = useRef(0);
  const bytes = useRef(0);
  const recorded = useRef<Blob[]>([]);
  const permissionRequest = useRef(0);
  const mounted = useRef(false);
  const audioGeneration = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const feedbackHeading = useRef<HTMLHeadingElement>(null);
  const nextChallenge = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mounted.current = true;
    function stopWhenHidden() {
      if (document.visibilityState !== "hidden") return;
      window.speechSynthesis?.cancel();
      playback.current?.pause();
      setAudioPlaying(false);
      if (recorder.current?.state === "recording") recorder.current.stop();
      media.current?.getTracks().forEach(track => track.stop());
    }
    document.addEventListener("visibilitychange", stopWhenHidden);
    return () => {
      mounted.current = false;
      permissionRequest.current += 1;
      audioGeneration.current += 1;
      if (timer.current) clearInterval(timer.current);
      transcriptRequest.current?.abort();
      if (recorder.current?.state === "recording") recorder.current.stop();
      media.current?.getTracks().forEach(track => track.stop());
      window.speechSynthesis?.cancel();
      playback.current?.pause();
      if (blobURL.current) URL.revokeObjectURL(blobURL.current);
      document.removeEventListener("visibilitychange", stopWhenHidden);
    };
  }, []);

  useEffect(() => {
    // A new phase should expose the new information rather than leave the
    // learner at the old composer position, especially after a long case file.
    const destination = firstFeedback || afterRetry
      ? feedbackHeading.current
      : !complete && run.round > 1 ? nextChallenge.current : heading.current;
    destination?.focus({ preventScroll: true });
    destination?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [afterRetry, complete, firstFeedback, run.round]);

  function updateDraft(value: string, inputMode: MissionInputMode = mode) {
    const next = value.slice(0, MISSION_MAX_ANSWER_LENGTH);
    setDraft(next); setMode(inputMode);
    try { localStorage.setItem(draftStorageKey, next); }
    catch { setStatus(text("Keep this page open: your browser cannot keep a draft backup.", "Lass diese Seite geöffnet: Dein Browser kann den Entwurf nicht sichern.")); }
  }
  function stopAudio() { audioGeneration.current += 1; window.speechSynthesis?.cancel(); playback.current?.pause(); setAudioPlaying(false); }
  function speak(value: string) {
    stopAudio();
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) { setStatus(text("Device audio is unavailable in this browser.", "Die Gerätevorlesung ist hier nicht verfügbar.")); return; }
    const generation = audioGeneration.current;
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = german ? "de-DE" : "en-GB";
    utterance.rate = ["A1", "A2"].includes(run.level) ? .84 : run.difficulty === 3 ? 1.04 : .95;
    const voice = window.speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith(language));
    if (voice) utterance.voice = voice;
    utterance.onend = () => { if (mounted.current && generation === audioGeneration.current) setAudioPlaying(false); };
    utterance.onerror = event => { if (mounted.current && generation === audioGeneration.current && !["interrupted", "canceled"].includes(event.error)) { setAudioPlaying(false); setStatus(text("Audio did not play. You can read the text.", "Die Wiedergabe ist fehlgeschlagen. Du kannst den Text lesen.")); } };
    setAudioPlaying(true);
    window.speechSynthesis.speak(utterance);
  }
  function savePhrase(phrase: MissionPhrase) {
    try { onSavePhrase({ ...phrase, context: `${template.title[language]} · ${text("round", "Runde")} ${run.round}`, language, level: run.level }); setSaved(old => [...old, phrase.expression]); setStatus(text("Saved to Chunks.", "In Chunks gespeichert.")); }
    catch { setStatus(text("This expression could not be saved. Try again.", "Der Ausdruck konnte nicht gespeichert werden. Versuche es erneut.")); }
  }
  function stopRecording() {
    permissionRequest.current += 1;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (recorder.current?.state === "recording") recorder.current.stop();
    media.current?.getTracks().forEach(track => track.stop());
    if (recordingState === "requesting") setRecordingState(audioBlob ? "ready" : "idle");
  }
  async function startRecording() {
    stopAudio();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setVoiceError(text("Recording is unavailable here. Type your response below.", "Dieser Browser kann nicht aufnehmen. Schreibe deine Antwort unten.")); return; }
    const permission = ++permissionRequest.current;
    setVoiceError(""); setRecordingState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || permission !== permissionRequest.current || document.visibilityState === "hidden") { stream.getTracks().forEach(track => track.stop()); return; }
      media.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(candidate => MediaRecorder.isTypeSupported(candidate));
      const next = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48000 } : undefined);
      recorder.current = next; recorded.current = []; bytes.current = 0;
      transcriptRequestId.current = crypto.randomUUID();
      next.ondataavailable = event => {
        if (event.data.size) { recorded.current.push(event.data); bytes.current += event.data.size; }
        if (bytes.current > AUDIO_BYTES && next.state === "recording") next.stop();
      };
      next.onstop = () => {
        if (timer.current) { clearInterval(timer.current); timer.current = null; }
        stream.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        if (blobURL.current) URL.revokeObjectURL(blobURL.current);
        const blob = new Blob(recorded.current, { type: next.mimeType || "audio/webm" });
        if (!blob.size || blob.size > AUDIO_BYTES) { setAudioBlob(null); setAudioURL(null); setRecordingState("idle"); setVoiceError(text("That recording is too large or empty. Try a shorter answer.", "Die Aufnahme ist zu groß oder leer. Versuche eine kürzere Antwort.")); return; }
        blobURL.current = URL.createObjectURL(blob); setAudioBlob(blob); setAudioURL(blobURL.current); setRecordingState("ready");
      };
      next.onerror = () => { stream.getTracks().forEach(track => track.stop()); if (timer.current) clearInterval(timer.current); if (mounted.current) { setRecordingState("idle"); setVoiceError(text("Recording stopped. Please try again.", "Die Aufnahme wurde beendet. Versuche es erneut.")); } };
      recordingStarted.current = Date.now(); setRecordingSeconds(0); setRecordingState("recording"); next.start(500);
      timer.current = setInterval(() => {
        const seconds = Math.min(AUDIO_SECONDS, Math.floor((Date.now() - recordingStarted.current) / 1000));
        if (mounted.current) setRecordingSeconds(seconds);
        if (seconds >= AUDIO_SECONDS && next.state === "recording") next.stop();
      }, 250);
    } catch (cause) {
      media.current?.getTracks().forEach(track => track.stop());
      if (mounted.current && permission === permissionRequest.current) { setRecordingState(audioBlob ? "ready" : "idle"); setVoiceError(cause instanceof DOMException && cause.name === "NotAllowedError" ? text("Microphone permission was declined. You can type your response.", "Der Mikrofonzugriff wurde abgelehnt. Du kannst deine Antwort schreiben.") : text("The microphone could not start. Try again or type your response.", "Das Mikrofon konnte nicht starten. Versuche es erneut oder schreibe deine Antwort.")); }
    }
  }
  async function transcribe() {
    if (!audioBlob || recordingState === "transcribing") return;
    setVoiceError(""); setRecordingState("transcribing");
    const controller = new AbortController(); transcriptRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 45000);
    const body = new FormData(); body.append("runId", run.id); body.append("requestId", transcriptRequestId.current || (transcriptRequestId.current = crypto.randomUUID())); body.append("audio", audioBlob, audioBlob.type.includes("mp4") ? "response.m4a" : "response.webm");
    try {
      const response = await fetch("/api/missions/transcribe", { method: "POST", body, signal: controller.signal });
      const result = await response.json() as { text?: string; error?: string; code?: string };
      if (!response.ok && result.code !== "request_pending" && result.code !== "mission_unavailable") transcriptRequestId.current = crypto.randomUUID();
      if (!response.ok || typeof result.text !== "string") throw new Error(result.error ?? text("The audio could not be transcribed. Your recording stays here.", "Die Aufnahme konnte nicht transkribiert werden. Sie bleibt hier erhalten."));
      if (!mounted.current) return;
      updateDraft(result.text, "voice"); setStatus(text("Transcript ready. Check it, then send your answer.", "Das Transkript ist bereit. Prüfe es und sende dann deine Antwort."));
      if (result.text.length > MISSION_MAX_ANSWER_LENGTH) setVoiceError(text("The transcript was shortened to the response limit. Check the ending before sending.", "Das Transkript wurde auf die Antwortlänge gekürzt. Prüfe das Ende vor dem Senden."));
    } catch (cause) { if (mounted.current) setVoiceError(cause instanceof Error && cause.name !== "AbortError" ? cause.message : text("Transcription took too long. Try again; your recording stays here.", "Die Transkription hat zu lange gedauert. Versuche es erneut; die Aufnahme bleibt hier.")); }
    finally { clearTimeout(timeout); if (mounted.current) setRecordingState("ready"); }
  }
  function discardRecording() { stopRecording(); if (blobURL.current) URL.revokeObjectURL(blobURL.current); blobURL.current = null; setAudioBlob(null); setAudioURL(null); setRecordingState("idle"); setVoiceError(""); }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!draft.trim() || busy || recordingState === "transcribing") return; stopRecording(); stopAudio(); await onRespond(draft.trim(), mode); }

  const expressionRows = (phrases: MissionPhrase[]) => <div className="mission-phrases">{phrases.slice(0, 2).map(phrase => <div className="mission-phrase" key={phrase.expression}><div><strong lang={language}>{phrase.expression}</strong><p>{phrase.meaning}</p><q lang={language}>{phrase.example}</q></div><button className="mission-icon-button" aria-label={`${saved.includes(phrase.expression) ? text("Saved", "Gespeichert") : text("Save", "Speichern")} ${phrase.expression}`} onClick={() => savePhrase(phrase)} disabled={saved.includes(phrase.expression)}>{saved.includes(phrase.expression) ? <Check size={19}/> : <Plus size={19}/>}</button></div>)}</div>;
  const compare = (round: number) => {
    const responses = missionRoundPair(run, round);
    return responses.original && <div className="mission-comparison" data-testid="mission-comparison"><div><span>{text("First try", "Erster Versuch")}</span><p lang={language}>{responses.original.answer}</p></div><div><span>{text("Your retry", "Dein neuer Versuch")}</span><p lang={language}>{responses.retry?.answer ?? text("No retry recorded for this round.", "Für diese Runde wurde kein neuer Versuch gespeichert.")}</p></div></div>;
  };

  const caseEvidence = template.evidence.length > 0 ? <div className="mission-evidence" aria-label={text("Case evidence", "Fallunterlagen")}>
        <div className="mission-section-heading"><h2>{text("The evidence", "Die Belege")}</h2><span>{text("Original case material", "Eigene Fallunterlagen")}</span></div>
        {template.evidence.map((item, index) => {
          const passage = ["A1", "A2"].includes(run.level) ? item.simpleText?.[language] ?? item.text[language] : item.text[language];
          return <article className="mission-evidence-file" key={item.id}><div className="mission-evidence-title"><span>0{index + 1}</span><h3>{item.title[language]}</h3></div>{item.audio ? <><button className="mission-listen" onClick={() => audioPlaying ? stopAudio() : speak(passage)}><Volume2 size={17}/>{audioPlaying ? text("Stop audio", "Audio stoppen") : text("Listen to the statement", "Aussage anhören")}</button><p className="mission-note">{text("Device voice · authored case statement. Listen before your first answer.", "Gerätestimme · verfasste Fallaussage. Höre sie vor deiner ersten Antwort.")}</p>{run.turns.length ? <details className="mission-transcript"><summary>{text("Show transcript", "Transkript zeigen")}</summary><p lang={language}>{passage}</p></details> : <small className="mission-note">{text("Transcript opens after your first attempt.", "Das Transkript öffnet sich nach deinem ersten Versuch.")}</small>}</> : <p lang={language}>{passage}</p>}</article>;
        })}
      </div> : null;

  return <section className="mission-stage" aria-label={template.title[language]}>
    <header className="mission-stage-header"><button className="mission-back" onClick={() => { stopRecording(); stopAudio(); onClose(); }} aria-label={text("Back to challenges", "Zurück zu den Challenges")}><ArrowLeft size={20}/><span>{text("Challenges", "Challenges")}</span></button><span className="mission-kicker">{run.level} · {complete ? text("Complete", "Abgeschlossen") : `${text("Round", "Runde")} ${run.round} / ${template.maxRounds}`}</span></header>
    <div className="mission-scene-title"><span className="mission-kicker">{MISSION_KIND_LABELS[template.kind][language]}</span><h1 ref={heading} tabIndex={-1}>{template.title[language]}</h1><p>{complete ? text("A better answer is evidence of practice. Keep the useful language.", "Eine bessere Antwort zeigt deinen Übungsfortschritt. Behalte die nützlichen Wendungen.") : template.stakes[language]}</p></div>
    {!complete && <>
      <details className="mission-brief"><summary>{text("Your brief", "Dein Auftrag")}</summary><p>{template.brief[language]}</p><p className="mission-note">{text("Your counterpart", "Dein Gegenüber")}: {template.role[language]}</p></details>
      {caseEvidence && (template.kind === "mystery" && run.turns.length > 0
        ? <details className="mission-evidence-archive"><summary>{text("Evidence & transcripts", "Belege & Transkripte")}</summary>{caseEvidence}</details>
        : caseEvidence)}
      <div className="mission-dialogue" ref={nextChallenge} tabIndex={-1} aria-label={text("Your opponent", "Dein Gegenüber")}><div className="mission-character-line"><span className={`mission-avatar mission-avatar-${template.kind}`} aria-hidden="true">{template.kind === "mystery" ? "?" : template.kind === "debate" ? "↔" : "↗"}</span><span>{template.kind === "mystery" ? text("Case lead", "Fallleitung") : template.kind === "debate" ? text("The challenger", "Die Gegenposition") : text("Your counterpart", "Dein Gegenüber")}</span><button className="mission-icon-button" onClick={() => audioPlaying ? stopAudio() : speak(latest && run.phase !== "challenge" ? latest.characterReply : run.currentChallenge || run.opening)} aria-label={text("Read the challenge aloud with device voice", "Challenge mit Gerätestimme vorlesen")}><Volume2 size={17}/></button></div><p lang={language}>{latest && run.phase !== "challenge" ? latest.characterReply : run.currentChallenge || run.opening}</p>{run.phase === "challenge" && run.round > 1 && <span className="mission-situation-label">{text("The situation has changed. Respond to this point.", "Die Situation hat sich verändert. Geh auf diesen Punkt ein.")}</span>}</div>
    </>}
    {feedback && !complete && (firstFeedback || afterRetry) && <section className="mission-feedback" aria-label={text("Feedback on your answer", "Feedback zu deiner Antwort")}>
      <div className="mission-section-heading"><h2 ref={feedbackHeading} tabIndex={-1}>{afterRetry ? text("What changed", "Was sich verändert hat") : text("Make your next answer stronger", "Mach deine nächste Antwort stärker")}</h2><span>{text("AI feedback", "KI-Feedback")}</span></div>
      {!!feedback.strengths.length && <p className="mission-strength"><Check size={16}/><span>{feedback.strengths[0]}</span></p>}
      <div className="mission-corrections">{feedback.improvements.slice(0, 3).map((improvement, i) => <article className="mission-correction" key={`${i}:${improvement.original}`}><span className="mission-correction-dimension">{({ grammar: text("Grammar", "Grammatik"), naturalness: text("Naturalness", "Natürlichkeit"), precision: text("Precision", "Präzision"), clarity: text("Clarity", "Klarheit"), register: text("Register", "Register"), reasoning: text("Reasoning", "Argumentation") })[improvement.dimension]}</span><div className="mission-correction-before" lang={language}>{improvement.original}</div><div className="mission-correction-after" lang={language}>{improvement.improved}</div><details><summary>{text("Why?", "Warum?")}</summary><p>{improvement.why}</p></details></article>)}</div>
      {afterRetry ? <><p className="mission-outcome-evidence">{feedback.outcome.evidence}</p>{compare(run.round)}<details className="mission-expression-details"><summary>{text("Two expressions to keep", "Zwei Wendungen zum Behalten")}</summary>{expressionRows(feedback.phrases)}</details></> : <p className="mission-retry-prompt">{feedback.retryPrompt}</p>}
    </section>}
    {canAnswer && <form className="mission-composer" onSubmit={submit}>
      <label htmlFor="mission-answer">{firstFeedback ? text("Try again in your own words", "Versuche es noch einmal mit eigenen Worten") : text("Your move", "Du bist dran")}</label>
      <p className="mission-composer-hint">{firstFeedback ? text("Keep your idea. Use the feedback to make it clearer.", "Behalte deinen Gedanken. Nutze das Feedback, um ihn klarer auszudrücken.") : template.kind === "mystery" ? text("Make a claim and point to the evidence that supports it.", "Formuliere eine Vermutung und beziehe dich auf passende Belege.") : text("Speak or write. Answer the actual point, not a memorised script.", "Sprich oder schreibe. Geh auf den konkreten Punkt ein.")}</p>
      <details className="mission-voice"><summary><Mic size={16}/>{text("Use your voice", "Mit deiner Stimme antworten")}<ChevronDown size={15}/></summary><div className="mission-voice-controls">
        {recordingState === "recording" ? <button type="button" className="mission-button-secondary" onClick={stopRecording}><Square size={15}/>{text("Stop recording", "Aufnahme stoppen")}<span role="timer">{secondsLabel(recordingSeconds)}</span></button> : <button type="button" className="mission-button-secondary" disabled={busy || recordingState === "transcribing" || recordingState === "requesting"} onClick={() => void startRecording()}><Mic size={16}/>{recordingState === "requesting" ? text("Opening microphone…", "Mikrofon wird geöffnet …") : audioBlob ? text("Record again", "Neu aufnehmen") : text("Record an answer", "Antwort aufnehmen")}</button>}
        <span className="mission-note">{text("Up to 90 seconds", "Bis zu 90 Sekunden")}</span>
        {audioURL && <div className="mission-recording"><audio ref={playback} controls src={audioURL} aria-label={text("Your recording", "Deine Aufnahme")}/><div><button type="button" className="mission-button-secondary" disabled={busy || recordingState === "transcribing" || !service.configured} onClick={() => void transcribe()}>{recordingState === "transcribing" ? text("Transcribing…", "Wird transkribiert …") : text("Transcribe with OpenAI", "Mit OpenAI transkribieren")}</button><button type="button" className="mission-icon-button" disabled={recordingState === "transcribing"} onClick={discardRecording} aria-label={text("Discard recording", "Aufnahme löschen")}><X size={18}/></button></div></div>}
        <p className="mission-note">{text("Your audio stays on this device until you tap Transcribe. Then OpenAI converts it to editable text. No pronunciation score is inferred.", "Deine Aufnahme bleibt auf diesem Gerät, bis du auf Transkribieren tippst. OpenAI wandelt sie dann in bearbeitbaren Text um. Es gibt keine daraus abgeleitete Aussprachebewertung.")}</p>
        {voiceError && <p className="mission-error" role="alert">{voiceError}</p>}
      </div></details>
      <textarea id="mission-answer" name="answer" lang={language} value={draft} onChange={event => updateDraft(event.target.value)} maxLength={MISSION_MAX_ANSWER_LENGTH} rows={5} placeholder={firstFeedback ? text("Make it clearer and more natural…", "Formuliere klarer und natürlicher …") : text("What do you say?", "Was sagst du?")} disabled={busy || recordingState === "transcribing"} autoCapitalize="sentences" spellCheck aria-describedby="mission-answer-limit"/>
      <div className="mission-composer-meta"><span>{mode === "voice" ? text("Transcript · edit before sending", "Transkript · vor dem Senden prüfen") : text("Draft saved on this device", "Entwurf auf diesem Gerät gespeichert")}</span><span id="mission-answer-limit">{draft.length} / {MISSION_MAX_ANSWER_LENGTH}</span></div>
      {error && <div className="mission-error" role="alert">{error}</div>}
      {!service.configured && <p className="mission-note" role="status">{text("OpenAI is not connected yet. You can explore the scenario and keep a draft; feedback needs the server API key.", "OpenAI ist noch nicht verbunden. Du kannst das Szenario ansehen und einen Entwurf speichern. Für Feedback wird der API-Schlüssel auf dem Server benötigt.")}</p>}
      <button className="mission-button mission-action" disabled={!draft.trim() || busy || recordingState === "recording" || recordingState === "requesting" || recordingState === "transcribing"} type="submit">{busy ? text("Your opponent is thinking…", "Dein Gegenüber denkt nach …") : firstFeedback ? text("Try my improved answer", "Meine neue Antwort testen") : text("Send my answer", "Meine Antwort senden")}<ArrowRight size={18}/></button>
    </form>}
    {afterRetry && !complete && <div className="mission-next"><p className="mission-note">{text("Your retry is saved alongside your first answer.", "Dein neuer Versuch ist neben deiner ersten Antwort gespeichert.")}</p>{error && <p className="mission-error" role="alert">{error}</p>}<button className="mission-button mission-action" onClick={() => { stopAudio(); void onAdvance(); }} disabled={busy}>{busy ? text("Opening the next turn…", "Die nächste Runde wird geöffnet …") : run.round >= template.maxRounds ? text("See what improved", "Meinen Fortschritt ansehen") : text("Continue the challenge", "Challenge fortsetzen")}<ArrowRight size={18}/></button>{run.round < template.maxRounds && <details className="mission-finish-early"><summary>{text("Short on time?", "Wenig Zeit?")}</summary><p className="mission-note">{text("Keep the evidence from the rounds you completed.", "Behalte die Ergebnisse aus den abgeschlossenen Runden.")}</p><button className="mission-button-secondary" disabled={busy} onClick={() => { stopAudio(); void onFinish(); }}>{text("Finish with these rounds", "Mit diesen Runden abschließen")}</button></details>}</div>}
    {complete && <section className="mission-summary" aria-label={text("Mission improvement summary", "Zusammenfassung der Mission")}>
      <div className={`mission-outcome mission-outcome-${run.outcome?.state ?? feedback?.outcome.state ?? "partial"}`}><span className="mission-kicker">{text("The outcome", "Das Ergebnis")}</span><h2>{run.outcome?.label ?? feedback?.outcome.label ?? text("Mission recorded", "Mission gespeichert")}</h2><p>{run.outcome?.evidence ?? feedback?.outcome.evidence}</p></div>
      <section><h2>{text("What you did well", "Was dir gut gelungen ist")}</h2>{(run.summary?.didWell ?? feedback?.strengths ?? []).slice(0, 3).map((line, i) => <p className="mission-summary-item" key={i}><Check size={16}/><span>{line}</span></p>)}</section>
      <section><h2>{text("Keep working on", "Daran kannst du weiterarbeiten")}</h2>{(run.summary?.weaknesses ?? feedback?.improvements.map(item => item.why) ?? []).slice(0, 3).map((line, i) => <p key={i}>{line}</p>)}</section>
      <section><h2>{text("Two expressions to keep", "Zwei Wendungen zum Behalten")}</h2>{expressionRows(run.summary?.betterExpressions ?? feedback?.phrases ?? [])}</section>
      <section><h2>{text("What improved after retrying", "Was sich durch den neuen Versuch verbessert hat")}</h2>{(run.summary?.retryImprovements ?? []).map((line, i) => <p key={i}>{line}</p>)}{!run.summary?.retryImprovements.length && run.turns.some(turn => turn.attempt === 2) && <p>{text("Compare your answers below to see what changed.", "Vergleiche unten deine Antworten, um die Veränderungen zu sehen.")}</p>}{run.turns.some(turn => turn.attempt === 2) && <><label className="mission-comparison-select">{text("Compare a round", "Eine Runde vergleichen")}<select value={comparisonRound} onChange={event => setComparisonRound(Number(event.target.value))}>{[1, 2, 3].filter(round => run.turns.some(turn => turn.round === round)).map(round => <option key={round} value={round}>{text("Round", "Runde")} {round}</option>)}</select></label>{compare(comparisonRound)}</>}</section>
      <p className="mission-note">{text("This is evidence from your answers and AI feedback, not a CEFR certification or a measured fluency score.", "Dies sind Belege aus deinen Antworten und dem KI-Feedback, keine CEFR-Zertifizierung oder gemessene Sprachkompetenz.")}</p>
      <button className="mission-button mission-action" onClick={onClose}>{text("Back to challenges", "Zurück zu den Challenges")}<ArrowRight size={18}/></button>
    </section>}
    {template.authenticSources.length > 0 && <details className="mission-sources"><summary>{text("Go beyond this scenario", "Über dieses Szenario hinaus")}</summary><p className="mission-note">{text("Authentic background material · external sources. These are separate from the authored case files.", "Authentisches Hintergrundmaterial · externe Quellen. Diese sind von den verfassten Fallunterlagen getrennt.")}</p>{template.authenticSources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={15}/></a>)}</details>}
    {status && <p className="mission-status" role="status">{status}</p>}
    {!complete && !canAnswer && !afterRetry && error && <p className="mission-error" role="alert">{error}</p>}
  </section>;
}
