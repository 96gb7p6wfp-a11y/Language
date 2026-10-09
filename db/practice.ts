import { env } from "cloudflare:workers";
import type { ProgressState, RecordProgress, DayProgress } from "../lib/progress";
import type { Language, Level, Exercise } from "../lib/curriculum";
import { isCorrect } from "../lib/curriculum";
import { localDate } from "../lib/progress";
function db(){if(!env.DB) throw new Error("Practice database unavailable");return env.DB as D1Database;}
export async function readProgress():Promise<ProgressState>{
 const [settings,records,days]=await Promise.all([
 db().prepare("SELECT language,level FROM learner_settings").all<{language:Language;level:Level}>(),
 db().prepare("SELECT * FROM exercise_progress").all<RecordProgress>(),
 db().prepare("SELECT * FROM practice_days ORDER BY date DESC LIMIT 730").all<DayProgress>()
 ]);
 return {settings:{en:"B1",de:"B1",...Object.fromEntries(settings.results.map(r=>[r.language,r.level]))},records:Object.fromEntries(records.results.map(r=>[r.exercise_id,r])),days:days.results};
}
export async function setLevel(language:Language,level:Level){await db().prepare("INSERT INTO learner_settings (language,level) VALUES (?,?) ON CONFLICT(language) DO UPDATE SET level=excluded.level").bind(language,level).run();}
export async function recordAnswer(id:string,exercise:Exercise,answer:string){
 const correct=isCorrect(exercise,answer), n=correct?1:0, now=Date.now();
 const prior=await db().prepare("SELECT streak FROM exercise_progress WHERE exercise_id=?").bind(exercise.id).first<{streak:number}>();
 const streak=correct?(prior?.streak??0)+1:0;
 const intervals=[0,1,3,7,14,30];
 const due=correct?now+intervals[Math.min(streak,5)]*86400000:now;
 await db().batch([
 db().prepare("INSERT INTO recorded_attempts (id,exercise_id,correct,created_at) VALUES (?,?,?,?) ON CONFLICT(id) DO NOTHING").bind(id,exercise.id,n,now),
 db().prepare("INSERT INTO exercise_progress (exercise_id,attempts,correct_count,streak,last_correct,due_at,updated_at) SELECT ?,1,?,?,?,?,? WHERE changes()=1 ON CONFLICT(exercise_id) DO UPDATE SET attempts=attempts+1,correct_count=correct_count+excluded.correct_count,streak=CASE WHEN excluded.last_correct=1 THEN streak+1 ELSE 0 END,last_correct=excluded.last_correct,due_at=excluded.due_at,updated_at=excluded.updated_at").bind(exercise.id,n,streak,n,due,now),
 db().prepare("INSERT INTO practice_days (language,date,attempts,correct_count) SELECT ?,?,1,? WHERE changes()=1 ON CONFLICT(language,date) DO UPDATE SET attempts=attempts+1,correct_count=correct_count+excluded.correct_count").bind(exercise.language,localDate(),n)
 ]);
 return {correct,progress:await readProgress()};
}
