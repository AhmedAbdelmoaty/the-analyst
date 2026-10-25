const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const clips=[],events={};let hidden=false;
class Audio{constructor(url){this.url=url;this.currentTime=0;this.paused=true;this.events={};clips.push(this)}addEventListener(k,fn){this.events[k]=fn}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}}
const ctx=vm.createContext({Audio,document:{get hidden(){return hidden},addEventListener(k,fn){events[k]=fn}}});
vm.runInContext(fs.readFileSync('vault-voice.js','utf8'),ctx);
(async()=>{
 const voice=ctx.VaultVoice;assert.equal(voice.play(0,.7),true);assert.match(clips[0].url,/first-vault-win.wav$/);assert.equal(clips[0].volume,.7);assert.equal(clips[0].loop,false);
 voice.stop();await Promise.resolve();assert.equal(clips[0].paused,true);assert.equal(clips[0].currentTime,0,'stops on next vault');
 assert.equal(voice.play(0,0),false);assert.equal(clips.length,1,'volume zero silent');
 voice.play(1,.5);assert.match(clips[1].url,/second-vault-win.wav$/);hidden=true;events.visibilitychange();assert.equal(clips[1].paused,true);assert.equal(voice.play(1,.5),false,'hidden page silent');
 hidden=false;voice.play(1,.5);voice.play(2,.5);assert.match(clips[3].url,/final-win.wav$/);assert.equal(clips[2].paused,true,'no overlapping recordings');voice.stop();
 assert.equal(voice.play(3,.5),false);assert.equal(voice.play(-1,.5),false);assert.equal(clips.length,4,'no recording for invalid vault');
 console.log('PASS all vault recordings: file mapping, volume, stop, no overlap, hidden page and mute');
})().catch(e=>{console.error(e);process.exitCode=1});
