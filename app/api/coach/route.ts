import { applyCoachOperations, readCoach } from "@/db/coach";
import { isCoachOperation } from "@/lib/coach";

const headers = { "Cache-Control": "no-store" };
export async function GET() {
  try { return Response.json({ state: await readCoach() }, { headers }); }
  catch (error) { console.error("Coach sync load failed", error); return Response.json({ error: "Your learning data could not sync. Your device keeps unsent changes." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  let input: unknown;
  try { input = await request.json(); }
  catch { return Response.json({ error: "Invalid learning changes" }, { status: 400 }); }
  if (!input || typeof input !== "object" || Array.isArray(input) || !("operations" in input) || !Array.isArray(input.operations) || input.operations.length > 100 || !input.operations.every(isCoachOperation)) return Response.json({ error: "Choose valid learning changes." }, { status: 400 });
  try { return Response.json(await applyCoachOperations(input.operations), { headers }); }
  catch (error) { console.error("Coach sync save failed", error); return Response.json({ error: "Your changes could not sync. They remain saved on this device." }, { status: 503, headers }); }
}
