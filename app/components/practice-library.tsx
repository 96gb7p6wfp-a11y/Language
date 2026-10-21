"use client";
import {useEffect,useState} from "react";
import {ArrowLeft,ArrowUpRight,BookOpen,Layers,GraduationCap,Headphones,MessageCircle,PenLine,Mic,Sparkles} from "lucide-react";
import type {Language,Level,Category} from "@/lib/curriculum";
import {emptyProgress,type ProgressState} from "@/lib/progress";
import type {useCoach} from "@/hooks/use-coach";
import FluencySession from "./fluency-session";
import ExercisePractice from "./exercise-practice";
import ChunksWorkspace from "./chunks-workspace";
import GrammarWorkspace from "./grammar-workspace";
import ExamWorkspace from "./exam-workspace";
type Skill="speak"|"listen"|"read"|"write"|"chunks"|"grammar"|"pronunciation"|"exam";
type Active={skill:Skill;mode?:Category|"mixed"|"review";rules?:string[]};
export default function PracticeLibrary({language,level,coach,initial="library",onClose}:{language:Language;level:Level;coach:ReturnType<typeof useCoach>;initial?:"library"|"chunks"|"exam";onClose:()=>void}){
 const [active,setActive]=useState<Active|null>(initial==="library"?null:{skill:initial});
 const [progress,setProgress]=useState<ProgressState>(emptyProgress);
 const [error,setError]=useState("");
 const [glosses,setGlosses]=useState(false);
 const [examTrack,setExamTrack]=useState<"ielts"|"school">("ielts");
 const [examVisited,setExamVisited]=useState(initial==="exam");
 useEffect(()=>{let alive=true;fetch("/api/progress",{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Previous exercise history could not load.");return await r.json() as ProgressState;}).then(p=>{if(alive)setProgress(p);}).catch(e=>{if(alive)setError(e.message);});try{setGlosses(localStorage.getItem("phrase-glosses")==="true");}catch{}return()=>{alive=false;window.speechSynthesis?.cancel();};},[]);
 const close=()=>active?setActive(null):onClose();
 function finish(seconds:number,rating?:"easy"|"okay"|"difficult"){if(active)coach.recordSession({language,skill:active.skill,seconds:Math.max(1,Math.round(seconds)),...(rating?{rating}:{})});setActive(null);}
 const key=`${language}:${level}:${active?.skill??"write"}:library`;
 const go=(skill:Skill)=>{setActive({skill});if(skill==="exam")setExamVisited(true);};
 return <div className="preserved-practice">{error&&<p role="alert" className="mission-error">{error}</p>}
 {active?.mode?<ExercisePractice language={language} level={level} progress={progress} onProgress={setProgress} mode={active.mode} rules={active.rules} onClose={()=>setActive(null)} onSaveExpression={coach.saveChunk} onComplete={finish}/>:active&&["listen","read","speak","write","pronunciation"].includes(active.skill)?<FluencySession key={active.skill} language={language} level={level} skill={active.skill as "listen"|"read"|"speak"|"write"|"pronunciation"} minutes={10} draft={coach.state.drafts[key]??""} onDraftChange={v=>coach.setDraft(key,v)} onSaveChunk={coach.saveChunk} onComplete={r=>finish(r.seconds,r.rating)} onClose={()=>setActive(null)}/>:active?.skill==="chunks"?<ChunksWorkspace language={language} level={level} chunks={coach.state.chunks.filter(c=>c.language===language)} glosses={glosses} onSave={coach.saveChunk} onReview={coach.reviewChunk} onClose={()=>setActive(null)} onComplete={finish}/>:active?.skill==="grammar"?<GrammarWorkspace language={language} level={level} progress={progress} glosses={glosses} onPractice={(mode,rules)=>setActive(a=>a?{...a,mode,rules}:null)} onClose={()=>setActive(null)}/>:!active&&<><button className="mission-back" onClick={onClose}><ArrowLeft size={18}/>Challenges</button><span className="mission-kicker">YOUR PRACTICE LIBRARY</span><h1>Keep a useful tool close.</h1><p className="mission-page-note">Your saved language and earlier practice stay here.</p><div className="library-grid">{([{skill:"speak",title:"Speak & think",Icon:MessageCircle},{skill:"listen",title:"Listen",Icon:Headphones},{skill:"read",title:"Read",Icon:BookOpen},{skill:"write",title:"Write",Icon:PenLine},{skill:"chunks",title:"Chunks",Icon:Layers},{skill:"grammar",title:"Grammar",Icon:Sparkles},{skill:"pronunciation",title:"Shadowing",Icon:Mic},{skill:"exam",title:"Exams",Icon:GraduationCap}] as const).map(({skill,title,Icon})=><button key={skill} onClick={()=>go(skill)}><Icon size={23}/><strong>{title}</strong><ArrowUpRight size={16}/></button>)}</div><details className="mission-details"><summary>Earlier exercises & spaced review</summary><div className="mission-legacy-links">{([{mode:"vocabulary",label:"Word recall"},{mode:"daily",label:"Everyday conversations"},{mode:"mixed",label:"Mixed practice"},{mode:"review",label:"Due exercises"}] as const).map(({mode,label})=><button className="mission-button-secondary" key={mode} onClick={()=>setActive({skill:"grammar",mode})}>{label}</button>)}</div></details></>}
 {examVisited&&<div className="preserved-exam" hidden={active?.skill!=="exam"||!!active.mode}><button className="mission-back" onClick={close}><ArrowLeft size={18}/>Challenges</button><span className="mission-kicker">A SEPARATE FOCUS</span><h1>{language==="en"?"Exam practice":"Klausurtraining"}</h1><p className="mission-page-note">A strong result supports your goals. It does not measure native fluency.</p>{language==="en"&&<div className="mission-filters"><button aria-pressed={examTrack==="ielts"} onClick={()=>setExamTrack("ielts")}>IELTS</button><button aria-pressed={examTrack==="school"} onClick={()=>setExamTrack("school")}>School / Klausur</button></div>}<ExamWorkspace language={language} track={language==="de"?"school":examTrack} active={active?.skill==="exam"&&!active.mode} onStartDrills={()=>setActive({skill:"exam",mode:"exam"})} onComplete={finish}/></div>}
 </div>;
}
