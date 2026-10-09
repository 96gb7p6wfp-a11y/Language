import {exercises} from "@/lib/curriculum";
import {recordAnswer} from "@/db/practice";
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid origin"},{status:403});
 let input:Record<string,unknown>;try{const raw=await request.json();if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid body");input=raw as Record<string,unknown>;}catch{return Response.json({error:"Invalid request"},{status:400});}
 if(!input||typeof input.id!=="string"||!/^[0-9a-f-]{36}$/i.test(input.id)||typeof input.answer!=="string"||input.answer.length>1000)return Response.json({error:"Invalid answer"},{status:400});
 const exercise=exercises.find(e=>e.id===input.exerciseId);if(!exercise)return Response.json({error:"Exercise not found"},{status:400});
 try{return Response.json(await recordAnswer(input.id,exercise,input.answer),{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Answer save failed",error);return Response.json({error:"Your answer has not been saved. Check your connection and try again."},{status:503});}
}
