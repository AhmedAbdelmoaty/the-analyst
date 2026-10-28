import { records, rate, share, counterfactualRates, originalRates } from './case-data.mjs';
import { resolveVerdict } from './engine.mjs';
import { createAudioManager } from './audio.mjs';
import { beginRun, finishRun, readRun } from './persistence.mjs';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toFixed(1).replace('.0', '')}%`;
const levelName = level => level === 'junior' ? 'Junior' : 'Senior';
const name = r => `${levelName(r.level)} · ${r.attended ? 'حضر' : 'لم يحضر'}`;
const pairText = ids => ids.map(id => records.find(r => r.id === id))
  .map(r => `${name(r)} ${r.promoted}/${r.total} = ${pct(rate(r))}`).join('  مقابل  ');
const state = {
  pairs: [[], []], savedPairs: [[], []], selected: [], snapshot: null,
  introStep: 0, decision: null, reason: null, hint: 0,
};
const audio = createAudioManager();
const playerId = window.name || 'guest';
const sound = (cue = 'button') => audio.play(cue);

function scene(id) {
  for (const el of document.querySelectorAll('.scene')) el.classList.toggle('hidden', el.id !== id);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateCards() {
  $('cards').innerHTML = records.map(r => `<button class="record-card ${state.selected.includes(r.id) ? 'selected' : ''}" data-id="${r.id}" aria-pressed="${state.selected.includes(r.id)}"><span class="record-tag">${name(r)}</span><span class="record-numbers"><b>${r.promoted}</b> ترقّوا من <b>${r.total}</b></span><span class="record-foot">ملف موظفين</span></button>`).join('');
  for (const card of document.querySelectorAll('.record-card')) card.addEventListener('click', () => {
    const id = card.dataset.id;
    state.selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : state.selected.length === 2 ? [id] : [...state.selected, id];
    sound('recordSelect'); updateCards();
  });
}

function updateClips() {
  document.querySelectorAll('.clip').forEach((el, i) => {
    const ids = state.pairs[i];
    el.querySelector('.clip-content').textContent = ids.length === 2 ? pairText(ids) : 'اختار بطاقتين';
    document.querySelector(`[data-save-clip="${i}"]`).disabled = ids.length !== 2;
  });
}

function renderSavedPairs() {
  $('savedPairs').innerHTML = state.savedPairs.map((ids, i) =>
    `<div class="saved-pair"><span>${ids.length === 2 ? pairText(ids) : 'الخانة فاضية'}</span>${ids.length === 2 ? `<button class="text-button" data-recall="${i}">افتح على المشبك</button>` : ''}</div>`
  ).join('');
  document.querySelectorAll('[data-recall]').forEach(button => button.addEventListener('click', () => {
    const i = Number(button.dataset.recall);
    state.pairs[i] = [...state.savedPairs[i]];
    updateClips(); sound('sceneChange');
    $('pairMessage').textContent = 'رجّعت المقارنة للمشبك. الدليل المحفوظ لسه موجود.';
  }));
}

function renderHistoricalReadout() {
  $('historicalReadout').innerHTML = `
    <div class="history-row"><b>حضروا البرنامج</b><strong>${pct(originalRates.trained)} · 140/400</strong><span>Junior: 100/400 = ${pct(share(true, 'junior'))} · Senior: 300/400 = ${pct(share(true, 'senior'))}</span></div>
    <div class="history-row"><b>ماحضروش البرنامج</b><strong>${pct(originalRates.untrained)} · 460/700</strong><span>Junior: 600/700 = ${pct(share(false, 'junior'))} · Senior: 100/700 = ${pct(share(false, 'senior'))}</span></div>`;
}

function currentMix() {
  return { trained: Number($('trainedMix').value) / 1000, untrained: Number($('untrainedMix').value) / 1000 };
}

function updateMix({ playSound = false } = {}) {
  const mix = currentMix();
  const rates = counterfactualRates(mix.trained, mix.untrained);
  for (const [group, junior, result] of [
    ['trained', mix.trained, rates.trained], ['untrained', mix.untrained, rates.untrained],
  ]) {
    $(`${group}MixValue`).textContent = pct(junior);
    $(`${group}JuniorShare`).textContent = pct(junior);
    $(`${group}SeniorShare`).textContent = pct(1 - junior);
    document.querySelector(`.${group}-junior`).style.width = `${junior * 100}%`;
    document.querySelector(`.${group}-senior`).style.width = `${(1 - junior) * 100}%`;
    $(`${group}WhatIf`).textContent = pct(result);
    $(`${group}Mix`).setAttribute('aria-valuetext', `Junior ${pct(junior)}، Senior ${pct(1 - junior)}`);
  }
  if (playSound) sound('mixAdjustment');
}

document.querySelectorAll('.clip').forEach(el => el.addEventListener('click', () => {
  const i = Number(el.dataset.clip);
  if (state.selected.length !== 2) { $('pairMessage').textContent = 'اختار بطاقتين الأول، وبعدين اضغط المشبك.'; return; }
  state.pairs[i] = [...state.selected]; state.selected = [];
  updateCards(); updateClips(); sound('clipAttach');
  $('pairMessage').textContent = 'بص على النسب. لو حابب ترجع للمقارنة دي، احتفظ بيها.';
}));
document.querySelectorAll('[data-save-clip]').forEach(button => button.addEventListener('click', () => {
  const i = Number(button.dataset.saveClip);
  if (state.pairs[i].length !== 2) return;
  state.savedPairs[i] = [...state.pairs[i]];
  renderSavedPairs(); sound('proofPin');
  $('pairMessage').textContent = 'اتحفظت في ملف الأدلة. تقدر تبدّلها في أي وقت.';
}));
$('clearSelection').addEventListener('click', () => { state.selected = []; updateCards(); sound(); });

for (const id of ['trainedMix', 'untrainedMix']) {
  $(id).addEventListener('input', event => {
    const input = event.currentTarget;
    input.value = String(Math.round(Number(input.value) / 50) * 50);
    updateMix();
  });
  $(id).addEventListener('change', () => updateMix({ playSound: true }));
  $(id).addEventListener('keydown', event => {
    const input = event.currentTarget;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(input.value);
    const nearest = Math.round(current / 50) * 50;
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
    input.value = String(Math.max(0, Math.min(1000, current % 50 ? nearest : current + direction * 50)));
    updateMix({ playSound: true });
  });
}
$('resetMix').addEventListener('click', () => {
  $('trainedMix').value = '250';
  $('untrainedMix').value = String(Math.round(share(false, 'junior') * 1000));
  updateMix({ playSound: true });
  $('scaleMessage').textContent = 'رجعنا للسجل الأصلي بدقته. التغيير الجاي هيبقى بخطوات 5%.';
});
$('saveMix').addEventListener('click', () => {
  const mix = currentMix();
  const rates = counterfactualRates(mix.trained, mix.untrained);
  state.snapshot = { trainedShare: mix.trained, untrainedShare: mix.untrained, trainedRate: rates.trained, untrainedRate: rates.untrained };
  $('savedMix').textContent = `لقطة افتراضية محفوظة: Junior للحاضرين ${pct(mix.trained)} ولغير الحاضرين ${pct(mix.untrained)} · معدل الترقية ${pct(rates.trained)} مقابل ${pct(rates.untrained)}. تقدر تستبدلها.`;
  sound('proofPin');
});
const hints = [
  'جرّب تغيّر مجموعة واحدة، وراقب رقمها قبل ما تغيّر التانية.',
  'هل المجموعتين في السجل الأصلي عندهم نفس نسبة Junior وSenior؟',
  'ارجع للمشابك: هل المقارنة بين موظفين من نفس المستوى بتقول نفس حكاية الإجمالي؟',
];
$('hintBtn').addEventListener('click', () => {
  $('scaleMessage').textContent = hints[Math.min(state.hint++, hints.length - 1)];
  sound('sceneChange');
});

const dialogue = [
  ['المدير المالي', 'الأرقام قدامنا: اللي ماحضروش اترقّوا أكتر. نلغي البرنامج ونوفّر ميزانية الكراسي؟'],
  ['مديرة الموارد البشرية', 'قبل الكراسي، خلّينا نبص على السجلات. الرقم ساعات بيحب يحكي لوحده.'],
  ['المدير المالي', 'ماشي، قدّامكم المكتب. بس خلّونا نطلع برأي قبل ما الشاي يبرد!'],
];
$('nextIntro').addEventListener('click', () => {
  beginRun(playerId);
  state.introStep++;
  if (state.introStep >= dialogue.length) { sound('officeEntry'); scene('investigation'); return; }
  sound('sceneChange');
  const [who, words] = dialogue[state.introStep];
  $('introSpeech').querySelector('.speaker').textContent = who;
  $('introSpeech').querySelector('p').textContent = words;
  document.querySelector('.characters').classList.toggle('hr-speaking', state.introStep === 1);
  $('introHr').src = state.introStep === 1 ? '/investigation-file/assets/investigation/hr-concerned.png' : '/investigation-file/assets/investigation/hr.png';
  $('nextIntro').textContent = state.introStep === dialogue.length - 1 ? 'افتح التحقيق ←' : 'التالي ←';
});

function renderMeetingEvidence() {
  const saved = state.savedPairs.filter(ids => ids.length === 2);
  $('meetingEvidence').innerHTML = `<b>من ملف أدلتك:</b>${saved.length ? saved.map(ids => `<p>${pairText(ids)}</p>`).join('') : '<p>لسه مفيش مقارنات محفوظة.</p>'}${state.snapshot ? `<p>لقطة افتراضية · Junior: الحاضرين ${pct(state.snapshot.trainedShare)}، غير الحاضرين ${pct(state.snapshot.untrainedShare)}. معدلات الترقية ${pct(state.snapshot.trainedRate)} مقابل ${pct(state.snapshot.untrainedRate)}.</p>` : ''}`;
}
function resetMeeting() {
  state.decision = null; state.reason = null;
  $('decisionStep').classList.remove('hidden');
  $('reasonStep').classList.add('hidden');
  document.querySelectorAll('[data-decision],[data-reason]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}
$('faceCfo').addEventListener('click', () => {
  resetMeeting(); renderMeetingEvidence(); $('verdictMessage').textContent = '';
  sound('sceneChange'); scene('confrontation');
});
$('backToDesk').addEventListener('click', () => { sound('sceneChange'); scene('investigation'); });
document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
  state.decision = button.dataset.decision;
  document.querySelectorAll('[data-decision]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  $('decisionStep').classList.add('hidden');
  $('reasonStep').classList.remove('hidden');
  sound('sceneChange');
}));
$('backToDecision').addEventListener('click', () => {
  $('reasonStep').classList.add('hidden'); $('decisionStep').classList.remove('hidden'); sound('sceneChange');
});
document.querySelectorAll('[data-reason]').forEach(button => button.addEventListener('click', () => {
  state.reason = button.dataset.reason;
  document.querySelectorAll('[data-reason]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  sound('button');
}));

function showEnding(result, reason = 'unsupported-decision') {
  finishRun(playerId, result, undefined, reason);
  $('endingReaction').src = result === 'success' ? '/investigation-file/assets/investigation/cfo-surprised.png' : '/investigation-file/assets/investigation/hr-concerned.png';
  $('endingReaction').alt = result === 'success' ? 'المدير المالي متفاجئ' : 'مديرة الموارد البشرية قلقة';
  $('endingIcon').src = result === 'success' ? '/investigation-file/assets/simpson/success-checkmark.png' : '/investigation-file/assets/simpson/failure-x.png';
  $('endingIcon').alt = result === 'success' ? 'نجاح التحقيق' : 'نهاية غير ناجحة';
  $('endingTitle').textContent = result === 'success' ? 'القرار اتوقف في وقته!' : 'الملف محتاج مراجعة';
  $('endingText').textContent = result === 'success'
    ? 'اعتراضك وضّح إن المقارنة داخل كل مستوى مختلفة عن حكاية الإجمالي. نوقف الإلغاء ونطلب تقييمًا إضافيًا؛ الأرقام دي وحدها ما تثبتش السبب.'
    : reason === 'causation' ? 'النسب ما تثبتش إن التدريب هو سبب الترقيات. محتاجين تقييم إضافي قبل الحكم ده.'
      : reason === 'aggregate' ? 'التقرير الإجمالي لوحده ما يكفيش للحكم. توزيع Junior وSenior مختلف بين المجموعتين.'
        : 'قرار إلغاء البرنامج ما اتسقش مع التبرير اللي قدمته. راجع الدليل قبل الحكم.';
  $('endingMath').hidden = result !== 'success';
  if (result === 'success') $('endingMath').innerHTML = '<div>Junior: حضروا 80% · ماحضروش 75%</div><div>Senior: حضروا 20% · ماحضروش 10%</div><div>الإجمالي الأصلي: 35% مقابل 65.7%</div><small>اختلاف تركيب المجموعتين بيغير حكاية الإجمالي. ده لا يثبت السبب.</small>';
  scene('ending'); sound(result);
  window.setTimeout(() => sound(result === 'success' ? 'successAccent' : 'failureAccent'), 260);
}
$('submitVerdict').addEventListener('click', () => {
  const result = resolveVerdict({ savedPairs: state.savedPairs }, state.decision, state.reason);
  if (result.status === 'needs-choice') { $('verdictMessage').textContent = 'اختار تبريرك الأول.'; return; }
  if (result.status === 'needs-evidence') {
    $('pairMessage').textContent = 'قرارك وتبريرك ماشيين مع بعض، بس المقارنات المحفوظة لسه مش كفاية لدعم الاعتراض. راجع المقارنات وبدّل اللي محتاج يتبدّل.';
    scene('investigation'); $('pairMessage').focus?.(); return;
  }
  showEnding(result.status, result.reason);
});
$('replay').addEventListener('click', () => { beginRun(playerId); sound('sceneChange'); window.setTimeout(() => location.reload(), 220); });
$('muteBtn').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  $('muteBtn').setAttribute('aria-pressed', String(muted));
  $('muteBtn').setAttribute('aria-label', muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية');
  $('muteBtn').textContent = muted ? '♪̸' : '♫';
});

updateCards(); updateClips(); renderSavedPairs(); renderHistoricalReadout(); updateMix();
const savedRun = readRun(playerId);
if (new URLSearchParams(location.search).get('showResult') === '1' && savedRun.status === 'completed') showEnding(savedRun.outcome, savedRun.failureReason);
