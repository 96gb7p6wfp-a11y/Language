import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {createRequire} from "node:module";
import {activeSeconds,createActiveTime,setTimeActive} from "../lib/active-time.ts";

// Compile TSX for its exported domain functions without rendering browser UI.
const require=createRequire(import.meta.url);
const ts=require("typescript");
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");
const cache=new Map();
function load(filename){
 const absolute=path.resolve(root,filename);
 if(cache.has(absolute))return cache.get(absolute).exports;
 const compiled={exports:{}};cache.set(absolute,compiled);
 const source=ts.transpileModule(fs.readFileSync(absolute,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const localRequire=name=>{
  if(name==="@/components/ui/progress")return {Progress:()=>null};
  if(name.startsWith("@/components/ui/"))return {};
  if(name.startsWith("@/")||name.startsWith(".")){
   const base=name.startsWith("@/")?path.resolve(root,name.slice(2)):path.resolve(path.dirname(absolute),name);
   const file=[".ts",".tsx"].map(extension=>base+extension).find(candidate=>fs.existsSync(candidate));
   if(file)return load(file);
  }
  return require(name);
 };
 vm.runInThisContext("(function(require,module,exports){"+source+"\n})",{filename:absolute})(localRequire,compiled,compiled.exports);
 return compiled.exports;
}
const {exercises}=load("lib/curriculum.ts");
const {buildExerciseDeck}=load("app/components/exercise-practice.tsx");
const {restoreExamDrafts}=load("app/components/exam-workspace.tsx");
const {writingTasks}=load("lib/exam-tasks.ts");
const empty=()=>({settings:{en:"C1",de:"C2"},records:{},days:[]});
const record=(exercise,lastCorrect,dueAt,attempts=1)=>({exercise_id:exercise.id,attempts,correct_count:lastCorrect,streak:lastCorrect,last_correct:lastCorrect,due_at:dueAt,updated_at:100});

test("mixed decks support both languages at every A1–C2 level",()=>{
 for(const language of ["en","de"])for(const level of ["A1","A2","B1","B2","C1","C2"]){
  const deck=buildExerciseDeck(language,level,"mixed",empty(),1,1000);
  assert.ok(deck.length>0&&deck.length<=10,`${language} ${level} has a bounded deck`);
  assert.ok(deck.every(exercise=>exercise.language===language&&exercise.level===level&&exercise.category!=="exam"));
 }
});

test("wrong answers stay ahead of due answers and new questions",()=>{
 const grammar=exercises.filter(exercise=>exercise.language==="en"&&exercise.level==="C1"&&exercise.category==="grammar");
 const progress=empty();
 progress.records[grammar[0].id]=record(grammar[0],0,900,99);
 progress.records[grammar[1].id]=record(grammar[1],1,900);
 const deck=buildExerciseDeck("en","C1","grammar",progress,7,1000);
 assert.equal(deck[0].id,grammar[0].id);
 assert.equal(deck[1].id,grammar[1].id);
 assert.equal(new Set(deck.map(exercise=>exercise.id)).size,deck.length);
});

test("review includes only due records in the selected language",()=>{
 const en=exercises.find(exercise=>exercise.language==="en"&&exercise.level==="C1");
 const future=exercises.find(exercise=>exercise.language==="en"&&exercise.level==="C2");
 const de=exercises.find(exercise=>exercise.language==="de"&&exercise.level==="C1");
 const progress=empty();
 progress.records[en.id]=record(en,0,900);
 progress.records[future.id]=record(future,1,2000);
 progress.records[de.id]=record(de,0,900);
 assert.deepEqual(buildExerciseDeck("en","C2","review",progress,1,1000).map(exercise=>exercise.id),[en.id]);
 assert.deepEqual(buildExerciseDeck("de","A1","review",progress,1,1000).map(exercise=>exercise.id),[de.id]);
});

test("weak-point drills respect the selected grammar rules",()=>{
 const weak=exercises.find(exercise=>exercise.language==="de"&&exercise.level==="C2"&&exercise.category==="grammar");
 const deck=buildExerciseDeck("de","C2","grammar",empty(),1,1000,[weak.rule]);
 assert.ok(deck.length>0);
 assert.ok(deck.every(exercise=>exercise.category==="grammar"&&exercise.rule===weak.rule));
 assert.deepEqual(buildExerciseDeck("de","C2","grammar",empty(),1,1000,["Unknown rule"]),[]);
});

test("exam device backup restores text, checks and unsynced changes independently",()=>{
 const en=writingTasks.find(task=>task.language==="en");
 const de=writingTasks.find(task=>task.language==="de");
 const restored=restoreExamDrafts({
  [en.id]:{draft:"My existing essay",checks:en.checklist.map(()=>true),elapsed:36,savedAt:100,dirty:true},
  [de.id]:{draft:"Mein bestehender Text",checks:de.checklist.map(()=>false),elapsed:90,savedAt:200,dirty:false},
  unknown:{draft:"not a supported task"}
 });
 assert.equal(restored[en.id].draft,"My existing essay");
 assert.equal(restored[en.id].elapsed,36);assert.equal(restored[en.id].dirty,true);
 assert.ok(restored[en.id].checks.every(Boolean));
 assert.equal(restored[de.id].draft,"Mein bestehender Text");assert.equal(restored[de.id].dirty,false);
 assert.equal(restored.unknown,undefined);
});

test("malformed backups are rejected or repaired without erasing valid text",()=>{
 const task=writingTasks[0];
 assert.deepEqual(restoreExamDrafts(null),{});
 assert.deepEqual(restoreExamDrafts({[task.id]:{draft:37}}),{});
 const restored=restoreExamDrafts({[task.id]:{draft:"Keep my essay",checks:["invalid"],elapsed:-4,savedAt:NaN,dirty:true}});
 assert.equal(restored[task.id].draft,"Keep my essay");
 assert.deepEqual(restored[task.id].checks,task.checklist.map(()=>false));
 assert.equal(restored[task.id].elapsed,0);assert.equal(restored[task.id].savedAt,null);
});

test("original exam IDs survive and school/IELTS tasks cover the requested formats",()=>{
 for(const id of ["en-task1-transport","en-task2-education","en-task2-technology","de-analysis-attention","de-poem-threshold","de-argument-smartphones"])assert.ok(writingTasks.some(task=>task.id===id));
 assert.equal(new Set(writingTasks.map(task=>task.id)).size,writingTasks.length);
 for(const skill of ["speaking","reading","listening"])assert.ok(writingTasks.some(task=>task.language==="en"&&task.track==="ielts"&&task.skill===skill));
 for(const format of ["Summary","Analysis","Comment","Mediation"])assert.ok(writingTasks.some(task=>task.language==="en"&&task.track==="school"&&task.kind.includes(format)));
 assert.ok(writingTasks.some(task=>task.language==="de"&&task.kind.includes("Materialgestütztes")));
});

test("foreground time excludes hidden documents and navigation away",()=>{
 const clock=createActiveTime();
 setTimeActive(clock,true,1000);
 assert.equal(activeSeconds(clock,11000),10);
 setTimeActive(clock,false,11000);
 assert.equal(activeSeconds(clock,90000),10,"hidden time is excluded");
 setTimeActive(clock,true,90000);
 setTimeActive(clock,true,91000);
 setTimeActive(clock,false,95000);
 assert.equal(activeSeconds(clock,180000),15,"resumed foreground adds only the new segment");
 setTimeActive(clock,false,200000);
 assert.equal(activeSeconds(clock,300000),15,"duplicate pause events add no time");
 assert.equal(activeSeconds(createActiveTime(),300000),0,"new practice does not inherit a historical timer");
});
