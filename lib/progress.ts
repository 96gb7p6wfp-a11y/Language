import type { Language, Level } from "./curriculum";
export type RecordProgress = {exercise_id:string;attempts:number;correct_count:number;streak:number;last_correct:number;due_at:number;updated_at:number};
export type DayProgress = {language:Language;date:string;attempts:number;correct_count:number};
export type ProgressState = {settings:Record<Language,Level>;records:Record<string,RecordProgress>;days:DayProgress[]};
export const emptyProgress:ProgressState = {settings:{en:"B1",de:"B1"},records:{},days:[]};
export function localDate(date = new Date()):string { return new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit",timeZone:"Europe/Berlin"}).format(date); }
