import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const modules=new Map();
function loadTs(file){
 file=resolve(file);if(modules.has(file))return modules.get(file).exports;
 const item={exports:{}};modules.set(file,item);
 const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const localRequire=name=>name.startsWith('.')?loadTs(resolve(dirname(file),name+'.ts')):require(name);
 new Function('require','module','exports',code)(localRequire,item,item.exports);return item.exports;
}
const protocol=loadTs(new URL('../lib/mission-protocol.ts',import.meta.url).pathname);
const {MissionRepository,missionSchemaStatements}=loadTs(new URL('../db/missions.ts',import.meta.url).pathname);
const {createMissionRun,appendMissionFeedback,continueMission,finishMission,expectedMissionAttempt,validateMissionAction,validateMissionPreferences,MissionProtocolError}=protocol;
function setup(){
 const raw=new DatabaseSync(':memory:');
 raw.exec(readFileSync(new URL('../drizzle/0000_fair_mandrill.sql',import.meta.url),'utf8'));
 raw.exec(readFileSync(new URL('../drizzle/0001_jittery_pride.sql',import.meta.url),'utf8'));
 raw.exec(readFileSync(new URL('../drizzle/0002_coach_storage.sql',import.meta.url),'utf8'));
 const prepare=sql=>({sql,bindings:[],bind(...bindings){return {...this,bindings};},async all(){return{results:raw.prepare(sql).all(...this.bindings)};},async first(){return raw.prepare(sql).get(...this.bindings)??null;},async run(){const result=raw.prepare(sql).run(...this.bindings);return{meta:{changes:Number(result.changes)}};}});
 const db={prepare,async batch(statements){raw.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());raw.exec('COMMIT');return results;}catch(error){raw.exec('ROLLBACK');throw error;}}};
 return {raw,db,repo:new MissionRepository(db)};
}
const brief={id:'investor-test',kind:'roleplay',topic:'business',title:'Pitch',teaser:'Pitch',brief:'Pitch an idea',role:'Investor',opening:'Why should I invest?',stakes:'Offer a justified plan.',registers:['professional'],evidence:[],authenticSources:[],maxRounds:3,level:'C1',difficulty:2,languageInstructions:'English'};
const feedback=(adaptation='same')=>({strengths:['You explained a concrete benefit.'],improvements:[{dimension:'naturalness',original:'make sport',improved:'play sport',why:'Use a natural collocation.'}],phrases:[{expression:'a trade-off',meaning:'a compromise',example:'There is a trade-off.'},{expression:'in practice',meaning:'in reality',example:'Does it work in practice?'}],retryPrompt:'Make your claim more precise.',outcome:{state:'in_progress',label:'A promising start',evidence:'You named the benefit but not the risk.'},adaptation,nextChallenge:'How will you handle the risk?'});
function answer(run,attempt=1,adaptation='same',text='I make sport.') {return appendMissionFeedback(run,{id:`answer-${run.round}-${attempt}`,answer:text,inputMode:'text',characterReply:'What evidence supports that?',feedback:feedback(adaptation)},run.updatedAt+1);}
function claim(run,version,id='request-first',now=1000,kind='respond'){return {userId:'user-one',requestId:id,runId:run.id,kind,fingerprint:`hash-${id}`,version,now};}

test('mission phases require response, feedback, retry and continuation in that order',()=>{
 let run=createMissionRun('mission-one',brief,'en',1000);assert.equal(expectedMissionAttempt(run),1);assert.throws(()=>continueMission(run,1001),/Retry/);assert.throws(()=>finishMission(run,1001),/Retry/);
 run=answer(run);assert.equal(run.phase,'feedback');assert.equal(expectedMissionAttempt(run),2);assert.throws(()=>continueMission(run,1002),/Retry/);
 run=answer(run,2,'same','I play sport.');assert.equal(run.phase,'retry');assert.throws(()=>expectedMissionAttempt(run),/Continue/);
 run=continueMission(run,1003);assert.equal(run.round,2);assert.equal(run.currentChallenge,'How will you handle the risk?');
 for(let round=2;round<=3;round++){run=answer(run);run=answer(run,2,'same','I play sport.');run=continueMission(run,1003+round);}
 assert.equal(run.status,'complete');assert.equal(run.phase,'summary');assert.equal(run.level,'C1');assert.equal(run.turns.length,6);assert.ok(run.summary.retryImprovements.some(value=>value.includes('make sport')));assert.equal(run.outcome.state,'partial');
});

test('adaptation changes challenge complexity without inventing CEFR mastery',()=>{
 let run=createMissionRun('mission-one',brief,'de',1000);assert.equal(run.language,'de');run=answer(run,1,'harder');assert.equal(run.difficulty,3);run=answer(run,2,'harder');assert.equal(run.difficulty,3);run=continueMission(run,1005);run=answer(run,1,'scaffold');assert.equal(run.difficulty,2);assert.equal(run.level,'C1');
});

test('completion summary only claims retry edits visible in recorded answers',()=>{
 let run=createMissionRun('mission-one',brief,'en',1000);run=answer(run);run=answer(run,2,'same','I like volleyball.');const done=finishMission(run,1010);assert.deepEqual(done.summary.retryImprovements,[]);assert.ok(done.summary.didWell.length);assert.equal(done.summary.betterExpressions.length,2);assert.strictEqual(finishMission(done,1020),done);
});

test('action validation rejects client-generated assessment/history and oversized answers',()=>{
 const good={action:'respond',runId:'mission-one',requestId:'request-first',answer:'My point is clear.',inputMode:'text',expectedUpdatedAt:1000};assert.deepEqual(validateMissionAction(good),good);
 assert.throws(()=>validateMissionAction({...good,feedback:feedback()}),/valid challenge/);assert.throws(()=>validateMissionAction({...good,answer:'a'.repeat(1801)}),/1800/);assert.throws(()=>validateMissionAction({...good,expectedUpdatedAt:-1}),/Reload/);assert.throws(()=>validateMissionAction({...good,inputMode:'fake'}),/1800/);
 assert.throws(()=>validateMissionPreferences({likedTopics:['business'],dislikedTopics:['business'],rejectedTemplateIds:[]}),/both/);assert.deepEqual(validateMissionPreferences({likedTopics:['business','business'],dislikedTopics:[],rejectedTemplateIds:[]}).likedTopics,['business']);
});

test('additive mission migration and fallback retain all legacy learner data',async()=>{
 const {raw,repo}=setup();raw.exec("INSERT INTO learner_settings VALUES ('de','C2'); INSERT INTO writing_drafts VALUES ('old-draft','My saved essay','[]',300,100);");
 raw.exec(readFileSync(new URL('../drizzle/0003_perpetual_sally_floyd.sql',import.meta.url),'utf8'));await repo.ready();for(const statement of missionSchemaStatements)raw.exec(statement);
 assert.equal(raw.prepare('SELECT draft FROM writing_drafts').get().draft,'My saved essay');assert.equal(raw.prepare('SELECT level FROM learner_settings').get().level,'C2');raw.close();
});

test('mission history, preferences and corrections are scoped to authenticated users and language',async()=>{
 const {raw,repo}=setup();const run=createMissionRun('mission-one',brief,'en',1000);await repo.createRun('user-one',run);await repo.createRun('user-two',createMissionRun('mission-two',brief,'de',1000));
 assert.equal((await repo.listRuns('user-one')).length,1);await assert.rejects(()=>repo.getStoredRun('user-two',run.id),error=>error.status===404);
 await repo.savePreferences('user-one','en',{likedTopics:['business'],dislikedTopics:[],rejectedTemplateIds:[]},1001);const prefs=await repo.preferences('user-one');assert.deepEqual(prefs.en.likedTopics,['business']);assert.deepEqual(prefs.de.likedTopics,[]);assert.deepEqual((await repo.preferences('user-two')).en.likedTopics,[]);raw.close();
});

test('a retried completed request replays its saved result without reserving another paid call',async()=>{
 const {raw,repo}=setup();let run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',1000));const request=claim(run,0);await repo.claim(request);run=answer(run);await repo.complete(request,run,{run},{inputTokens:100,outputTokens:200});const replay=await repo.replay('user-one',request.requestId,request.fingerprint,1002);assert.equal(replay.run.turns.length,1);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,1);assert.equal(raw.prepare('SELECT input_tokens FROM mission_usage').get().input_tokens,100);
 await assert.rejects(()=>repo.replay('user-one',request.requestId,'different-answer',1002),error=>error.code==='request_conflict');raw.close();
});

test('two simultaneous claims cannot both acquire a mission lock or consume usage',async()=>{
 const {raw,repo}=setup();const run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',1000));await repo.claim(claim(run,0));await assert.rejects(()=>repo.claim(claim(run,0,'request-second')),error=>error.code==='mission_busy');assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,1);assert.equal(raw.prepare('SELECT locked_by FROM mission_runs').get().locked_by,'request-first');raw.close();
});

test('daily and burst limits are enforced before a provider call can be claimed',async()=>{
 const {raw,repo}=setup();const run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',1000));
 for(let i=0;i<3;i++)raw.prepare('INSERT INTO mission_usage VALUES (?,?,?,?,?,?,?)').run(`prior-${i}`,'user-one',protocol.missionUsageDay(1000),'respond',0,0,999);
 await assert.rejects(()=>repo.claim(claim(run,0)),error=>error.code==='usage_limit'&&error.status===429);assert.equal(raw.prepare('SELECT locked_by FROM mission_runs').get().locked_by,null);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,3);
 assert.equal((await repo.usage('user-one',1000,true,'gpt-4.1-mini')).remainingToday,27);raw.close();
});

test('provider failure is cached safely and never automatically bills the same request twice',async()=>{
 const {raw,repo}=setup();const run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',1000));const request=claim(run,0);await repo.claim(request);await repo.fail(request,new MissionProtocolError('provider_busy','The AI service is busy.',503,30));
 await assert.rejects(()=>repo.replay('user-one',request.requestId,request.fingerprint,1002),error=>error.code==='provider_busy');assert.equal(raw.prepare('SELECT locked_by FROM mission_runs').get().locked_by,null);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,1);assert.equal((await repo.getStoredRun('user-one',run.id)).run.turns.length,0);raw.close();
});

test('pending duplicate and stale database versions cannot claim another paid request',async()=>{
 const {raw,repo}=setup();let run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',1000));const first=claim(run,0);await repo.claim(first);
 await assert.rejects(()=>repo.claim(first),error=>error.code==='request_pending');assert.equal(raw.prepare('SELECT status FROM mission_requests WHERE request_id=?').get(first.requestId).status,'pending');
 assert.equal(raw.prepare('SELECT locked_by FROM mission_runs').get().locked_by,first.requestId);assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,1);
 run=answer(run);await repo.complete(first,run,{run});await assert.rejects(()=>repo.claim(claim(run,0,'request-stale',2000)),error=>error.code==='mission_busy');assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,1);raw.close();
});

test('separate daily text, site-wide and voice allowances reject reservations atomically',async()=>{
 for(const scenario of [{kind:'respond',count:30,owner:'user-one'},{kind:'respond',count:100,owner:'other-user'},{kind:'transcribe',count:8,owner:'user-one'},{kind:'transcribe',count:24,owner:'other-user'}]){
  const {raw,repo}=setup();const now=1_000_000;const run=await repo.createRun('user-one',createMissionRun('mission-one',brief,'en',now));
  for(let i=0;i<scenario.count;i++)raw.prepare('INSERT INTO mission_usage VALUES (?,?,?,?,?,?,?)').run(`prior-${i}`,scenario.owner,protocol.missionUsageDay(now),scenario.kind,0,0,1);
  await assert.rejects(()=>repo.claim(claim(run,0,'request-limited',now,scenario.kind)),error=>error.code==='usage_limit');assert.equal(raw.prepare('SELECT COUNT(*) AS n FROM mission_usage').get().n,scenario.count);assert.equal(raw.prepare('SELECT locked_by FROM mission_runs').get().locked_by,null);raw.close();
 }
});

test('summary separates resolved corrections from remaining weaknesses',()=>{
 let run=createMissionRun('mission-one',brief,'en',1000);run=answer(run);const corrected={...feedback(),improvements:[]};run=appendMissionFeedback(run,{id:'answer-retry',answer:'I play sport.',inputMode:'text',characterReply:'That is clearer.',feedback:corrected},1000);
 assert.ok(run.updatedAt>1000);const summary=finishMission(run,1000).summary;assert.deepEqual(summary.weaknesses,[]);assert.equal(summary.retryImprovements.length,1);
});

test('finish requires a recorded retry in the current round and stays idempotent after completion',()=>{
 let run=createMissionRun('mission-one',brief,'en',1000);
 assert.throws(()=>finishMission(run,1001),error=>error.code==='retry_required');
 run=answer(run);assert.equal(run.phase,'feedback');assert.throws(()=>finishMission(run,1002),error=>error.code==='retry_required');
 run=answer(run,2,'same','I play sport.');const completed=finishMission(run,1003);assert.equal(completed.phase,'summary');assert.equal(completed.turns.length,2);assert.strictEqual(finishMission(completed,1004),completed);
 run=continueMission(run,1004);assert.equal(run.phase,'challenge');assert.throws(()=>finishMission(run,1005),error=>error.code==='retry_required');
 run=answer(run);assert.equal(run.phase,'feedback');assert.throws(()=>finishMission(run,1006),error=>error.code==='retry_required');
});
