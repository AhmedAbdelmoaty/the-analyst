/* Story flow helpers: the dossier must be received before analysis. */
(function(root){
function finishIntro(level,current){current.mode=level.meeting?'handoff':'investigate';if(level.meeting)current.seen=[...new Set([...current.seen,...Object.values(level.meeting.dialogueEvidence)])];return current;}
function receive(level,current){if(!level.meeting)return current;current.crmReceived=true;current.mode='investigate';current.seen=[...new Set([...current.seen,...level.evidence.map(e=>e.id)])];return current;}
function recordLine(level,current){const id=level.meeting?.dialogueEvidence[current.line];if(id&&!current.seen.includes(id))current.seen.push(id);return current;}
function migrate(level,current){if(level.meeting&&current.storyRevision!==level.meeting.revision){current.storyRevision=level.meeting.revision;current.line=0;current.crmReceived=false;current.mode='intro';}return current;}
root.DM_MEETING={finishIntro,receive,recordLine,migrate};
if(typeof module!=='undefined')module.exports=root.DM_MEETING;
})(typeof window!=='undefined'?window:globalThis);
