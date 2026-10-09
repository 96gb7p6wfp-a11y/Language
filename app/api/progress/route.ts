import {readProgress,setLevel} from "@/db/practice";
export async function GET(){try{return Response.json(await readProgress(),{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Progress load failed",error);return Response.json({error:"Your progress could not be loaded. Please try again."},{status:503});}}
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return Response.json({error:"Invalid origin"},{status:403});
 let input:Record<string,unknown>;try{const raw=await request.json();if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Invalid body");input=raw as Record<string,unknown>;}catch{return Response.json({error:"Invalid request"},{status:400});}
 if(!input||!["en","de"].includes(String(input.language))||!["A1","A2","B1","B2","C1","C2"].includes(String(input.level)))return Response.json({error:"Choose a supported language and level."},{status:400});
 try{await setLevel(input.language as "en"|"de",input.level as "A1"|"A2"|"B1"|"B2"|"C1"|"C2");return Response.json(await readProgress(),{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Level save failed",error);return Response.json({error:"Your level could not be saved. Please try again."},{status:503});}
}
