import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { MissionRepository } from "@/db/missions";
import { MissionProtocolError } from "@/lib/mission-protocol";
import { MissionAIError, serviceConfig } from "@/lib/mission-ai";

export const responseHeaders = { "Cache-Control": "no-store" };
export function missionEnvironment(): Record<string, unknown> {
 const runtime=env as unknown as Record<string,unknown>;
 // `.env.local` is read only in local development. Hosted values use Worker secrets.
 const local:Record<string,string|undefined>=typeof process!=="undefined"&&process.env.NODE_ENV!=="production"?process.env:{};
 return {...runtime,OPENAI_API_KEY:runtime.OPENAI_API_KEY??local.OPENAI_API_KEY,OPENAI_MODEL:runtime.OPENAI_MODEL??local.OPENAI_MODEL};
}
export function missionRepository() { if (!env.DB) throw new MissionProtocolError("storage_unavailable", "Saved challenges are temporarily unavailable. Your typed answer has not been discarded.", 503); return new MissionRepository(env.DB as D1Database); }
export async function missionUser() {
 const user = await getChatGPTUser();
 if (!user || user.userId.length > 200) throw new MissionProtocolError("sign_in_required", "Sign in to use your saved AI challenges.", 401);
 return user.userId;
}
export function assertSameOrigin(request: Request) {
 const origin = request.headers.get("origin");
 if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new MissionProtocolError("invalid_origin", "Open this challenge from Phrase.", 403);
}
export function requireMissionAI() {
 const config=serviceConfig(missionEnvironment());
 if(!config.configured)throw new MissionProtocolError("configuration_required", "OpenAI is not connected yet. Your answer stays on this device. Connect the server API key to use a responsive opponent.",503);
 return {...config,key:(missionEnvironment().OPENAI_API_KEY as string).trim()};
}
export async function fingerprint(value:unknown) { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(bytes)).map(value=>value.toString(16).padStart(2,"0")).join(""); }
export function missionErrorResponse(error: unknown) {
 if(error instanceof MissionProtocolError || error instanceof MissionAIError){const status=error.status;const retryAfter=error.retryAfter;return Response.json({error:error.message,code:error.code,...(retryAfter?{retryAfter}:{}),...(status===401?{signinPath:"/signin-with-chatgpt?return_to=%2F"}:{})},{status,headers:{...responseHeaders,...(retryAfter?{"Retry-After":String(retryAfter)}:{})}});}
 // Never log provider bodies, answers, authorization headers, or secrets.
 console.error("Mission request failed",error instanceof Error?error.name:"UnknownError");
 return Response.json({error:"The challenge could not be saved. Your answer stays on this device. Reload the saved challenge before trying again.",code:"mission_unavailable"},{status:503,headers:responseHeaders});
}

export async function readMissionBody(request:Request,maximum:number):Promise<Uint8Array>{
 const declared=Number(request.headers.get("content-length")??0);if(declared>maximum)throw new MissionProtocolError("request_too_large","This upload is too large. Use a shorter recording or a shorter answer.",413);
 if(!request.body)return new Uint8Array();
 const reader=request.body.getReader();const pieces:Uint8Array[]=[];let total=0;
 try{while(true){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>maximum){await reader.cancel();throw new MissionProtocolError("request_too_large","This upload is too large. Use a shorter recording or a shorter answer.",413);}pieces.push(part.value);}}finally{reader.releaseLock();}
 const body=new Uint8Array(total);let offset=0;for(const piece of pieces){body.set(piece,offset);offset+=piece.byteLength;}return body;
}
