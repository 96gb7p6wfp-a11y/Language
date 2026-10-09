"use client";

import {useState} from "react";
import {ArrowLeft,Check,ChevronDown,Plus,Volume2} from "lucide-react";
import {words,type Language,type Level} from "@/lib/curriculum";
import type {Chunk} from "@/lib/coach";

type ChunkInput = Pick<Chunk,"expression"|"meaning"|"example"|"context"|"language"|"level">;
type Rating = "easy"|"okay"|"difficult";
type Props = {
 language:Language;
 level:Level;
 chunks:Chunk[];
 glosses?:boolean;
 onSave:(input:ChunkInput)=>void;
 onReview:(id:string,rating:Rating)=>void;
 onClose:()=>void;
 onComplete?:(seconds:number)=>void;
};
type Expression = {expression:string;meaning:string;example:string;context:string};
const suggestionData:Record<Language,Record<string,string[][]>> = {
 en:{
  A1:[["Can I have …?","Ask for something politely","Can I have a glass of water, please?","Everyday requests"],["I would like to …","Say what you want to do","I would like to learn German.","Plans"],["How about you?","Ask the same question back","I like volleyball. How about you?","Conversation"]],
  A2:[["make an appointment","Arrange a time to meet","I'd like to make an appointment for Friday.","Everyday life"],["get better at","Improve a skill","I'm getting better at explaining my ideas.","Learning"],["be on my way","Be travelling to a place","I'm on my way. I'll be there in ten minutes.","Informal conversation"]],
  B1:[["run out of time","Have no time left","We ran out of time before we could discuss it.","School and work"],["look forward to doing","Feel pleased about a future activity","I'm looking forward to playing volleyball tomorrow.","Everyday conversation"],["see what you mean","Understand someone's point","I see what you mean, but I'm not sure I agree.","Discussion"]],
  B2:[["face the consequences","Accept the results of your actions","We need to face the consequences of that decision.","Consequences · common collocation"],["put something into perspective","See something in a wider context","Talking to her helped me put the problem into perspective.","Perspective · natural conversation"],["take something into account","Consider something when deciding","We should take everyone's circumstances into account.","Discussion"]],
  C1:[["a case in point","An example that supports what you said","Public transport is a case in point: access varies hugely.","Discussion · neutral/formal"],["strike a balance between","Find a sensible compromise","We need to strike a balance between freedom and responsibility.","Argument · common collocation"],["to put it another way","Explain the same point differently","To put it another way, more choice doesn't always mean more freedom.","Speech and writing"]],
  C2:[["not least because","Emphasise an important reason","The policy deserves scrutiny, not least because its effects are uneven.","Argument · formal"],["for all its merits","Acknowledge strengths before a reservation","For all its merits, the proposal leaves the main question unanswered.","Concession · formal"],["that's beside the point","Say something is not relevant to the main issue","That may be true, but that's beside the point.","Discussion · spoken"]],
 },
 de:{
  A1:[["Ich hätte gern …","Höflich etwas bestellen","Ich hätte gern ein Glas Wasser.","Alltag"],["Wie geht es dir?","Nach dem Befinden fragen","Hallo, wie geht es dir?","Gespräch"],["Ich komme aus …","Die Herkunft nennen","Ich komme aus China.","Sich vorstellen"]],
  A2:[["einen Termin vereinbaren","Eine Zeit für ein Treffen festlegen","Ich möchte einen Termin für Freitag vereinbaren.","Alltag"],["auf dem Weg sein","Gerade zu einem Ort fahren oder gehen","Ich bin auf dem Weg und komme in zehn Minuten.","Gesprochenes Deutsch"],["sich Zeit nehmen für","Etwas ohne Eile tun","Ich nehme mir heute Zeit für ein gutes Buch.","Alltag"]],
  B1:[["sich kümmern um","Für etwas sorgen","Ich kümmere mich um die Getränke.","Alltag · mit Akkusativ"],["in Frage kommen","Eine mögliche Wahl sein","Für mich kommt auch ein Studium im Ausland in Frage.","Pläne"],["Das sehe ich genauso.","Einer Meinung zustimmen","Das sehe ich genauso. Wir sollten früher anfangen.","Gespräch"]],
  B2:[["die Folgen tragen","Die Konsequenzen einer Handlung akzeptieren","Wer so entscheidet, muss auch die Folgen tragen.","Diskussion · feste Verbindung"],["etwas in Betracht ziehen","Eine Möglichkeit berücksichtigen","Wir sollten auch eine andere Lösung in Betracht ziehen.","Diskussion"],["aus meiner Sicht","Die eigene Perspektive ausdrücken","Aus meiner Sicht überwiegen die Vorteile.","Meinung · neutral"]],
  C1:[["etwas in Kauf nehmen","Einen Nachteil bewusst akzeptieren","Für mehr Flexibilität nehmen wir gewisse Nachteile in Kauf.","Argumentation · feste Verbindung"],["eine differenzierte Sicht auf","Verschiedene Aspekte eines Themas erkennen","Der Text eröffnet eine differenzierte Sicht auf soziale Mobilität.","Schule und Universität"],["Das leuchtet mir ein.","Eine Erklärung nachvollziehbar finden","Das leuchtet mir ein, aber eine Frage bleibt offen.","Natürliches gesprochenes Deutsch"]],
  C2:[["dem ist entgegenzuhalten, dass","Ein begründetes Gegenargument einführen","Dem ist entgegenzuhalten, dass nicht alle gleichermaßen profitieren.","Argumentation · formell"],["bei näherer Betrachtung","Etwas genauer untersuchen","Bei näherer Betrachtung erweist sich der Gegensatz als weniger eindeutig.","Analyse · formell"],["so pauschal würde ich das nicht sagen","Eine zu allgemeine Aussage einschränken","So pauschal würde ich das nicht sagen; es kommt auf den Kontext an.","Diskussion · gesprochen"]],
 },
};
const emptyForm = {expression:"",meaning:"",example:"",context:""};
const levels:Level[] = ["A1","A2","B1","B2","C1","C2"];

export default function ChunksWorkspace(props:Props){
 return <ChunksBody key={props.language} {...props}/>;
}

function ChunksBody({language,level,chunks,glosses=false,onSave,onReview,onClose,onComplete}:Props){
 const [now,setNow] = useState(()=>Date.now());
 const [view,setView] = useState<"due"|"all">("due");
 const [limit,setLimit] = useState(8);
 const [form,setForm] = useState(emptyForm);
 const [adding,setAdding] = useState(false);
 const [status,setStatus] = useState("");
 const [bankOpen,setBankOpen] = useState(false);
 const [bankLevel,setBankLevel] = useState<Level|"all">(level);
 const [bankLimit,setBankLimit] = useState(8);
 const [expanded,setExpanded] = useState<string|null>(null);
 const [review,setReview] = useState<{ids:string[];index:number;revealed:boolean;startedAt:number}|null>(null);
 const own = chunks.filter(item=>item.language===language).sort((a,b)=>a.dueAt-b.dueAt);
 const due = own.filter(item=>item.dueAt<=now);
 const visible = view==="due"?due:own;
 const suggestions:Expression[] = (suggestionData[language][level]??[]).map(([expression,meaning,example,context])=>({expression,meaning,example,context}));
 const bank = words.filter(word=>word.language===language&&(bankLevel==="all"||word.level===bankLevel));
 const current = review?own.find(item=>item.id===review.ids[review.index]):undefined;
 const reviewFinished = !!review&&review.index>=review.ids.length;

 function play(text:string){
  if(typeof window==="undefined"||!("speechSynthesis" in window)){setStatus("Speech playback is unavailable in this browser.");return;}
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang=language==="en"?"en-GB":"de-DE";
  utterance.onerror=()=>setStatus("Playback failed. Try the Listen button again.");
  window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
 }
 function save(input:Expression,targetLevel=level){
  onSave({...input,language,level:targetLevel});
  setNow(Date.now());
  setStatus(`Saved “${input.expression}”.`);
 }
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  const input = Object.fromEntries(Object.entries(form).map(([key,value])=>[key,value.trim()])) as Expression;
  if(!input.expression||!input.meaning)return;
  save(input);setForm(emptyForm);setAdding(false);
 }
 function startReview(){
  setReview({ids:visible.map(item=>item.id),index:0,revealed:false,startedAt:Date.now()});setStatus("");
 }
 function rate(rating:Rating){
  if(!review||!current||!review.revealed)return;
  onReview(current.id,rating);
  setNow(Date.now());
  setReview({...review,index:review.index+1,revealed:false});
 }
 function finish(){
  if(review)onComplete?.(Math.max(0,Math.floor((Date.now()-review.startedAt)/1000)));
  onClose();
 }

 return <section className="session-page">
  <header className="session-header"><button className="icon-button" aria-label={review?"Back to chunks":"Back to practice"} onClick={()=>review?setReview(null):onClose()}><ArrowLeft size={22}/></button><span className="eyebrow">{language==="en"?"English":"Deutsch"} · {level}</span></header>
  <div className="session-content">
   <h1>{review?"Recall a phrase":"Chunks"}</h1>
   {reviewFinished?<div className="empty-state"><Check size={28}/><h2>Review complete</h2><p>{review!.ids.length} expressions revisited.</p><button className="primary-button" onClick={finish}>Finish review</button></div>:review&&current?<div className="chunk-review">
    <p className="coach-note">{review.index+1} / {review.ids.length} · Recall it, then say it in your own sentence.</p>
    <span className="eyebrow">How would you say this?</span><h2>{current.meaning}</h2>{current.context&&<p className="coach-note">{current.context}</p>}
    {!review.revealed?<button className="primary-button" onClick={()=>setReview({...review,revealed:true})}>Reveal expression</button>:<>
     <div className="grammar-example" lang={language}><h2>{current.expression}</h2>{current.example&&<p>{current.example}</p>}<button className="secondary-button" onClick={()=>play(current.expression+". "+current.example)}><Volume2 size={17}/>Listen</button></div>
     <p className="coach-note">How easy was it to recall? This is your own rating.</p><div className="button-row"><button className="secondary-button" onClick={()=>rate("difficult")}>Difficult</button><button className="secondary-button" onClick={()=>rate("okay")}>Okay</button><button className="primary-button" onClick={()=>rate("easy")}>Easy</button></div>
    </>}
   </div>:review?<div className="empty-state"><p>This expression is no longer available.</p><button className="secondary-button" onClick={()=>setReview(null)}>Back to chunks</button></div>:<>
    <p className="coach-note">{due.length?`${due.length} ready to review`:"No reviews due"} · {own.length} saved in {language==="en"?"English":"Deutsch"}</p>
    <div className="button-row">{visible.length>0&&<button className="primary-button" onClick={startReview}>Review {view==="due"?"due":"saved"} expressions</button>}<button className="secondary-button" onClick={()=>{setAdding(!adding);setStatus("");}} aria-expanded={adding}><Plus size={17}/>Add expression</button></div>
    {adding&&<form className="chunk-form" onSubmit={submit}>
     <label className="form-field">Expression<input className="field" lang={language} required maxLength={300} autoFocus value={form.expression} onChange={event=>setForm({...form,expression:event.target.value})} placeholder={language==="en"?"put something into perspective":"etwas in Betracht ziehen"}/></label>
     <label className="form-field">Meaning<input className="field" required maxLength={1000} value={form.meaning} onChange={event=>setForm({...form,meaning:event.target.value})} placeholder="A short explanation"/></label>
     <label className="form-field">Example <span className="coach-note">optional</span><textarea className="field" lang={language} rows={2} maxLength={2000} value={form.example} onChange={event=>setForm({...form,example:event.target.value})}/></label>
     <label className="form-field">Context <span className="coach-note">optional</span><input className="field" maxLength={1000} value={form.context} onChange={event=>setForm({...form,context:event.target.value})} placeholder="Where did you hear or read it?"/></label>
     <div className="button-row"><button className="primary-button" type="submit">Save expression</button><button className="secondary-button" type="button" onClick={()=>setAdding(false)}>Cancel</button></div>
    </form>}
    <div className="segmented" aria-label="Saved expressions"><button className={view==="due"?"active":""} aria-pressed={view==="due"} onClick={()=>{setView("due");setLimit(8);setNow(Date.now());}}>Due</button><button className={view==="all"?"active":""} aria-pressed={view==="all"} onClick={()=>{setView("all");setLimit(8);setNow(Date.now());}}>All saved</button></div>
    {!visible.length?<div className="empty-state"><p>{view==="due"&&own.length?"You're up to date. Use a saved phrase in a conversation today.":"Save phrases you want to use in real life."}</p></div>:<div>{visible.slice(0,limit).map(item=><article className="expression-row" key={item.id}>
     <button className="list-row" onClick={()=>setExpanded(expanded===item.id?null:item.id)} aria-expanded={expanded===item.id}><span><strong lang={language}>{item.expression}</strong><small>{item.meaning}</small></span><ChevronDown size={17}/></button>
     {expanded===item.id&&<div className="expression-details">{item.example&&<p className="grammar-example" lang={language}>{item.example}</p>}{item.context&&<p className="coach-note">{item.context}</p>}<p className="coach-note">{item.level} · {item.lastReviewed?`Last reviewed ${new Date(item.lastReviewed).toLocaleDateString()}`:"Not reviewed yet"} · {item.dueAt<=now?"Review due":`Next review ${new Date(item.dueAt).toLocaleDateString()}`}<br/>Recall stage {item.mastery} · based on your own ratings</p><button className="secondary-button" onClick={()=>play(item.expression+". "+item.example)}><Volume2 size={17}/>Listen</button></div>}
    </article>)}{visible.length>limit&&<button className="secondary-button" onClick={()=>setLimit(limit+8)}>Show more</button>}</div>}
    <section className="chunk-suggestions"><h2>Useful at {level}</h2>{suggestions.map(item=>{const saved=own.some(chunk=>chunk.expression.toLocaleLowerCase()===item.expression.toLocaleLowerCase());return <article className="expression-row" key={item.expression}><div><h3 lang={language}>{item.expression}</h3><p>{item.meaning}</p><p className="grammar-example" lang={language}>{item.example}</p></div><button className="secondary-button" disabled={saved} onClick={()=>save(item)}>{saved?<Check size={16}/>:<Plus size={16}/>} {saved?"Saved":"Save"}</button></article>;})}</section>
    <section className="legacy-bank"><button className="list-row" onClick={()=>setBankOpen(!bankOpen)} aria-expanded={bankOpen}><span><strong>Original word bank</strong><small>Words and examples · all levels</small></span><ChevronDown size={18}/></button>{bankOpen&&<>
     <label className="form-field">Level<select className="field" value={bankLevel} onChange={event=>{setBankLevel(event.target.value as Level|"all");setBankLimit(8);}}><option value="all">All levels</option>{levels.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
     {bank.slice(0,bankLimit).map(word=><article className="expression-row" key={word.id}><div><h3 lang={language}>{word.word}</h3><p>{word.meaning}{glosses&&<span lang="zh"> · {word.gloss}</span>}</p><p className="grammar-example" lang={language}>{word.example}</p><small className="coach-note">{word.level}</small></div><div className="button-row"><button className="icon-button" aria-label={`Listen to ${word.word}`} onClick={()=>play(word.word+". "+word.example)}><Volume2 size={19}/></button><button className="secondary-button" onClick={()=>{setForm({expression:word.word,meaning:word.meaning,example:word.example,context:`Original ${word.level} word bank`});setAdding(true);window.scrollTo({top:0,behavior:"smooth"});}}>Save as chunk</button></div></article>)}
     {bank.length>bankLimit&&<button className="secondary-button" onClick={()=>setBankLimit(bankLimit+8)}>Show more words</button>}
    </>}</section>
   </>}
   {status&&<p className="coach-note" role="status">{status}</p>}
  </div>
 </section>;
}
