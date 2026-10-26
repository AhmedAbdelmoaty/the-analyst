/* Story flow helpers: the dossier must be received before analysis. */
(function(root){
function finishIntro(level,current){current.mode=level.meeting?'handoff':'investigate';if(level.meeting)current.seen=[...new Set([...current.seen,...Object.values(level.meeting.dialogueEvidence)])];return current;}
function receive(level,current){if(!level.meeting)return current;current.crmReceived=true;current.mode='investigate';current.seen=[...new Set([...current.seen,...level.evidence.map(e=>e.id)])];return current;}
function recordLine(level,current){const id=level.meeting?.dialogueEvidence[current.line];if(id&&!current.seen.includes(id))current.seen.push(id);return current;}
function migrate(level,current){if(level.meeting&&current.storyRevision!==level.meeting.revision){current.storyRevision=level.meeting.revision;current.line=0;current.crmReceived=false;current.mode='intro';}return current;}
function canLoad(state,levels){
 if(!state||state.version!==1||!state.current||!Array.isArray(state.completed)||!Array.isArray(state.current.picks))return false;
 const i=state.current.index;if(!Number.isInteger(i)||i<0)return false;
 return i<levels.length?state.current.picks.length===levels[i].rows.length:i===2&&levels.length===2&&state.current.picks.length===6;
}
function normalizeProgress(state,levels,freshCase){
 state.completed=[...new Set(state.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<levels.length))];
 if(state.current.index>=levels.length){state.current=freshCase(levels.length-1);state.completed=levels.map((_,i)=>i);state.current.mode='finished';state.current.solved=true;state.current.picks=levels.at(-1).solution.slice();state.current.crmReceived=true;}
 else if(state.completed.includes(state.current.index)){state.current.crmReceived=true;state.current.storyRevision=levels[state.current.index].meeting?.revision||0;if(state.current.mode!=='finished')state.current.mode='success';}
 else migrate(levels[state.current.index],state.current);
 return state;
}
root.DM_MEETING={finishIntro,receive,recordLine,migrate,canLoad,normalizeProgress};
if(typeof module!=='undefined')module.exports=root.DM_MEETING;
})(typeof window!=='undefined'?window:globalThis);
