import {env} from "cloudflare:workers";
import {writingTasks} from "@/lib/exam-tasks";
function db(){if(!env.DB)throw new Error("Writing database unavailable");return env.DB as D1Database;}
export async function GET(){try{const data=await db().prepare("SELECT * FROM writing_drafts").all();return Response.json({drafts:data.results},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Writing drafts failed",error);return Response.json({error:"Saved drafts could not be loaded. Please try again."},{status:503});}}
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid origin"},{status:403});
 let input:Record<string,unknown>;try{const body=await request.json();if(!body||typeof body!=="object"||Array.isArray(body))throw new Error("Invalid request");input=body as Record<string,unknown>;}catch{return Response.json({error:"Invalid request"},{status:400});}
 const task=writingTasks.find(t=>t.id===input.taskId);
 if(!task||typeof input.draft!=="string"||input.draft.length>40000||!Array.isArray(input.checklist)||input.checklist.length!==task.checklist.length||!input.checklist.every(v=>typeof v==="boolean")||typeof input.elapsedSeconds!=="number"||!Number.isInteger(input.elapsedSeconds)||input.elapsedSeconds<0||input.elapsedSeconds>86400)return Response.json({error:"Choose a valid task and provide a supported draft."},{status:400});
 try{const now=Date.now();await db().prepare("INSERT INTO writing_drafts (task_id,draft,checklist,elapsed_seconds,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET draft=excluded.draft,checklist=excluded.checklist,elapsed_seconds=excluded.elapsed_seconds,updated_at=excluded.updated_at").bind(task.id,input.draft,JSON.stringify(input.checklist),input.elapsedSeconds,now).run();return Response.json({savedAt:now},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Writing save failed",error);return Response.json({error:"Your draft has not been saved. Keep this page open and try again."},{status:503});}
}
