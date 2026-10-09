/** Accumulate only foreground practice time; pause gaps never count. */
export type ActiveTime = {elapsedMs:number; startedAt:number|null};

export function createActiveTime():ActiveTime{return {elapsedMs:0,startedAt:null};}

export function setTimeActive(clock:ActiveTime, active:boolean, now:number):void{
 if(active&&clock.startedAt===null)clock.startedAt=now;
 else if(!active&&clock.startedAt!==null){clock.elapsedMs+=Math.max(0,now-clock.startedAt);clock.startedAt=null;}
}

export function activeSeconds(clock:ActiveTime, now:number):number{
 return Math.round((clock.elapsedMs+(clock.startedAt===null?0:Math.max(0,now-clock.startedAt)))/1000);
}
