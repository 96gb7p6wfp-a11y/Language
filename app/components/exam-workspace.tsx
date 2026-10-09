"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import {Clock, Play, Pause, RotateCcw, Save, GraduationCap, Lightbulb, CheckCircle2, Volume2} from "lucide-react";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Table, TableBody, TableHeader, TableHead, TableRow, TableCell, TableCaption} from "@/components/ui/table";
import {Progress} from "@/components/ui/progress";
import {writingTasks, wordCount} from "@/lib/exam-tasks";
import type {Language} from "@/lib/curriculum";
import {activeSeconds,createActiveTime,setTimeActive} from "@/lib/active-time";

type Draft = {draft:string; checks:boolean[]; elapsed:number; savedAt:number|null; dirty:boolean};
type ServerDraft = {task_id:string; draft:string; checklist:string; elapsed_seconds:number; updated_at:number};
type Props = {language:Language; active?:boolean; track?:"ielts"|"school"; onStartDrills:()=>void; onComplete?:(seconds:number)=>void};
const BACKUP_KEY="phrase-exam-drafts-v1";
const SELECTION_KEY="phrase-exam-selected-v1";
const fresh=(length:number):Draft=>({draft:"",checks:Array(length).fill(false),elapsed:0,savedAt:null,dirty:false});
const trackFor=(language:Language, track?:"ielts"|"school")=>language==="de"?"school":track??"ielts";

/** Device backups supplement the existing server drafts without changing task IDs. */
export function restoreExamDrafts(value:unknown):Record<string,Draft>{
 const result:Record<string,Draft>={};
 if(!value||typeof value!=="object"||Array.isArray(value))return result;
 for(const task of writingTasks){const entry=(value as Record<string,unknown>)[task.id];if(!entry||typeof entry!=="object"||Array.isArray(entry))continue;const draft=entry as Partial<Draft>;if(typeof draft.draft!=="string"||draft.draft.length>40000)continue;result[task.id]={draft:draft.draft,checks:Array.isArray(draft.checks)&&draft.checks.length===task.checklist.length&&draft.checks.every(check=>typeof check==="boolean")?draft.checks:fresh(task.checklist.length).checks,elapsed:typeof draft.elapsed==="number"&&Number.isFinite(draft.elapsed)?Math.min(86400,Math.max(0,Math.floor(draft.elapsed))):0,savedAt:typeof draft.savedAt==="number"&&Number.isFinite(draft.savedAt)?draft.savedAt:null,dirty:draft.dirty===true};}
 return result;
}

export default function ExamWorkspace({language,active=true,track,onStartDrills,onComplete}:Props){
 const activeTrack=trackFor(language,track);
 const available=writingTasks.filter(task=>task.language===language&&(task.track??(task.language==="en"?"ielts":"school"))===activeTrack);
 const [selected,setSelected]=useState<Record<string,string>>({});
 const task=available.find(item=>item.id===selected[`${language}:${activeTrack}`])??available[0];
 const [drafts,setDrafts]=useState<Record<string,Draft>>({});
 const [loading,setLoading]=useState(true);
 const [hydrated,setHydrated]=useState(false);
 const [savingIds,setSavingIds]=useState<string[]>([]);
 const [error,setError]=useState("");
 const [backupAvailable,setBackupAvailable]=useState(true);
 const [runningId,setRunningId]=useState<string|null>(null);
 const [showModel,setShowModel]=useState(false);
 const [showTranscript,setShowTranscript]=useState(false);
 const [speechError,setSpeechError]=useState("");
 const [finished,setFinished]=useState(false);
 const draftsRef=useRef(drafts);
 const locks=useRef(new Set<string>());
 const mounted=useRef(true);
 const backupAvailableRef=useRef(true);
 const activeClock=useRef(createActiveTime());
 const trackedTask=useRef(task.id);
 const completedRef=useRef(false);
 const current=drafts[task.id]??fresh(task.checklist.length);
 const count=wordCount(current.draft);
 const remaining=Math.max(0,task.minutes*60-current.elapsed);
 const saving=savingIds.includes(task.id);
 const skill=task.skill??"writing";

 const commit=useCallback((next:Record<string,Draft>)=>{
  draftsRef.current=next;setDrafts(next);
  try{localStorage.setItem(BACKUP_KEY,JSON.stringify(next));backupAvailableRef.current=true;setBackupAvailable(true);}catch{backupAvailableRef.current=false;setBackupAvailable(false);}
 },[]);
 const updateDraft=useCallback((id:string, change:Partial<Draft>)=>{const target=writingTasks.find(item=>item.id===id);if(!target)return;commit({...draftsRef.current,[id]:{...(draftsRef.current[id]??fresh(target.checklist.length)),...change,dirty:true}});},[commit]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  setLoading(true);
  try{const response=await fetch("/api/writing",{cache:"no-store",signal});const data=await response.json() as {error?:string;drafts:ServerDraft[]};if(!response.ok)throw new Error(data.error??"Saved drafts could not be loaded.");if(!mounted.current)return;const next={...draftsRef.current};for(const row of data.drafts){const target=writingTasks.find(item=>item.id===row.task_id);const local=next[row.task_id];if(!target||local?.dirty||(local?.savedAt??0)>row.updated_at)continue;let checks:unknown;try{checks=JSON.parse(row.checklist);}catch{checks=[];}next[row.task_id]={draft:row.draft,checks:Array.isArray(checks)&&checks.length===target.checklist.length&&checks.every(check=>typeof check==="boolean")?checks:fresh(target.checklist.length).checks,elapsed:Math.max(0,row.elapsed_seconds),savedAt:row.updated_at,dirty:false};}commit(next);setError("");}catch(cause){if(!signal?.aborted&&mounted.current)setError((cause as Error).message);}finally{if(mounted.current)setLoading(false);}
 },[commit]);
 const saveDraft=useCallback(async(id:string)=>{
  const currentDraft=draftsRef.current[id];if(!currentDraft||locks.current.has(id))return;
  const snapshot={...currentDraft,checks:[...currentDraft.checks]};
  locks.current.add(id);setSavingIds(ids=>[...ids,id]);
  try{const response=await fetch("/api/writing",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({taskId:id,draft:snapshot.draft,checklist:snapshot.checks,elapsedSeconds:snapshot.elapsed})});const data=await response.json() as {error?:string;savedAt:number};if(!response.ok)throw new Error(data.error??"Cloud save is unavailable. Your device backup is kept.");if(!mounted.current)return;const now=draftsRef.current[id]??snapshot;const unchanged=now.draft===snapshot.draft&&now.elapsed===snapshot.elapsed&&JSON.stringify(now.checks)===JSON.stringify(snapshot.checks);commit({...draftsRef.current,[id]:{...now,savedAt:data.savedAt,dirty:!unchanged}});setError("");}catch(cause){if(mounted.current)setError((cause as Error).message);}finally{locks.current.delete(id);if(mounted.current)setSavingIds(ids=>ids.filter(value=>value!==id));}
 },[commit]);

 useEffect(()=>{
  mounted.current=true;
  const controller=new AbortController();
  queueMicrotask(()=>{
  if(controller.signal.aborted)return;
  try{const stored=localStorage.getItem(BACKUP_KEY);if(stored){const restored=restoreExamDrafts(JSON.parse(stored));draftsRef.current=restored;setDrafts(restored);}const storedSelection=localStorage.getItem(SELECTION_KEY);if(storedSelection){const value=JSON.parse(storedSelection);if(value&&typeof value==="object"&&!Array.isArray(value)){const selections:Record<string,string>={};for(const [key,id] of Object.entries(value))if(typeof id==="string"&&writingTasks.some(item=>item.id===id))selections[key]=id;setSelected(selections);}}}catch{}
  setHydrated(true);void load(controller.signal);
  });
  return()=>{mounted.current=false;controller.abort();window.speechSynthesis?.cancel();};
 },[load]);
 useEffect(()=>{let canceled=false;window.speechSynthesis?.cancel();queueMicrotask(()=>{if(canceled)return;setShowModel(false);setShowTranscript(false);setSpeechError("");setRunningId(null);setFinished(false);});return()=>{canceled=true;};},[task.id]);
 useEffect(()=>{
  let canceled=false;
  if(trackedTask.current!==task.id||(active&&completedRef.current)){activeClock.current=createActiveTime();trackedTask.current=task.id;completedRef.current=false;queueMicrotask(()=>{if(!canceled)setFinished(false);});}
  const visibility=()=>{const foreground=active&&!completedRef.current&&document.visibilityState!=="hidden";setTimeActive(activeClock.current,foreground,Date.now());if(!foreground){window.speechSynthesis?.cancel();queueMicrotask(()=>{if(!canceled)setRunningId(null);});}};
  visibility();document.addEventListener("visibilitychange",visibility);
  return()=>{canceled=true;setTimeActive(activeClock.current,false,Date.now());document.removeEventListener("visibilitychange",visibility);};
 },[active,task.id]);
 useEffect(()=>{
  if(!runningId)return;
  const target=writingTasks.find(item=>item.id===runningId)!;
  const initial=draftsRef.current[runningId]?.elapsed??0;
  const started=Date.now();
  const timer=window.setInterval(()=>{const elapsed=Math.min(target.minutes*60,initial+Math.floor((Date.now()-started)/1000));if(elapsed!==(draftsRef.current[runningId]?.elapsed??0))updateDraft(runningId,{elapsed});if(elapsed>=target.minutes*60)setRunningId(null);},500);
  return()=>window.clearInterval(timer);
 },[runningId,updateDraft]);
 // Text and check changes are debounced; elapsed time gets its own periodic save.
 const contentKey=JSON.stringify([task.id,current.draft,current.checks]);
 useEffect(()=>{if(!hydrated||loading||!draftsRef.current[task.id]?.dirty)return;const timeout=window.setTimeout(()=>void saveDraft(task.id),1200);return()=>window.clearTimeout(timeout);},[contentKey,hydrated,loading,task.id,saveDraft]);
 useEffect(()=>{const interval=window.setInterval(()=>{for(const [id,draft] of Object.entries(draftsRef.current))if(draft.dirty)void saveDraft(id);},15000);return()=>window.clearInterval(interval);},[saveDraft]);
 useEffect(()=>{const warn=(event:BeforeUnloadEvent)=>{if(!backupAvailableRef.current&&Object.values(draftsRef.current).some(draft=>draft.dirty&&draft.draft.trim())){event.preventDefault();event.returnValue="";}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);},[]);

 function selectTask(id:string){const next={...selected,[`${language}:${activeTrack}`]:id};setSelected(next);try{localStorage.setItem(SELECTION_KEY,JSON.stringify(next));}catch{}const previous=draftsRef.current[task.id];if(previous?.dirty)void saveDraft(task.id);}
 function speak(){setSpeechError("");if(!("speechSynthesis" in window)){setSpeechError("Device audio is unavailable. Use the transcript.");return;}try{window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(task.sourceText??"");utterance.lang=language==="en"?"en-GB":"de-DE";utterance.rate=.95;utterance.onerror=event=>{if(!["interrupted","canceled"].includes(event.error))setSpeechError("Audio could not play. Try again.");};window.speechSynthesis.speak(utterance);}catch{setSpeechError("Audio could not play. Use the transcript.");}}
 async function finish(){if(finished||saving||!active)return;setTimeActive(activeClock.current,false,Date.now());const seconds=Math.max(1,activeSeconds(activeClock.current,Date.now()));completedRef.current=true;setRunningId(null);setFinished(true);if(draftsRef.current[task.id]?.dirty)await saveDraft(task.id);onComplete?.(seconds);}
 const completedChecks=current.checks.filter(Boolean).length;
 const officialIELTS=language==="en"&&activeTrack==="ielts";

 return <div className="exam-workspace">
  <section className="exam-intro"><div><span className="eyebrow">{officialIELTS?"IELTS":"SCHOOL / KLAUSUR"}</span><h2>{language==="en"?"Practice with purpose.":"Gezielt üben."}</h2><p>{officialIELTS?"Build a clear response. Keep exam practice separate from everyday fluency.":language==="en"?"Summary, analysis, discussion, and mediation.":"Analyse, Interpretation, Erörterung und materialgestütztes Schreiben."}</p></div><button className="secondary-button" onClick={onStartDrills}><GraduationCap size={18}/>{language==="en"?"Skill drills":"Sprachübungen"}</button></section>
  <div className="task-controls"><label>Practice task<Select value={task.id} onValueChange={selectTask} disabled={!hydrated}><SelectTrigger aria-label="Exam practice task"><SelectValue/></SelectTrigger><SelectContent>{available.map(item=><SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent></Select></label><div className="timer" role="timer" aria-label="Practice time remaining"><Clock size={18}/><strong>{String(Math.floor(remaining/60)).padStart(2,"0")}:{String(remaining%60).padStart(2,"0")}</strong><button className="icon-button" onClick={()=>setRunningId(id=>id===task.id?null:task.id)} disabled={!remaining||!hydrated} aria-label={runningId===task.id?"Pause timer":"Start timer"}>{runningId===task.id?<Pause size={18}/>:<Play size={18}/>}</button><button className="icon-button" aria-label="Restart timer" disabled={!hydrated} onClick={()=>{setRunningId(null);updateDraft(task.id,{elapsed:0});}}><RotateCcw size={17}/></button></div></div>
  {error&&<div className="error-banner" role="alert"><span>{error}{backupAvailable&&" Your draft is backed up on this device."}</span><button onClick={()=>current.dirty?void saveDraft(task.id):void load()} disabled={saving||loading}>Retry</button></div>}
  <div className="writing-grid"><div className="writing-primary">
   <section className="task-brief"><span className="eyebrow">{task.kind}</span><p>{task.prompt}</p>{task.table&&<Table className="practice-table"><TableCaption>Fictional practice figures · share of students (%)</TableCaption><TableHeader><TableRow>{task.table.headers.map(header=><TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{task.table.rows.map(row=><TableRow key={row[0]}>{row.map((cell,index)=><TableCell key={index}>{cell}</TableCell>)}</TableRow>)}</TableBody></Table>}{skill==="listening"&&<div className="listening-controls"><button className="primary-button" onClick={speak}><Volume2 size={18}/>Listen</button><button className="secondary-button" aria-expanded={showTranscript} onClick={()=>setShowTranscript(value=>!value)}>{showTranscript?"Hide transcript":"Show transcript"}</button><p className="writing-note">Read by your device’s voice.</p>{speechError&&<p role="status">{speechError}</p>}</div>}{task.sourceText&&(skill!=="listening"||showTranscript)&&<div className="source-text" lang={task.id==="en-school-mediation"?"de":language}>{task.sourceText}</div>}</section>
   <section className="writing-editor"><div className="writing-editor-top"><label htmlFor="exam-draft">{skill==="speaking"?"After speaking: notes and expressions":language==="en"?"Your response":"Dein Text"}</label>{task.minimumWords>0&&<span className={count>=task.minimumWords?"word-target reached":"word-target"}>{count} / {task.minimumWords}+ words</span>}</div><textarea id="exam-draft" lang={language} value={current.draft} onChange={event=>updateDraft(task.id,{draft:event.target.value})} maxLength={40000} disabled={!hydrated} placeholder={skill==="speaking"?"What was easy? Which expressions did you need?":language==="en"?"Write your response…":"Schreibe deinen Text…"} spellCheck autoCapitalize="sentences"/><div className="draft-save-row"><span role="status">{!hydrated?"Loading drafts…":saving?"Saving…":current.dirty?backupAvailable?"Saved on this device · syncing":"Cloud save pending":current.savedAt?"Draft saved":loading?"Checking saved drafts…":"Changes save automatically."}</span><button className="secondary-button" onClick={()=>void saveDraft(task.id)} disabled={saving||!hydrated||!drafts[task.id]}><Save size={17}/>{saving?"Saving…":"Save draft"}</button></div><p className="writing-note">{skill==="speaking"?"Speak first. Pauses are part of thinking. This practice has no automatic speech score.":"The timer is for practice. You can keep writing when it reaches zero."}</p></section>
   <section className="model-section"><button className="model-toggle" onClick={()=>setShowModel(value=>!value)} aria-expanded={showModel}><Lightbulb size={20}/><strong>{showModel?"Hide comparison":skill==="reading"||skill==="listening"?"Show answer key":"Compare with a model"}</strong><span>{task.modelLabel}</span></button>{showModel&&<div className="model-content"><p className="writing-note">{skill==="reading"||skill==="listening"?"Check your answers against the passage and the explanations.":"Use this original practice example to revise your response. It is not an assessed script."}</p><div className="model-response" lang={language}>{task.model.split("\n\n").map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div><h3>{language==="en"?"Why this works":"Was daran funktioniert"}</h3><ul>{task.annotations.map(annotation=><li key={annotation}>{annotation}</li>)}</ul></div>}</section>
   <button className="primary-button" onClick={()=>void finish()} disabled={saving||finished||!hydrated}><CheckCircle2 size={18}/>{finished?"Practice recorded":"Finish practice"}</button>
  </div><aside className="writing-sidebar">
   <section className="writing-plan"><h3>{skill==="writing"?(language==="en"?"Make a short plan":"Kurz planen"):"Your approach"}</h3><ol>{task.outline.map(line=><li key={line}>{line}</li>)}</ol></section>
   <section className="writing-checklist"><div className="checklist-heading"><h3>{language==="en"?"Self-check":"Selbstcheck"}</h3><span>{completedChecks}/{task.checklist.length}</span></div><Progress value={completedChecks/task.checklist.length*100} aria-label="Self-check completion"/>{task.checklist.map((item,index)=><label key={index} htmlFor={task.id+"-check-"+index}><Checkbox id={task.id+"-check-"+index} checked={current.checks[index]} disabled={!hydrated} onCheckedChange={value=>updateDraft(task.id,{checks:current.checks.map((check,position)=>position===index?value===true:check)})}/><span><small>{item.criterion}</small>{item.label}</span></label>)}<p className="writing-note">Your own checks. No automatic {officialIELTS?"IELTS band score":"school grade"}.</p></section>
   <a className="exam-source-link" href={officialIELTS?"https://ielts.org/take-a-test/preparation-resources":language==="en"?"https://www.kmk.org/themen/qualitaetssicherung-in-schulen/bildungsstandards.html":"https://kultus.hessen.de/schulsystem/schulformen-und-bildungsgaenge/gymnasium/landesabitur/operatoren-allgemeinbildende-faecher"} target="_blank" rel="noreferrer">{officialIELTS?"Official IELTS resources":language==="en"?"School standards · KMK":"Offizielle Operatoren · Hessen"}</a>
  </aside></div>
 </div>;
}
