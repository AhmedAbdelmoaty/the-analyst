/* Uploaded story recordings, selected by the solved vault. */
globalThis.VaultVoice=(()=>{
  let active;
  function stop(){if(active){active.pause();active.currentTime=0;active=null}}
  function play(level=0,volume=.55){
    const files=['first-vault-win.wav','second-vault-win.wav','final-win.wav'];
    if(!Number.isInteger(level)||!files[level])return false;
    stop();
    if(typeof Audio!=='function'||document.hidden||volume<=0)return false;
    const clip=new Audio('assets/'+files[level]);active=clip;
    clip.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.55));clip.loop=false;
    clip.addEventListener('ended',()=>{if(active===clip)active=null});
    clip.addEventListener('error',()=>{if(active===clip)active=null});
    try{const started=clip.play();started?.then(()=>{if(active!==clip)clip.pause()}).catch(()=>{if(active===clip)active=null})}catch{active=null;return false}
    return true;
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  return {play,stop};
})();
