"use client";

import {useState} from "react";
import {ArrowLeft,ChevronDown,ChevronRight,Layers} from "lucide-react";
import {exercises,type Language,type Level,type Category,type Exercise} from "@/lib/curriculum";
import type {ProgressState} from "@/lib/progress";

type Props = {
 language:Language;
 level:Level;
 progress:ProgressState;
 glosses?:boolean;
 onPractice:(mode:Category|"review",rules?:string[])=>void;
 onClose:()=>void;
};
type WeakPoint = {rule:string;misses:number;attempts:number;example:Exercise};

export default function GrammarWorkspace(props:Props){
 return <GrammarBody key={`${props.language}-${props.level}`} {...props}/>;
}

function GrammarBody({language,level,progress,glosses=false,onPractice,onClose}:Props){
 const [tab,setTab] = useState<"learn"|"practice"|"weak">("learn");
 const [expanded,setExpanded] = useState<string|null>(null);
 const [weakLimit,setWeakLimit] = useState(6);
 const current = exercises.filter(exercise=>exercise.language===language&&exercise.level===level&&exercise.category==="grammar");
 const rules = Array.from(new Map(current.map(exercise=>[exercise.rule,exercise])).values());
 const weakByRule = new Map<string,WeakPoint>();
 for(const exercise of exercises){
  if(exercise.language!==language||exercise.category!=="grammar")continue;
  const record = progress.records[exercise.id];
  if(!record)continue;
  const misses = Math.max(0,record.attempts-record.correct_count);
  if(!misses||record.streak>=3)continue;
  const existing = weakByRule.get(exercise.rule);
  weakByRule.set(exercise.rule,{rule:exercise.rule,misses:misses+(existing?.misses??0),attempts:record.attempts+(existing?.attempts??0),example:existing?.example??exercise});
 }
 const weak = Array.from(weakByRule.values()).filter(point=>point.misses>=2).sort((a,b)=>b.misses-a.misses||a.rule.localeCompare(b.rule));
 function example(exercise:Exercise){return exercise.prompt.includes("___")?exercise.prompt.replace("___",exercise.answer):exercise.example??exercise.answer;}

 return <section className="session-page">
  <header className="session-header"><button className="icon-button" aria-label="Back to practice" onClick={onClose}><ArrowLeft size={22}/></button><span className="eyebrow">{language==="en"?"English":"Deutsch"} · {level}</span></header>
  <div className="session-content"><h1>Grammar</h1><p className="coach-note">A short explanation. Then use it.</p>
   <div className="segmented" aria-label="Grammar section"><button aria-pressed={tab==="learn"} className={tab==="learn"?"active":""} onClick={()=>setTab("learn")}>Learn</button><button aria-pressed={tab==="practice"} className={tab==="practice"?"active":""} onClick={()=>setTab("practice")}>Practice</button><button aria-pressed={tab==="weak"} className={tab==="weak"?"active":""} onClick={()=>setTab("weak")}>My Weak Points</button></div>
   {tab==="learn"&&<div className="grammar-lessons">{rules.map(exercise=><article className="expression-row" key={exercise.id}><button className="list-row" onClick={()=>setExpanded(expanded===exercise.rule?null:exercise.rule)} aria-expanded={expanded===exercise.rule}><span><strong>{exercise.rule}</strong><small lang={language}>{example(exercise)}</small></span><ChevronDown size={17}/></button>{expanded===exercise.rule&&<div className="expression-details"><p>{exercise.explanation}</p><p className="grammar-example" lang={language}>{example(exercise)}</p>{glosses&&<p className="coach-note" lang="zh">{exercise.chinese}</p>}<button className="secondary-button" onClick={()=>onPractice("grammar",[exercise.rule])}>Practise this</button></div>}</article>)}</div>}
   {tab==="practice"&&<div className="grammar-practice"><button className="list-row" onClick={()=>onPractice("grammar")}><span><strong>Grammar in context</strong><small>{level} · short sentence exercises</small></span><ChevronRight size={20}/></button><button className="list-row" onClick={()=>onPractice("sentences")}><span><strong>Sentence builder</strong><small>Put natural sentences together</small></span><Layers size={20}/></button>{weak.length>0&&<button className="list-row" onClick={()=>onPractice("grammar",weak.map(point=>point.rule))}><span><strong>Work on weak points</strong><small>{weak.length} patterns to revisit</small></span><ChevronRight size={20}/></button>}<p className="coach-note">Choose a pattern in Learn for a focused practice session.</p></div>}
   {tab==="weak"&&<div>{!weak.length?<div className="empty-state"><h2>No repeated patterns yet</h2><p>Patterns appear here after repeated missed answers. Three correct answers in a row clear a pattern.</p><button className="primary-button" onClick={()=>onPractice("grammar")}>Practise grammar</button></div>:<><p className="coach-note">Based on your exercise answers in {language==="en"?"English":"Deutsch"}. These are practice patterns, not an assessment of your level.</p><button className="primary-button" onClick={()=>onPractice("grammar",weak.map(point=>point.rule))}>Practise weak points</button>{weak.slice(0,weakLimit).map(point=><article className="expression-row" key={point.rule}><button className="list-row" onClick={()=>setExpanded(expanded===point.rule?null:point.rule)} aria-expanded={expanded===point.rule}><span><strong>{point.rule}</strong><small>{point.misses} missed answers · {point.example.level}</small></span><ChevronDown size={17}/></button>{expanded===point.rule&&<div className="expression-details"><p>{point.example.explanation}</p><p className="grammar-example" lang={language}>{example(point.example)}</p>{glosses&&<p className="coach-note" lang="zh">{point.example.chinese}</p>}<button className="secondary-button" onClick={()=>onPractice("grammar",[point.rule])}>Practise this pattern</button></div>}</article>)}{weak.length>weakLimit&&<button className="secondary-button" onClick={()=>setWeakLimit(weakLimit+6)}>Show more patterns</button>}</>}</div>}
  </div>
 </section>;
}
