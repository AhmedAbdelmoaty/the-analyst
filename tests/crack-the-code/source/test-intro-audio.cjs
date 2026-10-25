const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function setup({complete=true,blocked=false,deferred=false}={}){
 const events={},imageEvents={},image={complete,naturalWidth:complete?1024:0,addEventListener(k,fn){imageEvents[k]=fn},removeEventListener(k,fn){if(imageEvents[k]===fn)delete imageEvents[k]}};
 let audio,resolve,deny=blocked;
 class Audio{constructor(){audio=this;this.paused=true;this.currentTime=0;this.handlers={};this.calls=0}addEventListener(k,fn){this.handlers[k]=fn}play(){this.calls++;if(deny)return Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'}));this.paused=false;return deferred?new Promise(r=>resolve=r):Promise.resolve()}pause(){this.paused=true}}
 const document={hidden:false,querySelector(){return image},addEventListener(k,fn){events[k]=fn},removeEventListener(k,fn){if(events[k]===fn)delete events[k]}};
 const ctx=vm.createContext({document,Audio});vm.runInContext(fs.readFileSync('intro-audio.js','utf8'),ctx);
 return {voice:ctx.IntroVoice,image,imageEvents,document,events,get audio(){return audio},resolve(){resolve()},allow(){deny=false}};
}
const flush=()=>new Promise(r=>setImmediate(r));
(async()=>{
 let t=setup({complete:false});t.voice.show();assert.equal(t.audio.calls,0);t.imageEvents.load();await flush();assert.equal(t.audio.calls,1,'autoplays when image appears');assert.equal(t.audio.paused,false);t.voice.hide();assert.equal(t.audio.paused,true);assert.equal(t.audio.currentTime,0,'start stops and rewinds');
 t=setup({blocked:true});t.voice.show();await flush();assert.equal(typeof t.events.pointerdown,'function');t.events.pointerdown({target:{closest:()=>true}});assert.equal(t.audio.calls,1,'start button does not restart blocked intro');t.allow();t.events.pointerdown({target:{closest:()=>false}});await flush();assert.equal(t.audio.calls,2);assert.equal(t.events.pointerdown,undefined,'one interaction resumes without adding any UI');
 t=setup();t.voice.show();await flush();t.document.hidden=true;t.events.visibilitychange();assert.equal(t.audio.paused,true);t.document.hidden=false;t.events.visibilitychange();await flush();assert.equal(t.audio.paused,false);t.voice.hide();t.events.visibilitychange();assert.equal(t.audio.paused,true,'no narration outside intro');
 t=setup({deferred:true});t.voice.show();t.voice.hide();t.resolve();await flush();assert.equal(t.audio.paused,true,'late promise stays silent');
 t=setup({complete:false});t.voice.show();t.voice.hide();assert.equal(t.imageEvents.load,undefined,'late image cannot speak');
 assert.equal(fs.readFileSync('index.html','utf8').includes('intro-voice-toggle'),false,'no listen or pause control exists');
 console.log('PASS automatic intro: image timing, no controls, gesture retry, stop on entry, visibility and late events');
})().catch(e=>{console.error(e);process.exitCode=1});
