/* Decision Matrix — standalone visual-novel preview. No network or packages required. */
(()=>{'use strict';
const {levels,characters}=window.DM_DATA,E=window.DM_ENGINE;
const $=s=>document.querySelector(s),app=$('#app'),overlay=$('#overlay');
const PLAYER_ID=window.name||'guest';
const SCOPE=encodeURIComponent(PLAYER_ID);
const KEY='theanalyst.decision-matrix.v1.'+SCOPE;
const PREF='theanalyst.decision-matrix.preferences.'+SCOPE;
const LEGACY_KEY=KEY+'.pre-replacement';
const paths={chart:'M4 17V9m5 8V5m5 12v-7m5 7V3',arrow:'M19 12H5m6-6-6 6 6 6',close:'m6 6 12 12M6 18 18 6',book:'M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z',file:'M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6',grid:'M3 3h18v18H3Zm6 0v18m6-18v18M3 9h18M3 15h18',bulb:'M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0l-1 2H9Z',check:'m5 12 4 4L20 5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3-1 2 3-2 3 2 3-2 3-3-1-1 3h-4l-1-3-3 1-2-3 2-3-2-3 2-3 3 1Z',chat:'M4 4h16v12H9l-5 4Z',laptop:'M4 4h16v13H4ZM2 20h20',sound:'M4 9h4l5-4v14l-5-4H4Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',mute:'M4 9h4l5-4v14l-5-4H4Zm12 0 5 6m0-6-5 6',reset:'M4 8a8 8 0 1 1 0 8m0-13v6h6',lock:'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4',spark:'m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3Z',users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.file}"/></svg>`;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
const btn=(action,label,cls='secondary',extra='')=>`<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const avatar=(who,cls='')=>`<span class="avatar avatar-${who} ${cls||''}" style="background-position:${characters[who]?.pos||'center'}" aria-hidden="true"></span>`;
const freshCase=i=>({index:i,mode:'intro',line:0,seen:[],picks:levels[i].rows.map(()=>-1),crosses:[],checked:[],hints:0,attempts:0,solved:false,choice:-1,notes:'',crmReceived:false,storyRevision:levels[i].meeting?.revision||0});
const fresh=()=>({version:1,started:false,current:freshCase(0),completed:[],totalAttempts:0,totalHints:0,elapsed:0});
let state=fresh(),prefs={sound:false,voice:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,timer:false},saved=false;
const showSavedResult=new URLSearchParams(location.search).get('showResult')==='1';
try{const p=JSON.parse(localStorage.getItem(PREF));if(p)Object.keys(prefs).forEach(k=>{if(typeof p[k]==='boolean')prefs[k]=p[k];});const s=JSON.parse(localStorage.getItem(KEY));if(window.DM_MEETING.canLoad(s,levels)){state=s;saved=!!s.started;}}catch{}
window.DM_MEETING.normalizeProgress(state,levels,freshCase);
let home=true,modal=null,evidenceId=null,typing=null,typedFull='',typingDone=true,toastTimer,audio,returnFocus=null;
let lastUserAction=Date.now();
const voicePlayer=new window.DM_VoicePlayer();
let voiceStatus='idle',reactionTimer=null,reactionToken=0;
let sceneVoiceKey='',successVoiceIndex=0;
const level=()=>levels[state.current.index],c=()=>state.current;
const recorded=()=>window.DM_LEVEL_VOICES?.[c().index];
const chapterClip=section=>recorded()?.group(section)[0];
function persist(){try{const prior=localStorage.getItem(KEY);if(prior!==null&&localStorage.getItem(LEGACY_KEY)===null)localStorage.setItem(LEGACY_KEY,prior);localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(PREF,JSON.stringify(prefs));saved=state.started;}catch{toast('المتصفح مش سامح بالحفظ. تقدر تكمل الجلسة الحالية.');}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300);}
function tone(type='tap'){if(!prefs.sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sine';o.frequency.value=type==='success'?660:type==='fail'?160:420;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);}catch{}}
function duration(t){return Math.floor(t/60).toString().padStart(2,'0')+':'+(t%60).toString().padStart(2,'0');}
function header(){return `<header class="topbar"><div class="brand"><span class="brand-symbol">${icon('chart')}</span><div><div class="brand-name">THE ANALYST</div><div class="brand-sub">مصفوفة القرار · نسخة الكارتون</div></div></div><nav class="chapter-track" aria-label="تقدم القصة">${levels.map((l,i)=>`<div class="chapter ${state.completed.includes(i)?'done':!home&&i===c().index?'active':''}" ${!home&&i===c().index?'aria-current="step"':''}><span class="chapter-number">${state.completed.includes(i)?'✓':String(i+1).padStart(2,'0')}</span><span>${l.short}</span></div>`).join('')}</nav><div class="top-tools"><button class="icon-btn" data-action="settings" aria-label="الإعدادات">${icon('settings')}</button></div></header>`;}
function render(){clearInterval(typing);document.body.classList.toggle('reduced',!prefs.motion);app.innerHTML=header()+(home?homeView():sceneView());if(!home&&c().mode==='intro')typeDialogue();syncSceneVoice();}
function homeView(){return `<main class="home"><div class="home-image"></div><div class="home-content"><div class="eyebrow">أول يوم ليك. أول قرار عليك.</div><h1>الكل عنده رأي.<br>إنت عندك <span>الدليل.</span></h1><p class="home-desc">كرسيك مستنيك على ترابيزة الاجتماع. اسمع الفريق، فتّش في التقارير، واربط الأرقام قبل ما تاخد قرارك.</p><div class="home-cta">${btn('start',`${saved?'كمّل من مكانك':'ادخل الاجتماع'} ${icon('arrow')}`,'primary')}${saved?btn('reset','ابدأ من جديد','secondary'):btn('how','إزاي ألعب؟','secondary')}</div><p class="status">قضيتان مترابطتان · بدون ضغط وقت · التقدم بيتحفظ على جهازك</p><div class="home-cases">${levels.map((l,i)=>`<div class="home-case"><b>0${i+1}</b><span>${l.title}</span></div>`).join('')}</div><div class="home-footer">THE ANALYST · CARTOON EDITION <span aria-hidden="true">&nbsp; / &nbsp;</span> قصة واحدة. قراران بيعملوا فرق.</div></div><div class="home-label">THE EVIDENCE CHANGES EVERYTHING</div></main>`;}
function sceneView(){const l=level(),intro=c().mode==='intro',reaction=c().mode==='reaction',handoff=c().mode==='handoff',meeting=!!l.meeting,locked=intro||reaction||handoff,who=reaction?reactionLine().who:handoff?l.meeting.handoffSpeaker:intro?l.intro[c().line][0]:'omar';
 const visibleEvidence=l.evidence.filter(e=>!['report','laptop'].includes(e.source));
 return `<main class="stage ${reaction?'reaction-active':''} ${handoff?'handoff-active':''} ${meeting?'story-meeting':''}" aria-label="غرفة الاجتماعات من منظور المحلل"><div class="scene-viewport"><div class="scenery" role="img" aria-label="عمر أمامك، وسارة وكريم على اليسار، ونادية ومريم على اليمين، واللاب والتقارير قدامك"></div><div class="scene-heading"><div class="eyebrow">${l.eyebrow}</div><h1>${l.title}</h1><p>${intro?'اسمع الاجتماع… كل رأي وراه جزء من الصورة.':handoff?'التكليف وصل لك. الملف قدامك على الترابيزة.':l.brief}</p></div><div class="scene-tools">${prefs.timer?`<span class="scene-time"><span data-clock>${duration(state.elapsed)}</span></span>`:''}<button class="btn notebook-btn" data-action="${meeting?'casefile':'notebook'}" ${reaction||(meeting&&!c().crmReceived)?'disabled':''}>${icon(meeting?'file':'book')} ${meeting?'ملف الاجتماع':'دفتر الأدلة'} <b>${c().seen.length}/${l.evidence.length}</b></button></div><div class="scene-caption">PRISM / MEETING ROOM 01</div>${locked?'':hotspots(l)}</div><div class="scene-bottom"><div class="crew" aria-label="الفريق">${['sara','karim','omar','nadia','mariam'].map(id=>{const ev=visibleEvidence.find(e=>e.source===id);return `<button class="crew-btn ${locked&&id===who?'active':''}" data-action="${locked?'crewIntro':id==='omar'?'brief':'evidence'}" ${ev?`data-id="${ev.id}"`:''} aria-label="${characters[id].name}، ${characters[id].role}">${avatar(id)}${characters[id].name}${!locked&&ev&&c().seen.includes(ev.id)?' ✓':''}</button>`;}).join('')}</div>${reaction?reactionView():handoff?handoffView():intro?dialogueView():investigateView()}<div class="scene-foot"><span><i></i> ${reaction?'الفريق بيرد على تحليلك… وبعده القرار ليك.':intro?'إنت قاعد معاهم. اسمع اللي بيتقال.':handoff?(c().index===1?'أعداد المبيعات + الهامش والإعلان + محضر الاجتماع':'تقرير الإنفاق + تصدير العملاء + محضر الاجتماع'):'الملف معاك. خلّي الأرقام تسند قرارك.'}</span><span>THE ANALYST / CHAPTER 0${c().index+1}</span></div><div class="progress-strip" aria-hidden="true">${levels.map((_,i)=>`<span class="${state.completed.includes(i)?'done':''}"></span>`).join('')}</div></div></main>`;
}
function handoffView(){const m=level().meeting;return `<section class="dialogue handoff-dialogue" aria-label="${c().index===1?'استلام ملف المنتجات':'استلام تقرير الـCRM'}"><div class="dialogue-inner">${avatar(m.handoffSpeaker)}<div><div class="speaker-name">${characters[m.handoffSpeaker].name}<small>${characters[m.handoffSpeaker].role}</small></div><p class="speech">${m.handoffText}</p></div></div><div class="handoff-package"><div class="paper-mark">${icon('file')}</div><div><div class="eyebrow">وصل لك من نادية · ملف الاجتماع</div><h2>${c().index===1?'ملف المنتجات':'تقرير الـCRM'}</h2><p>${c().index===1?'أعداد المبيعات · هامش البيع · تكلفة الإعلان':'الإنفاق الإعلاني · أعداد العملاء · محضر الاجتماع'}</p></div>${btn('receiveCrm',(c().index===1?'استلم ملف المنتجات ':'استلم تقرير الـCRM ')+icon('arrow'),'primary')}</div></section>`;}
function meetingBar(){return `<section class="investigate-bar"><div><div class="eyebrow" style="font-size:9px;margin-bottom:6px">ملف الاجتماع معاك</div><h2>${c().solved?'الربط اتراجع. هتقول لعمر إيه؟':'استلمت الملف. دورك تربط الصورة.'}</h2><p>التقرير وكل اللي اتقال في الاجتماع ظاهرين جنب المصفوفة.</p></div><div class="bar-actions">${btn('casefile',icon('file')+' افتح الملف','secondary')}${btn(c().solved?'decision':'analysis',icon('grid')+(c().solved?' قدم قرارك':' ابدأ التحليل'),'primary')}</div></section>`;}
function crmTable(){
  const l=level();
  return `<table class="dossier-data-table crm-table">
    <thead>
      <tr>
        <th scope="col">${l.rowLabel}</th>
        <th scope="col">${l.valueLabel}</th>
      </tr>
    </thead>
    <tbody>
      ${l.values.map((v,i)=>`
        <tr>
          <td><span class="missing-source">غير متاح</span></td>
          <td class="amount"><b>${fmt(v)}</b></td>
        </tr>
      `).join('')}
    </tbody>
  </table>`;
}

function spendTable(){
  const l=level();
  const total=l.base.reduce((a,b)=>a+b,0);
  return `<table class="dossier-data-table spend-table">
    <thead>
      <tr>
        <th scope="col">${l.rowLabel}</th>
        <th scope="col">${l.baseLabel} (ج.م)</th>${l.margins?'<th scope="col">هامش البيع (ج.م)</th>':''}
      </tr>
    </thead>
    <tbody>
      ${l.rows.map((row,i)=>`
        <tr>
          <td class="platform-cell">
            ${getRowIcon(l.id, row, i)}
            <span class="platform-name">${row}</span>
          </td>
          <td class="amount">${fmt(l.base[i])}</td>${l.margins?`<td class="amount">${fmt(l.margins[i])}</td>`:''}
        </tr>
      `).join('')}
    </tbody>
    <tfoot>
      <tr class="spend-total-row">
        <th scope="row">
          <span class="total-coin-icon">💰</span>
          <span>إجمالي الشهر</span>
        </th>
        <td class="amount total-amount">${fmt(total)} ج.م</td>${l.margins?'<td>—</td>':''}
      </tr>
    </tfoot>
  </table>`;
}

function meetingFacts(){
  const l=level();
  const ids=['karim','sara','nadia','mariam'];
  return ids.map(id=>{
    const e=l.evidence.find(x=>x.id===id);
    if(!e)return '';
    return `<div class="dossier-statement-card">
      <div class="statement-avatar-wrap">
        ${avatar(id)}
      </div>
      <div class="statement-content">
        <div class="statement-header">
          <span class="statement-speaker">${characters[id].name}</span>
          <button class="statement-sound-btn" data-action="playCharVoice" data-who="${id}" title="استمع لـ ${characters[id].name}" aria-label="استمع لـ ${characters[id].name}">
            ${icon('sound')}
          </button>
        </div>
        <p class="statement-bubble">${esc(e.text)}</p>
      </div>
    </div>`;
  }).join('');
}

function casefileView(){
  const l=level();
  const body=`<div class="dossier-two-pages">
    <!-- RIGHT PAGE: تقرير العملاء والإنفاق -->
    <section class="dossier-page page-right">
      <div class="dossier-page-heading">
        <div class="dossier-title-group">
          <h2>ملف الاجتماع <span class="dossier-head-icon" aria-hidden="true">${icon('users')}</span></h2>
          <div class="dossier-subtitle">${l.id==='products'?'تقرير المنتجات والتكاليف':'تقرير العملاء والإنفاق'}</div>
        </div>
        <div class="rubber-stamp stamp-missing">بيانات ناقصة</div>
      </div>

      <div class="dossier-section-block">
        <div class="dossier-section-title">
          <span class="sec-icon">${icon('users')}</span>
          <h4>${l.id==='products'?'أعداد المبيعات':'تقرير العملاء'}</h4>
        </div>
        ${crmTable()}
      </div>

      <div class="dossier-dashed-rule"></div>

      <div class="dossier-section-block">
        <div class="dossier-section-title">
          <span class="sec-icon">${icon('chart')}</span>
          <h4>${l.id==='products'?'تكلفة الإعلان وهامش البيع':'الإنفاق الإعلاني'}</h4>
        </div>
        ${spendTable()}
      </div>

      <div class="dossier-page-action">
        <button class="btn secondary dossier-btn-back" data-action="close">أرجع للاجتماع</button>
      </div>
    </section>

    <!-- CENTRAL SPINE RINGS -->
    <div class="dossier-spine" aria-hidden="true">
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
    </div>

    <!-- LEFT PAGE: محضر الاجتماع وتكليف عمر -->
    <section class="dossier-page page-left">
      <div class="dossier-page-heading">
        <div class="dossier-title-group">
          <h2><span class="dossier-chat-icon" aria-hidden="true">${icon('chat')}</span> محضر الاجتماع</h2>
        </div>
      </div>

      <div class="dossier-statements-list">
        ${meetingFacts()}
      </div>

      <div class="dossier-pinned-task">
        <span class="golden-pushpin" aria-hidden="true">📌</span>
        <div class="pinned-task-header">
          <div class="pinned-avatar-wrap">
            ${avatar('omar')}
          </div>
          <div class="pinned-title-group">
            <div class="pinned-task-title">
              <span>تكليف عمر</span>
              <span class="pinned-megaphone" aria-hidden="true">📢</span>
            </div>
            <p class="pinned-task-desc">${esc(l.question)}</p>
          </div>
        </div>
      </div>

      <div class="dossier-page-action">
        <button class="btn primary dossier-btn-start" data-action="analysis">
          <span>ابدأ التحليل</span>
          <span class="btn-arrow" aria-hidden="true">←</span>
        </button>
      </div>
    </section>
  </div>`;

  return dialog('ملف الاجتماع', body, '', false, `القضية 0${c().index+1} · ${l.short}`, 'casefile-dialog custom-head');
}

function meetingAnalysisView(){return basicAnalysisView();}
function reactionLines(){if(recorded())return recorded().reactionLines(c());const rounds=level().meeting?.reactionRounds||window.DM_REACTIONS.rounds;return rounds[Math.max(0,c().attempts-1)%rounds.length];}
function reactionLine(){const lines=reactionLines();return lines[Math.min(c().reactionIndex||0,lines.length-1)];}
function stopVoice(status='paused'){reactionToken++;clearTimeout(reactionTimer);voicePlayer.stop();voiceStatus=status;}
function beginReaction(){stopVoice();clearTimeout(toastTimer);$('#toast').classList.remove('visible');c().mode='reaction';c().reactionIndex=0;c().reactionDone=false;persist();closeModal();render();playReaction();$('.reaction-dialogue')?.scrollIntoView({block:'nearest'});}
function playReaction(){
 if(home||modal||c().mode!=='reaction'||c().reactionDone)return;
 stopVoice(prefs.voice?'loading':'muted');render();if(!prefs.voice)return;
 if(!reactionLine().file){voiceStatus='script';render();return;}
 const token=reactionToken,line=reactionLine(),file='assets/voices/'+line.file;
 const current=()=>token===reactionToken&&!home&&!modal&&c().mode==='reaction'&&!c().reactionDone;
 const update=status=>{if(current()){voiceStatus=status;render();}};
 voicePlayer.play(window.DM_AUDIO_ASSETS?.[file]||file,{
  onPlaying:()=>update('playing'),
  onBlocked:()=>update('blocked'),
  onError:()=>update('error'),
  onEnded:()=>{if(current()){voiceStatus='ended';render();reactionTimer=setTimeout(()=>{if(current())advanceReaction();},450);}}
 });
}
function advanceReaction(){stopVoice();if(c().reactionDone)return;if((c().reactionIndex||0)<reactionLines().length-1){c().reactionIndex=(c().reactionIndex||0)+1;persist();render();playReaction();}else{c().reactionDone=true;voiceStatus='complete';persist();render();$('[data-action="reactionRetry"]')?.focus();}}
function finishReaction(){stopVoice('complete');c().reactionIndex=reactionLines().length-1;c().reactionDone=true;persist();render();}
function restartReaction(){stopVoice();c().reactionIndex=0;c().reactionDone=false;persist();render();playReaction();}
function reactionView(){const line=reactionLine(),spoken=!!line.file,done=c().reactionDone,playing=voiceStatus==='playing',status=done?'الفريق خلّص كلامه. قرارك دلوقتي.':!spoken?'الحوار الجديد للمراجعة · التسجيل بعد اعتماد النص':!prefs.voice?'الصوت مكتوم. تقدر تكمّل التعليقات يدويًا.':({loading:'جاري تجهيز الصوت…',playing:'بيتكلّم دلوقتي',blocked:'اضغط «شغّل الصوت» عشان تسمع التعليقات.',error:'الصوت ما اتحمّلش. جرّب إعادة السماع.',paused:'الصوت متوقف. اضغط لإعادة السماع.',ended:'التعليق التالي…',idle:'اضغط «شغّل الصوت» لبدء التعليقات.'}[voiceStatus]||'');return `<section class="dialogue reaction-dialogue dossier-reaction-sheet" aria-label="رد فعل الفريق في غرفة الاجتماع"><div class="reaction-banner"><div class="reaction-banner-title"><span class="dot"></span><span>رجعت لغرفة الاجتماع</span></div><div class="rubber-stamp stamp-danger">محتاج مراجعة</div><span class="reaction-subtitle">${c().solved?'التوصية محتاجة مراجعة':'فيه حاجة مش راكبة في التحليل'}</span></div><div class="dialogue-inner">${avatar(line.who)}<div class="reaction-copy"><div class="speaker-name">${characters[line.who].name}<small>${characters[line.who].role}</small>${playing?'<span class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>':''}</div><p class="speech" aria-live="polite">${esc(line.text)}</p><div class="voice-status" role="status">${status}</div></div></div><div class="reaction-controls"><div class="voice-buttons">${spoken?btn('reactionMute',icon(prefs.voice?'sound':'mute')+(prefs.voice?'كتم الصوت':'تفعيل الصوت'),'quiet','aria-pressed="'+!prefs.voice+'"'):''}${done?btn('reactionReplay',icon('reset')+(spoken?' اسمعهم تاني':' راجع الحوار من الأول'),'quiet'):playing?btn('reactionPause','إيقاف مؤقت','quiet'):prefs.voice&&spoken?btn('reactionPlay',icon('sound')+(voiceStatus==='blocked'||voiceStatus==='idle'?' شغّل الصوت':' إعادة السماع'),'secondary'):''}</div><span class="dialogue-count">${(c().reactionIndex||0)+1} / ${reactionLines().length}</span>${done?`<div class="reaction-decisions">${btn('reactionHint',icon('bulb')+' خذ تلميح','secondary')}${btn('reactionRetry',c().solved?'أراجع القرار':'أعيد التحليل','primary')}</div>`:`<div class="reaction-navigation">${btn('reactionSkip','تخطي التعليقات','quiet')}${btn('reactionNext','التعليق التالي '+icon('arrow'),'secondary')}</div>`}</div></section>`;}
function hotspots(l){return l.evidence.map(e=>{const report=e.source==='report',laptop=e.source==='laptop',char=!report&&!laptop,x=report?82:laptop?48:characters[e.source].x,y=char?characters[e.source].y:70;return `<button class="hotspot ${c().seen.includes(e.id)?'seen':''}" data-kind="${char?'character':'object'}" style="left:${x}%;top:${y}%;--mobile-x:${report?76:50}%;--mobile-y:310px" data-action="evidence" data-id="${e.id}" data-label="${e.title}" aria-label="افتح ${e.title}${c().seen.includes(e.id)?'، تم اكتشافه':''}">${icon(c().seen.includes(e.id)?'check':report?'file':laptop?'laptop':'chat')}</button>`;}).join('');}
function dialogueView(){const l=level(),[who,text]=l.intro[c().line],last=c().line===l.intro.length-1;return `<section class="dialogue" aria-label="حوار ${characters[who].name}"><div class="dialogue-inner">${avatar(who)}<div><div class="speaker-name">${characters[who].name}<small>${characters[who].role}</small></div><p class="speech" data-say aria-label="${esc(text)}">${esc(text)}</p></div></div><div class="dialogue-actions"><div>${c().line?btn('previous','رجوع','quiet'):''}${btn('skip',l.meeting?'اختصر الاجتماع':'انتقل للتحقيق','quiet')}</div><div class="dialogue-count">${c().line+1} / ${l.intro.length}</div>${btn('next',`${last?(l.meeting?'أنا جاهز':'افتح التحقيق'):'التالي'} ${icon('arrow')}`,'primary')}</div></section>`;}
function investigateView(){if(level().meeting)return meetingBar();return `<section class="investigate-bar"><div><div class="eyebrow" style="font-size:9px;margin-bottom:6px">${c().solved?'الربط اكتمل · فاضل القرار':'مرحلة التحقيق'}</div><h2>${c().solved?'الأرقام جاهزة. هتوصي بإيه؟':'اسأل. استكشف. وبعدها اربط.'}</h2><p>${c().solved?'راجع المقارنة وقدم توصيتك لعمر.':'اضغط على الفريق أو اللاب أو التقرير لجمع الأدلة.'}</p></div><div class="bar-actions">${btn('hint',`${icon('bulb')} تلميح`,'secondary')}${btn(c().solved?'decision':'analysis',`${icon('grid')} ${c().solved?'قدم قرارك':'افتح المصفوفة'}`,'primary')}</div></section>`;}
function typeDialogue(){const node=$('[data-say]');if(!node)return;typedFull=level().intro[c().line][1];typingDone=!prefs.motion;if(typingDone)return;node.textContent='';node.classList.add('type-cursor');let n=0;const chars=Array.from(typedFull);typing=setInterval(()=>{if(!node.isConnected){clearInterval(typing);return;}node.textContent=chars.slice(0,++n).join('');if(n>=chars.length)finishTyping();},20);}
function finishTyping(){clearInterval(typing);const node=$('[data-say]');if(node){node.textContent=typedFull;node.classList.remove('type-cursor');}typingDone=true;}
function dialog(title,body,footer='',small=false,eyebrow='مصفوفة القرار',cls=''){
  const currentLevel=level?level():levels[0];
  const tagText=eyebrow||`القضية 0${(state?.current?.index||0)+1} · ${currentLevel?.short||'الميزانية'}`;
  return `<dialog class="dossier-modal ${small?'small-dialog':''} ${cls||''}" aria-labelledby="dialog-title">
    <div class="dossier-leather-frame">
      <div class="dossier-top-bar">
        <div class="dossier-top-clip">
          <span class="dossier-paperclip" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22"><path d="M7 13.5V8a5 5 0 0 1 10 0v10a3 3 0 0 1-6 0V9a1 1 0 0 1 2 0v8.5" fill="none" stroke="#D4A34C" stroke-width="2.2" stroke-linecap="round"/></svg>
          </span>
          <span class="dossier-case-tag">${esc(tagText)}</span>
        </div>
        <div class="dossier-brand-center">
          <span class="dossier-brand-logo">THE <strong>ANALYST</strong></span>
        </div>
        <div class="dossier-top-actions">
          <button class="dossier-btn-close" data-action="close" aria-label="إغلاق">✕</button>
        </div>
      </div>
      <aside class="dossier-side-tabs right-tabs" aria-hidden="true">
        <span class="dossier-tab tab-summary"><span class="tab-label">الملخص</span></span>
        <span class="dossier-tab tab-customers"><span class="tab-label">العملاء</span></span>
        <span class="dossier-tab tab-spend"><span class="tab-label">الإنفاق</span></span>
      </aside>
      <aside class="dossier-side-tabs left-tabs" aria-hidden="true">
        <span class="dossier-tab tab-main"><span class="tab-label">العملاء والإنفاق</span></span>
        <span class="dossier-tab tab-notes"><span class="tab-label">ملاحظات</span></span>
      </aside>
      <div class="dossier-inner-content">
        ${cls?.includes('custom-head') ? '' : `<div class="modal-head"><div><div class="eyebrow">${eyebrow}</div><h2 id="dialog-title">${title}</h2></div><button class="icon-btn dossier-inner-close" data-action="close" aria-label="إغلاق">${icon('close')}</button></div>`}
        ${body}
        ${footer?`<div class="modal-footer">${footer}</div>`:''}
      </div>
    </div>
  </dialog>`;
}
function openModal(type,id){if(level().meeting){if(type==='notebook'&&c().crmReceived)type='casefile';if(['analysis','casefile','decision'].includes(type)&&!c().crmReceived){window.DM_MEETING.finishIntro(level(),c());persist();closeModal();render();return;}}finishTyping();if(c().mode==='reaction'){stopVoice();render();}if(!modal)returnFocus=document.activeElement;if(type==='success'&&modal!=='success')successVoiceIndex=0;modal=type;evidenceId=id??evidenceId;renderModal();}
function closeModal(){modal=null;overlay.innerHTML='';syncSceneVoice();if(returnFocus?.isConnected)returnFocus.focus();else $('button[data-action="notebook"]')?.focus();}
function renderModal(focus){const l=level();let html='';
 if(modal==='analysis')html=analysisView();
 if(modal==='casefile')html=casefileView();
 if(modal==='evidence'){const e=l.evidence.find(e=>e.id===evidenceId);html=evidenceView(e);}
 if(modal==='notebook')html=notebookView();
 if(modal==='hint')html=hintView();
 if(modal==='decision')html=decisionView();
 if(modal==='success')html=successView();
 if(modal==='finish')html=finishView();
 if(modal==='settings')html=settingsView();
 if(modal==='brief')html=briefView();
 if(modal==='reset')html=resetView();
 if(modal==='how')html=howView();
 overlay.innerHTML=html;const d=$('dialog');if(d){d.showModal();d.addEventListener('cancel',ev=>{ev.preventDefault();if(modal==='success'){toast('كمّل رد الفريق أو اقفل من زر الإغلاق.');}closeModal();});d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closeModal();}});if(focus)d.querySelector(focus)?.focus();}syncSceneVoice();
}
function analysisView(){return basicAnalysisView();}
function getCornerIcon(levelId){
  if(levelId==='branches')return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7z" fill="#d9383a" stroke="#22141c" stroke-width="1.2"/><circle cx="12" cy="9" r="2.5" fill="#fff"/></svg>`;
  return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><path d="M3 10v4h3l5 4V6L6 10H3z" fill="#d9383a" stroke="#22141c" stroke-width="1.2"/><path d="M15 8c1.5 1.2 2.5 2.5 2.5 4s-1 2.8-2.5 4" fill="none" stroke="#d9383a" stroke-width="2" stroke-linecap="round"/><path d="M18 5c2.5 2 4 4.5 4 7s-1.5 5-4 7" fill="none" stroke="#d9383a" stroke-width="2" stroke-linecap="round"/></svg>`;
}
function getRowIcon(levelId, row, r){
  if(levelId==='products'){
    if(row==='SQL'||r===0)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><ellipse cx="12" cy="7" rx="7" ry="2.5" fill="#2d7fb8" stroke="#22141c" stroke-width="1.2"/><path d="M5 7v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V7" fill="#4fa5dc" stroke="#22141c" stroke-width="1.2"/><path d="M5 11v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" fill="#69b8e8" stroke="#22141c" stroke-width="1.2"/></svg>`;
    if(row==='Excel'||r===1)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect width="22" height="22" x="1" y="1" rx="4" fill="#107C41" stroke="#22141c" stroke-width="1.2"/><text x="12" y="16.5" fill="#fff" font-size="13" font-weight="900" font-family="'Segoe UI',Arial,sans-serif" text-anchor="middle">X</text></svg>`;
    if(row==='Power BI'||r===2)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect x="5" y="13" width="3.5" height="7" rx="1" fill="#e59819" stroke="#22141c" stroke-width="1"/><rect x="10.2" y="8" width="3.5" height="12" rx="1" fill="#f2b600" stroke="#22141c" stroke-width="1"/><rect x="15.5" y="4" width="3.5" height="16" rx="1" fill="#ffc72c" stroke="#22141c" stroke-width="1"/></svg>`;
    if(row==='Python'||r===3)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><path d="M11.8 4c-3.1 0-2.9 1.3-2.9 1.3l.01 1.4h3v.4H7.8s-2 .2-2 3c0 2.7 1.7 2.8 1.7 2.8h1v-1.4s-.1-1.7 1.7-1.7h3s1.6 0 1.6-1.5V6.3s.2-2.3-3-2.3zm-1 1a.5.5 0 1 1 0 1 .5.5 0 0 1 0-1z" fill="#3673A5"/><path d="M12.2 20c3.1 0 2.9-1.3 2.9-1.3l-.01-1.4h-3v-.4h4.1s2-.2 2-3c0-2.7-1.7-2.8-1.7-2.8h-1v1.4s.1 1.7-1.7 1.7h-3s-1.6 0-1.6 1.5v3.1s-.2 2.3 3 2.3zm1-1a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z" fill="#FFD43B"/></svg>`;
    return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><path d="M4 18h16 M5 16l4-6 4 3 6-8" stroke="#c72535" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="19" cy="5" r="1.8" fill="#c72535"/></svg>`;
  }
  if(levelId==='channels'){
    if(row==='Facebook'||r===0)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect width="22" height="22" x="1" y="1" rx="4" fill="#1877F2"/><path fill="#fff" d="M14 13.5h2.5l.5-3H14v-2c0-.8.2-1.3 1.3-1.3H17V4.5c-.5-.1-1.4-.2-2.5-.2-2.5 0-4 1.5-4 4.2v2h-2.5v3H10.5V22h3.5v-8.5z"/></svg>`;
    if(row==='Instagram'||r===1)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><defs><linearGradient id="igGb" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#f09433"/><stop offset="50%" stop-color="#e6683c"/><stop offset="100%" stop-color="#bc1888"/></linearGradient></defs><rect width="22" height="22" x="1" y="1" rx="5" fill="url(#igGb)"/><rect x="5.5" y="5.5" width="13" height="13" rx="3.5" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="15.8" cy="8.2" r="1" fill="#fff"/></svg>`;
    if(row==='TikTok'||r===2)return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect width="22" height="22" x="1" y="1" rx="4" fill="#111"/><path d="M12.5 5v8.5a3 3 0 1 1-3-3c.4 0 .8.1 1.2.2V7.8a6 6 0 1 0 4.8 5.8V9.2a6.5 6.5 0 0 0 3.5 1V7.5a4 4 0 0 1-3.5-2.5h-3z" fill="#25F4EE"/><path d="M13 5v8.5a3 3 0 1 1-3-3c.4 0 .8.1 1.2.2V7.8a6 6 0 1 0 4.8 5.8V9.2a6.5 6.5 0 0 0 3.5 1V7.5a4 4 0 0 1-3.5-2.5h-3z" fill="#FE2C55" style="mix-blend-mode:screen"/></svg>`;
    return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect width="22" height="22" x="1" y="1" rx="4" fill="#fff" stroke="#dedede"/><path fill="#4285F4" d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h4.8c-.2 1.1-.9 2.1-1.9 2.7v2.3h3.1c1.8-1.7 2.8-4.1 2.8-6.8z"/><path fill="#34A853" d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.3c-.8.6-1.9 1-2.9 1-2.2 0-4.1-1.5-4.8-3.5H4v2.4C5.5 19.3 8.5 21 12 21z"/><path fill="#FBBC05" d="M7.2 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.6H4C3.4 8.9 3 10.4 3 12s.4 3.1 1 4.4l3.2-2.4z"/><path fill="#EA4335" d="M12 6.5c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.4 3.8 14.4 3 12 3 8.5 3 5.5 4.7 4 7.6l3.2 2.4c.7-2 2.6-3.5 4.8-3.5z"/></svg>`;
  }
  const colors=['#32885d','#d97724','#7a42b8','#2979b9','#1b9aaa','#b82d62'];
  const fill=colors[r%colors.length];
  return `<svg viewBox="0 0 24 24" class="cartoon-badge-svg" aria-hidden="true"><rect width="22" height="22" x="1" y="1" rx="4" fill="${fill}" stroke="#22141c" stroke-width="1.2"/><path d="M6 19V8l6-4 6 4v11H6z" fill="#fff" opacity="0.95"/><rect x="9" y="10" width="2" height="2" fill="${fill}"/><rect x="13" y="10" width="2" height="2" fill="${fill}"/><rect x="9" y="14" width="2" height="2" fill="${fill}"/><rect x="13" y="14" width="2" height="2" fill="${fill}"/></svg>`;
}
function getReportIcon(idx){
  if(idx===0)return `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 15V8m5 7V4m5 11v-6m4 6V2" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  if(idx===1)return `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="7" cy="7" r="3" fill="#0284c7"/><path d="M2 16c0-2.8 2.2-5 5-5s5 2.2 5 5" fill="none" stroke="#0284c7" stroke-width="2"/><circle cx="14" cy="8" r="2.5" fill="#38bdf8"/><path d="M12 16c0-1.8 1.3-3.2 3-3.5" fill="none" stroke="#38bdf8" stroke-width="1.8"/></svg>`;
  if(idx===2)return `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#eab308"/><text x="10" y="14" fill="#fff" font-size="12" font-weight="900" text-anchor="middle">$</text></svg>`;
  return `<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="#a855f7"/><path d="M10 2 A8 8 0 0 1 18 10 L10 10 Z" fill="#7e22ce"/></svg>`;
}
function basicAnalysisView(){const l=level();return dialog('مساحة التحليل',puzzleBoardView(l,c()),'',false,l.eyebrow,'analysis-dialog');}
function puzzleBoardView(l=level(),cur=c()){
  const rows=l.rows,values=l.values;
  const n=cur.picks.filter(x=>x>=0).length;
  const isSolved=cur.solved;
  const isComplete=E.complete(l,cur.picks);
  const displayClues=l.meeting?l.evidence:l.evidence.slice(0,4);

  return `<div class="desk-container">
    <header class="desk-topbar">
      <div class="desk-top-start">
        <button class="desk-btn-gear" data-action="settings" aria-label="الإعدادات">
          <svg class="gear-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="#2e1b26" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3-1 2 3-2 3 2 3-2 3-3-1-1 3h-4l-1-3-3 1-2-3 2-3-2-3 2-3 3 1Z"/>
          </svg>
        </button>
        <div class="desk-badge-analyst">THE ANALYST</div>
      </div>

      <div class="desk-capsule-track">
        <span class="capsule-ch-badge" lang="en" dir="ltr">0${cur.index+1}</span>
        <div class="capsule-nodes" aria-hidden="true">
          <span class="capsule-node done">✓</span>
          <span class="capsule-line"></span>
          <span class="capsule-node ${state.completed.includes(1)?'done':''}">✓</span>
          <span class="capsule-line"></span>
          <span class="capsule-node ${state.completed.includes(2)?'done':''}"></span>
        </div>
        <span class="capsule-count" lang="en" dir="ltr">1/1</span>
        <span class="capsule-title">اللغز الوحيد</span>
        <span class="capsule-dim" style="display:none">${rows.length} × ${values.length}</span>
      </div>

      <div class="desk-top-end">
        <span class="desk-badge-chart" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 18V11m5 7V7m5 11v-6m5 6V3" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>
        </span>
        <div class="desk-badge-imp">
          <strong>IMP</strong>
          <small>Institute of Management<br>Professionals</small>
        </div>
        <button class="desk-close-btn" data-action="close" aria-label="إغلاق والعودة للاجتماع">✕</button>
      </div>
    </header>

    <div class="desk-workspace">
      <aside class="desk-notes-column">
        <article class="note-card note-mission">
          <div class="pushpin red-pin note-pin" aria-hidden="true"></div>
          <div class="note-head">
            <div class="mission-head-title">
              <span class="note-icon">
                <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="#fde8ea" stroke="#d9383a" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="#fff" stroke="#d9383a" stroke-width="1.8"/><circle cx="12" cy="12" r="2.5" fill="#d9383a"/></svg>
              </span>
              <h3 class="note-title"><span style="display:none">📌 </span>مهمتك</h3>
            </div>
          </div>
          <p class="note-body">${l.brief}</p>
        </article>

        <article class="note-card note-hints">
          <div class="scotch-tape" aria-hidden="true"></div>
          <div class="note-head">
            <div class="hints-head-title">
              <span class="note-icon">
                <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="10" cy="10" r="6" fill="none" stroke="#b82333" stroke-width="2.5"/><path d="M15 15l5 5" stroke="#b82333" stroke-width="2.8" stroke-linecap="round"/></svg>
              </span>
              <h3 class="note-title"><span style="display:none">💡 </span>التلميحات</h3>
            </div>
            <button class="btn-bulb-hint" data-action="hint" aria-label="طلب تلميح">
              <svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 18h6m-5 2h4M12 3a6 6 0 0 0-6 6c0 2.2 1.3 4.1 3 5.2V16h6v-1.8c1.7-1.1 3-3 3-5.2a6 6 0 0 0-6-6z" fill="#f59e0b" stroke="#78350f" stroke-width="1.5"/></svg>
            </button>
          </div>
          <ol class="hints-list">
            ${l.hints.slice(0,cur.hints).map((hint,idx)=>`
              <li class="hint-item ${cur.hints>idx||isSolved?'revealed':''}">
                <span class="hint-number" lang="en" dir="ltr">${idx+1}</span>
                <span class="hint-text">${hint}</span>
              </li>
            `).join('')}
          </ol>
        </article>

        <article class="note-card note-reports">
          <div class="notebook-spiral" aria-hidden="true">
            <i></i><i></i><i></i><i></i><i></i><i></i>
          </div>
          <div class="bookmark-ribbon" aria-hidden="true"></div>
          <div class="note-head">
            <div class="reports-head-title">
              <span class="note-icon">
                <svg viewBox="0 0 24 24" width="20" height="20"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#f1ece1" stroke="#281422" stroke-width="1.5"/><path d="M14 2v6h6M9 13h6M9 17h4" stroke="#281422" stroke-width="1.5" stroke-linecap="round"/></svg>
              </span>
              <h3 class="note-title"><span style="display:none">📄 </span>التقارير المتاحة</h3>
            </div>
            <span class="reports-count" style="display:none">${cur.seen.length}/${l.evidence.length}</span>
          </div>
          <div class="reports-list">
            ${displayClues.map((e,idx)=>{
              const unlocked=cur.seen.includes(e.id);
              return `
                <button class="report-pill ${unlocked?'unlocked':'locked'}" data-action="${unlocked?(l.meeting?'casefile':'evidence'):'goDiscover'}" ${unlocked?`data-id="${e.id}"`:''}>
                  <div class="report-pill-badge badge-${idx%4}">
                    ${getReportIcon(idx)}
                  </div>
                  <div class="report-pill-info">
                    <strong>${e.title}</strong>
                    <small>${unlocked?(e.tag||'تقرير تفصيلي'):'دليل لم تكتشفه بعد'}</small>
                  </div>
                  <span class="report-arrow">›</span>
                </button>
              `;
            }).join('')}
          </div>
        </article>
      </aside>

      <main class="desk-board-wrapper">
        <section class="desk-paper-sheet" aria-label="مصفوفة القرار التفاعلية">
          <div class="pushpin red-pin board-pin-left" aria-hidden="true"></div>
          <div class="paperclip silver-clip board-clip-right" aria-hidden="true"></div>

          <div class="board-doodle-sticky" aria-hidden="true">
            <div class="doodle-tape"></div>
            <div class="doodle-chart">
              <svg viewBox="0 0 40 30" width="36" height="26">
                <rect x="4" y="14" width="6" height="14" fill="#f79838" rx="1.5" />
                <rect x="14" y="8" width="6" height="20" fill="#e55c42" rx="1.5" />
                <rect x="24" y="3" width="6" height="25" fill="#b82333" rx="1.5" />
                <path d="M2 28 H36" stroke="#442211" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="doodle-tag">
              <svg viewBox="0 0 28 28" width="22" height="22">
                <rect x="2" y="2" width="24" height="24" rx="4" fill="#fee970" stroke="#cbb22f" stroke-width="1.2"/>
                <path d="M6 7h16M6 13h11M6 19h7" stroke="#442211" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </div>
            <div class="doodle-arrow">
              <svg viewBox="0 0 38 38" width="34" height="34">
                <path d="M6 6 C 22 4, 32 16, 26 32" fill="none" stroke="#221118" stroke-width="2" stroke-linecap="round"/>
                <path d="M20 28 L26 32 L30 26" fill="none" stroke="#221118" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>

          <div class="board-title-banner">
            <h2>مصفوفة التحليل</h2>
          </div>
          <p class="board-subtitle">${chapterClip('بدء المصفوفة')?.file?esc(chapterClip('بدء المصفوفة').text):'اضغط الخانة: × استبعاد، ثم ✓ تثبيت، ثم مسح. التثبيت يستبعد باقي الصف والعمود.'}</p>

          <div class="board-table-container">
            <table class="sketch-matrix" aria-label="مصفوفة ${l.rowLabel} و${l.valueLabel}">
              <thead>
                <tr>
                  <th scope="col" class="sketch-th corner-th">
                    <div class="corner-pill">
                      <span class="corner-icon">${getCornerIcon(l.id)}</span>
                      <span>${l.rowLabel} / ${l.unit}</span>
                    </div>
                  </th>
                  ${values.map(v=>`
                    <th scope="col" class="sketch-th value-th">
                      <div class="value-pill" lang="en" dir="ltr">${fmt(v)}</div>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map((row,r)=>`
                  <tr>
                    <th scope="row" class="sketch-row-th">
                      <div class="row-header-card">
                        <span class="row-icon-badge">${getRowIcon(l.id,row,r)}</span>
                        <span class="row-title">${row}</span>
                      </div>
                    </th>
                    ${values.map((v,col)=>{
                      const yes=cur.picks[r]===col;
                      const no=cur.crosses.includes(r+':'+col);
                      const auto=!yes&&(cur.picks[r]>=0||cur.picks.includes(col));
                      const status=yes?'مرتبط':auto?'مستبعد تلقائيًا':no?'مستبعد':'فارغ';
                      return `
                        <td class="sketch-td">
                          <button class="cell sketch-cell ${yes?'yes':auto?'auto':no?'no':''}"
                                  data-action="cell"
                                  data-row="${r}"
                                  data-col="${col}"
                                  aria-label="${row}، ${fmt(v)} ${l.unit}، ${status}"
                                  aria-pressed="${yes}"
                                  ${isSolved?'disabled':''}>
                            ${yes?'✓':no&&!auto?'✕':''}
                          </button>
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="board-bottom-controls">
            <button class="desk-btn-reset" data-action="clearGrid" ${cur.picks.some(x=>x>=0)||cur.crosses.length?'':'disabled'} aria-label="إعادة ضبط">
              <span>إعادة الضبط</span>
              <span class="btn-icon">↺</span>
            </button>

            <button class="desk-btn-calc-toggle" data-action="toggleResults" aria-expanded="false" title="عرض جدول الحسابات" style="display:none;">
              <span>📊 الأرقام والحسابات</span>
            </button>

            ${isSolved?`
              <button class="desk-btn-verify solved" data-action="decision" aria-label="قدم قرارك">
                <span>قدم قرارك</span>
                <span class="btn-icon">←</span>
              </button>
            `:`
              <button class="desk-btn-verify ${!isComplete?'incomplete':''}" data-action="verify" ${isComplete?'':'disabled'} aria-label="تحقق من الحل">
                <span>تحقق من الحل</span>
                <span class="btn-icon">✓</span>
              </button>
            `}
          </div>

          <div class="board-results-drawer" id="board-calc-drawer" style="display: none;">
            <div class="drawer-header">
              <h4>نتيجة التحليل الحالية</h4>
              <small>تتحدث تلقائيًا مع كل ربط</small>
            </div>
            ${resultsTable(isSolved)}
          </div>
        </section>
      </main>
    </div>
  </div>`;
}
function resultsTable(verified=false){
  const l=level();
  return `<table class="data-table dossier-data-table results-table">
    <thead>
      <tr>
        <th scope="col">${l.rowLabel}</th>
        <th scope="col">${l.baseLabel}</th>
        <th scope="col">${l.valueLabel}</th>
        <th scope="col">${l.metricLabel}</th>
      </tr>
    </thead>
    <tbody>
      ${l.rows.map((row,r)=>{
        const p=c().picks[r],value=p>=0?E.metric(l,r,p):null,best=verified&&(l.id==='channels'?value===80:l.id==='products'?value===59000:value===10);
        return `<tr class="${best?'winner winner-row':''}">
          <td class="platform-cell">${getRowIcon(l.id,row,r)}<span class="platform-name">${row}</span></td>
          <td class="amount">${fmt(l.base[r])}</td>
          <td class="amount ${p<0?'result-unknown':''}">${p<0?'—':fmt(l.values[p])}</td>
          <td class="amount metric-val ${p<0?'result-unknown':''}">${p<0?'—':fmt(value,l.id==='branches'?1:0)+' '+l.metricUnit} ${best?'<span class="winner-badge">★ الأفضل</span>':''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function evidenceView(e){
  const l=level(),ch=characters[e.source],spoken=recorded()?recorded().group('أسئلة اختيارية').find(x=>x.who===e.source):null;
  const body=`<div class="dossier-single-page">
    <div class="dossier-evidence-paper">
      <div class="paperclip silver-clip evidence-clip" aria-hidden="true"></div>
      <div class="evidence-paper-header">
        <div class="evidence-avatar-box">
          ${ch?avatar(e.source):`<span class="evidence-doc-icon">${icon(e.source==='laptop'?'laptop':'file')}</span>`}
        </div>
        <div class="evidence-meta">
          <span class="evidence-type-badge">${esc(e.tag||'إفادة')}</span>
          <h3 class="evidence-speaker-name">${ch?ch.name+' · '+ch.role:'تقرير الشهر الحالي'}</h3>
        </div>
        ${spoken?`
          <button class="statement-sound-btn" data-action="playCharVoice" data-who="${e.source}" title="استمع للإفادة" aria-label="استمع لإفادة ${ch?ch.name:''}">
            ${icon('sound')}
          </button>
        `:''}
      </div>

      <div class="evidence-paper-body">
        <h4 class="evidence-paper-title">${esc(e.title)}</h4>
        <p class="evidence-statement-text">${esc(e.text)}</p>
        ${spoken?`
          <div class="evidence-spoken-bubble">
            <span class="bubble-tag">${esc(spoken.trigger.replace('سؤال اللاعب المكتوب: ',''))}</span>
            <p>${esc(spoken.text)}</p>
          </div>
        `:''}
        ${e.table?`
          <div class="dossier-section-block" style="margin-top:14px">
            <table class="dossier-data-table">
              <thead>
                <tr>
                  <th scope="col">${l.rowLabel}</th>
                  <th scope="col">${l.baseLabel}${l.id==='branches'?'':' · ج.م'}</th>
                  ${l.margins?'<th scope="col">هامش البيع · ج.م</th>':''}
                </tr>
              </thead>
              <tbody>
                ${l.rows.map((r,i)=>`<tr>
                  <td class="platform-cell">${getRowIcon(l.id,r,i)}<span class="platform-name">${r}</span></td>
                  <td class="amount">${fmt(l.base[i])}</td>
                  ${l.margins?`<td class="amount">${fmt(l.margins[i])}</td>`:''}
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        `:''}
      </div>
    </div>
  </div>`;
  const footer=`<span class="save-label">${icon('check')} اتسجل في دفتر الأدلة</span>${btn('close','أرجع للاجتماع','primary')}`;
  return dialog(e.title, body, footer, true, l.eyebrow, 'evidence-dialog custom-head');
}

function notebookView(){
  const l=level();
  const body=`<div class="dossier-two-pages notebook-two-pages">
    <!-- RIGHT PAGE: بطاقات الأدلة المكتشفة -->
    <section class="dossier-page page-right">
      <div class="dossier-page-heading">
        <div class="dossier-title-group">
          <h2>دفتر الأدلة <span class="dossier-head-icon" aria-hidden="true">${icon('file')}</span></h2>
          <div class="dossier-subtitle">${c().seen.length} من ${l.evidence.length} أدلة مسجلة</div>
        </div>
      </div>
      <div class="notebook-clues-grid">
        ${l.evidence.map(e=>{
          const seen=c().seen.includes(e.id);
          const ch=characters[e.source];
          return `<div class="clue-paper-card ${seen?'unlocked':'locked'}" data-action="${seen?'evidence':'goDiscover'}" data-id="${e.id}" role="button" tabindex="0">
            <div class="clue-card-top">
              <div class="clue-speaker-info">
                ${ch?avatar(e.source):`<span class="doc-mini-icon">${icon(e.source==='laptop'?'laptop':'file')}</span>`}
                <div>
                  <strong>${seen?e.title:'دليل لم يُكتشف'}</strong>
                  <small>${seen?(ch?ch.name:e.tag):'اضغط على الفريق في المشهد'}</small>
                </div>
              </div>
              ${seen&&ch&&!!recorded()?`
                <button class="clue-mini-sound" data-action="playEvidenceVoice" data-id="${e.id}" title="استمع" aria-label="استمع لـ ${ch.name}">
                  ${icon('sound')}
                </button>
              `:''}
            </div>
            <p class="clue-card-snippet">${seen?(e.table?'📊 أرقام التقرير متاحة. اضغط للمراجعة.':esc(e.text)):'ارجع لغرفة الاجتماع واضغط على الشخصيات والتقارير.'}</p>
          </div>`;
        }).join('')}
      </div>
    </section>

    <!-- SPINE -->
    <div class="dossier-spine" aria-hidden="true">
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
      <span class="spine-ring"></span>
    </div>

    <!-- LEFT PAGE: المفكرة الصفراء للملاحظات -->
    <section class="dossier-page page-left yellow-memo-page">
      <div class="dossier-page-heading">
        <div class="dossier-title-group">
          <h2><span class="golden-pushpin" aria-hidden="true">📌</span> ملاحظات التحليل</h2>
          <div class="dossier-subtitle">مفكرة سريعة لتسجيل استنتاجاتك</div>
        </div>
      </div>
      <div class="yellow-notepad-container">
        <label class="sr-only" for="notes">ملاحظاتك الخاصة</label>
        <textarea id="notes" class="yellow-notepad-textarea" placeholder="اكتب استنتاجاتك أو العلاقات هنا… (بتتحفظ تلقائيًا)">${esc(c().notes)}</textarea>
      </div>
      <div class="dossier-page-action">
        <button class="btn primary dossier-btn-start" data-action="analysis">
          <span>افتح المصفوفة</span>
          <span class="btn-arrow" aria-hidden="true">←</span>
        </button>
      </div>
    </section>
  </div>`;
  return dialog('دفتر الأدلة', body, '', false, l.eyebrow, 'notebook-dialog custom-head');
}

function hintView(){
  const n=c().hints;
  const l=level();
  const body=`<div class="dossier-single-page">
    <div class="dossier-hint-sheet">
      <div class="scotch-tape" aria-hidden="true"></div>
      <div class="hint-sheet-header">
        <div class="hint-badge-circle">💡</div>
        <div>
          <h3>خيط يساعدك تفكّها</h3>
          <p>التلميح بيوجه التفكير ومش بيحل المصفوفة مكانك (${n} من 3 متاحين).</p>
        </div>
      </div>

      <div class="hint-stages-list">
        ${[0, 1, 2].map(i => {
          const unlocked = i < n;
          const hintText = l.hints[i];
          return `<div class="hint-stage-item ${unlocked ? 'unlocked' : 'locked'}">
            <div class="hint-stage-pill">
              <span class="stage-num">${i + 1}</span>
              <span>تلميح ${i + 1}</span>
              ${unlocked ? '<span class="stage-check">✓</span>' : '<span class="stage-lock">🔒</span>'}
            </div>
            <div class="hint-stage-content">
              ${unlocked ? `<p>${esc(hintText)}</p>` : `<span class="hint-locked-placeholder">مخفي حتى تطلبه…</span>`}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
  const footer=`${btn('analysis','أرجع للتحليل')}${btn('revealHint', n < 3 ? `اكشف تلميح ${n + 1}` : 'كشفت كل التلميحات', 'primary', n < 3 ? '' : 'disabled')}`;
  return dialog('خيط يساعدك تفكّها', body, footer, true, 'مساعدة اختيارية', 'hint-dialog custom-head');
}

function feedbackLine(who,text){return `<div class="feedback-person">${avatar(who)}<div><h3>${characters[who].name} <span class="muted" style="font-size:10px;font-weight:400">· ${characters[who].role}</span></h3><p>${text}</p></div></div>`;}

function decisionView(){
  const l=level();
  const body=`<div class="dossier-single-page decision-sheet-page">
    <div class="decision-recommendation-sheet">
      <div class="paperclip silver-clip" aria-hidden="true"></div>
      <div class="decision-sheet-header">
        <div class="decision-header-top">
          <div class="rubber-stamp stamp-gold">ورقة توصية رسمية</div>
          <span class="decision-doc-ref">DOC-REF: DM-0${c().index+1}</span>
        </div>
        <h3>${l.id==='products'?'توصية أولوية المنتجات':'قرار التوزيع النهائي للميزانية'}</h3>
        <p class="decision-intro-note">${recorded()?esc(chapterClip('الربط الصحيح').text):'الربط سليم. قارن الأرقام الناتجة وقدم توصيتك لعمر.'}</p>
      </div>

      <div class="dossier-section-block" style="margin-bottom:18px">
        <div class="dossier-section-title">
          <span class="sec-icon">${icon('chart')}</span>
          <h4>جدول الحسابات والمقارنة</h4>
        </div>
        ${resultsTable(true)}
      </div>

      <div class="decision-question-box">
        <div class="question-icon">❓</div>
        <h4 class="decision-question">${esc(l.question)}</h4>
      </div>

      <div class="decision-options-group" role="group" aria-label="اختيارات القرار">
        ${l.options.map((o,i)=>`
          <button class="decision-ballot-option ${c().choice===i?'selected':''}" data-action="choice" data-value="${i}" aria-pressed="${c().choice===i}">
            <span class="option-marker">0${i+1}</span>
            <span class="option-text">${esc(o)}</span>
            <span class="option-radio-check">${c().choice===i?'✓':''}</span>
          </button>
        `).join('')}
      </div>
    </div>
  </div>`;
  const footer=`${btn('analysis','راجع الأرقام')}${btn('submitDecision','اعتمد القرار '+icon('arrow'),'primary',c().choice<0?'disabled':'')}`;
  return dialog('دورك تقول القرار', body, footer, false, l.eyebrow, 'decision-dialog custom-head');
}

function successView(){
  const l=level();
  const body=`<div class="dossier-single-page success-sheet-page">
    <div class="dossier-approval-sheet">
      <div class="rubber-stamp stamp-success">تم اعتماد القرار ✓</div>

      <div class="success-header-group">
        <div class="success-approval-title">
          <h3>توصيتك اتقبلت رسميًا في الاجتماع</h3>
          <p>ردود الفريق بعد مراجعة الأرقام واعتماد القرار:</p>
        </div>
      </div>

      <div class="success-team-feedback">
        ${l.success.map((x,i)=>`
          <div class="feedback-card ${!!recorded()&&i===successVoiceIndex?'recorded-line-active':''}">
            ${feedbackLine(...x)}
          </div>
        `).join('')}
      </div>

      ${!!recorded()?`
        <div class="success-voice-stepper">
          <button class="btn secondary" data-action="successVoiceNext" ${successVoiceIndex>=5?'disabled':''}>
            ${successVoiceIndex<4?'التعليق التالي ←':'إنهاء التعليقات'}
          </button>
          <span class="stepper-count">${Math.min(successVoiceIndex+1,5)} / 5</span>
        </div>
      `:''}

      <div class="insight-parchment-box">
        <div class="insight-badge">الأرقام وراء القرار</div>
        <p class="insight-text">${esc(l.takeaway)}</p>
      </div>
    </div>
  </div>`;
  const footer=`${btn('analysis','راجع تحليلك')}${btn('nextCase',c().index===levels.length-1?'ختام اللعبة':`القضية التالية: ${levels[c().index+1].short}`,'primary')}`;
  return dialog('قرارك وصل للفريق', body, footer, true, 'تم اعتماد القرار', 'success-dialog custom-head');
}

function finishView(){
  const body=`<div class="dossier-single-page finish-sheet-page">
    <div class="dossier-approval-sheet">
      <div class="rubber-stamp stamp-success">يوم مكتمل ١٠٠٪</div>
      <div class="finish-hero">
        <div class="finish-seal-icon">🏆</div>
        <h3>أول يوم عمل… واتحسب صح!</h3>
        <p>ملفان، وقراران مبنيان على الأرقام: كفاءة اكتساب العملاء ومساهمة المنتجات.</p>
      </div>

      <div class="finish-stats-strip">
        <div class="stat-box"><b>${levels.length} / ${levels.length}</b><span>قضايا مكتملة</span></div>
        <div class="stat-box"><b>${state.totalAttempts}</b><span>مرات مراجعة</span></div>
        <div class="stat-box"><b>${state.totalHints}</b><span>تلميحات كشفتها</span></div>
      </div>

      <div class="finish-cases-summary">
        ${levels.map((l,idx)=>`
          <div class="finish-case-row">
            <span class="case-check">✓</span>
            <div>
              <strong>${esc(l.title)}</strong>
              <p>${esc(l.takeaway)}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>`;
  const footer=`${btn('export','صدّر ملخص القرارات')}${btn('reset','جرّب من البداية','primary')}`;
  return dialog('أول يوم… واتحسب صح', body, footer, true, 'حصيلة أول يوم', 'finish-dialog custom-head');
}

function settingsView(){
  const toggle=(key,title,desc)=>`<div class="dossier-setting-item">
    <div class="setting-text">
      <strong>${title}</strong>
      <small>${desc}</small>
    </div>
    <button class="dossier-toggle ${prefs[key]?'on':''}" role="switch" aria-checked="${prefs[key]}" aria-label="${title}" data-action="pref" data-key="${key}">
      <span class="toggle-thumb"></span>
    </button>
  </div>`;
  const body=`<div class="dossier-single-page">
    <div class="dossier-sheet-card">
      <div class="settings-list">
        ${toggle('voice','أصوات الشخصيات','حوارات المرحلتين وأسئلتهما وتلميحاتهما وردود الفريق.')}
        ${toggle('sound','أصوات التفاعل','نغمات خفيفة عند الاختيار والتثبيت والتقييم.')}
        ${toggle('motion','حركة المشهد','حركة هادئة للنصوص وظهور تدريجي للحوار.')}
        ${toggle('timer','إظهار الوقت','وقت لعب تصاعدي للمتابعة بدون توتر أو حد زمني.')}
      </div>
      <div class="settings-disclaimer">
        <p>البيانات والتقدم بتتحفظ على متصفحك الحالي، وكل الأرقام بيانات تدريبية داخل بيئة العمل.</p>
      </div>
    </div>
  </div>`;
  return dialog('إعدادات اللعبة', body, `${btn('home','شاشة البداية')}${btn('close','حفظ ورجوع','primary')}`, true, 'الإعدادات', 'settings-dialog custom-head');
}

function briefView(){
  const l=level();
  const spoken=recorded()?recorded().group('أسئلة اختيارية').find(x=>x.who==='omar'):null;
  const body=`<div class="dossier-single-page">
    <div class="dossier-pinned-task yellow-memo">
      <span class="golden-pushpin" aria-hidden="true">📌</span>
      <div class="pinned-task-header">
        <div class="pinned-avatar-wrap">
          ${avatar('omar')}
        </div>
        <div class="pinned-title-group">
          <div class="pinned-task-title">
            <span>تكليف عمر</span>
            <span class="pinned-megaphone" aria-hidden="true">📢</span>
          </div>
          <h3 class="pinned-task-heading">${esc(l.title)}</h3>
        </div>
        ${spoken?`
          <button class="statement-sound-btn" data-action="playCharVoice" data-who="omar" title="استمع لعمر" aria-label="استمع لتكليف عمر">
            ${icon('sound')}
          </button>
        `:''}
      </div>
      <p class="pinned-task-desc" style="font-size:15px;line-height:1.6;margin-top:12px">${esc(l.brief)}</p>
      ${!!recorded()?`
        <div class="dossier-memo-callout">
          <strong>السؤال الأساسي:</strong>
          <p>${esc(spoken?spoken.text:'عايز أكبر عدد، ولا أقل تكلفة؟')}</p>
        </div>
      `:''}
    </div>
  </div>`;
  return dialog('تكليف المدير', body, btn('close','أرجع للتحقيق','primary'), true, l.eyebrow, 'brief-dialog custom-head');
}

function howView(){
  const body=`<div class="dossier-single-page">
    <div class="dossier-sheet-card">
      <div class="dossier-sheet-badge">دليل الموظف الجديد</div>
      <h3 style="color:var(--maroon);margin-bottom:8px">خد مكانك في الاجتماع</h3>
      <p style="color:var(--ink-muted);font-size:14px;margin-bottom:16px">إنت Junior Analyst، ودي أول مهامك مع الفريق.</p>
      <ol class="dossier-steps-list">
        <li><span>١</span><div><strong>اسمع واقرأ:</strong> اسمع حوار الاجتماع، ثم راجع إفادات الفريق والتقارير لجمع الأدلة.</div></li>
        <li><span>٢</span><div><strong>المصفوفة التفاعلية:</strong> ضغطة تعمل ✕، والتانية تعمل ✓، والتالتة تمسح. علامة ✓ تستبعد باقي الصف والعمود تلقائيًا.</div></li>
        <li><span>٣</span><div><strong>التقييم:</strong> نتيجة التحليل بتتملي مع كل اختيار. اضغط «تحقق من الحل» لما تخلص.</div></li>
        <li><span>٤</span><div><strong>مراجعة وتلميحات:</strong> لو فيه حاجة مش راكبة، الفريق هيرد في غرفة الاجتماع. تقدر تطلب تلميح في أي وقت.</div></li>
        <li><span>٥</span><div><strong>اتخاذ القرار:</strong> بعد الربط الصحيح، قارن الأرقام وقدّم توصيتك الرسمية للمدير.</div></li>
      </ol>
    </div>
  </div>`;
  return dialog('طريقة اللعب', body, btn('close','فهمت، يلا','primary'), true, 'إرشادات اللعب', 'how-dialog custom-head');
}

function resetView(){
  const body=`<div class="dossier-single-page">
    <div class="dossier-sheet-card warning-card">
      <div class="rubber-stamp stamp-danger" style="margin-bottom:12px">إعادة تعيين</div>
      <h3 style="color:var(--maroon);margin-bottom:8px">نبدأ يوم جديد؟</h3>
      <p style="color:var(--ink);font-size:14px;line-height:1.6">ده هيبدأ تجربة جديدة ويمسح تقدم النسخة دي من جهازك. تقدر تصدّر ملخص قراراتك قبل البداية.</p>
    </div>
  </div>`;
  return dialog('نبدأ يوم جديد؟', body, `${btn('export','تصدير ملخص','secondary')}${btn('doReset','ابدأ من جديد','primary')}`, true, 'تأكيد', 'reset-dialog custom-head');
}
function discover(id){const e=level().evidence.find(e=>e.id===id);if(!e)return;if(!c().seen.includes(id)){c().seen.push(id);persist();tone();render();}openModal('evidence',id);}
function next(){if(!typingDone){finishTyping();return;}window.DM_MEETING.recordLine(level(),c());if(c().line<level().intro.length-1)c().line++;else window.DM_MEETING.finishIntro(level(),c());persist();render();$('[data-action="next"]')?.focus();}

function sceneVoiceToolbar(){return '';}
function sceneVoiceContext(){
 if(home||document.hidden||!recorded()||c().mode==='reaction')return null;
 const V=recorded();
 if(modal){
  if(modal==='evidence')return V.group('أسئلة اختيارية').find(x=>x.who===level().evidence.find(e=>e.id===evidenceId)?.source)||null;
  if(modal==='brief')return recorded().group('أسئلة اختيارية').find(x=>x.who==='omar');
  if(modal==='hint')return V.group('تلميحات اختيارية')[c().hints-1]||null;
  if(modal==='analysis')return chapterClip('بدء المصفوفة');
  if(modal==='decision')return chapterClip('الربط الصحيح');
  if(modal==='success')return V.group('النهاية الصحيحة')[successVoiceIndex]||null;
  return null;
 }
 if(c().mode==='intro')return V.group('الافتتاحية')[c().line];
 if(c().mode==='handoff')return chapterClip('استلام الملف');
 return null;
}
function syncSceneVoice(){
 if(document.hidden)return;
 if(c().mode==='reaction'&&!home)return;
 const clip=sceneVoiceContext(),key=clip?clip.id+':'+prefs.voice:'';
 if(key===sceneVoiceKey)return;
 sceneVoiceKey=key;stopVoice();
 if(!clip||!clip.file||!prefs.voice)return;
 const token=reactionToken,valid=()=>token===reactionToken&&sceneVoiceKey===key;
 const status=text=>{if(valid())document.querySelectorAll('.scene-voice-status').forEach(n=>n.textContent=text);};
 const file='assets/voices/'+clip.file;
 voicePlayer.play(window.DM_AUDIO_ASSETS?.[file]||file,{
  onPlaying:()=>status('بيتكلّم دلوقتي'),
  onBlocked:()=>status('اضغط إعادة سماع لتشغيل الصوت'),
  onError:()=>status('الصوت لم يتحمّل؛ تقدر تكمل بالنص أو تعيد السماع'),
  onEnded:()=>{if(!valid())return;status('');if(modal==='success'){reactionTimer=setTimeout(()=>{if(valid()){successVoiceIndex++;if(successVoiceIndex>=level().success.length)completeSuccessVoice();else renderModal();}},450);}}
 });
}

function completeSuccessVoice(){stopVoice();if(c().index===levels.length-1){c().mode='finished';persist();render();openModal('finish');}else renderModal();}
function exportSummary(){const output={title:'حصيلة مصفوفة القرار',createdAt:new Date().toISOString(),completed:state.completed.map(i=>({case:levels[i].title,insight:levels[i].takeaway})),currentCase:level().title,notes:c().notes,reviewCount:state.totalAttempts,hintsUsed:state.totalHints};const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='decision-matrix-summary.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('تم تصدير ملخص قراراتك.');}
document.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target||target.disabled)return;lastUserAction=Date.now();const action=target.dataset.action;
switch(action){
 case 'start':home=false;state.started=true;persist();render();if(c().mode==='finished')openModal('finish');else if(c().mode==='success')openModal('success');else if(c().mode==='reaction')playReaction();break;
 case 'home':stopVoice();home=true;closeModal();render();break;
 case 'next':next();break;
 case 'skip':window.DM_MEETING.finishIntro(level(),c());persist();render();break;
 case 'previous':if(c().line>0){c().line--;persist();render();}break;
 case 'receiveCrm':window.DM_MEETING.receive(level(),c());persist();render();openModal('casefile');break;
 case 'casefile':openModal('casefile');break;
 case 'crewIntro':toast(c().mode==='handoff'?'الملف قدامك. استلمه عشان تبدأ.':c().mode==='reaction'?'اسمع رد الفريق، وبعده اختار خطوتك.':'اسمع الحوار، وبعدها تقدر تسأل الفريق وتفتح الأدلة.');break;
 case 'playCharVoice':{
  const who=target.dataset.who;
  if(!prefs.voice)break;
  if(recorded()){
    const clip=(who==='omar'?recorded().group('أسئلة اختيارية').find(x=>x.who==='omar'):null)||recorded().group('أسئلة اختيارية').find(x=>x.who===who)||recorded().group('الافتتاحية').find(x=>x.who===who);
    if(clip&&clip.file){
      stopVoice();
      const file='assets/voices/'+clip.file;
      voicePlayer.play(window.DM_AUDIO_ASSETS?.[file]||file);
    }
  }
  break;
 }
 case 'playEvidenceVoice':{
  const id=target.dataset.id;
  if(!prefs.voice)break;
  if(recorded()){
    const e=level().evidence.find(x=>x.id===id);
    if(e){
      const clip=recorded().group('أسئلة اختيارية').find(x=>x.who===e.source);
      if(clip&&clip.file){
        stopVoice();
        const file='assets/voices/'+clip.file;
        voicePlayer.play(window.DM_AUDIO_ASSETS?.[file]||file);
      }
    }
  }
  break;
 }
 case 'evidence':discover(target.dataset.id);break;
 case 'goDiscover':closeModal();toast('ارجع للمشهد وافتح الشخصيات والتقارير لجمع الدليل.');break;
 case 'notebook':case 'settings':case 'analysis':case 'brief':case 'reset':case 'how':openModal(action);break;
 case 'hint':openModal('hint');break;
 case 'close':closeModal();break;
 case 'pref':prefs[target.dataset.key]=!prefs[target.dataset.key];if(target.dataset.key==='voice'){sceneVoiceKey='';stopVoice(prefs.voice?'paused':'muted');}persist();render();renderModal(`[data-key="${target.dataset.key}"]`);if(target.dataset.key==='sound')tone();break;
 case 'cell':{if(c().solved)break;const r=+target.dataset.row,col=+target.dataset.col,nextState=E.toggle(c().picks,c().crosses,r,col);Object.assign(c(),nextState);persist();tone();renderModal(`[data-row="${r}"][data-col="${col}"]`);break;}
 case 'clearGrid':c().picks=level().rows.map(()=>-1);c().crosses=[];persist();renderModal('[data-action="clearGrid"]');break;
 case 'toggleResults':{const d=$('#board-calc-drawer');if(d){const v=d.style.display==='none';d.style.display=v?'block':'none';target.setAttribute('aria-expanded',v);}break;}
 case 'checkClue':{const id=target.dataset.id;c().checked=c().checked.includes(id)?c().checked.filter(x=>x!==id):[...c().checked,id];persist();renderModal(`[data-action="checkClue"][data-id="${id}"]`);break;}
 case 'verify':if(!E.complete(level(),c().picks)){toast('كمّل ربط واحد لكل صف وعمود الأول.');break;}state.totalAttempts++;if(E.correct(level(),c().picks)){c().solved=true;persist();tone('success');render();toast('الربط سليم. فاضل القرار.');openModal('decision');}else{c().attempts++;c().mapAttempts=(c().mapAttempts||0)+1;tone('fail');beginReaction();}break;
 case 'revealHint':if(c().hints<3){c().hints++;state.totalHints++;persist();renderModal('[data-action="revealHint"]');}break;
 case 'decision':if(!c().solved){toast('راجع الربط الأول.');break;}if(state.completed.includes(c().index)){openModal('success');}else openModal('decision');break;
 case 'choice':c().choice=+target.dataset.value;persist();renderModal(`[data-value="${c().choice}"]`);break;
 case 'submitDecision':if(!c().solved||c().choice<0)break;state.totalAttempts++;if(c().choice===level().answer){if(!state.completed.includes(c().index))state.completed.push(c().index);c().mode='success';persist();tone('success');render();openModal('success');}else{c().attempts++;tone('fail');beginReaction();}break;
 case 'sceneVoiceReplay':sceneVoiceKey='';syncSceneVoice();break;
 case 'sceneVoiceMute':prefs.voice=!prefs.voice;sceneVoiceKey='';stopVoice(prefs.voice?'paused':'muted');persist();render();if(modal)renderModal();break;
 case 'successVoiceNext':stopVoice();successVoiceIndex=Math.min(successVoiceIndex+1,level().success.length);if(successVoiceIndex>=level().success.length)completeSuccessVoice();else renderModal();break;
 case 'reactionPlay':playReaction();break;
 case 'reactionPause':stopVoice();render();break;
 case 'reactionNext':advanceReaction();break;
 case 'reactionSkip':finishReaction();break;
 case 'reactionReplay':restartReaction();break;
 case 'reactionMute':prefs.voice=!prefs.voice;persist();stopVoice(prefs.voice?'paused':'muted');render();if(prefs.voice&&!c().reactionDone)playReaction();break;
 case 'reactionRetry':stopVoice();c().mode='investigate';persist();render();openModal(c().solved?'decision':'analysis');break;
 case 'reactionHint':stopVoice();c().mode='investigate';persist();render();openModal('hint');break;
 case 'nextCase':if(c().index<levels.length-1){state.current=freshCase(c().index+1);persist();closeModal();render();}else{c().mode='finished';persist();openModal('finish');}break;
 case 'doReset':stopVoice();state=fresh();saved=false;home=false;state.started=true;persist();closeModal();render();break;
 case 'export':exportSummary();break;
}});
document.addEventListener('input',event=>{if(event.target.id==='notes'){c().notes=event.target.value.slice(0,5000);persist();}});
document.addEventListener('keydown',event=>{lastUserAction=Date.now();if(modal||home)return;if((event.key===' '||event.key==='Enter')&&c().mode==='intro'&&!event.target.closest('button,textarea')){event.preventDefault();next();}});
setInterval(()=>{if(!home&&!modal&&document.visibilityState==='visible'&&Date.now()-lastUserAction<90000&&c().mode!=='finished'){state.elapsed++;const clock=$('[data-clock]');if(clock)clock.textContent=duration(state.elapsed);if(state.elapsed%10===0)persist();}},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopVoice('paused');clearInterval(typing);typing=null;} });
window.addEventListener('beforeunload',()=>{stopVoice();if(state.started)persist();});
if(showSavedResult&&saved&&state.completed.length>=levels.length){home=false;render();openModal('finish')}else render();
})();
