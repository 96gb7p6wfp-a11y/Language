"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowLeft, Check, ChevronRight, Mic, Pause, Play, Square, Trash2, Volume2 } from "lucide-react";
import type { Language, Level } from "@/lib/curriculum";
import { externalSources, getInput, getSpeakingPrompt, getWritingPrompt } from "@/lib/fluency-content";

type Rating = "easy" | "okay" | "difficult";
type SessionSkill = "listen" | "read" | "speak" | "write" | "pronunciation";
type ChunkInput = {
  expression: string;
  meaning: string;
  example: string;
  context: string;
  language: Language;
  level: Level;
};

export type FluencySessionProps = {
  language: Language;
  level: Level;
  skill: SessionSkill;
  minutes: number;
  activityId?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSaveChunk: (input: ChunkInput) => void;
  onComplete: (result: { seconds: number; rating?: Rating }) => void;
  onClose: () => void;
};

// Count time spent in the foreground, rather than the planned session length.
// Date-based intervals also stay accurate when the browser throttles timers.
function useActiveClock(enabled: boolean) {
  const accrued = useRef(0);
  const startedAt = useRef<number | null>(null);
  const [seconds, setSeconds] = useState(0);

  function snapshotSeconds() {
    const live = startedAt.current === null ? 0 : Math.max(0, Date.now() - startedAt.current);
    return Math.floor((accrued.current + live) / 1000);
  }

  function reset() {
    accrued.current = 0;
    startedAt.current = null;
    setSeconds(0);
  }

  useEffect(() => {
    function pause() {
      if (startedAt.current !== null) {
        accrued.current += Math.max(0, Date.now() - startedAt.current);
        startedAt.current = null;
      }
    }
    function resume() {
      if (enabled && document.visibilityState === "visible" && startedAt.current === null) {
        startedAt.current = Date.now();
      }
    }
    function tick() {
      const live = startedAt.current === null ? 0 : Math.max(0, Date.now() - startedAt.current);
      setSeconds(Math.floor((accrued.current + live) / 1000));
    }
    function visibilityChanged() {
      if (document.visibilityState === "visible") resume();
      else pause();
      tick();
    }
    resume();
    const interval = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      pause();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [enabled]);

  return { seconds, snapshotSeconds, reset };
}

function clockLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function contentIndex(activityId: string | undefined) {
  // Daily IDs select a stable passage; reopening a session keeps its content.
  let hash = 2166136261;
  for (const character of activityId ?? "practice") hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

export default function FluencySession({
  language, level, skill, minutes, activityId, draft, onDraftChange, onSaveChunk, onComplete, onClose,
}: FluencySessionProps) {
  const german = language === "de";
  const text = (english: string, deutsch: string) => german ? deutsch : english;
  const index = contentIndex(activityId);
  const input = getInput(language, level, index);
  const speakingPrompt = getSpeakingPrompt(language, level, index);
  const writingPrompt = getWritingPrompt(language, level, index);
  const skillNames: Record<SessionSkill, string> = {
    listen: text("Real input", "Echtes Deutsch"),
    read: text("Read", "Lesen"),
    speak: text("Speak & think", "Sprechen & Denken"),
    write: text("Writing coach", "Schreibcoach"),
    pronunciation: "Shadowing",
  };

  const [active, setActive] = useState(true);
  const sessionClock = useActiveClock(active);
  const [listeningStep, setListeningStep] = useState(0);
  const [readingMode, setReadingMode] = useState<"quick" | "deep">("quick");
  const [missed, setMissed] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [useOwnInput, setUseOwnInput] = useState(true);
  const [inputAudioURL, setInputAudioURL] = useState<string | null>(null);
  const [inputAudioName, setInputAudioName] = useState("");
  const [shadowingIndex, setShadowingIndex] = useState(0);
  const [shadowingStep, setShadowingStep] = useState<0 | 1 | 2>(0);
  const [rating, setRating] = useState<Rating | undefined>();
  const [timerMinutes, setTimerMinutes] = useState<number | null>(2);
  const [speakingActive, setSpeakingActive] = useState(false);
  const speakingClock = useActiveClock(speakingActive && active);
  const [wish, setWish] = useState("");
  const [wishMeaning, setWishMeaning] = useState("");
  const [wishExample, setWishExample] = useState("");
  const [checks, setChecks] = useState<number[]>([]);
  const [recording, setRecording] = useState<"idle" | "requesting" | "recording" | "ready">("idle");
  const [recordingURL, setRecordingURL] = useState<string | null>(null);
  const [recordingExtension, setRecordingExtension] = useState("webm");
  const [recordingError, setRecordingError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const recordingURLRef = useRef<string | null>(null);
  const requestToken = useRef(0);
  const audioToken = useRef(0);
  const inputAudioURLRef = useRef<string | null>(null);
  const inputAudio = useRef<HTMLAudioElement | null>(null);
  const inputDetails = useRef<HTMLDetailsElement | null>(null);
  const mounted = useRef(false);
  const completed = useRef(false);
  const pauseInputAudio = useCallback(() => { inputAudio.current?.pause(); }, []);

  useEffect(() => {
    mounted.current = true;
    function stopMediaWhenHidden() {
      if (document.visibilityState !== "hidden") return;
      window.speechSynthesis?.cancel();
      pauseInputAudio();
      setAudioPlaying(false);
      if (recorder.current?.state === "recording") {
        recorder.current.stop();
        stream.current?.getTracks().forEach(track => track.stop());
        setSpeakingActive(false);
      }
    }
    document.addEventListener("visibilitychange", stopMediaWhenHidden);
    return () => {
      mounted.current = false;
      requestToken.current += 1;
      window.speechSynthesis?.cancel();
      pauseInputAudio();
      if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
      stream.current?.getTracks().forEach(track => track.stop());
      if (recordingURLRef.current) URL.revokeObjectURL(recordingURLRef.current);
      if (inputAudioURLRef.current) URL.revokeObjectURL(inputAudioURLRef.current);
      document.removeEventListener("visibilitychange", stopMediaWhenHidden);
    };
  }, [pauseInputAudio]);

  function stopAudio() {
    audioToken.current += 1;
    window.speechSynthesis?.cancel();
    setAudioPlaying(false);
  }

  function playAudio(value: string) {
    if (typeof window.speechSynthesis?.speak !== "function" || typeof SpeechSynthesisUtterance === "undefined") {
      setStatus(text("Device audio is unavailable here. Open an authentic source or read the transcript.", "Die Gerätevorlesung ist hier nicht verfügbar. Öffne eine echte Quelle oder lies den Text."));
      return;
    }
    stopAudio();
    inputAudio.current?.pause();
    if (skill === "listen" && listeningStep === 0 && inputDetails.current) inputDetails.current.open = false;
    const token = audioToken.current;
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = german ? "de-DE" : "en-GB";
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(candidate => candidate.lang.toLowerCase().startsWith(german ? "de" : "en"));
    if (voice) utterance.voice = voice;
    utterance.rate = level === "C1" || level === "C2" ? 1 : 0.9;
    utterance.onend = () => { if (mounted.current && token === audioToken.current) setAudioPlaying(false); };
    utterance.onerror = event => {
      if (!mounted.current || token !== audioToken.current || event.error === "canceled" || event.error === "interrupted") return;
      setAudioPlaying(false);
      setStatus(text("Audio could not play. Try again or use an authentic source.", "Die Wiedergabe ist fehlgeschlagen. Versuche es erneut oder nutze eine echte Quelle."));
    };
    setStatus("");
    setActive(true);
    setAudioPlaying(true);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      setAudioPlaying(false);
      setStatus(text("Audio could not play. Use the transcript or an authentic source.", "Die Wiedergabe ist nicht verfügbar. Nutze den Text oder eine echte Quelle."));
    }
  }

  function stopRecording() {
    requestToken.current += 1;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    stream.current?.getTracks().forEach(track => track.stop());
    setSpeakingActive(false);
    if (recording === "requesting") setRecording(recordingURL ? "ready" : "idle");
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setRecordingError(text("This browser cannot record audio. You can still speak and use the timer.", "Dieser Browser kann nicht aufnehmen. Du kannst trotzdem sprechen und den Timer nutzen."));
      return;
    }
    const token = ++requestToken.current;
    setRecordingError("");
    setRecording("requesting");
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || token !== requestToken.current || document.visibilityState === "hidden") {
        media.getTracks().forEach(track => track.stop());
        if (mounted.current && token === requestToken.current) setRecording(recordingURLRef.current ? "ready" : "idle");
        return;
      }
      stream.current = media;
      const nextRecorder = new MediaRecorder(media);
      recorder.current = nextRecorder;
      chunks.current = [];
      nextRecorder.ondataavailable = event => { if (event.data.size > 0) chunks.current.push(event.data); };
      nextRecorder.onstop = () => {
        media.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        if (recordingURLRef.current) URL.revokeObjectURL(recordingURLRef.current);
        const blob = new Blob(chunks.current, { type: nextRecorder.mimeType || "audio/webm" });
        const url = blob.size ? URL.createObjectURL(blob) : null;
        recordingURLRef.current = url;
        setRecordingExtension(nextRecorder.mimeType.includes("mp4") ? "m4a" : nextRecorder.mimeType.includes("ogg") ? "ogg" : "webm");
        setRecordingURL(url);
        setRecording(url ? "ready" : "idle");
      };
      nextRecorder.onerror = () => {
        media.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setRecordingError(text("Recording stopped. Please try again.", "Die Aufnahme wurde beendet. Versuche es erneut."));
        setSpeakingActive(false);
        setRecording(recordingURLRef.current ? "ready" : "idle");
      };
      stopAudio();
      nextRecorder.start();
      setActive(true);
      setSpeakingActive(true);
      setRecording("recording");
    } catch (error) {
      stream.current?.getTracks().forEach(track => track.stop());
      if (!mounted.current || token !== requestToken.current) return;
      setRecording(recordingURLRef.current ? "ready" : "idle");
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setRecordingError(denied
        ? text("Microphone access is off. You can speak without recording.", "Der Mikrofonzugriff ist aus. Du kannst ohne Aufnahme sprechen.")
        : text("The microphone is unavailable. You can speak without recording.", "Das Mikrofon ist nicht verfügbar. Du kannst ohne Aufnahme sprechen."));
    }
  }

  function toggleActive() {
    if (active) {
      stopAudio();
      inputAudio.current?.pause();
      stopRecording();
    }
    setActive(!active);
  }

  function saveExpression(expression: (typeof input.expressions)[number]) {
    try {
      onSaveChunk({
        expression: expression.expression,
        meaning: expression.meaning,
        example: expression.example,
        context: expression.context ?? input.title,
        language,
        level,
      });
      setSaved(previous => [...previous, expression.expression]);
      setStatus(text("Saved to Chunks.", "In Chunks gespeichert."));
    } catch {
      setStatus(text("This expression could not be saved. Please try again.", "Der Ausdruck konnte nicht gespeichert werden. Versuche es erneut."));
    }
  }

  function saveCustomExpression(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wish.trim()) return;
    try {
      onSaveChunk({
        expression: wish.trim(),
        meaning: wishMeaning.trim(),
        example: wishExample.trim(),
        context: skill === "speak"
          ? `${text("Speaking wish list", "Wunschliste Sprechen")} · ${speakingPrompt}`
          : skill === "write" ? `${text("Writing practice", "Schreibübung")} · ${writingPrompt}` : sessionTitle,
        language,
        level,
      });
      setWish("");
      setWishMeaning("");
      setWishExample("");
      setStatus(skill === "speak"
        ? text("Saved to Chunks. Add a target-language version when you find one.", "In Chunks gespeichert. Ergänze die Formulierung, sobald du sie findest.")
        : text("Saved to Chunks.", "In Chunks gespeichert."));
    } catch {
      setStatus(text("Your expression could not be saved. Please try again.", "Dein Ausdruck konnte nicht gespeichert werden. Versuche es erneut."));
    }
  }

  function finish() {
    if (completed.current) return;
    completed.current = true;
    stopAudio();
    inputAudio.current?.pause();
    stopRecording();
    const seconds = sessionClock.snapshotSeconds();
    setActive(false);
    onComplete({ seconds, ...(rating ? { rating } : {}) });
  }

  function close() {
    stopAudio();
    inputAudio.current?.pause();
    stopRecording();
    onClose();
  }

  const customTextActive = (skill === "listen" || skill === "read") && useOwnInput && Boolean(draft.trim());
  const customAudioActive = skill === "listen" && useOwnInput && Boolean(inputAudioURL);
  const ownInputActive = customTextActive || customAudioActive;
  const sessionText = customTextActive ? draft.trim() : input.text;
  const sessionTitle = customTextActive ? text("Your real input", "Dein echtes Material") : input.title;
  const shadowingSentences = customTextActive
    ? (sessionText.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [sessionText]).map(sentence => sentence.trim()).filter(Boolean)
    : input.shadowing;
  const shadowingSentence = shadowingSentences[shadowingIndex] ?? shadowingSentences[0] ?? sessionText;
  const authenticSource = externalSources[language].filter(source => source.kind === (skill === "read" ? "read" : "listen"));
  const source = authenticSource[index % Math.max(1, authenticSource.length)];
  const listeningSteps = german
    ? ["Ohne Text", "Mit Text", "Was fehlte?", "Chunks speichern", "Shadowing"]
    : ["Without subtitles", "With transcript", "Missed expressions", "Save chunks", "Shadowing"];

  function expressionRows(expressions = input.expressions) {
    return expressions.map(expression => {
      const isSaved = saved.includes(expression.expression);
      return <div className="expression-row" key={expression.expression}>
        <div><strong lang={language}>{expression.expression}</strong><p>{expression.meaning}</p><small lang={language}>{expression.example}</small></div>
        <button className="icon-button" onClick={() => saveExpression(expression)} disabled={isSaved} aria-label={`${isSaved ? text("Saved", "Gespeichert") : text("Save", "Speichern")} ${expression.expression}`}>
          {isSaved ? <Check size={18} /> : <span aria-hidden="true">+</span>}
        </button>
      </div>;
    });
  }

  function loadInputAudio(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    stopAudio();
    inputAudio.current?.pause();
    try {
      const url = URL.createObjectURL(file);
      if (inputAudioURLRef.current) URL.revokeObjectURL(inputAudioURLRef.current);
      inputAudioURLRef.current = url;
      setInputAudioURL(url);
      setInputAudioName(file.name);
      setUseOwnInput(true);
      setListeningStep(0);
      setStatus(text("Audio ready. This file stays in your browser and is not uploaded.", "Audio bereit. Die Datei bleibt in deinem Browser und wird nicht hochgeladen."));
    } catch {
      setStatus(text("This audio file could not be opened. Try another file.", "Diese Audiodatei konnte nicht geöffnet werden. Versuche eine andere Datei."));
    }
    event.target.value = "";
  }

  const ownInputControls = <details className="session-details" ref={inputDetails}>
    <summary>{text("Use my own input", "Eigenes Material verwenden")}</summary>
    <p className="coach-note">{text("An external source keeps its transcript on its own site. Paste that transcript or reading text here to practise with the same material.", "Der Text einer externen Quelle bleibt auf deren Website. Füge den passenden Hör- oder Lesetext hier ein, um genau damit zu üben.")}</p>
    <label className="form-field" htmlFor="own-input-text">{skill === "listen" ? text("Real transcript · optional", "Passender Hörtext · optional") : text("Real reading text", "Eigener Lesetext")}<textarea className="field" id="own-input-text" lang={language} rows={5} value={draft} maxLength={40000} placeholder={text("Paste target-language text…", "Text in der Zielsprache einfügen …")} onChange={event => { stopAudio(); inputAudio.current?.pause(); onDraftChange(event.target.value); setShadowingIndex(0); setShadowingStep(0); }} /></label>
    {skill === "listen" && <label className="form-field" htmlFor="own-input-audio">{text("Local audio · optional", "Lokale Audiodatei · optional")}<input className="field" id="own-input-audio" type="file" accept="audio/*" onChange={loadInputAudio} /><small>{text("No upload. Audio is kept for this session only.", "Kein Upload. Audio bleibt nur für diese Übung erhalten.")}</small></label>}
    {(draft.trim() || inputAudioURL) && <label className="form-field"><span><input type="checkbox" checked={useOwnInput} onChange={event => { stopAudio(); inputAudio.current?.pause(); setUseOwnInput(event.target.checked); setListeningStep(0); setShadowingIndex(0); setShadowingStep(0); }} /> {text("Use this input instead of the practice passage", "Dieses Material statt des Übungstexts nutzen")}</span></label>}
    <small className="audio-disclosure">{text("Pasted text is kept on this device. Use the original practice passage anytime.", "Eingefügter Text bleibt auf diesem Gerät. Du kannst jederzeit zum Übungstext wechseln.")}</small>
    {inputAudioURL && <div className="button-row"><small>{inputAudioName}</small><button className="icon-button" onClick={() => { inputAudio.current?.pause(); if (inputAudioURLRef.current) URL.revokeObjectURL(inputAudioURLRef.current); inputAudioURLRef.current = null; setInputAudioURL(null); setInputAudioName(""); }} aria-label={text("Remove local audio", "Lokale Audiodatei entfernen")}><Trash2 size={17} /></button></div>}
  </details>;

  const localInputAudio = <div className="recording-playback local-input-audio">
    <audio ref={inputAudio} controls src={inputAudioURL ?? undefined} onPlay={() => { stopAudio(); setActive(true); if (listeningStep === 0 && inputDetails.current) inputDetails.current.open = false; }} onError={() => setStatus(text("This browser cannot play that audio format. Try a supported audio file.", "Dieser Browser unterstützt das Audioformat nicht. Versuche eine andere Audiodatei."))} aria-label={text("Your real input audio", "Dein echtes Hörmaterial")} />
    <small className="audio-disclosure">{inputAudioName} · {text("local audio · no upload", "lokales Audio · kein Upload")}</small>
  </div>;

  const customExpressionForm = <details className="session-details">
    <summary>{skill === "speak" ? text("An expression I wished I knew", "Ein Ausdruck, der mir fehlte") : text("Save another expression", "Weiteren Ausdruck speichern")}</summary>
    <form className="wish-form" onSubmit={saveCustomExpression}>
      <label className="form-field" htmlFor="session-expression">{skill === "speak" ? text("Expression or idea", "Ausdruck oder Gedanke") : text("Expression", "Ausdruck")}<input className="field" id="session-expression" lang={language} value={wish} maxLength={240} onChange={event => setWish(event.target.value)} placeholder={text("e.g. put something into perspective", "z. B. etwas auf den Punkt bringen")} required /></label>
      <label className="form-field" htmlFor="session-expression-meaning">{text("Meaning · optional", "Bedeutung · optional")}<input className="field" id="session-expression-meaning" value={wishMeaning} maxLength={500} onChange={event => setWishMeaning(event.target.value)} /></label>
      <label className="form-field" htmlFor="session-expression-example">{text("Example · optional", "Beispiel · optional")}<input className="field" id="session-expression-example" lang={language} value={wishExample} maxLength={700} onChange={event => setWishExample(event.target.value)} /></label>
      <button className="secondary-button" type="submit" disabled={!wish.trim()}>{text("Save to Chunks", "In Chunks speichern")}</button>
    </form>
  </details>;

  const shadowingView = <section className="shadowing-practice">
      <span className="eyebrow">{text("Sentence", "Satz")} {shadowingIndex + 1} / {Math.max(1, shadowingSentences.length)}</span>
      <h2 lang={language} className="shadowing-sentence">{shadowingSentence}</h2>
      <div className="shadowing-steps" aria-label={text("Shadowing steps", "Shadowing-Schritte")}>
        {[text("Listen", "Hören"), text("Repeat", "Nachsprechen"), text("With rhythm", "Mit Rhythmus")].map((label, position) => <span key={label} aria-current={position === shadowingStep ? "step" : undefined}>{position + 1}. {label}</span>)}
      </div>
      <p className="coach-note">{shadowingStep === 0
        ? text("Listen for the stressed words and the melody of the sentence.", "Achte auf betonte Wörter und die Satzmelodie.")
        : shadowingStep === 1
          ? text("Say the sentence aloud. Keep going through small pauses.", "Sprich den Satz laut nach. Kleine Pausen sind okay.")
          : text("Repeat once more. Link the words and copy the rhythm, rather than stressing every word.", "Sprich noch einmal. Verbinde die Wörter und übernimm den Rhythmus. Achte auf klare Vokale.")}</p>
      <div className="button-row">
        <button className="secondary-button" onClick={() => audioPlaying ? stopAudio() : playAudio(shadowingSentence)}>{audioPlaying ? <Square size={17} /> : <Volume2 size={17} />}{audioPlaying ? text("Stop audio", "Audio stoppen") : text("Listen", "Hören")}</button>
        {shadowingStep < 2
          ? <button className="primary-button" onClick={() => { stopAudio(); setShadowingStep((shadowingStep + 1) as 1 | 2); }}>{shadowingStep === 0 ? text("Repeat now", "Jetzt nachsprechen") : text("Again with rhythm", "Noch einmal mit Rhythmus")}<ChevronRight size={17} /></button>
          : shadowingIndex + 1 < shadowingSentences.length
            ? <button className="primary-button" onClick={() => { stopAudio(); setShadowingIndex(shadowingIndex + 1); setShadowingStep(0); }}>{text("Next sentence", "Nächster Satz")}<ChevronRight size={17} /></button>
            : <button className="secondary-button" onClick={() => { stopAudio(); setShadowingIndex(0); setShadowingStep(0); }}>{text("Repeat the set", "Sätze wiederholen")}</button>}
      </div>
      <small className="audio-disclosure">{text("Synthesized practice audio · your device voice. Practise native rhythm with real recordings too.", "Synthetisches Übungsaudio · Gerätestimme. Übe natürliche Aussprache auch mit echten Aufnahmen.")}</small>
    </section>;

  return <section className="session-page" aria-label={skillNames[skill]}>
    <header className="session-header">
      <button className="icon-button" onClick={close} aria-label={text("Back to practice", "Zurück zum Üben")}><ArrowLeft size={21} /></button>
      <span className="eyebrow">{german ? "Deutsch" : "English"} · {level} · {minutes} min</span>
      <button className="icon-button" onClick={toggleActive} aria-label={active ? text("Pause session", "Übung pausieren") : text("Resume session", "Übung fortsetzen")}>{active ? <Pause size={18} /> : <Play size={18} />}</button>
    </header>
    <div className="session-title"><h1>{skillNames[skill]}</h1><span className="session-active-time">{clockLabel(sessionClock.seconds)} {active ? text("active", "aktiv") : text("paused", "pausiert")}</span></div>
    {!active && <div className="coach-note" role="status">{text("Session paused. Resume when you’re ready.", "Übung pausiert. Setze sie fort, wenn du bereit bist.")} <button className="text-button" onClick={() => setActive(true)}>{text("Resume", "Fortsetzen")}</button></div>}

    <div className="session-content">
      {(skill === "listen" || skill === "read") && ownInputControls}
      {skill === "listen" && <>
        <div className="session-step-heading"><span className="eyebrow">{text("Step", "Schritt")} {listeningStep + 1} / 5</span><h2>{listeningSteps[listeningStep]}</h2></div>
        {listeningStep === 0 && <>
          <h3 lang={language}>{customAudioActive && !customTextActive ? inputAudioName : sessionTitle}</h3>
          <p className="coach-note">{text("Listen for the main idea. Keep the transcript closed on your first pass.", "Höre auf die Hauptaussage. Lass den Text beim ersten Hören geschlossen.")}</p>
          {source && <a className="secondary-button authentic-source" href={source.url} target="_blank" rel="noreferrer">{text("Listen to real English", "Echtes Deutsch hören")}<ChevronRight size={17} /><small>{source.title} · {text("external", "extern")}</small></a>}
          {customAudioActive ? localInputAudio : <div className="practice-audio"><button className="secondary-button" onClick={() => audioPlaying ? stopAudio() : playAudio(sessionText)}>{audioPlaying ? <Square size={17} /> : <Volume2 size={17} />}{audioPlaying ? text("Stop audio", "Audio stoppen") : text("Play device audio", "Geräteaudio abspielen")}</button><small className="audio-disclosure">{customTextActive
            ? text("Your pasted text · synthesized by your device. Add the matching real audio above to hear the original recording.", "Dein eingefügter Text · vom Gerät vorgelesen. Ergänze oben die passende echte Aufnahme, um das Original zu hören.")
            : text("Original practice passage · synthesized by your device. This is not a native-speaker recording.", "Eigener Übungstext · von deinem Gerät vorgelesen. Keine Aufnahme einer Muttersprachlerin oder eines Muttersprachlers.")}</small></div>}
        </>}
        {listeningStep === 1 && <>
          {customAudioActive && !customTextActive ? <p className="coach-note">{text("No transcript has been added for this recording. Paste its matching transcript in “Use my own input” above, or keep listening without text.", "Für diese Aufnahme fehlt noch der passende Text. Füge ihn oben unter „Eigenes Material verwenden“ ein oder höre ohne Text weiter.")}</p> : <>
            <h3 lang={language}>{sessionTitle}</h3>
            {!customAudioActive && <button className="secondary-button" onClick={() => audioPlaying ? stopAudio() : playAudio(sessionText)}>{audioPlaying ? <Square size={17} /> : <Volume2 size={17} />}{audioPlaying ? text("Stop audio", "Audio stoppen") : text("Listen with the text", "Mit Text hören")}</button>}
            <article className="reading-text" lang={language}>{sessionText.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</article>
            <small className="audio-disclosure">{customTextActive ? text("Your pasted transcript", "Dein eingefügter Hörtext") : input.sourceLabel}{!customAudioActive && ` · ${text("device voice", "Gerätestimme")}`}</small>
          </>}
          {customAudioActive && localInputAudio}
        </>}
        {listeningStep === 2 && <>
          <p className="coach-note">{ownInputActive ? text("Listen again. Notice one or two expressions you missed and save them below.", "Höre noch einmal. Achte auf ein oder zwei Ausdrücke, die dir fehlten, und speichere sie unten.") : text("Choose the phrases you missed or want to use yourself.", "Wähle Ausdrücke, die du verpasst hast oder selbst nutzen möchtest.")}</p>
          {ownInputActive ? customExpressionForm : <div className="missed-expressions">{input.expressions.map(expression => <label className="expression-row" key={expression.expression}>
            <input type="checkbox" checked={missed.includes(expression.expression)} onChange={event => setMissed(previous => event.target.checked ? [...previous, expression.expression] : previous.filter(value => value !== expression.expression))} />
            <span><strong lang={language}>{expression.expression}</strong>{missed.includes(expression.expression) && <small>{expression.meaning}</small>}</span>
          </label>)}</div>}
        </>}
        {listeningStep === 3 && <><p className="coach-note">{ownInputActive ? text("Save useful phrases from your own input as complete chunks.", "Speichere nützliche Wendungen aus deinem Material als ganze Chunks.") : text("Keep useful phrases together. Tap + to save a chunk for spaced review.", "Speichere nützliche Wendungen als Ganzes. Mit + kommen sie in die Wiederholung.")}</p>{!ownInputActive && expressionRows(missed.length ? input.expressions.filter(expression => missed.includes(expression.expression)) : input.expressions)}{customExpressionForm}</>}
        {listeningStep === 4 && <><p className="coach-note">{text("Optional: say it aloud and follow the rhythm.", "Optional: Sprich laut nach und folge dem Rhythmus.")}</p>{customAudioActive && !customTextActive ? <><p className="coach-note">{text("Replay a short part of your recording and repeat it aloud. Add a matching transcript above for sentence-by-sentence practice.", "Spiele einen kurzen Teil deiner Aufnahme ab und sprich ihn laut nach. Ergänze oben den passenden Text, um Satz für Satz zu üben.")}</p>{localInputAudio}</> : shadowingView}</>}
        <div className="button-row session-step-controls">
          {listeningStep > 0 && <button className="secondary-button" onClick={() => { stopAudio(); setListeningStep(listeningStep - 1); }}>{text("Back", "Zurück")}</button>}
          {listeningStep < 4 && <button className="primary-button" onClick={() => { stopAudio(); setListeningStep(listeningStep + 1); }}>{listeningStep === 0 ? text("Show transcript", "Text zeigen") : text("Continue", "Weiter")}<ChevronRight size={17} /></button>}
        </div>
      </>}

      {skill === "read" && <>
        <div className="segmented" role="group" aria-label={text("Reading mode", "Lesemodus")}>
          <button aria-pressed={readingMode === "quick"} onClick={() => setReadingMode("quick")}>{text("Quick read", "Einfach lesen")}</button>
          <button aria-pressed={readingMode === "deep"} onClick={() => setReadingMode("deep")}>{text("Deep read", "Genau lesen")}</button>
        </div>
        <h2 lang={language}>{sessionTitle}</h2>
        <p className="coach-note">{readingMode === "quick" ? text("Read for meaning. Keep going past unfamiliar words and summarise the main idea aloud.", "Lies auf Bedeutung. Lies bei unbekannten Wörtern weiter und fasse die Hauptaussage laut zusammen.") : text("Read once for meaning, then notice how the language works.", "Lies zuerst auf Bedeutung. Achte dann darauf, wie die Sprache funktioniert.")}</p>
        <article className="reading-text" lang={language}>{sessionText.split("\n\n").map((paragraph, i) => <p key={i}>{paragraph}</p>)}</article>
        <small className="audio-disclosure">{customTextActive ? text("Your pasted text", "Dein eingefügter Text") : input.sourceLabel}</small>
        {readingMode === "deep" && <section className="deep-reading-notes"><h3>{text("Look closer", "Genauer hinsehen")}</h3>{customTextActive ? <p className="coach-note">{text("Find one useful phrase, one sentence pattern and one transition. Notice their meaning in context, then save what you could use yourself.", "Finde eine nützliche Wendung, ein Satzmuster und einen Übergang. Achte auf ihre Bedeutung im Kontext und speichere, was du selbst nutzen kannst.")}</p> : <ul>{input.deepNotes.map(note => <li key={note}>{note}</li>)}</ul>}</section>}
        {!customTextActive && <details className="session-details" open={readingMode === "deep"}><summary>{text("Useful expressions", "Nützliche Ausdrücke")}</summary>{expressionRows()}</details>}
        {customExpressionForm}
        {source && <a className="secondary-button authentic-source" href={source.url} target="_blank" rel="noreferrer">{text("Keep reading", "Weiterlesen")}<ChevronRight size={17} /><small>{source.title} · {text("external", "extern")}</small></a>}
      </>}

      {skill === "speak" && <>
        <span className="eyebrow">{text("Speak without a script", "Sprich ohne Skript")}</span>
        <h2 className="speaking-prompt" lang={language}>{speakingPrompt}</h2>
        <p className="coach-note">{text("Start with one idea. Add an example. Pauses are part of thinking.", "Beginne mit einem Gedanken. Ergänze ein Beispiel. Denkpausen sind okay.")}</p>
        <div className="segmented" role="group" aria-label={text("Speaking timer length", "Sprechzeit")}>
          {[1, 2, 5, 10].map(duration => <button key={duration} aria-pressed={timerMinutes === duration} onClick={() => { stopRecording(); setSpeakingActive(false); speakingClock.reset(); setTimerMinutes(duration); }}>{duration} min</button>)}
          <button aria-pressed={timerMinutes === null} onClick={() => { stopRecording(); setSpeakingActive(false); speakingClock.reset(); setTimerMinutes(null); }}>{text("Off", "Aus")}</button>
        </div>
        <div className="speaking-timer">
          <div className="timer-display" role="timer" aria-label={text("Speaking time", "Sprechzeit")}>{clockLabel(timerMinutes === null ? speakingClock.seconds : Math.max(0, timerMinutes * 60 - speakingClock.seconds))}</div>
          <button className="primary-button" onClick={() => {
            if (speakingActive) { stopRecording(); setSpeakingActive(false); }
            else { setActive(true); setSpeakingActive(true); }
          }}>{speakingActive ? <Pause size={18} /> : <Play size={18} />}{speakingActive ? text("Pause", "Pause") : speakingClock.seconds ? text("Keep speaking", "Weitersprechen") : text("Start speaking", "Sprechen starten")}</button>
          {timerMinutes !== null && speakingClock.seconds >= timerMinutes * 60 && <p className="coach-note">{text("Time’s up. Finish your thought at your own pace.", "Die Zeit ist um. Beende deinen Gedanken in Ruhe.")}</p>}
        </div>
        <details className="session-details"><summary>{text("Record & listen back", "Aufnehmen & anhören")}</summary>
          <p className="coach-note">{text("Optional local recording. Your voice stays in this session and is not assessed.", "Optionale lokale Aufnahme. Deine Stimme bleibt in dieser Übung und wird nicht bewertet.")}</p>
          <button className="secondary-button" onClick={() => recording === "recording" || recording === "requesting" ? stopRecording() : void startRecording()}>{recording === "recording" ? <Square size={17} /> : <Mic size={17} />}{recording === "recording" ? text("Stop recording", "Aufnahme stoppen") : recording === "requesting" ? text("Cancel microphone request", "Mikrofonanfrage abbrechen") : text("Record my voice", "Meine Stimme aufnehmen")}</button>
          {recordingError && <p className="coach-note" role="alert">{recordingError}</p>}
          {recordingURL && recording !== "recording" && recording !== "requesting" && <div className="recording-playback"><audio controls src={recordingURL} aria-label={text("Your speaking recording", "Deine Sprachaufnahme")} /><div className="button-row"><a className="text-button" href={recordingURL} download={`speaking-${language}.${recordingExtension}`}>{text("Keep recording", "Aufnahme behalten")}</a><button className="icon-button" onClick={() => { if (recordingURLRef.current) URL.revokeObjectURL(recordingURLRef.current); recordingURLRef.current = null; setRecordingURL(null); setRecording("idle"); }} aria-label={text("Delete recording", "Aufnahme löschen")}><Trash2 size={17} /></button></div></div>}
        </details>
        <section className="speaking-reflection"><h3>{text("How did it feel?", "Wie war es?")}</h3><div className="segmented" role="group" aria-label={text("Speaking difficulty", "Schwierigkeit beim Sprechen")}>{(["easy", "okay", "difficult"] as const).map(value => <button key={value} aria-pressed={rating === value} onClick={() => setRating(value)}>{value === "easy" ? text("Easy", "Leicht") : value === "okay" ? text("Okay", "Okay") : text("Difficult", "Schwierig")}</button>)}</div></section>
        {customExpressionForm}
      </>}

      {skill === "write" && <>
        <span className="eyebrow">{text("Write, then refine", "Schreiben, dann verbessern")}</span>
        <h2 className="writing-prompt" lang={language}>{writingPrompt}</h2>
        <label className="form-field" htmlFor="fluency-writing-draft">{text("Your draft", "Dein Entwurf")}<textarea className="field writing-draft" id="fluency-writing-draft" lang={language} value={draft} onChange={event => onDraftChange(event.target.value)} placeholder={text("Make your point clearly…", "Formuliere deinen Gedanken klar …")} maxLength={40000} rows={10} spellCheck autoCapitalize="sentences" /></label>
        <div className="writing-draft-meta"><small>{draft.trim() ? draft.trim().split(/\s+/).length : 0} {text("words", "Wörter")}</small><small>{text("Draft kept on this device", "Entwurf bleibt auf diesem Gerät")}</small></div>
        <section className="writing-self-review"><h3>{text("One useful improvement", "Eine sinnvolle Verbesserung")}</h3><p className="coach-note">{text("Self-review, not automatic assessment. Pick the most useful change first.", "Selbstcheck, keine automatische Bewertung. Wähle zuerst die wichtigste Änderung.")}</p>
          {[
            [text("Correctness", "Korrektheit"), text("Check verb forms, articles and prepositions.", "Prüfe Verbformen, Artikel und Präpositionen.")],
            [text("Naturalness", "Natürlichkeit"), text("Would you say this aloud? Remove literal translations.", "Würdest du das so sagen? Vermeide wörtliche Übersetzungen.")],
            [text("Vocabulary", "Wortwahl"), text("Use a precise phrase, not a longer word for its own sake.", "Nutze einen präzisen Ausdruck statt unnötig langer Wörter.")],
            [text("Sentence structure", "Satzbau"), text("Vary the structure while keeping sentences clear.", "Variiere den Satzbau und bleibe verständlich.")],
            [text("Logic / clarity", "Logik / Klarheit"), text("Does each point follow? Add one example if needed.", "Folgen die Gedanken logisch? Ergänze bei Bedarf ein Beispiel.")],
            [text("Native-like alternative", "Natürliche Alternative"), text("Try another way to express the same idea and register.", "Formuliere denselben Gedanken anders im passenden Register.")],
          ].map(([title, hint], position) => <details className="self-review-category" key={title}><summary><span>{title}</span><span aria-hidden="true">{checks.includes(position) ? "✓" : "+"}</span></summary><p>{hint}</p><label><input type="checkbox" checked={checks.includes(position)} onChange={event => setChecks(previous => event.target.checked ? [...previous, position] : previous.filter(value => value !== position))} />{text("I checked this", "Geprüft")}</label></details>)}
        </section>
        <details className="session-details correction-model"><summary>{text("See a short correction example", "Kurzes Korrekturbeispiel")}</summary><p className="coach-note">{text("Illustrative example. This feedback is not generated from your draft.", "Ein Lernbeispiel. Diese Rückmeldung wurde nicht aus deinem Entwurf erzeugt.")}</p>
          <div className="correction-level"><small>{text("Incorrect", "Falsch")}</small><p lang={language}>{text("I make sport every Tuesday.", "Ich mache Sport an jeden Dienstag.")}</p></div>
          <div className="correction-level"><small>{text("Correct but unnatural", "Korrekt, aber unnatürlich")}</small><p lang={language}>{text("I perform physical exercise every Tuesday.", "Ich betätige mich jeden Dienstag sportlich.")}</p></div>
          <div className="correction-level natural"><small>{text("Natural", "Natürlich")}</small><p lang={language}>{text("I work out every Tuesday.", "Ich mache jeden Dienstag Sport.")}</p></div>
          <details><summary>{text("Why?", "Warum?")}</summary><p>{text("English uses exercise, do sport or work out rather than make sport. Perform physical exercise is grammatical but stiff in everyday conversation.", "Jeden Dienstag braucht hier keine Präposition. Sich sportlich betätigen ist korrekt, klingt im Alltag aber förmlich.")}</p></details>
          <div className="correction-level"><small>{text("Advanced / native-like", "Fortgeschritten / idiomatisch")}</small><p lang={language}>{text("I make time for a workout every Tuesday.", "Dienstags plane ich mir bewusst Zeit fürs Training ein.")}</p><small>{text("This adds the idea of deliberately making time. Natural language need not use difficult words.", "Das betont die bewusste Zeitplanung. Natürliche Sprache braucht keine schwierigen Wörter.")}</small></div>
        </details>
        <details className="session-details"><summary>{text("Useful phrases for this level", "Nützliche Wendungen für dein Niveau")}</summary>{expressionRows()}</details>
        {customExpressionForm}
      </>}

      {skill === "pronunciation" && shadowingView}
    </div>

    {status && <p className="session-status coach-note" role="status">{status}</p>}
    <footer className="session-footer"><button className="primary-button" onClick={finish}><Check size={18} />{text("Finish session", "Übung abschließen")}</button><small>{text("Only active time counts. Hidden tabs and pauses do not.", "Nur aktive Zeit zählt. Verborgene Tabs und Pausen zählen nicht.")}</small></footer>
  </section>;
}
