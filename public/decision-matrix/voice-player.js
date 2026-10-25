/* One shared audio element: stop old clips and ignore stale callbacks. */
(function(root){
class VoicePlayer{
 constructor(createAudio=()=>new Audio()){this.audio=createAudio();this.generation=0;this.audio.preload='auto';}
 stop(){this.generation++;this.audio.onended=null;this.audio.onerror=null;this.audio.onplaying=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();}
 play(src,callbacks={}){
  this.stop();const generation=this.generation,current=()=>generation===this.generation;
  this.audio.src=src;
  this.audio.onplaying=()=>{if(current())callbacks.onPlaying?.();};
  this.audio.onended=()=>{if(current())callbacks.onEnded?.();};
  this.audio.onerror=()=>{if(current())callbacks.onError?.();};
  try{return Promise.resolve(this.audio.play()).catch(error=>{if(current())(error.name==='NotAllowedError'?callbacks.onBlocked:callbacks.onError)?.();});}
  catch(error){if(current())(error.name==='NotAllowedError'?callbacks.onBlocked:callbacks.onError)?.();return Promise.resolve();}
 }
}
root.DM_VoicePlayer=VoicePlayer;
if(typeof module!=='undefined')module.exports=VoicePlayer;
})(typeof window!=='undefined'?window:globalThis);
