import { TEAMS, type TeamId } from '../data/case';
const values=(team:TeamId)=>TEAMS[team].members.map(m=>m.value);
export const mean=(xs:number[])=>xs.reduce((a,b)=>a+b,0)/xs.length;
export const median=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b);return (s[4]+s[5])/2};
export const range=(xs:number[])=>Math.max(...xs)-Math.min(...xs);
export const populationSd=(xs:number[])=>{const m=mean(xs);return Math.sqrt(xs.reduce((n,x)=>n+(x-m)**2,0)/xs.length)};
export const quartiles=(xs:number[])=>{const s=[...xs].sort((a,b)=>a-b);return {q1:s[2],q3:s[7],iqr:s[7]-s[2]}};
export const stats=(team:TeamId)=>{const xs=values(team);const q=quartiles(xs);return {mean:mean(xs),total:mean(xs)/10,median:median(xs),range:range(xs),sd:populationSd(xs),...q,threshold:xs.filter(x=>x>=85).length,values:xs}};
