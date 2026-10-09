"use client";

import {useEffect, useRef, useState} from "react";
import {ArrowLeft, CheckCircle2, Lightbulb, Plus, RotateCcw, Volume2} from "lucide-react";
import {Progress} from "@/components/ui/progress";
import {categoryNames, exercises, isCorrect, names, type Category, type Exercise, type Language, type Level} from "@/lib/curriculum";
import type {ProgressState} from "@/lib/progress";
import {activeSeconds,createActiveTime,setTimeActive} from "@/lib/active-time";

export type ExerciseMode = Category | "mixed" | "review";
export type SavedExerciseExpression = {expression:string; meaning:string; example:string; context:string; language:Language; level:Level};
type Session = {questions:Exercise[]; index:number; results:boolean[]; seed:number};
type Props = {language:Language; level:Level; progress:ProgressState; mode:ExerciseMode; rules?:string[]; onProgress:(progress:ProgressState)=>void; onClose:()=>void; onSaveExpression?:(expression:SavedExerciseExpression)=>void; onComplete?:(seconds:number)=>void};

function hash(value:string){let result=2166136261;for(const character of value)result=Math.imul(result^character.charCodeAt(0),16777619);return result>>>0;}
function shuffle<T>(items:T[], seed:string):T[]{return items.map((item,index)=>({item,order:hash(seed+"-"+index)})).sort((a,b)=>a.order-b.order).map(entry=>entry.item);}

/** Keep legacy exercise IDs and review intervals; recent errors come first. */
export function buildExerciseDeck(language:Language, level:Level, mode:ExerciseMode, progress:ProgressState, seed:number, now=Date.now(), rules?:string[]):Exercise[]{
 const priority=(exercise:Exercise)=>{const record=progress.records[exercise.id];return record&&!record.last_correct?0:record&&record.due_at<=now?1:!record?2:3;};
 const practiceLevel=mode==="exam"&&["A1","A2","B1"].includes(level)?"B2":level;
 let pool=exercises.filter(exercise=>exercise.language===language&&(mode==="review"?!!progress.records[exercise.id]&&progress.records[exercise.id].due_at<=now:exercise.level===practiceLevel&&(mode==="mixed"?exercise.category!=="exam":exercise.category===mode)));
 if(rules?.length)pool=pool.filter(exercise=>exercise.category==="grammar"&&rules.includes(exercise.rule));
 const compare=(a:Exercise,b:Exercise)=>priority(a)-priority(b)||(progress.records[a.id]?.attempts??0)-(progress.records[b.id]?.attempts??0)||hash(a.id+seed)-hash(b.id+seed);
 pool=pool.sort(compare);
 if(mode==="mixed")pool=(["vocabulary","grammar","sentences","daily"] as Category[]).flatMap(category=>pool.filter(exercise=>exercise.category===category).slice(0,category==="vocabulary"||category==="grammar"?3:2)).sort(compare);
 return pool.slice(0,mode==="mixed"?10:8);
}

export default function ExercisePractice({language,level,progress,mode,rules,onProgress,onClose,onSaveExpression,onComplete}:Props){
 const createSession=():Session=>{const seed=Date.now();return {questions:buildExerciseDeck(language,level,mode,progress,seed,Date.now(),rules),index:0,results:[],seed};};
 const [session,setSession]=useState<Session>(createSession);
 const [answer,setAnswer]=useState("");
 const [chosen,setChosen]=useState<number[]>([]);
 const [feedback,setFeedback]=useState<boolean|null>(null);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");
 const [speechError,setSpeechError]=useState("");
 const [glosses,setGlosses]=useState(false);
 const [savedExpressions,setSavedExpressions]=useState<string[]>([]);
 const attemptId=useRef("");
 const inFlight=useRef(false);
 const completedCallback=useRef(false);
 const activeClock=useRef(createActiveTime());
 const inputRef=useRef<HTMLInputElement>(null);
 const sessionKey=useRef(`${language}:${level}:${mode}:${JSON.stringify(rules??[])}`);
 const current=session.questions[session.index];
 const completed=session.index===session.questions.length;

 useEffect(()=>{let canceled=false;const visibility=()=>setTimeActive(activeClock.current,!completedCallback.current&&document.visibilityState!=="hidden",Date.now());visibility();document.addEventListener("visibilitychange",visibility);queueMicrotask(()=>{if(canceled)return;try{setGlosses(localStorage.getItem("phrase-glosses")==="true");}catch{}});return()=>{canceled=true;setTimeActive(activeClock.current,false,Date.now());document.removeEventListener("visibilitychange",visibility);window.speechSynthesis?.cancel();};},[]);
 useEffect(()=>{const key=`${language}:${level}:${mode}:${JSON.stringify(rules??[])}`;if(sessionKey.current===key)return;sessionKey.current=key;const seed=Date.now();setSession({questions:buildExerciseDeck(language,level,mode,progress,seed,Date.now(),rules),index:0,results:[],seed});setAnswer("");setChosen([]);setFeedback(null);setError("");attemptId.current="";completedCallback.current=false;activeClock.current=createActiveTime();setTimeActive(activeClock.current,document.visibilityState!=="hidden",Date.now());},[language,level,mode,rules,progress]);

 function resetQuestion(){setAnswer("");setChosen([]);setFeedback(null);setError("");setSpeechError("");attemptId.current="";}
 function speak(text:string){setSpeechError("");if(!("speechSynthesis" in window)){setSpeechError("Audio is unavailable on this device. Read the sentence aloud.");return;}try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language==="en"?"en-GB":"de-DE";utterance.rate=.85;const voice=window.speechSynthesis.getVoices().find(item=>item.lang.startsWith(language));if(voice)utterance.voice=voice;utterance.onerror=event=>{if(!["interrupted","canceled"].includes(event.error))setSpeechError("Audio could not play. Try again.");};window.speechSynthesis.speak(utterance);}catch{setSpeechError("Audio could not play. Read the sentence aloud.");}}
 async function checkAnswer(){
  if(!current||inFlight.current||feedback!==null)return;
  const submitted=current.kind==="order"?chosen.map(index=>current.chunks![index]).join(" "):answer;
  if(!submitted.trim())return;
  inFlight.current=true;setSaving(true);setError("");
  if(!attemptId.current)attemptId.current=crypto.randomUUID();
  try{const response=await fetch("/api/practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:attemptId.current,exerciseId:current.id,answer:submitted})});const result=await response.json() as {correct:boolean;progress:ProgressState;error?:string};if(!response.ok)throw new Error(result.error??"Your answer has not been saved. Try again.");onProgress(result.progress);setFeedback(result.correct);setSession(value=>({...value,results:[...value.results,result.correct]}));}catch(cause){setError((cause as Error).message);}finally{inFlight.current=false;setSaving(false);}
 }
 function nextQuestion(){if(feedback===null)return;if(session.index===session.questions.length-1&&!completedCallback.current){completedCallback.current=true;setTimeActive(activeClock.current,false,Date.now());onComplete?.(Math.max(1,activeSeconds(activeClock.current,Date.now())));}resetQuestion();setSession(value=>({...value,index:value.index+1}));window.speechSynthesis?.cancel();}
 function saveExpression(){if(!current||!onSaveExpression)return;onSaveExpression({expression:current.word??current.example??current.answer,meaning:current.category==="vocabulary"&&current.kind==="choice"?current.answer:current.rule,example:current.example??current.answer,context:current.explanation,language,level:current.level});setSavedExpressions(value=>[...value,current.id]);}
 function practiceAgain(){resetQuestion();completedCallback.current=false;activeClock.current=createActiveTime();setTimeActive(activeClock.current,document.visibilityState!=="hidden",Date.now());setSession(createSession());}
 const canCheck=current?.kind==="order"?chosen.length===current.chunks?.length:!!answer.trim();
 const optionOrder=current?.options?shuffle(current.options,current.id+session.seed):[];
 const chunkOrder=current?.chunks?shuffle(current.chunks.map((_,index)=>index),current.id+session.seed):[];

 return <section className="practice-panel" aria-label={mode==="review"?"Spaced review":"Language exercises"}>
  <button className="back-button" disabled={saving} onClick={onClose}><ArrowLeft size={18}/>Back</button>
  {completed?<div className="session-complete"><CheckCircle2 size={40}/><p className="eyebrow">{session.questions.length?"SESSION COMPLETE":"REVIEW"}</p><h2>{session.questions.length?"Keep it going.":"You’re all caught up."}</h2>{session.questions.length>0&&<><p>{session.results.filter(Boolean).length} of {session.results.length} answers correct.</p>{session.results.some(result=>!result)&&<p>Missed questions return in your next review.</p>}</>}<button className="primary-button" onClick={onClose}>Done</button>{session.questions.length>0&&<button className="secondary-button" onClick={practiceAgain}>Practice again</button>}</div>:current&&<>
   <div className="practice-top"><span>{names[language]} · {current.level}</span><span>{session.index+1} / {session.questions.length}</span></div>
   <Progress value={session.index/session.questions.length*100} aria-label="Practice session progress"/>
   <p className="eyebrow">{categoryNames[current.category]}</p>
   <h2 className="question-title" lang={current.category==="grammar"||(current.category==="exam"&&language==="de")?language:"en"}>{current.prompt}</h2>
   <p className="practice-hint">{current.kind==="choice"?"Choose one answer":current.kind==="write"?"Type the word or phrase":"Tap the words in order"}</p>
   {current.kind==="choice"&&<div className="answer-options">{optionOrder.map((option,index)=><button key={option} disabled={feedback!==null||saving} onClick={()=>setAnswer(option)} className={(answer===option?"selected ":"")+(feedback!==null&&isCorrect(current,option)?"correct ":"")+(feedback===false&&answer===option?"incorrect":"")} aria-pressed={answer===option}><span>{String.fromCharCode(65+index)}</span><strong lang={current.category==="vocabulary"?"en":language}>{option}</strong>{feedback!==null&&isCorrect(current,option)&&<CheckCircle2 size={19}/>}</button>)}</div>}
   {current.kind==="write"&&<div className="write-answer"><label htmlFor="word-answer">Your answer{language==="de"?" · include the article when shown":""}</label><input id="word-answer" ref={inputRef} value={answer} onChange={event=>setAnswer(event.target.value)} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();if(feedback!==null)nextQuestion();else void checkAnswer();}}} disabled={feedback!==null||saving} autoComplete="off" autoCapitalize="none" spellCheck={false} lang={language} placeholder={language==="en"?"Type in English…":"Auf Deutsch schreiben…"}/>{language==="de"&&feedback===null&&<div className="special-letters">{["ä","ö","ü","ß"].map(letter=><button key={letter} onClick={()=>{setAnswer(value=>value+letter);inputRef.current?.focus();}} disabled={saving}>{letter}</button>)}</div>}</div>}
   {current.kind==="order"&&<div className="sentence-game"><div className="sentence-answer" aria-live="polite"><span className="sentence-placeholder">{chosen.length?"Your sentence":"Build your sentence."}</span><div>{chosen.map((index,position)=><button key={index} onClick={()=>setChosen(value=>value.filter((_,item)=>item!==position))} disabled={feedback!==null||saving} lang={language}>{current.chunks![index]}</button>)}</div></div><div className="sentence-tiles">{chunkOrder.map(index=><button key={index} onClick={()=>setChosen(value=>[...value,index])} disabled={chosen.includes(index)||feedback!==null||saving} className={chosen.includes(index)?"used":""} lang={language}>{current.chunks![index]}</button>)}</div>{feedback===null&&<button className="reset-sentence" onClick={()=>setChosen([])} disabled={saving||!chosen.length}><RotateCcw size={15}/>Clear sentence</button>}</div>}
   {feedback!==null&&<div className={"feedback "+(feedback?"right":"wrong")} role="status"><div className="feedback-title">{feedback?<CheckCircle2 size={22}/>:<Lightbulb size={22}/>}<strong>{feedback?"That’s right.":"Try this."}</strong></div>{!feedback&&<p className="correct-answer" lang={current.category==="vocabulary"&&current.kind==="choice"?"en":language}>{current.answer}</p>}<h3>{current.rule}</h3><p>{current.explanation}</p>{glosses&&<p className="chinese" lang="zh">{current.chinese}</p>}{(current.example||current.kind==="order")&&<button className="listen-answer" onClick={()=>speak(current.example??current.answer)}><Volume2 size={17}/>Listen and repeat</button>}{onSaveExpression&&<button className="secondary-button" disabled={savedExpressions.includes(current.id)} onClick={saveExpression}><Plus size={16}/>{savedExpressions.includes(current.id)?"Saved to Chunks":"Save expression"}</button>}{speechError&&<p>{speechError}</p>}</div>}
   {error&&<p className="save-error" role="alert">{error}</p>}
   <div className="practice-bottom"><span>{feedback!==null?"Answer saved":"Take your time."}</span><button className="primary-button" disabled={saving||(feedback===null&&!canCheck)} onClick={()=>feedback!==null?nextQuestion():void checkAnswer()}>{saving?"Saving…":feedback!==null?(session.index===session.questions.length-1?"Finish session":"Continue"):error?"Try again":"Check answer"}</button></div>
  </>}
 </section>;
}
