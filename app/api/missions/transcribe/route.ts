import { transcribeMissionAudio, MissionAIError } from "@/lib/mission-ai";
import { expectedMissionAttempt, isIdentifier, MISSION_MAX_AUDIO_BYTES, MissionProtocolError } from "@/lib/mission-protocol";
import { assertSameOrigin, fingerprint, missionErrorResponse, missionRepository, missionUser, readMissionBody, requireMissionAI, responseHeaders } from "../shared";
import type { RequestClaim } from "@/db/missions";

export async function POST(request:Request){
 let claim:RequestClaim|undefined;
 let claimed=false;
 try{
  assertSameOrigin(request);const userId=await missionUser();const config=requireMissionAI();const contentType=request.headers.get("content-type")??"";
  if(!contentType.startsWith("multipart/form-data;"))throw new MissionProtocolError("invalid_audio","Send a recording from this challenge.");
  const bytes=await readMissionBody(request,MISSION_MAX_AUDIO_BYTES+64000);const form=await new Request("https://phrase.local/voice",{method:"POST",headers:{"Content-Type":contentType},body:bytes.buffer as ArrayBuffer}).formData();
  const runId=form.get("runId"),requestId=form.get("requestId"),audio=form.get("audio");if(!isIdentifier(runId)||!isIdentifier(requestId)||!(audio instanceof File)||audio.size===0||audio.size>MISSION_MAX_AUDIO_BYTES||!/^audio\/(webm|mp4|mpeg|wav|x-wav|ogg)(;.*)?$/.test(audio.type))throw new MissionProtocolError("invalid_audio","Use an audio recording under 2 MB in a supported format.");
  const repo=missionRepository();const now=Date.now();const audioDigest=await crypto.subtle.digest("SHA-256",await audio.arrayBuffer());const digest=await fingerprint({runId,requestId,audio:Array.from(new Uint8Array(audioDigest)),type:audio.type});
  const replay=await repo.replay(userId,requestId,digest,now);if(replay)return Response.json({...replay as object,service:await repo.usage(userId,now,config.configured,config.model)},{headers:responseHeaders});
  const stored=await repo.getStoredRun(userId,runId);expectedMissionAttempt(stored.run);claim={userId,requestId,runId,kind:"transcribe",fingerprint:digest,version:stored.version,now};await repo.claim(claim);claimed=true;
  const result=await transcribeMissionAudio({key:config.key,file:audio,language:stored.run.language});const updated=stored.run;await repo.complete(claim,updated,{text:result.text});return Response.json({text:result.text,service:await repo.usage(userId,Date.now(),config.configured,config.model)},{headers:responseHeaders});
 }catch(error){if(claim&&claimed){const safe=error instanceof MissionProtocolError||error instanceof MissionAIError?error:new MissionProtocolError("transcription_unavailable","The recording could not be transcribed. Your local recording is kept; try typing your answer.",503);try{await missionRepository().fail(claim,safe);}catch{}}
  return missionErrorResponse(error);
 }
}
