const vm=require('vm'),fs=require('fs'),assert=require('assert/strict');
let contexts=0,started=0,stopped=0,speeches=0,cancels=0,filters=0;const gains=[];
const parameter=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
class AudioContext{constructor(){contexts++;this.currentTime=0;this.state='running';this.destination={};this.sampleRate=44100}createGain(){const n={gain:parameter(),connect(){},disconnect(){}};gains.push(n);return n}createOscillator(){return{frequency:parameter(),connect(){},disconnect(){},start(){started++},stop(){stopped++}}}createBiquadFilter(){filters++;return{frequency:parameter(),Q:parameter(),connect(){},disconnect(){}}}createBuffer(channels,size){return{getChannelData:()=>new Float32Array(size)}}createBufferSource(){return{connect(){},disconnect(){},start(){started++},stop(){stopped++}}}resume(){return Promise.resolve()}}
let hidden=false;const listeners={};let reduced=false;
const document={get hidden(){return hidden},querySelector(){return null},addEventListener(k,f){listeners[k]=f}};
const sandbox=vm.createContext({document,window:{AudioContext,SpeechSynthesisUtterance:class{constructor(text){this.text=text}},speechSynthesis:{getVoices:()=>[{lang:'ar-EG'}],speak(){speeches++},cancel(){cancels++}},matchMedia:()=>({matches:reduced})},setTimeout(){}});
vm.runInContext(fs.readFileSync('effects.js','utf8'),sandbox);const fx=sandbox.GameFX;
assert.equal(fx.play('success'),false);assert.equal(contexts,0,'muted game creates no audio context');
fx.configure({sound:true,volume:.5,motion:true});assert.equal(fx.play('digit'),true);assert.equal(contexts,1);
fx.play('hint');assert.equal(contexts,1,'audio context is reused');assert.ok(started>2);
const beforeMute=stopped;fx.configure({sound:false,volume:.5});assert.ok(stopped>beforeMute,'mute stops active voices');const beforeMutedPlay=started;fx.play('success');assert.equal(started,beforeMutedPlay);
fx.configure({sound:true,volume:0});assert.equal(fx.play('success'),false,'zero volume is silent');
fx.configure({sound:true,volume:1});hidden=true;assert.equal(fx.play('digit'),false,'hidden page is silent');listeners.visibilitychange();
hidden=false;assert.equal(fx.play('success'),true);assert.equal(contexts,1);
assert.ok(filters>0,'crowd uses vowel formants');assert.equal(speeches,1,'successful code has a spoken reaction');
fx.configure({sound:true,crowd:false,volume:.5});assert.ok(cancels>0,'crowd toggle cancels spoken reaction');
const oldSpeech=speeches;fx.play('retry');assert.equal(speeches,oldSpeech,'crowd off suppresses voice');
const fresh=vm.createContext({document,window:sandbox.window,setTimeout(){}});vm.runInContext(fs.readFileSync('effects.js','utf8'),fresh);fresh.GameFX.configure({sound:true,crowd:true,volume:.5,lang:'ar'});fresh.GameFX.play('retry');assert.equal(speeches,oldSpeech,'wrong submission uses sound effects without spoken overlap');fresh.GameFX.configure({sound:false,crowd:true,volume:.5});
fx.configure({sound:false,motion:false});assert.doesNotThrow(()=>fx.animate('success'));
sandbox.window.AudioContext=undefined;const noAudio=vm.createContext({document,window:{},setTimeout(){}});vm.runInContext(fs.readFileSync('effects.js','utf8'),noAudio);noAudio.GameFX.configure({sound:true,volume:.5});assert.equal(noAudio.GameFX.play('digit'),false,'unsupported audio never breaks gameplay');
console.log('PASS sound opt-in, one shared audio context, mute, volume zero, hidden page, reduced effects, unsupported audio');
console.log('PASS crowd formants, spoken encouragement/retry, crowd toggle, speech cancellation');
const tones=[];class BuzzerContext extends AudioContext{createOscillator(){const oscillator=super.createOscillator();tones.push(oscillator);return oscillator}}
const buzzer=vm.createContext({document,window:{AudioContext:BuzzerContext},setTimeout(){}});vm.runInContext(fs.readFileSync('effects.js','utf8'),buzzer);buzzer.GameFX.configure({sound:true,crowd:false,volume:.5});
buzzer.GameFX.play('error');const genericCount=tones.length;const generic=tones.splice(0);
buzzer.GameFX.play('retry');assert.ok(tones.length>genericCount,'wrong full code has a distinct layered buzzer');assert.ok(tones.some(t=>t.type==='square'),'wrong-code buzzer has a clear electronic timbre');assert.ok(generic.every(t=>t.type!=='square'),'ordinary input error remains softer');
buzzer.GameFX.configure({sound:false});const mutedCount=tones.length;buzzer.GameFX.play('retry');assert.equal(tones.length,mutedCount,'wrong buzzer respects mute');
console.log('PASS wrong-code buzzer distinct from input errors, crowd optional, no spoken overlap and master mute');
