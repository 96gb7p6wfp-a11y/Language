import { getMissionTemplate, getMissionBrief, initialMissionDifficulty } from "@/lib/missions";
import { getMissionSolution } from "@/lib/mission-solutions";
import { generateMissionFeedback, serviceConfig, MissionAIError } from "@/lib/mission-ai";
import { appendMissionFeedback, continueMission, createMissionRun, expectedMissionAttempt, finishMission, MissionProtocolError, validateMissionAction } from "@/lib/mission-protocol";
import { assertSameOrigin, fingerprint, missionEnvironment, missionErrorResponse, missionRepository, missionUser, requireMissionAI, responseHeaders, readMissionBody } from "./shared";
import type { RequestClaim } from "@/db/missions";

export async function GET() {
 try { const userId=await missionUser();const repo=missionRepository();const config=serviceConfig(missionEnvironment());const [runs,preferences,service]=await Promise.all([repo.listRuns(userId),repo.preferences(userId),repo.usage(userId,Date.now(),config.configured,config.model)]);return Response.json({runs,preferences,service},{headers:responseHeaders}); }
 catch(error){return missionErrorResponse(error);}
}
export async function POST(request:Request){
 let claim:RequestClaim|undefined;
 let claimed=false;
 try{
  assertSameOrigin(request);const userId=await missionUser();
  const declaredLength=Number(request.headers.get("content-length")??0);if(declaredLength>16000)throw new MissionProtocolError("request_too_large","This answer is too long. Keep it under 1800 characters.",413);
  const raw=new TextDecoder().decode(await readMissionBody(request,16000));if(raw.length>16000)throw new MissionProtocolError("request_too_large","This answer is too long. Keep it under 1800 characters.",413);
  let value:unknown;try{value=JSON.parse(raw);}catch{throw new MissionProtocolError("invalid_request","Choose a valid challenge action.");}
  const input=validateMissionAction(value);const repo=missionRepository();const now=Date.now();const config=serviceConfig(missionEnvironment());
  const service=()=>repo.usage(userId,Date.now(),config.configured,config.model);
  if(input.action==="preferences"){const preferences=await repo.savePreferences(userId,input.language,input.preferences,now);return Response.json({preferences,service:await service()},{headers:responseHeaders});}
  if(input.action==="start"){
   const template=getMissionTemplate(input.templateId);if(!template)throw new MissionProtocolError("mission_not_found","Choose one of the available challenges.",404);
   const difficulty=initialMissionDifficulty(input.level,await repo.listRuns(userId),input.language);const brief=getMissionBrief(template,input.language,input.level,difficulty);const run=await repo.createRun(userId,createMissionRun(input.id,brief,input.language,now));return Response.json({run,service:await service()},{headers:responseHeaders});
  }
  const digest=await fingerprint(input);const replay=await repo.replay(userId,input.requestId,digest,now);if(replay)return Response.json({...replay as object,service:await service()},{headers:responseHeaders});
  const stored=await repo.getStoredRun(userId,input.runId);const run=stored.run;
  if(input.expectedUpdatedAt!==undefined&&input.expectedUpdatedAt!==run.updatedAt)throw new MissionProtocolError("state_changed","This challenge has a newer saved response. Reload it before sending your next answer.",409);
  if(input.action==="respond"){
   const attempt=expectedMissionAttempt(run);const aiConfig=requireMissionAI();const template=getMissionTemplate(run.templateId);if(!template)throw new MissionProtocolError("mission_not_found","This challenge is no longer available.",404);
   claim={userId,requestId:input.requestId,runId:input.runId,kind:"respond",fingerprint:digest,version:stored.version,now};await repo.claim(claim);claimed=true;
   const context=await repo.context(userId,run.language,now);const result=await generateMissionFeedback({key:aiConfig.key,model:aiConfig.model,run,template,answer:input.answer,attempt,context,solution:getMissionSolution(template.id)});
   const updated=appendMissionFeedback(run,{id:input.requestId,answer:input.answer,inputMode:input.inputMode,characterReply:result.characterReply,feedback:result.feedback},Date.now());const response={run:updated};await repo.complete(claim,updated,response,result.usage);return Response.json({...response,service:await service()},{headers:responseHeaders});
  }
  const updated=input.action==="continue"?continueMission(run,now):finishMission(run,now);claim={userId,requestId:input.requestId,runId:input.runId,kind:input.action,fingerprint:digest,version:stored.version,now};await repo.claim(claim);claimed=true;await repo.complete(claim,updated,{run:updated});return Response.json({run:updated,service:await service()},{headers:responseHeaders});
 }catch(error){
  if(claim&&claimed){const safe=error instanceof MissionProtocolError||error instanceof MissionAIError?error:new MissionProtocolError("mission_unavailable","The answer could not be saved. Reload your saved challenge before trying again.",503);try{await missionRepository().fail(claim,safe);}catch{/* The durable pending request prevents automatic duplicate provider calls. */}}
  return missionErrorResponse(error);
 }
}
