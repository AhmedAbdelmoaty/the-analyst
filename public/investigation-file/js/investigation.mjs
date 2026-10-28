import { records, rate, share, weightedRate, originalRates } from './case-data.mjs';
import { resolveVerdict } from './engine.mjs';
import { createAudioManager } from './audio.mjs';
import { beginRun, finishRun, readRun } from './persistence.mjs';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toFixed(1).replace('.0', '')}%`;
const levelName = level => level === 'junior' ? 'Junior' : 'Senior';
const name = r => `${levelName(r.level)} · ${r.attended ? 'حضر' : 'لم يحضر'}`;
const state = { pairs: [[], []], selected: [], trainedDominant: null, untrainedDominant: null, sawOriginal: false, sawBalanced: false, introStep: 0 };
const audio = createAudioManager();
const playerId = window.name || 'guest';
const sound = (cue = 'button') => audio.play(cue);
function scene(id) {
  for (const el of document.querySelectorAll('.scene')) el.classList.toggle('hidden', el.id !== id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function updateCards() {
  $('cards').innerHTML = records.map(r => `<button class="record-card ${state.selected.includes(r.id) ? 'selected' : ''}" data-id="${r.id}" aria-pressed="${state.selected.includes(r.id)}"><span class="record-tag">${levelName(r.level)} · ${r.attended ? 'حضر' : 'لم يحضر'}</span><span class="record-numbers"><b>${r.promoted}</b> ترقّوا من <b>${r.total}</b></span><span class="record-foot">ملف موظفين</span></button>`).join('');
  for (const card of document.querySelectorAll('.record-card')) card.addEventListener('click', () => {
    const id = card.dataset.id;
    state.selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : state.selected.length === 2 ? [id] : [...state.selected, id];
    sound('recordSelect'); updateCards();
  });
}
function updateClips() {
  document.querySelectorAll('.clip').forEach((el, i) => {
    const ids = state.pairs[i];
    if (ids.length !== 2) { el.querySelector('.clip-content').textContent = 'اختار بطاقتين'; return; }
    const [a,b] = ids.map(id => records.find(r => r.id === id));
    el.querySelector('.clip-content').innerHTML = `<span>${name(a)} <b dir="ltr">${pct(rate(a))}</b></span><span class="versus">مقابل</span><span>${name(b)} <b dir="ltr">${pct(rate(b))}</b></span>`;
  });
}
function evidence() { return { pairs: state.pairs, trainedDominant: state.trainedDominant, untrainedDominant: state.untrainedDominant, sawOriginal: state.sawOriginal, sawBalanced: state.sawBalanced }; }
function updateSummary() {
  const parts = [
    `المقارنات: ${state.pairs.filter(p => p.length === 2).length} من ٢`,
    `توزيع الموظفين: ${state.trainedDominant && state.untrainedDominant ? 'مُسجّل' : 'لسه ناقص'}`,
    `تجارب الميزان: ${Number(state.sawOriginal) + Number(state.sawBalanced)} من ٢`,
  ];
  $('evidenceSummary').innerHTML = parts.map(x => `<div class="summary-line">${x}</div>`).join('');
}

document.querySelectorAll('.clip').forEach(el => el.addEventListener('click', () => {
  const idx = Number(el.dataset.clip);
  if (state.selected.length !== 2) { $('pairMessage').textContent = 'اختار بطاقتين الأول، ثم اضغط المشبك.'; return; }
  state.pairs[idx] = [...state.selected]; state.selected = []; sound('clipAttach'); updateCards(); updateClips();
  $('pairMessage').textContent = 'المقارنة اتثبتت. تقدر تغيّرها، أو تختبر وزن المجموعات.';
}));
$('clearSelection').addEventListener('click', () => { state.selected=[]; updateCards(); sound(); });
document.querySelectorAll('input[name="trainedDominant"],input[name="untrainedDominant"]').forEach(el => el.addEventListener('change', () => { state[el.name] = el.value; sound(); }));

function drawRates(trained, untrained, caption, cue) {
  $('scaleReadout').innerHTML = `<span class="scale-caption">${caption}</span><div class="rate-compare"><div><span>حضروا</span><strong dir="ltr">${pct(trained)}</strong><i style="width:${trained*100}%"></i></div><div><span>ماحضروش</span><strong dir="ltr">${pct(untrained)}</strong><i style="width:${untrained*100}%"></i></div></div>`;
  document.querySelector('.scale-art').classList.remove('swing'); void document.querySelector('.scale-art').offsetWidth; document.querySelector('.scale-art').classList.add('swing');
  sound(cue);
}
$('weighOriginal').addEventListener('click', () => {
  if (!state.trainedDominant || !state.untrainedDominant) { $('scaleMessage').textContent='حدد المجموعة الأغلب في كل جانب الأول.'; return; }
  if (state.trainedDominant !== 'senior' || state.untrainedDominant !== 'junior') {
    $('scaleMessage').textContent='اختيار الأحجام ده لا يطابق أعداد الموظفين المكتوبة على السجلات. جرّب تراجعها.'; sound(); return;
  }
  state.sawOriginal = true;
  drawRates(originalRates.trained, originalRates.untrained, `التوزيع الفعلي · الحاضرين: ${pct(share(true,'senior'))} Senior · غير الحاضرين: ${pct(share(false,'junior'))} Junior`, 'actualDistribution');
  $('scaleMessage').textContent='دي نفس نتيجة تقرير الـCFO. تقدر تغيّر التركيب في تجربة منفصلة من غير تغيير نسب الترقية داخل كل فئة.';
});
for (const id of ['trainedMix', 'untrainedMix']) $(id).addEventListener('input', () => {
  $(id+'Value').textContent = `${$(id).value}%`;
  document.querySelector('.scale-art .beam').style.transform = `rotate(${(Number($('trainedMix').value)-Number($('untrainedMix').value))/12}deg)`;
});
$('weighBalanced').addEventListener('click', () => {
  if (!state.sawOriginal) { $('scaleMessage').textContent='جرّب وزن السجلات الفعلية الأول عشان يبقى عندك أساس للمقارنة.'; return; }
  const trainedMix = Number($('trainedMix').value)/100;
  const untrainedMix = Number($('untrainedMix').value)/100;
  const equal = Math.abs(trainedMix-untrainedMix) < .02;
  if (equal) state.sawBalanced = true;
  drawRates(weightedRate(true,trainedMix), weightedRate(false,untrainedMix), `تجربة افتراضية · Junior: ${pct(trainedMix)} بين الحاضرين، ${pct(untrainedMix)} بين غير الحاضرين`, 'tryDistribution');
  $('scaleMessage').textContent = equal ? 'دلوقتي تركيب المجموعتين متساوٍ. قارن اتجاه النتيجة بالتقرير الأصلي؛ نسب الترقية داخل كل فئة ثابتة.' : 'التركيب لسه مختلف في الجانبين. حرّك المقبضين وجرّب تاني.';
});

const dialogue = [
  ['المدير المالي','الأرقام قدامنا. اللي ماحضروش اترقّوا أكتر. نوقف البرنامج؟'],
  ['مديرة الموارد البشرية','عندي سجلات الموظفين. نفسي نبص عليها قبل ما القرار يتختم.'],
  ['المدير المالي','ماشي، بس ورّوني التقرير ده مخبّي إيه. قدّامكم المكتب!'],
];
$('nextIntro').addEventListener('click', () => {
  beginRun(playerId);
  state.introStep++;
  if (state.introStep >= dialogue.length) { sound('officeEntry'); scene('investigation'); return; }
  sound('sceneChange');
  const [who, words] = dialogue[state.introStep]; $('introSpeech').querySelector('.speaker').textContent=who; $('introSpeech').querySelector('p').textContent=words;
  document.querySelector('.characters').classList.toggle('hr-speaking', state.introStep === 1);
  $('introHr').src = state.introStep === 1 ? '/investigation-file/assets/investigation/hr-concerned.png' : '/investigation-file/assets/investigation/hr.png';
  $('nextIntro').textContent = state.introStep === dialogue.length - 1 ? 'افتح التحقيق ←' : 'التالي ←';
});
$('faceCfo').addEventListener('click', () => { sound('sceneChange'); updateSummary(); scene('confrontation'); });
$('backToDesk').addEventListener('click', () => { sound('sceneChange'); scene('investigation'); });
function showEnding(result) {
  finishRun(playerId, result);
  $('endingReaction').src = result === 'success' ? '/investigation-file/assets/investigation/cfo-surprised.png' : '/investigation-file/assets/investigation/hr-concerned.png';
  $('endingReaction').alt = result === 'success' ? 'المدير المالي متفاجئ' : 'مديرة الموارد البشرية قلقة';
  $('endingIcon').src = result === 'success' ? '/investigation-file/assets/simpson/success-checkmark.png' : '/investigation-file/assets/simpson/failure-x.png';
  $('endingIcon').alt = result === 'success' ? 'نجاح التحقيق' : 'نهاية غير ناجحة';
  $('endingTitle').textContent = result === 'success' ? 'القرار اتوقف في وقته!' : 'الملف محتاج مراجعة';
  $('endingText').textContent = result === 'success' ? 'قارنت موظفين من نفس المستوى، ثم كشفت إن توزيع Junior وSenior مختلف جدًا بين الحاضرين وغير الحاضرين. ده سبب انقلاب صورة التقرير الإجمالي. القرار الأدق: ما نلغيش البرنامج من الرقم ده وحده، ونطلب تقييمًا لأثره.' : 'القرار اتبنى قبل ما ملف الأدلة يفسّر اختلاف التقريرين. هل المقارنتان عادلتان؟ وهل عرفت أي جزء في توزيع الموظفين غيّر النتيجة الإجمالية؟ افتح الملف وجرّب تاني.';
  $('endingMath').hidden = result !== 'success';
  if (result === 'success') $('endingMath').innerHTML = `<div>Junior: حضروا <bdi dir="ltr">80/100 = 80%</bdi> · ماحضروش <bdi dir="ltr">450/600 = 75%</bdi></div><div>Senior: حضروا <bdi dir="ltr">60/300 = 20%</bdi> · ماحضروش <bdi dir="ltr">10/100 = 10%</bdi></div><div>الإجمالي: <bdi dir="ltr">140/400 = 35%</bdi> · <bdi dir="ltr">460/700 = 65.7%</bdi></div><small>ده انقلاب في الاتجاه عند التجميع. لكنه وحده لا يثبت إن التدريب سبّب الترقية.</small>`;
  scene('ending');
  sound(result);
  window.setTimeout(() => sound(result === 'success' ? 'successAccent' : 'failureAccent'), 260);
}

document.querySelectorAll('[data-verdict]').forEach(el => el.addEventListener('click', () => {
  const result = resolveVerdict(evidence(), el.dataset.verdict);
  sound('button');
  showEnding(result);
}));
$('replay').addEventListener('click', () => { beginRun(playerId); sound('sceneChange'); window.setTimeout(() => location.reload(), 220); });
$('muteBtn').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  $('muteBtn').setAttribute('aria-pressed', String(muted));
  $('muteBtn').setAttribute('aria-label', muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية');
  $('muteBtn').textContent = muted ? '♪̸' : '♫';
});

updateCards(); updateClips();
const savedRun = readRun(playerId);
if (new URLSearchParams(location.search).get('showResult') === '1' && savedRun.status === 'completed') showEnding(savedRun.outcome);
