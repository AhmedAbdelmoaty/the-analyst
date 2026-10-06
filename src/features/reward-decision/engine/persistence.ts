import type { RewardRun } from './model';
const key=(uid:string)=>`the-analyst:reward-decision:v1:${uid}`;
export function loadRun(uid:string):RewardRun|null{try{const d=JSON.parse(localStorage.getItem(key(uid))??'null') as RewardRun|null;if(!d||d.schemaVersion!==1||d.gameId!=='reward-decision'||d.caseVersion!=='rowad-v1'||d.userId!==uid)return null;return {...d,paused:d.phase!=='cover'};}catch{return null}}
export function saveRun(run:RewardRun){try{localStorage.setItem(key(run.userId),JSON.stringify({...run,revision:run.revision+1,savedAt:new Date().toISOString()}));return true}catch{return false}}
export function clearRun(uid:string){try{localStorage.removeItem(key(uid))}catch{/* unavailable */}}
