/* Pure logic: independent from DOM, browser storage, and the story UI. */
(function(root){
function permutations(list){if(!list.length)return [[]];return list.flatMap((x,i)=>permutations(list.filter((_,j)=>i!==j)).map(p=>[x,...p]));}
function satisfies(values, constraints){return constraints.every(([type,a,b,k])=>{
 if(type==='ratio')return values[a]===values[b]*k;
 if(type==='gt')return values[a]>values[b];
 if(type==='eq')return values[a]===b;
 if(type==='sum')return a.reduce((sum,r)=>sum+values[r],0)===b;
 return false;
});}
function solve(level){return permutations(level.values).filter(p=>satisfies(p,level.constraints));}
function metric(level,r,c){const n=level.values[c];if(level.id==='channels')return level.base[r]/n;if(level.id==='products')return n*level.margins[r]-level.base[r];return level.base[r]/n*100;}
function complete(level,picks){return picks.length===level.rows.length&&picks.every(c=>Number.isInteger(c)&&c>=0&&c<level.values.length)&&new Set(picks).size===picks.length;}
function correct(level,picks){return complete(level,picks)&&picks.every((v,i)=>v===level.solution[i]);}
function toggle(picks,crosses,r,c){const next=picks.slice(), marks=new Set(crosses),key=r+':'+c;
 if(next[r]===c){next[r]=-1;marks.delete(key);}
 else if(marks.has(key)||next[r]>=0||next.includes(c)){next.forEach((v,i)=>{if(v===c)next[i]=-1;});next[r]=c;marks.delete(key);}
 else marks.add(key);
 return {picks:next,crosses:[...marks]};
}
root.DM_ENGINE={permutations,satisfies,solve,metric,complete,correct,toggle};
if(typeof module!=='undefined')module.exports=root.DM_ENGINE;
})(typeof window!=='undefined'?window:globalThis);
