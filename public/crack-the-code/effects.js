/* Original synthesized sounds; no downloads, permissions, or audio files. */
globalThis.GameFX = (() => {
  let context, master, enabled=false, volume=.55, motion=true, crowd=true, language='en', speechActive=false, lastReaction=-Infinity;
  const voices=new Set();
  const cues={
    digit:[[560,0,.07,.17,'sine'],[1120,.025,.045,.035,'sine']],
    select:[[740,0,.055,.08,'sine']],
    erase:[[330,0,.07,.10,'sine'],[220,.045,.06,.07,'sine']],
    excluded:[[210,0,.085,.13,'triangle'],[150,.05,.075,.08,'sine']],
    possible:[[440,0,.09,.10,'sine'],[554,.065,.10,.08,'sine']],
    confirmed:[[660,0,.12,.11,'sine'],[880,.075,.14,.10,'sine']],
    exact:[[660,0,.11,.10,'sine'],[880,.07,.13,.10,'sine'],[1320,.14,.20,.07,'sine']],
    hint:[[523,0,.17,.09,'sine'],[784,.10,.20,.09,'sine'],[1047,.20,.30,.06,'sine']],
    error:[[220,0,.14,.12,'triangle'],[185,.12,.17,.10,'triangle']],
    retry:[[196,0,.16,.11,'square'],[147,0,.16,.07,'triangle'],[147,.22,.25,.12,'square'],[110,.22,.25,.08,'triangle']],
    ready:[[440,0,.09,.08,'sine'],[660,.08,.09,.08,'sine'],[880,.16,.16,.08,'sine']],
    success:[[130,0,.18,.12,'triangle'],[262,.08,.22,.12,'sine'],[523,.18,.25,.11,'sine'],[659,.30,.27,.11,'sine'],[784,.42,.35,.10,'sine'],[1047,.58,.55,.10,'sine'],[523,.58,.55,.05,'sine'],[659,.58,.55,.05,'sine']],
    level:[[392,0,.15,.09,'sine'],[523,.12,.16,.09,'sine'],[784,.24,.28,.07,'sine']]
  };
  function stop(){for(const node of voices){try{node.stop()}catch{}}voices.clear();if(speechActive){window.speechSynthesis?.cancel();speechActive=false}}
  function configure(prefs){const hadCrowd=crowd;enabled=!!prefs.sound;volume=Number.isFinite(prefs.volume)?Math.max(0,Math.min(1,prefs.volume)):.55;motion=prefs.motion!==false;crowd=prefs.crowd!==false;language=prefs.lang||'en';if(master&&context)master.gain.setValueAtTime(enabled?volume:0,context.currentTime);if(!enabled||volume===0||hadCrowd&&!crowd)stop()}
  function track(source,cleanup,start,duration){voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();cleanup.forEach(n=>n.disconnect())};source.start(start);source.stop(start+duration+.025)}
  function whistle(start,happy){
    const source=context.createOscillator(),gain=context.createGain();source.type='sine';
    source.frequency.setValueAtTime(happy?1300:1800,start);
    source.frequency.linearRampToValueAtTime(happy?2200:1300,start+.15);
    source.frequency.linearRampToValueAtTime(happy?1900:1550,start+.35);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.035,start+.025);gain.gain.exponentialRampToValueAtTime(.0001,start+.4);
    source.connect(gain);gain.connect(master);track(source,[gain],start,.42);
  }
  function crowdVowel(start,happy,index){
    // A small formant choir gives the reaction a rounded "ooooh" sound.
    if(!context.createBiquadFilter)return;
    const source=context.createOscillator(),envelope=context.createGain();source.type='sawtooth';
    const pitch=105+index*31;
    source.frequency.setValueAtTime(happy?pitch*.8:pitch*1.2,start);
    source.frequency.linearRampToValueAtTime(happy?pitch*1.5:pitch*.78,start+.65);
    envelope.gain.setValueAtTime(0,start);envelope.gain.linearRampToValueAtTime(.065,start+.11);envelope.gain.exponentialRampToValueAtTime(.0001,start+1.05);
    source.connect(envelope);const filters=[];
    for(const frequency of happy?[540,1450,2400]:[330,820,2250]){const filter=context.createBiquadFilter();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=frequency<1000?5:9;envelope.connect(filter);filter.connect(master);filters.push(filter)}
    track(source,[envelope,...filters],start,1.08);
  }
  function applause(start){
    if(!context.createBuffer||!context.createBufferSource)return;
    const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.07),context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(context.sampleRate*.014));
    for(let i=0;i<18;i++){
      const at=start+i*.078+Math.random()*.04,source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
      gain.gain.value=.045+Math.random()*.035;source.connect(gain);gain.connect(master);track(source,[gain],at,.075);
    }
  }
  function speak(happy){
    // Speech is optional: the synthesized reaction also works without a voice.
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)return;
    try{
      const speech=window.speechSynthesis,available=speech.getVoices(),arabic=language==='ar',voice=available.find(v=>v.lang.toLowerCase().startsWith(arabic?'ar':'en'));
      const useArabic=arabic&&!!voice;
      const phrase=happy?(useArabic?'جامد جدًا! فتحت الخزنة!':'Bravo! You cracked it!'):(useArabic?'أوووه! جرّب تاني، أنت قدها!':'Ooh! Try again. You can do it!');
      if(speechActive)speech.cancel();
      const line=new window.SpeechSynthesisUtterance(phrase);line.lang=useArabic?'ar-EG':'en-US';if(voice)line.voice=voice;line.volume=volume*.8;line.rate=happy?1.05:.94;line.pitch=happy?1.12:.85;
      line.onend=line.onerror=()=>{speechActive=false};speechActive=true;speech.speak(line);
    }catch{speechActive=false}
  }
  function reaction(happy,start,spoken=true){
    if(!crowd||context.currentTime-lastReaction<1.6)return;lastReaction=context.currentTime;
    for(let i=0;i<3;i++)crowdVowel(start+i*.06,happy,i);
    whistle(start+(happy?.45:.3),happy);if(happy)applause(start+.1);if(spoken)speak(happy);
  }
  function play(kind='digit',options={}){
    if(!enabled||!volume||document.hidden)return false;
    try{
      if(!context||context.state==='closed'){
        const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
        context=new Audio();master=context.createGain();master.gain.value=volume;master.connect(context.destination);
      }
      if(context.state==='suspended')context.resume().catch(()=>{});
      // Keep rapid tapping quiet and bounded, even on held keyboard keys.
      if(voices.size>28)return false;
      const start=context.currentTime+.012;
      for(const [frequency,delay,duration,gain,wave] of cues[kind]||cues.digit){
        const oscillator=context.createOscillator(),envelope=context.createGain();
        oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,start+delay);
        envelope.gain.setValueAtTime(0,start+delay);
        envelope.gain.linearRampToValueAtTime(gain,start+delay+.008);
        envelope.gain.exponentialRampToValueAtTime(.0001,start+delay+duration);
        oscillator.connect(envelope);envelope.connect(master);voices.add(oscillator);
        oscillator.onended=()=>{voices.delete(oscillator);oscillator.disconnect();envelope.disconnect()};
        oscillator.start(start+delay);oscillator.stop(start+delay+duration+.02);
      }
      if(kind==='success'||kind==='retry')reaction(kind==='success',start+(kind==='retry'?.58:.04),kind!=='retry'&&options.speech!==false);
      return true;
    }catch{return false}
  }
  function animate(kind){
    if(!motion||document.hidden||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const target=document.querySelector(kind==='success'?'.lock-panel':kind==='hint'?'.hint-panel':'.slots');
    if(!target)return;target.classList.remove('fx-pop','fx-unlock');void target.offsetWidth;
    target.classList.add(kind==='success'?'fx-unlock':'fx-pop');
    if(kind!=='success')return;
    document.querySelector('.fx-particles')?.remove();
    const layer=document.createElement('div');layer.className='fx-particles';layer.setAttribute('aria-hidden','true');
    for(let i=0;i<32;i++){
      const particle=document.createElement('i');
      particle.style.setProperty('--x',`${Math.round(Math.random()*94+3)}vw`);
      particle.style.setProperty('--drift',`${Math.round(Math.random()*180-90)}px`);
      particle.style.setProperty('--delay',`${Math.round(Math.random()*250)}ms`);
      particle.style.setProperty('--rotation',`${Math.round(Math.random()*600-300)}deg`);
      particle.style.setProperty('--color',['#a61e25','#dcb8a8','#16825d','#d5a43b'][i%4]);layer.appendChild(particle);
    }
    // A dialog is in the top layer; particles must live inside it to stay visible.
    const host=document.querySelector('dialog[open]')||document.body;host.appendChild(layer);
    setTimeout(()=>layer.remove(),1900);
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
  return {configure,play,animate,stop};
})();
