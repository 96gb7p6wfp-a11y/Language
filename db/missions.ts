import type { Language } from "../lib/curriculum";
import type { MissionPreferences, MissionRun } from "../lib/missions";
import { emptyMissionPreferences, MissionProtocolError, MISSION_BURST_LIMIT, MISSION_DAILY_LIMIT, MISSION_SITE_DAILY_LIMIT, MISSION_REQUEST_LOCK_MS, TRANSCRIPTION_DAILY_LIMIT, TRANSCRIPTION_SITE_DAILY_LIMIT, missionUsageDay } from "../lib/mission-protocol";

export const missionSchemaStatements = [
 "CREATE TABLE IF NOT EXISTS mission_runs (id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, language TEXT NOT NULL, template_id TEXT NOT NULL, state TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, locked_by TEXT, locked_until INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS mission_runs_user_updated ON mission_runs (user_id,updated_at)",
 "CREATE TABLE IF NOT EXISTS mission_preferences (user_id TEXT NOT NULL, language TEXT NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id,language))",
 "CREATE TABLE IF NOT EXISTS mission_requests (user_id TEXT NOT NULL, request_id TEXT NOT NULL, run_id TEXT NOT NULL, kind TEXT NOT NULL, fingerprint TEXT NOT NULL, status TEXT NOT NULL, result TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id,request_id))",
 "CREATE TABLE IF NOT EXISTS mission_usage (request_key TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS mission_usage_user_day ON mission_usage (user_id,day,kind)",
 "CREATE INDEX IF NOT EXISTS mission_usage_created ON mission_usage (created_at)",
];
const setups = new WeakMap<object, Promise<void>>();
export async function ensureMissionTables(db: D1Database) {
 let setup = setups.get(db);
 if (!setup) { setup = db.batch(missionSchemaStatements.map(sql => db.prepare(sql))).then(() => {}); setups.set(db, setup); setup.catch(() => setups.delete(db)); }
 await setup;
}
export type StoredMissionRun = { run: MissionRun; version: number };
export type StoredMissionRequest = { run_id: string; kind: string; fingerprint: string; status: string; result: string | null; created_at: number; updated_at: number };
export type MissionService = { configured: boolean; model: string; remainingToday: number; dailyLimit: number; transcriptionRemainingToday: number; transcriptionDailyLimit: number };
export type RequestClaim = { userId: string; requestId: string; runId: string; kind: "respond" | "transcribe" | "continue" | "finish"; fingerprint: string; version: number; now: number };

export class MissionRepository {
 constructor(readonly db: D1Database) {}
 async ready() { await ensureMissionTables(this.db); }
 async listRuns(userId: string): Promise<MissionRun[]> {
  await this.ready(); const rows = await this.db.prepare("SELECT state FROM mission_runs WHERE user_id=? ORDER BY updated_at DESC LIMIT 100").bind(userId).all<{state:string}>();
  return rows.results.map(row => JSON.parse(row.state) as MissionRun);
 }
 async getStoredRun(userId: string, runId: string): Promise<StoredMissionRun> {
  await this.ready(); const row = await this.db.prepare("SELECT state,version FROM mission_runs WHERE id=? AND user_id=?").bind(runId,userId).first<{state:string;version:number}>();
  if (!row) throw new MissionProtocolError("mission_not_found", "This saved challenge could not be found.",404);
  return { run:JSON.parse(row.state) as MissionRun,version:row.version };
 }
 async createRun(userId: string, run: MissionRun): Promise<MissionRun> {
  await this.ready();
  await this.db.prepare("INSERT INTO mission_runs (id,user_id,language,template_id,state,version,created_at,updated_at) SELECT ?,?,?,?,?,0,?,? WHERE (SELECT COUNT(*) FROM mission_runs WHERE user_id=? AND created_at>?)<20 ON CONFLICT(id) DO NOTHING").bind(run.id,userId,run.language,run.templateId,JSON.stringify(run),run.createdAt,run.updatedAt,userId,run.createdAt-86400000).run();
  const existing = await this.getStoredRun(userId,run.id).catch(() => {throw new MissionProtocolError("start_limit","You have opened many challenges today. Continue a saved challenge and try a new one tomorrow.",429,86400);});
  if(existing.run.templateId!==run.templateId||existing.run.language!==run.language||existing.run.level!==run.level)throw new MissionProtocolError("request_conflict","This challenge ID is already used by another saved challenge.",409);
  return existing.run;
 }
 async preferences(userId: string): Promise<Record<Language,MissionPreferences>> {
  await this.ready(); const rows=await this.db.prepare("SELECT language,value FROM mission_preferences WHERE user_id=?").bind(userId).all<{language:Language;value:string}>();
  const result={en:emptyMissionPreferences(),de:emptyMissionPreferences()};for(const row of rows.results)if(row.language==="en"||row.language==="de")result[row.language]=JSON.parse(row.value) as MissionPreferences;return result;
 }
 async savePreferences(userId:string,language:Language,preferences:MissionPreferences,now:number) {
  await this.ready();await this.db.prepare("INSERT INTO mission_preferences (user_id,language,value,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,language) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(userId,language,JSON.stringify(preferences),now).run();return this.preferences(userId);
 }
 async usage(userId:string,now:number,configured:boolean,model:string):Promise<MissionService>{
  await this.ready();const rows=await this.db.prepare("SELECT kind,COUNT(*) AS count FROM mission_usage WHERE user_id=? AND day=? GROUP BY kind").bind(userId,missionUsageDay(now)).all<{kind:string;count:number}>();const counts=Object.fromEntries(rows.results.map(row=>[row.kind,row.count]));return {configured,model,remainingToday:Math.max(0,MISSION_DAILY_LIMIT-(counts.respond??0)),dailyLimit:MISSION_DAILY_LIMIT,transcriptionRemainingToday:Math.max(0,TRANSCRIPTION_DAILY_LIMIT-(counts.transcribe??0)),transcriptionDailyLimit:TRANSCRIPTION_DAILY_LIMIT};
 }
 async replay(userId:string,requestId:string,fingerprint:string,now:number):Promise<unknown|null>{
  await this.ready();const row=await this.db.prepare("SELECT run_id,kind,fingerprint,status,result,created_at,updated_at FROM mission_requests WHERE user_id=? AND request_id=?").bind(userId,requestId).first<StoredMissionRequest>();if(!row)return null;
  if(row.fingerprint!==fingerprint)throw new MissionProtocolError("request_conflict","This request ID was already used with a different answer.",409);
  if(row.status==="complete"&&row.result)return JSON.parse(row.result) as unknown;
  if(row.status==="failed"&&row.result){const error=JSON.parse(row.result) as {code:string;error:string;status:number;retryAfter?:number};throw new MissionProtocolError(error.code,error.error,error.status,error.retryAfter);}
  if(now-row.created_at>MISSION_REQUEST_LOCK_MS)throw new MissionProtocolError("request_expired","That request ended without a saved response. Reload the challenge before trying again.",409);
  throw new MissionProtocolError("request_pending","Your previous answer is still being processed. Please wait a moment.",409,3);
 }
 async claim(input:RequestClaim):Promise<void>{
  await this.ready();const {userId,requestId,runId,kind,fingerprint,version,now}=input;const ai=kind==="respond"||kind==="transcribe";const perUser=kind==="transcribe"?TRANSCRIPTION_DAILY_LIMIT:MISSION_DAILY_LIMIT;const site=kind==="transcribe"?TRANSCRIPTION_SITE_DAILY_LIMIT:MISSION_SITE_DAILY_LIMIT;const day=missionUsageDay(now);
  const statements=[this.db.prepare("INSERT INTO mission_requests (user_id,request_id,run_id,kind,fingerprint,status,created_at,updated_at) VALUES (?,?,?,?,?,'pending',?,?) ON CONFLICT(user_id,request_id) DO NOTHING").bind(userId,requestId,runId,kind,fingerprint,now,now),this.db.prepare("UPDATE mission_runs SET locked_by=?,locked_until=? WHERE id=? AND user_id=? AND version=? AND (locked_by IS NULL OR locked_until<?) AND changes()=1").bind(requestId,now+MISSION_REQUEST_LOCK_MS,runId,userId,version,now)];
  if(ai)statements.push(this.db.prepare("INSERT INTO mission_usage (request_key,user_id,day,kind,created_at) SELECT ?,?,?,?,? WHERE changes()=1 AND (SELECT COUNT(*) FROM mission_usage WHERE user_id=? AND day=? AND kind=?)<? AND (SELECT COUNT(*) FROM mission_usage WHERE day=? AND kind=?)<? AND (SELECT COUNT(*) FROM mission_usage WHERE user_id=? AND created_at>?)<?").bind(`${userId}:${requestId}`,userId,day,kind,now,userId,day,kind,perUser,day,kind,site,userId,now-60000,MISSION_BURST_LIMIT));
  const results=await this.db.batch(statements);
  if(!results[0].meta.changes){await this.replay(userId,requestId,fingerprint,now);throw new MissionProtocolError("request_pending","Your previous answer is still being processed.",409,3);}
  if(!results[1].meta.changes){const error=new MissionProtocolError("mission_busy","The challenge changed while this answer was being sent. Reload it and try again.",409,3);await this.fail(input,error);throw error;}
  if(ai&&!results[2].meta.changes){const error=new MissionProtocolError("usage_limit","Your challenge limit has been reached. Wait a minute, or return tomorrow if today's allowance is used.",429,60);await this.fail(input,error);throw error;}
 }
 async complete(input:RequestClaim,run:MissionRun,result:unknown,usage?:{inputTokens:number;outputTokens:number}){
  const {userId,requestId,runId,version,now}=input;const encoded=JSON.stringify(result);const statements=[this.db.prepare("UPDATE mission_runs SET state=?,version=version+1,updated_at=?,locked_by=NULL,locked_until=NULL WHERE id=? AND user_id=? AND version=? AND locked_by=?").bind(JSON.stringify(run),run.updatedAt,runId,userId,version,requestId),this.db.prepare("UPDATE mission_requests SET status='complete',result=?,updated_at=? WHERE user_id=? AND request_id=? AND status='pending' AND changes()=1").bind(encoded,now,userId,requestId)];
  if(usage)statements.push(this.db.prepare("UPDATE mission_usage SET input_tokens=?,output_tokens=? WHERE request_key=?").bind(usage.inputTokens,usage.outputTokens,`${userId}:${requestId}`));
  const results=await this.db.batch(statements);if(!results[0].meta.changes||!results[1].meta.changes)throw new MissionProtocolError("mission_conflict","The saved challenge changed. Reload before sending another answer.",409);
 }
 async fail(input:RequestClaim,error:{code:string;message:string;status:number;retryAfter?:number}){
  const {userId,requestId,runId,now}=input;await this.db.batch([this.db.prepare("UPDATE mission_requests SET status='failed',result=?,updated_at=? WHERE user_id=? AND request_id=? AND status='pending'").bind(JSON.stringify({code:error.code,error:error.message,status:error.status,...(error.retryAfter?{retryAfter:error.retryAfter}:{})}),now,userId,requestId),this.db.prepare("UPDATE mission_runs SET locked_by=NULL,locked_until=NULL WHERE id=? AND user_id=? AND locked_by=?").bind(runId,userId,requestId)]);
 }
 async context(userId:string,language:Language,now:number){
  const runs=await this.listRuns(userId);const priorMistakes=runs.filter(run=>run.language===language).flatMap(run=>run.turns.slice(-2).flatMap(turn=>turn.feedback.improvements)).slice(0,2).map(({original,improved,dimension})=>({original,improved,dimension}));
  // The previous app's chunk bank is site-wide. Read it without changing its IDs or review state.
  let duePhrases:{expression:string;example:string}[]=[];try{const rows=await this.db.prepare("SELECT expression,example FROM coach_chunks WHERE language=? AND due_at<=? ORDER BY due_at ASC LIMIT 2").bind(language,now).all<{expression:string;example:string}>();duePhrases=rows.results;}catch{/* A new local database may not yet have the legacy coach schema. */}
  return {duePhrases,priorMistakes};
 }
}
