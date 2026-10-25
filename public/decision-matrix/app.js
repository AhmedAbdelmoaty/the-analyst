/* Decision Matrix — standalone visual-novel preview. No network or packages required. */
(()=>{'use strict';
const {levels,characters}=window.DM_DATA,E=window.DM_ENGINE;
const $=s=>document.querySelector(s),app=$('#app'),overlay=$('#overlay');
const PLAYER_ID=window.name||'guest';
const SCOPE=encodeURIComponent(PLAYER_ID);
const KEY='theanalyst.decision-matrix.v1.'+SCOPE;
const PREF='theanalyst.decision-matrix.preferences.'+SCOPE;
const paths={chart:'M4 17V9m5 8V5m5 12v-7m5 7V3',arrow:'M19 12H5m6-6-6 6 6 6',close:'m6 6 12 12M6 18 18 6',book:'M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z',file:'M14 3H5v18h14V8Zm0 0v5h5M8 12h8M8 16h6',grid:'M3 3h18v18H3Zm6 0v18m6-18v18M3 9h18M3 15h18',bulb:'M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0l-1 2H9Z',check:'m5 12 4 4L20 5',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3-1 2 3-2 3 2 3-2 3-3-1-1 3h-4l-1-3-3 1-2-3 2-3-2-3 2-3 3 1Z',chat:'M4 4h16v12H9l-5 4Z',laptop:'M4 4h16v13H4ZM2 20h20',sound:'M4 9h4l5-4v14l-5-4H4Zm12-1a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',mute:'M4 9h4l5-4v14l-5-4H4Zm12 0 5 6m0-6-5 6',reset:'M4 8a8 8 0 1 1 0 8m0-13v6h6',lock:'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4',spark:'m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3Z'};
const icon=n=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[n]||paths.file}"/></svg>`;
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number(n).toLocaleString('en-US',{maximumFractionDigits:d});
const btn=(action,label,cls='secondary',extra='')=>`<button class="btn ${cls}" data-action="${action}" ${extra}>${label}</button>`;
const avatar=(who,cls='')=>`<span class="avatar avatar-${who} ${cls||''}" style="background-position:${characters[who]?.pos||'center'}" aria-hidden="true"></span>`;
const freshCase=i=>({index:i,mode:'intro',line:0,seen:[],picks:levels[i].rows.map(()=>-1),crosses:[],checked:[],hints:0,attempts:0,solved:false,choice:-1,notes:'',crmReceived:false,storyRevision:levels[i].meeting?.revision||0});
const fresh=()=>({version:1,started:false,current:freshCase(0),completed:[],totalAttempts:0,totalHints:0,elapsed:0});
let state=fresh(),prefs={sound:false,voice:true,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches,timer:false},saved=false;
try{const p=JSON.parse(localStorage.getItem(PREF));if(p)Object.keys(prefs).forEach(k=>{if(typeof p[k]==='boolean')prefs[k]=p[k];});const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.version===1&&s.current&&levels[s.current.index]&&Array.isArray(s.current.picks)&&s.current.picks.length===levels[s.current.index].rows.length&&Array.isArray(s.completed)){state=s;saved=!!s.started;}}catch{}
if(state.current.index===0&&!state.completed.includes(0))window.DM_MEETING.migrate(levels[0],state.current);
let home=true,modal=null,evidenceId=null,typing=null,typedFull='',typingDone=true,toastTimer,audio,returnFocus=null;
let lastUserAction=Date.now();
const voicePlayer=new window.DM_VoicePlayer();
let voiceStatus='idle',reactionTimer=null,reactionToken=0;
const level=()=>levels[state.current.index],c=()=>state.current;
function persist(){try{localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(PREF,JSON.stringify(prefs));saved=state.started;}catch{toast('المتصفح مش سامح بالحفظ. تقدر تكمل الجلسة الحالية.');}}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3300);}
function tone(type='tap'){if(!prefs.sound)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.type='sine';o.frequency.value=type==='success'?660:type==='fail'?160:420;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.15);o.start();o.stop(audio.currentTime+.16);}catch{}}
function duration(t){return Math.floor(t/60).toString().padStart(2,'0')+':'+(t%60).toString().padStart(2,'0');}
function header(){return `<header class="topbar"><div class="brand"><span class="brand-symbol">${icon('chart')}</span><div><div class="brand-name">THE ANALYST</div><div class="brand-sub">مصفوفة القرار · نسخة الكارتون</div></div></div><nav class="chapter-track" aria-label="تقدم القصة">${levels.map((l,i)=>`<div class="chapter ${state.completed.includes(i)?'done':!home&&i===c().index?'active':''}" ${!home&&i===c().index?'aria-current="step"':''}><span class="chapter-number">${state.completed.includes(i)?'✓':String(i+1).padStart(2,'0')}</span><span>${l.short}</span></div>`).join('')}</nav><div class="top-tools"><span class="pill">CARTOON EDITION</span><button class="icon-btn" data-action="settings" aria-label="الإعدادات">${icon('settings')}</button></div></header>`;}
function render(){clearInterval(typing);document.body.classList.toggle('reduced',!prefs.motion);app.innerHTML=header()+(home?homeView():sceneView());if(!home&&c().mode==='intro')typeDialogue();}
function homeView(){return `<main class="home"><div class="home-image"></div><div class="home-content"><div class="eyebrow">أول يوم ليك. أول قرار عليك.</div><h1>الكل عنده رأي.<br>إنت عندك <span>الدليل.</span></h1><p class="home-desc">كرسيك مستنيك على ترابيزة الاجتماع. اسمع الفريق، فتّش في التقارير، واربط الأرقام قبل ما تاخد قرارك.</p><div class="home-cta">${btn('start',`${saved?'كمّل من مكانك':'ادخل الاجتماع'} ${icon('arrow')}`,'primary')}${saved?btn('reset','ابدأ من جديد','secondary'):btn('how','إزاي ألعب؟','secondary')}</div><p class="status">ثلاث قضايا مترابطة · بدون ضغط وقت · التقدم بيتحفظ على جهازك</p><div class="home-cases">${levels.map((l,i)=>`<div class="home-case"><b>0${i+1}</b><span>${l.title}</span></div>`).join('')}</div><div class="home-footer">THE ANALYST · CARTOON EDITION <span aria-hidden="true">&nbsp; / &nbsp;</span> قصة واحدة. ثلاث قرارات بتفرق.</div></div><div class="home-label">THE EVIDENCE CHANGES EVERYTHING</div></main>`;}
function sceneView(){const l=level(),intro=c().mode==='intro',reaction=c().mode==='reaction',handoff=c().mode==='handoff',meeting=!!l.meeting,locked=intro||reaction||handoff,who=reaction?reactionLine().who:handoff?l.meeting.handoffSpeaker:intro?l.intro[c().line][0]:'omar';
 const visibleEvidence=l.evidence.filter(e=>!['report','laptop'].includes(e.source));
 return `<main class="stage ${reaction?'reaction-active':''} ${handoff?'handoff-active':''} ${meeting?'story-meeting':''}" aria-label="غرفة الاجتماعات من منظور المحلل"><div class="scene-viewport"><div class="scenery" role="img" aria-label="عمر أمامك، وسارة وكريم على اليسار، ونادية ومريم على اليمين، واللاب والتقارير قدامك"></div><div class="scene-heading"><div class="eyebrow">${l.eyebrow}</div><h1>${l.title}</h1><p>${intro?'اسمع الاجتماع… كل رأي وراه جزء من الصورة.':handoff?'التكليف وصل لك. الملف قدامك على الترابيزة.':l.brief}</p></div><div class="scene-tools">${prefs.timer?`<span class="scene-time"><span data-clock>${duration(state.elapsed)}</span></span>`:''}<button class="btn notebook-btn" data-action="${meeting?'casefile':'notebook'}" ${reaction||(meeting&&!c().crmReceived)?'disabled':''}>${icon(meeting?'file':'book')} ${meeting?'ملف الاجتماع':'دفتر الأدلة'} <b>${c().seen.length}/${l.evidence.length}</b></button></div><div class="scene-caption">PRISM / MEETING ROOM 01</div>${locked?'':hotspots(l)}</div><div class="scene-bottom"><div class="crew" aria-label="الفريق">${['sara','karim','omar','nadia','mariam'].map(id=>{const ev=visibleEvidence.find(e=>e.source===id);return `<button class="crew-btn ${locked&&id===who?'active':''}" data-action="${locked?'crewIntro':id==='omar'?'brief':'evidence'}" ${ev?`data-id="${ev.id}"`:''} aria-label="${characters[id].name}، ${characters[id].role}">${avatar(id)}${characters[id].name}${!locked&&ev&&c().seen.includes(ev.id)?' ✓':''}</button>`;}).join('')}</div>${reaction?reactionView():handoff?handoffView():intro?dialogueView():investigateView()}<div class="scene-foot"><span><i></i> ${reaction?'الفريق بيرد على تحليلك… وبعده القرار ليك.':intro?'إنت قاعد معاهم. اسمع اللي بيتقال.':handoff?'تقرير الإنفاق + تصدير العملاء + محضر الاجتماع':'الملف معاك. خلّي الأرقام تسند قرارك.'}</span><span>THE ANALYST / CHAPTER 0${c().index+1}</span></div><div class="progress-strip" aria-hidden="true">${levels.map((_,i)=>`<span class="${state.completed.includes(i)?'done':''}"></span>`).join('')}</div></div></main>`;
}
function handoffView(){const m=level().meeting;return `<section class="dialogue handoff-dialogue" aria-label="استلام تقرير الـCRM"><div class="dialogue-inner">${avatar(m.handoffSpeaker)}<div><div class="speaker-name">${characters[m.handoffSpeaker].name}<small>${characters[m.handoffSpeaker].role}</small></div><p class="speech">${m.handoffText}</p></div></div><div class="handoff-package"><div class="paper-mark">${icon('file')}</div><div><div class="eyebrow">وصل لك من نادية · ملف الاجتماع</div><h2>تقرير الـCRM</h2><p>الإنفاق الإعلاني · أعداد العملاء · محضر الاجتماع</p></div>${btn('receiveCrm','استلم تقرير الـCRM '+icon('arrow'),'primary')}</div></section>`;}
function meetingBar(){return `<section class="investigate-bar"><div><div class="eyebrow" style="font-size:9px;margin-bottom:6px">ملف الاجتماع معاك</div><h2>${c().solved?'الربط اتراجع. هتقول لعمر إيه؟':'استلمت الملف. دورك تربط الصورة.'}</h2><p>التقرير وكل اللي اتقال في الاجتماع ظاهرين جنب المصفوفة.</p></div><div class="bar-actions">${btn('casefile',icon('file')+' افتح الملف','secondary')}${btn(c().solved?'decision':'analysis',icon('grid')+(c().solved?' قدم قرارك':' ابدأ التحليل'),'primary')}</div></section>`;}
function crmTable(){const l=level();return `<div class="crm-caption">أعداد العملاء في نسخة التصدير المستلمة</div><table class="data-table crm-table"><thead><tr><th>اسم المنصة</th><th>عملاء جدد اشتروا</th></tr></thead><tbody>${l.values.map((v,i)=>`<tr><td><span class="missing-source">غير متاح <small>سجل ${i+1}</small></span></td><td class="amount">${fmt(v)}</td></tr>`).join('')}</tbody></table>`;}
function spendTable(){const l=level();return `<table class="data-table spend-table"><thead><tr><th>المنصة</th><th>الإنفاق · ج.م</th></tr></thead><tbody>${l.rows.map((row,i)=>`<tr><td>${row}</td><td class="amount">${fmt(l.base[i])}</td></tr>`).join('')}</tbody><tfoot><tr><th>إجمالي الشهر</th><td class="amount">${fmt(l.base.reduce((a,b)=>a+b,0))}</td></tr></tfoot></table>`;}
function meetingFacts(){const l=level();return ['karim','sara','nadia','mariam'].map(id=>{const e=l.evidence.find(x=>x.id===id);return `<button class="clue-card meeting-fact ${c().checked.includes(id)?'checked':''}" data-action="checkClue" data-id="${id}" aria-pressed="${c().checked.includes(id)}"><small>${e.title}${c().checked.includes(id)?' ✓':''}</small>${esc(e.text)}</button>`;}).join('');}
function meetingSidebar(){const l=level();return `<h3>${icon('file')} التقرير ومحضر الاجتماع</h3><h4>الإنفاق · ج.م</h4><div class="spend-summary">${l.rows.map((name,i)=>`<span><b>${name}</b><em>${fmt(l.base[i])}</em></span>`).join('')}</div><h4>أعداد العملاء في الـCRM</h4><div class="crm-value-list">${l.values.map(v=>`<span>${v} عميل</span>`).join('')}</div><p class="meeting-report-intro">كل عدد لمنصة واحدة. اربط الأسماء بالأدلة.</p><h4>اللي اتقال في الاجتماع</h4>${meetingFacts()}${c().hints?`<div class="hint-panel"><b>التلميح المساعد ${c().hints}/3</b>${l.hints[c().hints-1]}</div>`:''}${btn('hint',icon('bulb')+' محتاج تلميح؟','secondary','style="width:100%;font-size:11px"')}`;}
function casefileView(){const l=level();return dialog(l.meeting.reportTitle,`<div class="modal-body casefile-body"><div class="dossier-meta"><span>CRM-01 / MONTHLY ACQUISITION</span><span>الفترة: الشهر الماضي · نسخة مستلمة</span></div><div class="casefile-layout"><section class="casefile-sheet"><div class="eyebrow">التقرير المستلم</div><h3>عملاء موجودين. أسماء منصات ناقصة.</h3><p class="meeting-report-intro">${l.meeting.reportNote}</p>${crmTable()}<h3 class="report-subtitle">الإنفاق الإعلاني</h3>${spendTable()}</section><section class="casefile-sheet transcript-sheet"><div class="eyebrow">محضر الاجتماع</div><h3>خلاصة كلام الفريق</h3><p class="meeting-report-intro">دي الإفادات اللي اتقالت قدامك. استخدمها لإعادة ربط الملف.</p>${meetingFacts()}<div class="casefile-task">${icon('chat')} <div><b>تكليف عمر</b><p>مين يستاهل نختبر زيادة ميزانيته؟ قدّم توصية تسندها بالأرقام.</p></div></div></section></div></div>`,`${btn('close','أرجع لغرفة الاجتماع')}${btn('analysis','ابدأ التحليل '+icon('arrow'),'primary')}`,false,'من نادية · مرفقات اجتماع الميزانية');}
function meetingAnalysisView(){return basicAnalysisView();}
function reactionLines(){const rounds=level().meeting?.reactionRounds||window.DM_REACTIONS.rounds;return rounds[Math.max(0,c().attempts-1)%rounds.length];}
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
function reactionView(){const line=reactionLine(),spoken=!!line.file,done=c().reactionDone,playing=voiceStatus==='playing',status=done?'الفريق خلّص كلامه. قرارك دلوقتي.':!spoken?'الحوار الجديد للمراجعة · التسجيل بعد اعتماد النص':!prefs.voice?'الصوت مكتوم. تقدر تكمّل التعليقات يدويًا.':({loading:'جاري تجهيز الصوت…',playing:'بيتكلّم دلوقتي',blocked:'اضغط «شغّل الصوت» عشان تسمع التعليقات.',error:'الصوت ما اتحمّلش. جرّب إعادة السماع.',paused:'الصوت متوقف. اضغط لإعادة السماع.',ended:'التعليق التالي…',idle:'اضغط «شغّل الصوت» لبدء التعليقات.'}[voiceStatus]||'');return `<section class="dialogue reaction-dialogue" aria-label="رد فعل الفريق في غرفة الاجتماع"><div class="reaction-banner"><span><span class="dot"></span> رجعت لغرفة الاجتماع</span><span>${c().solved?'التوصية محتاجة مراجعة':'فيه حاجة مش راكبة في التحليل'}</span></div><div class="dialogue-inner">${avatar(line.who)}<div class="reaction-copy"><div class="speaker-name">${characters[line.who].name}<small>${characters[line.who].role}</small>${playing?'<span class="voice-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>':''}</div><p class="speech" aria-live="polite">${esc(line.text)}</p><div class="voice-status" role="status">${status}</div></div></div><div class="reaction-controls"><div class="voice-buttons">${spoken?btn('reactionMute',icon(prefs.voice?'sound':'mute')+(prefs.voice?'كتم الصوت':'تفعيل الصوت'),'quiet','aria-pressed="'+!prefs.voice+'"'):''}${done?btn('reactionReplay',icon('reset')+(spoken?' اسمعهم تاني':' راجع الحوار من الأول'),'quiet'):playing?btn('reactionPause','إيقاف مؤقت','quiet'):prefs.voice&&spoken?btn('reactionPlay',icon('sound')+(voiceStatus==='blocked'||voiceStatus==='idle'?' شغّل الصوت':' إعادة السماع'),'secondary'):''}</div><span class="dialogue-count">${(c().reactionIndex||0)+1} / ${reactionLines().length}</span>${done?`<div class="reaction-decisions">${btn('reactionHint',icon('bulb')+' خذ تلميح','secondary')}${btn('reactionRetry',c().solved?'أراجع القرار':'أعيد التحليل','primary')}</div>`:`<div class="reaction-navigation">${btn('reactionSkip','تخطي التعليقات','quiet')}${btn('reactionNext','التعليق التالي '+icon('arrow'),'secondary')}</div>`}</div></section>`;}
function hotspots(l){return l.evidence.map(e=>{const report=e.source==='report',laptop=e.source==='laptop',char=!report&&!laptop,x=report?82:laptop?48:characters[e.source].x,y=char?characters[e.source].y:70;return `<button class="hotspot ${c().seen.includes(e.id)?'seen':''}" data-kind="${char?'character':'object'}" style="left:${x}%;top:${y}%;--mobile-x:${report?76:50}%;--mobile-y:310px" data-action="evidence" data-id="${e.id}" data-label="${e.title}" aria-label="افتح ${e.title}${c().seen.includes(e.id)?'، تم اكتشافه':''}">${icon(c().seen.includes(e.id)?'check':report?'file':laptop?'laptop':'chat')}</button>`;}).join('');}
function dialogueView(){const l=level(),[who,text]=l.intro[c().line],last=c().line===l.intro.length-1;return `<section class="dialogue" aria-label="حوار ${characters[who].name}"><div class="dialogue-inner">${avatar(who)}<div><div class="speaker-name">${characters[who].name}<small>${characters[who].role}</small></div><p class="speech" data-say aria-label="${esc(text)}">${esc(text)}</p></div></div><div class="dialogue-actions"><div>${c().line?btn('previous','رجوع','quiet'):''}${btn('skip',l.meeting?'اختصر الاجتماع':'انتقل للتحقيق','quiet')}</div><div class="dialogue-count">${c().line+1} / ${l.intro.length}</div>${btn('next',`${last?(l.meeting?'أنا جاهز':'افتح التحقيق'):'التالي'} ${icon('arrow')}`,'primary')}</div></section>`;}
function investigateView(){if(level().meeting)return meetingBar();return `<section class="investigate-bar"><div><div class="eyebrow" style="font-size:9px;margin-bottom:6px">${c().solved?'الربط اكتمل · فاضل القرار':'مرحلة التحقيق'}</div><h2>${c().solved?'الأرقام جاهزة. هتوصي بإيه؟':'اسأل. استكشف. وبعدها اربط.'}</h2><p>${c().solved?'راجع المقارنة وقدم توصيتك لعمر.':'اضغط على الفريق أو اللاب أو التقرير لجمع الأدلة.'}</p></div><div class="bar-actions">${btn('hint',`${icon('bulb')} تلميح`,'secondary')}${btn(c().solved?'decision':'analysis',`${icon('grid')} ${c().solved?'قدم قرارك':'افتح المصفوفة'}`,'primary')}</div></section>`;}
function typeDialogue(){const node=$('[data-say]');if(!node)return;typedFull=level().intro[c().line][1];typingDone=!prefs.motion;if(typingDone)return;node.textContent='';node.classList.add('type-cursor');let n=0;const chars=Array.from(typedFull);typing=setInterval(()=>{if(!node.isConnected){clearInterval(typing);return;}node.textContent=chars.slice(0,++n).join('');if(n>=chars.length)finishTyping();},20);}
function finishTyping(){clearInterval(typing);const node=$('[data-say]');if(node){node.textContent=typedFull;node.classList.remove('type-cursor');}typingDone=true;}
function dialog(title,body,footer='',small=false,eyebrow='مصفوفة القرار',cls=''){return `<dialog class="${small?'small-dialog':''} ${cls||''}" aria-labelledby="dialog-title"><div class="modal-head"><div><div class="eyebrow">${eyebrow}</div><h2 id="dialog-title">${title}</h2></div><button class="icon-btn" data-action="close" aria-label="إغلاق">${icon('close')}</button></div>${body}${footer?`<div class="modal-footer">${footer}</div>`:''}</dialog>`;}
function openModal(type,id){if(level().meeting){if(type==='notebook'&&c().crmReceived)type='casefile';if(['analysis','casefile','decision'].includes(type)&&!c().crmReceived){window.DM_MEETING.finishIntro(level(),c());persist();closeModal();render();return;}}finishTyping();if(c().mode==='reaction'){stopVoice();render();}if(!modal)returnFocus=document.activeElement;modal=type;evidenceId=id??evidenceId;renderModal();}
function closeModal(){modal=null;overlay.innerHTML='';if(returnFocus?.isConnected)returnFocus.focus();else $('button[data-action="notebook"]')?.focus();}
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
 if(modal==='brief')html=dialog('عمر مستني قرارك',`<div class="modal-body"><div class="evidence-header">${avatar('omar')}<div><div class="evidence-label">المدير</div><h3>${l.title}</h3></div></div><p class="evidence-text">${l.brief}</p></div>`,btn('close','أرجع للتحقيق','primary'),true,l.eyebrow);
 if(modal==='reset')html=dialog('نبدأ يوم جديد؟',`<div class="modal-body"><p class="reset-text">ده هيبدأ تجربة جديدة ويمسح تقدم النسخة دي من جهازك. تقدر تصدّر ملخص قراراتك قبل البداية.</p></div>`,`${btn('export','تصدير ملخص','secondary')}${btn('doReset','ابدأ من جديد','primary')}`,true);
 if(modal==='how')html=dialog('خد مكانك في الاجتماع',`<div class="modal-body"><p class="evidence-text">إنت Junior Analyst، ودي أول مهامك مع الفريق.</p><ol class="review-steps"><li>اسمع الحوار، ثم افتح الشخصيات والتقارير لجمع الأدلة.</li><li>في المصفوفة: ضغطة تعمل ×، والتانية تعمل ✓، والتالتة تمسحها. علامة ✓ تستبعد باقي الصف والعمود تلقائيًا.</li><li>نتيجة التحليل بتتملي مع اختياراتك. التقييم يحصل لما تضغط «راجع تحليلي».</li><li>لو فيه حاجة مش راكبة، الفريق هيرد. تقدر تعيد أو تطلب تلميح، من غير كشف الخانات الغلط.</li><li>بعد الربط الصحيح، قارن الأرقام وقدّم قرارك. كل قضية بتفتح اللي بعدها.</li></ol></div>`,btn('close','فهمت، يلا','primary'),true,'طريقة اللعب');
 overlay.innerHTML=html;const d=$('dialog');if(d){d.showModal();d.addEventListener('cancel',ev=>{ev.preventDefault();if(modal==='success'){toast('كمّل رد الفريق أو اقفل من زر الإغلاق.');}closeModal();});d.addEventListener('click',ev=>{if(ev.target===d){const r=d.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)closeModal();}});if(focus)d.querySelector(focus)?.focus();}
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
  const displayClues=l.evidence.slice(0,4);

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
            ${l.hints.map((hint,idx)=>`
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
          <p class="board-subtitle">اسحب الأرقام من التقارير وضعها في الخانات المناسبة</p>

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
function resultsTable(verified=false){const l=level();return `<table class="data-table"><thead><tr><th scope="col">${l.rowLabel}</th><th scope="col">${l.baseLabel}</th><th scope="col">${l.valueLabel}</th><th scope="col">${l.metricLabel}</th></tr></thead><tbody>${l.rows.map((row,r)=>{const p=c().picks[r],value=p>=0?E.metric(l,r,p):null,best=verified&&(l.id==='channels'?value===80:l.id==='products'?value===59000:value===10);return `<tr class="${best?'winner':''}"><td>${row}</td><td class="amount">${fmt(l.base[r])}</td><td class="amount ${p<0?'result-unknown':''}">${p<0?'—':fmt(l.values[p])}</td><td class="amount ${p<0?'result-unknown':''}">${p<0?'—':fmt(value,l.id==='branches'?1:0)+' '+l.metricUnit}</td></tr>`;}).join('')}</tbody></table>`;}
function evidenceView(e){const l=level(),ch=characters[e.source];return dialog(e.title,`<div class="modal-body"><div class="evidence-header">${ch?avatar(e.source):`<span class="file-symbol">${icon(e.source==='laptop'?'laptop':'file')}</span>`}<div><div class="evidence-label">${e.tag}</div><h3>${ch?ch.name+' · '+ch.role:'تقرير الشهر الحالي'}</h3></div></div><p class="evidence-text">${e.text}</p>${e.table?`<div class="evidence-table"><table class="data-table"><thead><tr><th>${l.rowLabel}</th><th>${l.baseLabel}${l.id==='branches'?'':' · ج.م'}</th>${l.margins?'<th>هامش البيع · ج.م</th>':''}</tr></thead><tbody>${l.rows.map((r,i)=>`<tr><td>${r}</td><td class="amount">${fmt(l.base[i])}</td>${l.margins?`<td class="amount">${fmt(l.margins[i])}</td>`:''}</tr>`).join('')}</tbody></table></div>`:''}</div>`,`<span class="save-label">${icon('check')} اتسجل في دفتر الأدلة</span>${btn('close','أرجع للاجتماع','primary')}`,true,level().eyebrow);}
function notebookView(){const l=level();return dialog('دفتر الأدلة',`<div class="modal-body"><p class="feedback-intro">${c().seen.length} من ${l.evidence.length} أدلة. افتح أي بطاقة لمراجعتها، والملاحظات بتتحفظ تلقائيًا.</p><div class="notebook-list">${l.evidence.map(e=>`<button class="clue-card ${c().seen.includes(e.id)?'':'locked'}" data-action="${c().seen.includes(e.id)?'evidence':'goDiscover'}" data-id="${e.id}"><small>${c().seen.includes(e.id)?e.title:'دليل لسه مقفول'}</small>${c().seen.includes(e.id)?e.table?'أرقام التقرير متاحة. اضغط لمراجعتها.':esc(e.text):'ارجع للمشهد واضغط على الأشخاص والملفات.'}</button>`).join('')}</div><label class="notes-label" for="notes">ملاحظاتك الخاصة</label><textarea id="notes" class="notes-area" placeholder="اكتب استنتاج أو علاقة عايز تراجعها…">${esc(c().notes)}</textarea></div>`,`${btn('close','ارجع للمشهد')}${btn('analysis','افتح المصفوفة '+icon('grid'),'primary')}`,false,l.eyebrow);}
function hintView(){const n=c().hints;return dialog('خيط يساعدك تفكّها',`<div class="modal-body"><p class="feedback-intro">التلميح اختيارك. بيوجه التفكير، ومش بيملأ المصفوفة مكانك.</p>${n?level().hints.slice(0,n).map((h,i)=>`<div class="hint-panel"><b>تلميح ${i+1} من 3</b>${h}</div>`).join(''):'<p class="evidence-text">قبل ما تكشف تلميح، راجع الأدلة المسجلة. ممكن تكون العلاقة اللي ناقصاك قدامك بالفعل.</p>'}</div>`,`${btn('analysis','أرجع للتحليل')}${btn('revealHint',n<3?`اكشف تلميح ${n+1}`:'كشفت كل التلميحات','primary',n<3?'':'disabled')}`,true,'مساعدة اختيارية');}
function feedbackLine(who,text){return `<div class="feedback-person">${avatar(who)}<div><h3>${characters[who].name} <span class="muted" style="font-size:10px;font-weight:400">· ${characters[who].role}</span></h3><p>${text}</p></div></div>`;}
function decisionView(){const l=level();return dialog('دورك تقول القرار',`<div class="modal-body"><div class="save-label" style="margin-bottom:12px">${icon('check')} الربط صحيح. دلوقتي نقرأ معناه.</div>${resultsTable(true)}<h3 class="decision-question">${l.question}</h3><div role="group" aria-label="اختيارات القرار">${l.options.map((o,i)=>`<button class="option ${c().choice===i?'selected':''}" data-action="choice" data-value="${i}" aria-pressed="${c().choice===i}"><b>0${i+1}</b><span>${o}</span></button>`).join('')}</div></div>`,`${btn('analysis','راجع الأرقام')}${btn('submitDecision','اعتمد القرار '+icon('arrow'),'primary',c().choice<0?'disabled':'')}`,false,l.eyebrow);}
function successView(){const l=level();return dialog('قرارك وصل للفريق',`<div class="modal-body">${l.success.map(x=>feedbackLine(...x)).join('')}<div class="insight"><div class="eyebrow">الأرقام وراء القرار</div>${l.takeaway}</div></div>`,`${btn('analysis','راجع تحليلك')}${btn('nextCase',c().index===2?'شوف حصيلة أول يوم':`القضية التالية: ${levels[c().index+1].short}`,'primary')}`,true,'تم اعتماد القرار');}
function finishView(){return dialog('أول يوم… واتحسب صح',`<div class="modal-body"><div class="finish-mark">${icon('check')}</div><h3 class="finish-title">أهلًا بيك في الفريق.</h3><p class="finish-desc">ثلاث مشكلات، وثلاث قرارات مبنيين على الأدلة.<br>كل رقم كمل جزء من الصورة.</p><div class="finish-stats"><div><b>3 / 3</b><span>قضايا مكتملة</span></div><div><b>${state.totalAttempts}</b><span>مرات مراجعة</span></div><div><b>${state.totalHints}</b><span>تلميحات استخدمتها</span></div></div>${levels.map(l=>`<div class="finish-item">${icon('check')}<b>${l.title}</b><br>${l.takeaway}</div>`).join('')}</div>`,`${btn('export','صدّر ملخص القرارات')}${btn('reset','جرّب من البداية','primary')}`,true,'حصيلة أول يوم');}
function settingsView(){const toggle=(key,title,desc)=>`<div class="settings-row"><div><strong>${title}</strong><small>${desc}</small></div><button class="toggle ${prefs[key]?'on':''}" role="switch" aria-checked="${prefs[key]}" aria-label="${title}" data-action="pref" data-key="${key}"></button></div>`;return dialog('على راحتك',`<div class="modal-body">${toggle('voice','أصوات الشخصيات','تعليقات مصرية مولدة، تُسمع بالترتيب بعد الإجابة الغلط.')}${toggle('sound','أصوات التفاعل','نغمات خفيفة عند الاختيار والتقييم.')}${toggle('motion','حركة المشهد','حركة كاميرا هادية وظهور الحوار تدريجيًا.')}${toggle('timer','إظهار الوقت','وقت لعب تصاعدي، من غير حد أو عقوبة.')}<p class="feedback-intro" style="margin-top:20px">اللعبة بتشتغل على جهازك. التقدم بيتحفظ في المتصفح ده، والأرقام بيانات تدريبية افتراضية.</p></div>`,`${btn('home','شاشة البداية')}${btn('close','حفظ ورجوع','primary')}`,true,'الإعدادات');}
function discover(id){const e=level().evidence.find(e=>e.id===id);if(!e)return;if(!c().seen.includes(id)){c().seen.push(id);persist();tone();render();}openModal('evidence',id);}
function next(){if(!typingDone){finishTyping();return;}window.DM_MEETING.recordLine(level(),c());if(c().line<level().intro.length-1)c().line++;else window.DM_MEETING.finishIntro(level(),c());persist();render();$('[data-action="next"]')?.focus();}
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
 case 'evidence':discover(target.dataset.id);break;
 case 'goDiscover':closeModal();toast('ارجع للمشهد وافتح الشخصيات والتقارير لجمع الدليل.');break;
 case 'notebook':case 'settings':case 'analysis':case 'brief':case 'reset':case 'how':openModal(action);break;
 case 'hint':openModal('hint');break;
 case 'close':closeModal();break;
 case 'pref':prefs[target.dataset.key]=!prefs[target.dataset.key];if(target.dataset.key==='voice')stopVoice(prefs.voice?'paused':'muted');persist();render();renderModal(`[data-key="${target.dataset.key}"]`);if(target.dataset.key==='sound')tone();break;
 case 'cell':{if(c().solved)break;const r=+target.dataset.row,col=+target.dataset.col,nextState=E.toggle(c().picks,c().crosses,r,col);Object.assign(c(),nextState);persist();tone();renderModal(`[data-row="${r}"][data-col="${col}"]`);break;}
 case 'clearGrid':c().picks=level().rows.map(()=>-1);c().crosses=[];persist();renderModal('[data-action="clearGrid"]');break;
 case 'toggleResults':{const d=$('#board-calc-drawer');if(d){const v=d.style.display==='none';d.style.display=v?'block':'none';target.setAttribute('aria-expanded',v);}break;}
 case 'checkClue':{const id=target.dataset.id;c().checked=c().checked.includes(id)?c().checked.filter(x=>x!==id):[...c().checked,id];persist();renderModal(`[data-action="checkClue"][data-id="${id}"]`);break;}
 case 'verify':if(!E.complete(level(),c().picks)){toast('كمّل ربط واحد لكل صف وعمود الأول.');break;}state.totalAttempts++;if(E.correct(level(),c().picks)){c().solved=true;persist();tone('success');render();toast('الربط سليم. فاضل القرار.');openModal('decision');}else{c().attempts++;tone('fail');beginReaction();}break;
 case 'revealHint':if(c().hints<3){c().hints++;state.totalHints++;persist();renderModal('[data-action="revealHint"]');}break;
 case 'decision':if(!c().solved){toast('راجع الربط الأول.');break;}if(state.completed.includes(c().index)){openModal('success');}else openModal('decision');break;
 case 'choice':c().choice=+target.dataset.value;persist();renderModal(`[data-value="${c().choice}"]`);break;
 case 'submitDecision':if(!c().solved||c().choice<0)break;state.totalAttempts++;if(c().choice===level().answer){if(!state.completed.includes(c().index))state.completed.push(c().index);c().mode='success';persist();tone('success');render();openModal('success');}else{c().attempts++;tone('fail');beginReaction();}break;
 case 'reactionPlay':playReaction();break;
 case 'reactionPause':stopVoice();render();break;
 case 'reactionNext':advanceReaction();break;
 case 'reactionSkip':finishReaction();break;
 case 'reactionReplay':restartReaction();break;
 case 'reactionMute':prefs.voice=!prefs.voice;persist();stopVoice(prefs.voice?'paused':'muted');render();if(prefs.voice&&!c().reactionDone)playReaction();break;
 case 'reactionRetry':stopVoice();c().mode='investigate';persist();render();openModal(c().solved?'decision':'analysis');break;
 case 'reactionHint':stopVoice();c().mode='investigate';persist();render();openModal('hint');break;
 case 'nextCase':if(c().index<2){state.current=freshCase(c().index+1);persist();closeModal();render();}else{c().mode='finished';persist();openModal('finish');}break;
 case 'doReset':stopVoice();state=fresh();saved=false;home=false;state.started=true;persist();closeModal();render();break;
 case 'export':exportSummary();break;
}});
document.addEventListener('input',event=>{if(event.target.id==='notes'){c().notes=event.target.value.slice(0,5000);persist();}});
document.addEventListener('keydown',event=>{lastUserAction=Date.now();if(modal||home)return;if((event.key===' '||event.key==='Enter')&&c().mode==='intro'&&!event.target.closest('button,textarea')){event.preventDefault();next();}});
setInterval(()=>{if(!home&&!modal&&document.visibilityState==='visible'&&Date.now()-lastUserAction<90000&&c().mode!=='finished'){state.elapsed++;const clock=$('[data-clock]');if(clock)clock.textContent=duration(state.elapsed);if(state.elapsed%10===0)persist();}},1000);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&c().mode==='reaction'){stopVoice();if(!home&&!modal)render();}});
window.addEventListener('beforeunload',()=>{stopVoice();if(state.started)persist();});
render();
})();
