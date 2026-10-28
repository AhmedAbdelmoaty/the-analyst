import { records, rate, share, counterfactualRates, originalRates } from './case-data.mjs';
import { isFairPair, resolveVerdict } from './engine.mjs';
import { createAudioManager } from './audio.mjs';
import { beginRun, finishRun, readRun } from './persistence.mjs';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toFixed(1).replace('.0', '')}%`;
const levelName = level => level === 'junior' ? 'Junior' : 'Senior';
const name = r => `${levelName(r.level)} · ${r.attended ? 'حضر' : 'لم يحضر'}`;
const state = {
  pairs: [[], []], selected: [], sawOriginal: false, simulation: null,
  argument: { comparisons: [], composition: null, replay: null }, introStep: 0,
};
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
    const [a, b] = ids.map(id => records.find(r => r.id === id));
    el.querySelector('.clip-content').innerHTML = `<span>${name(a)} <b dir="ltr">${pct(rate(a))}</b></span><span class="versus">مقابل</span><span>${name(b)} <b dir="ltr">${pct(rate(b))}</b></span>`;
  });
}

function fairPair(level) {
  return state.pairs.find(ids => isFairPair(ids) && records.find(r => r.id === ids[0])?.level === level);
}

function renderHistoricalReadout() {
  const trainedJunior = share(true, 'junior');
  const trainedSenior = share(true, 'senior');
  const untrainedJunior = share(false, 'junior');
  const untrainedSenior = share(false, 'senior');
  $('historicalReadout').innerHTML = `
    <div class="history-row"><b>حضروا البرنامج</b><strong>${pct(originalRates.trained)} · 140/400</strong><span>Junior: 100/400 = ${pct(trainedJunior)} · Senior: 300/400 = ${pct(trainedSenior)}</span></div>
    <div class="history-row"><b>ماحضروش البرنامج</b><strong>${pct(originalRates.untrained)} · 460/700</strong><span>Junior: 600/700 = ${pct(untrainedJunior)} · Senior: 100/700 = ${pct(untrainedSenior)}</span></div>`;
}

function currentMix() {
  return { trained: Number($('trainedMix').value) / 1000, untrained: Number($('untrainedMix').value) / 1000 };
}

function updateMix({ playSound = false } = {}) {
  const mix = currentMix();
  const rates = counterfactualRates(mix.trained, mix.untrained);
  const trainedSenior = 1 - mix.trained;
  const untrainedSenior = 1 - mix.untrained;

  $('trainedMixValue').textContent = pct(mix.trained);
  $('untrainedMixValue').textContent = pct(mix.untrained);
  $('trainedJuniorShare').textContent = pct(mix.trained);
  $('trainedSeniorShare').textContent = pct(trainedSenior);
  $('untrainedJuniorShare').textContent = pct(mix.untrained);
  $('untrainedSeniorShare').textContent = pct(untrainedSenior);
  document.querySelector('.trained-junior').style.width = `${mix.trained * 100}%`;
  document.querySelector('.trained-senior').style.width = `${trainedSenior * 100}%`;
  document.querySelector('.untrained-junior').style.width = `${mix.untrained * 100}%`;
  document.querySelector('.untrained-senior').style.width = `${untrainedSenior * 100}%`;
  $('trainedWhatIf').textContent = pct(rates.trained);
  $('untrainedWhatIf').textContent = pct(rates.untrained);
  $('trainedBar').style.width = `${rates.trained * 100}%`;
  $('untrainedBar').style.width = `${rates.untrained * 100}%`;
  $('trainedMix').setAttribute('aria-valuetext', `Junior ${pct(mix.trained)}، Senior ${pct(trainedSenior)}`);
  $('untrainedMix').setAttribute('aria-valuetext', `Junior ${pct(mix.untrained)}، Senior ${pct(untrainedSenior)}`);

  const shared = mix.trained === mix.untrained;
  $('mixStatus').textContent = shared ? 'التركيبتان متطابقتان' : 'قارن بين التركيبين';
  if (shared && originalRates.trained < originalRates.untrained && rates.trained > rates.untrained) {
    state.simulation = { trainedJuniorShare: mix.trained, untrainedJuniorShare: mix.untrained, observed: true };
    $('scaleMessage').textContent = `اتسجلت تجربة بتركيبة Junior ${pct(mix.trained)} للطرفين. النتيجة الافتراضية ظاهرة فوق؛ تقدر تغيّرها وتجرب تاني.`;
  } else {
    $('scaleMessage').textContent = 'النسب الافتراضية بتتحدث مع الحركة. قارنها بالتقرير الثابت، وجرّب تراكيب مختلفة.';
  }
  if (playSound) sound('mixAdjustment');
  renderArgumentBuilder();
}

function evidence() {
  return { pairs: state.pairs, sawOriginal: state.sawOriginal, simulation: state.simulation };
}

function argumentEvidence() {
  return {
    comparisons: state.argument.comparisons,
    composition: state.argument.composition,
    replay: state.argument.replay,
  };
}

const PROOFS = [
  { id: 'junior-comparison', label: 'داخل Junior: قارن الحاضرين بغير الحاضرين', ready: () => Boolean(fairPair('junior')), detail: () => pairSummary('junior') },
  { id: 'senior-comparison', label: 'داخل Senior: قارن الحاضرين بغير الحاضرين', ready: () => Boolean(fairPair('senior')), detail: () => pairSummary('senior') },
  { id: 'historical-distribution', label: 'تركيبة المجموعتين في السجل التاريخي', ready: () => state.sawOriginal, detail: () => 'الحاضرون: 25% Junior · غير الحاضرين: 85.7% Junior' },
  { id: 'shared-mix-result', label: 'نتيجة إعادة الوزن الافتراضية', ready: () => Boolean(state.simulation), detail: () => `Junior ${pct(state.simulation.trainedJuniorShare)} في الطرفين` },
];

function pairSummary(level) {
  const pair = fairPair(level);
  if (!pair) return 'المشبك محتاج مقارنة بين موظفين من نفس المستوى.';
  return pair.map(id => records.find(r => r.id === id)).map(r => `${r.attended ? 'حضر' : 'لم يحضر'} ${pct(rate(r))}`).join(' مقابل ');
}

function isPinned(id) {
  return id === 'junior-comparison' || id === 'senior-comparison'
    ? state.argument.comparisons.includes(id)
    : state.argument[id === 'historical-distribution' ? 'composition' : 'replay'] === id;
}

function toggleProof(id) {
  if (id === 'junior-comparison' || id === 'senior-comparison') {
    state.argument.comparisons = state.argument.comparisons.includes(id)
      ? state.argument.comparisons.filter(item => item !== id)
      : [...state.argument.comparisons, id];
  } else if (id === 'historical-distribution') {
    state.argument.composition = state.argument.composition === id ? null : id;
  } else {
    state.argument.replay = state.argument.replay === id ? null : id;
  }
  sound('proofPin');
  renderArgumentBuilder();
}

function renderArgumentBuilder() {
  const builder = $('argumentBuilder');
  if (!builder) return;
  builder.innerHTML = PROOFS.map(proof => {
    const ready = proof.ready();
    const pinned = isPinned(proof.id);
    const buttonText = ready ? (pinned ? 'الدليل متثبت · اضغط للإزالة' : 'ثبّت الدليل') : 'لسه محتاج فحص';
    return `<div class="argument-line"><span>${proof.label}</span><button class="proof-button" data-proof="${proof.id}" aria-pressed="${pinned}" ${ready ? '' : 'disabled'}>${buttonText}</button>${pinned ? `<span class="proof-detail">${proof.detail()}</span>` : ''}</div>`;
  }).join('');
  builder.querySelectorAll('[data-proof]').forEach(button => button.addEventListener('click', () => toggleProof(button.dataset.proof)));
  const pinnedCount = state.argument.comparisons.length + Number(Boolean(state.argument.composition)) + Number(Boolean(state.argument.replay));
  $('evidenceSummary').textContent = `الأدلة المتثبتة في الاعتراض: ${pinnedCount} من ٤`;
}

document.querySelectorAll('.clip').forEach(el => el.addEventListener('click', () => {
  const idx = Number(el.dataset.clip);
  if (state.selected.length !== 2) { $('pairMessage').textContent = 'اختار بطاقتين الأول، ثم اضغط المشبك.'; return; }
  state.pairs[idx] = [...state.selected]; state.selected = []; sound('clipAttach'); updateCards(); updateClips(); renderArgumentBuilder();
  $('pairMessage').textContent = 'المقارنة اتثبتت. جرّب تقرأ معدلاتها، وتقدر تغيّرها في أي وقت.';
}));
$('clearSelection').addEventListener('click', () => { state.selected = []; updateCards(); sound(); });

$('revealHistory').addEventListener('click', () => {
  const readout = $('historicalReadout');
  const opening = readout.hidden;
  if (opening) renderHistoricalReadout();
  readout.hidden = !opening;
  $('revealHistory').setAttribute('aria-expanded', String(opening));
  $('revealHistory').textContent = opening ? 'اقفل السجل' : 'افتح سجل التركيبة';
  if (opening) { state.sawOriginal = true; sound('actualDistribution'); renderArgumentBuilder(); }
});

for (const id of ['trainedMix', 'untrainedMix']) {
  $(id).addEventListener('input', () => updateMix());
  $(id).addEventListener('change', () => updateMix({ playSound: true }));
}

const dialogue = [
  ['المدير المالي', 'الأرقام قدامنا: اللي ماحضروش اترقّوا أكتر. نلغي البرنامج ونوفّر ميزانية الكراسي؟'],
  ['مديرة الموارد البشرية', 'قبل الكراسي، خلّينا نبص على السجلات. الرقم ساعات بيحب يحكي لوحده.'],
  ['المدير المالي', 'ماشي، قدّامكم المكتب. بس خلّونا نطلع باعتراض مقنع قبل ما الشاي يبرد!'],
];
$('nextIntro').addEventListener('click', () => {
  beginRun(playerId);
  state.introStep++;
  if (state.introStep >= dialogue.length) { sound('officeEntry'); scene('investigation'); return; }
  sound('sceneChange');
  const [who, words] = dialogue[state.introStep]; $('introSpeech').querySelector('.speaker').textContent = who; $('introSpeech').querySelector('p').textContent = words;
  document.querySelector('.characters').classList.toggle('hr-speaking', state.introStep === 1);
  $('introHr').src = state.introStep === 1 ? '/investigation-file/assets/investigation/hr-concerned.png' : '/investigation-file/assets/investigation/hr.png';
  $('nextIntro').textContent = state.introStep === dialogue.length - 1 ? 'افتح التحقيق ←' : 'التالي ←';
});

$('faceCfo').addEventListener('click', () => { sound('sceneChange'); renderArgumentBuilder(); $('verdictMessage').textContent = ''; scene('confrontation'); });
$('backToDesk').addEventListener('click', () => { sound('sceneChange'); scene('investigation'); });

const missingCopy = {
  'junior-comparison': 'راجع مشبك Junior وثبّت مقارنة بين الحاضرين وغير الحاضرين من نفس المستوى.',
  'senior-comparison': 'راجع مشبك Senior وثبّت مقارنة بين الحاضرين وغير الحاضرين من نفس المستوى.',
  'historical-distribution': 'افتح سجل التركيبة التاريخية وافحص أعداد Junior وSenior في المجموعتين.',
  'shared-mix-result': 'ارجع للوح الافتراضي وجرّب تركيبة مشتركة، ثم لاحظ اتجاه النسبتين.',
  'argument-comparisons': 'ثبّت دليل المقارنتين العادلتين في ورقة الاعتراض.',
  'argument-composition': 'ثبّت دليل اختلاف تركيبة المجموعتين من السجل التاريخي.',
  'argument-replay': 'ثبّت نتيجة إعادة الوزن الافتراضية في ورقة الاعتراض.',
};

function returnForEvidence(missing) {
  const details = missing.map(id => missingCopy[id]).join(' ');
  $('scaleMessage').textContent = `التوصية دي مش خسارة، بس الاعتراض لسه ناقصه دليل. ${details}`;
  scene('investigation');
  window.setTimeout(() => $('scaleMessage').focus?.(), 0);
}

function showEnding(result, reason = 'unsupported-decision') {
  finishRun(playerId, result, undefined, reason);
  $('endingReaction').src = result === 'success' ? '/investigation-file/assets/investigation/cfo-surprised.png' : '/investigation-file/assets/investigation/hr-concerned.png';
  $('endingReaction').alt = result === 'success' ? 'المدير المالي متفاجئ' : 'مديرة الموارد البشرية قلقة';
  $('endingIcon').src = result === 'success' ? '/investigation-file/assets/simpson/success-checkmark.png' : '/investigation-file/assets/simpson/failure-x.png';
  $('endingIcon').alt = result === 'success' ? 'نجاح التحقيق' : 'نهاية غير ناجحة';
  $('endingTitle').textContent = result === 'success' ? 'القرار اتوقف في وقته!' : 'الملف محتاج مراجعة';
  $('endingText').textContent = result === 'success'
    ? 'اعتراضك ربط المقارنة داخل كل مستوى باختلاف تركيبة المجموعتين، وأثبت إن اتجاه التقرير يتغير عند استخدام تركيبة مشتركة. نوقف الإلغاء بناءً على الإجمالي وحده، ونطلب تقييمًا إضافيًا؛ البيانات دي لا تثبت السببية.'
    : reason === 'causation'
      ? 'البيانات بتوضح ارتباطًا ومعدلات ترقية، لكنها مش تجربة تثبت إن التدريب هو سبب الترقيات. الاعتراض على الإجمالي ما يديش حقنا نبالغ في النتيجة.'
      : 'إلغاء البرنامج من الإجمالي وحده تجاهل المقارنة بين المستويات وتركيبة الموظفين. كان لازم تراجع الأدلة قبل ما تختم القرار.';
  $('endingMath').hidden = result !== 'success';
  if (result === 'success') {
    const hasRunExperiment = Boolean(state.simulation);
    const mix = state.simulation?.trainedJuniorShare ?? 0.5;
    const rates = counterfactualRates(mix, mix);
    const trialLabel = hasRunExperiment ? 'تجربتك' : 'مثال افتراضي';
    $('endingMath').innerHTML = `<div>Junior: حضروا <bdi dir="ltr">80/100 = 80%</bdi> · ماحضروش <bdi dir="ltr">450/600 = 75%</bdi></div><div>Senior: حضروا <bdi dir="ltr">60/300 = 20%</bdi> · ماحضروش <bdi dir="ltr">10/100 = 10%</bdi></div><div>الإجمالي التاريخي: <bdi dir="ltr">140/400 = 35%</bdi> · <bdi dir="ltr">460/700 = 65.7%</bdi></div><div>${trialLabel} عند تركيبة Junior ${pct(mix)} للطرفين: الحاضرين <bdi dir="ltr">${pct(rates.trained)}</bdi> · غير الحاضرين <bdi dir="ltr">${pct(rates.untrained)}</bdi></div><small>اختلاف التركيبة يفسر انقلاب النتيجة الإجمالية. الأرقام وحدها لا تثبت إن التدريب سبّب الترقية.</small>`;
  }
  scene('ending');
  sound(result);
  window.setTimeout(() => sound(result === 'success' ? 'successAccent' : 'failureAccent'), 260);
}

document.querySelectorAll('[data-verdict]').forEach(el => el.addEventListener('click', () => {
  const result = resolveVerdict(evidence(), el.dataset.verdict, argumentEvidence());
  sound('button');
  if (result.status === 'needs-evidence') { returnForEvidence(result.missing); return; }
  showEnding(result.status, result.reason);
}));

$('replay').addEventListener('click', () => { beginRun(playerId); sound('sceneChange'); window.setTimeout(() => location.reload(), 220); });
$('muteBtn').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  $('muteBtn').setAttribute('aria-pressed', String(muted));
  $('muteBtn').setAttribute('aria-label', muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية');
  $('muteBtn').textContent = muted ? '♪̸' : '♫';
});

updateCards(); updateClips(); renderHistoricalReadout(); updateMix(); renderArgumentBuilder();
const savedRun = readRun(playerId);
if (new URLSearchParams(location.search).get('showResult') === '1' && savedRun.status === 'completed') showEnding(savedRun.outcome, savedRun.failureReason);
