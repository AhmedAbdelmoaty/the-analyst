import { records, rate, share, counterfactualRates, originalRates } from './case-data.mjs';
import { resolveVerdict } from './engine.mjs';
import { createAudioManager } from './audio.mjs';
import { beginRun, finishRun, readRun } from './persistence.mjs';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toFixed(1).replace('.0', '')}%`;
const levelName = level => level === 'junior' ? 'Junior' : 'Senior';
const name = r => `${levelName(r.level)} · ${r.attended ? 'حضر' : 'لم يحضر'}`;
const comparisonCard = r => `<span class="comparison-card"><span class="comparison-name">${levelName(r.level)} · ${r.attended ? 'حضر' : 'ماحضرش'}</span><span class="comparison-count"><bdi dir="ltr">${r.promoted}/${r.total}</bdi> ترقّوا</span><strong dir="ltr">${pct(rate(r))}</strong></span>`;
const comparisonView = ids => ids.length === 2
  ? `<span class="comparison-side">${comparisonCard(records.find(r => r.id === ids[0]))}</span><span class="comparison-vs" aria-label="مقابل">مقابل</span><span class="comparison-side">${comparisonCard(records.find(r => r.id === ids[1]))}</span>`
  : '<span class="clip-empty">اختار بطاقتين من سجلات HR واضغط هنا</span>';
const state = {
  pairs: [[], []], savedPairs: [[], []], selected: [], snapshot: null,
  introStep: 0, decision: null, reason: null, hint: 0,
};
const audio = createAudioManager();
const playerId = window.name || 'guest';
const sound = (cue = 'button') => audio.play(cue);
const felfelAssets = {
  idle: 'idle', entrance: 'idle', talking: 'idle', thinking: 'inspect', magnifier: 'inspect', hint: 'inspect',
  surprise: 'celebrate', discovery: 'celebrate', celebration: 'celebrate', failure: 'concerned', exit: 'idle',
};
// Warm the alternate poses during the opening so the character never appears in pieces at a scene change.
for (const pose of ['inspect', 'celebrate', 'concerned']) {
  const image = new Image();
  image.src = `/investigation-file/assets/felfel/${pose}.png`;
  image.decode().catch(() => {});
}
let deskFelfelTimer;
function reactFelfel(stateName, actor = 'deskFelfel') {
  const actorElement = $(actor);
  if (!actorElement) return;
  actorElement.src = `/investigation-file/assets/felfel/${felfelAssets[stateName] || 'idle'}.png`;
  actorElement.dataset.state = stateName;
  if (actor === 'deskFelfel') {
    window.clearTimeout(deskFelfelTimer);
    if (stateName !== 'idle') deskFelfelTimer = window.setTimeout(() => reactFelfel('idle'), 1100);
  }
}

function scene(id) {
  for (const el of document.querySelectorAll('.scene')) el.classList.toggle('hidden', el.id !== id);
  $('hintBtn').classList.toggle('hidden', id !== 'investigation' && id !== 'confrontation');
  if (!$('hintPanel').classList.contains('hidden')) closeHint(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const officeTabs = [['evidenceTab', 'evidenceWork'], ['labTab', 'analysisWork']];
function activateOfficeTab(tabId, focus = false) {
  const selectedIndex = officeTabs.findIndex(([id]) => id === tabId);
  if (selectedIndex < 0) return;
  officeTabs.forEach(([id, panelId], index) => {
    const active = index === selectedIndex;
    const button = $(id);
    const panel = $(panelId);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    button.classList.toggle('active', active);
    panel.hidden = !active;
    panel.classList.toggle('hidden', !active);
    if (active) {
      panel.classList.remove('tab-enter');
      void panel.offsetWidth;
      panel.classList.add('tab-enter');
    }
  });
  if (focus) $(tabId).focus();
}
for (const [tabId] of officeTabs) {
  $(tabId).addEventListener('click', () => {
    if ($(tabId).getAttribute('aria-selected') === 'true') return;
    sound('sceneChange');
    activateOfficeTab(tabId);
  });
  $(tabId).addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = officeTabs.findIndex(([id]) => id === tabId);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? officeTabs.length - 1 : (index + 1) % officeTabs.length;
    activateOfficeTab(officeTabs[next][0], true);
    sound('sceneChange');
  });
}

function updateCards() {
  $('cards').innerHTML = records.map(r => `<button class="record-card ${state.selected.includes(r.id) ? 'selected' : ''}" data-id="${r.id}" aria-pressed="${state.selected.includes(r.id)}"><span class="record-tag">${name(r)}</span><span class="record-numbers"><b>${r.promoted}</b> ترقّوا من <b>${r.total}</b></span><span class="record-foot">ملف موظفين</span></button>`).join('');
  for (const card of document.querySelectorAll('.record-card')) card.addEventListener('click', () => {
    const id = card.dataset.id;
    state.selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : state.selected.length === 2 ? [id] : [...state.selected, id];
    sound('recordSelect'); reactFelfel('magnifier'); updateCards();
    if (state.selected.length === 2) {
      const openClip = state.pairs.findIndex(pair => pair.length !== 2);
      state.pairs[openClip < 0 ? 0 : openClip] = [...state.selected];
      updateClips();
      sound('clipAttach');
      $('pairMessage').textContent = 'المقارنة ظهرت على المشبك. تقدر تحفظها أو تجرّب غيرها.';
    }
  });
}

function updateClips() {
  document.querySelectorAll('.clip').forEach((el, i) => {
    const ids = state.pairs[i];
    el.querySelector('.clip-content').innerHTML = comparisonView(ids);
    el.classList.remove('clip-attached');
    if (ids.length === 2) { void el.offsetWidth; el.classList.add('clip-attached'); }
    document.querySelector(`[data-save-clip="${i}"]`).disabled = ids.length !== 2;
  });
}

function renderSavedPairs() {
  $('savedPairs').innerHTML = state.savedPairs.map((ids, i) => {
    const recordNames = ids.length === 2 ? ids.map(id => records.find(record => record.id === id)) : [];
    const summary = recordNames.length === 2
      ? `${name(recordNames[0])} ${pct(rate(recordNames[0]))} · مقابل ${name(recordNames[1])} ${pct(rate(recordNames[1]))}`
      : 'الخانة فاضية · احفظ أي مقارنة';
    return `<div class="saved-pair ${ids.length === 2 ? 'has-evidence' : ''}"><div class="saved-pair-heading"><b>دليل ${i + 1}</b>${ids.length === 2 ? `<span class="saved-pair-summary">${summary}</span><button class="text-button" data-recall="${i}">افتح على المشبك</button>` : `<span>${summary}</span>`}</div><div class="saved-pair-detail" data-saved-detail="${i}"><div class="comparison-layout">${ids.length === 2 ? comparisonView(ids) : ''}</div></div></div>`;
  }).join('');
  document.querySelectorAll('[data-recall]').forEach(button => button.addEventListener('click', () => {
    const i = Number(button.dataset.recall);
    state.pairs[i] = [...state.savedPairs[i]];
    updateClips(); sound('sceneChange');
    $('pairMessage').textContent = 'رجّعت المقارنة للمشبك. الدليل المحفوظ لسه موجود.';
  }));
}

function renderHistoricalReadout() {
  $('historicalReadout').innerHTML = `
    <div class="history-row"><b>حضروا البرنامج</b><div class="history-result"><span>اترقّوا <bdi dir="ltr">140 / 400</bdi></span><strong dir="ltr">${pct(originalRates.trained)}</strong></div><div class="history-composition"><span>Junior <bdi dir="ltr">100 / 400</bdi> · ${pct(share(true, 'junior'))}</span><span>Senior <bdi dir="ltr">300 / 400</bdi> · ${pct(share(true, 'senior'))}</span></div></div>
    <div class="history-row"><b>ماحضروش البرنامج</b><div class="history-result"><span>اترقّوا <bdi dir="ltr">460 / 700</bdi></span><strong dir="ltr">${pct(originalRates.untrained)}</strong></div><div class="history-composition"><span>Junior <bdi dir="ltr">600 / 700</bdi> · ${pct(share(false, 'junior'))}</span><span>Senior <bdi dir="ltr">100 / 700</bdi> · ${pct(share(false, 'senior'))}</span></div></div>`;
}

function currentMix() {
  return { trained: Number($('trainedMix').value) / 1000, untrained: Number($('untrainedMix').value) / 1000 };
}

const populations = { trained: new Map(), untrained: new Map() };
let labDiscoveryShown = false;
function renderPopulation(group, juniorShare) {
  const chamber = $(`${group}Population`);
  const tokens = populations[group];
  const juniorCount = Math.round(juniorShare * 20);
  const wanted = new Set(Array.from({ length: 20 }, (_, slot) => slot < juniorCount ? `j${slot}` : `s${slot - juniorCount}`));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  chamber.querySelectorAll('.leaving').forEach(node => node.remove());
  for (const [key, node] of tokens) {
    if (wanted.has(key)) continue;
    tokens.delete(key);
    if (reduced) { node.remove(); continue; }
    node.classList.add('leaving');
    const exit = node.animate([
      { transform: 'translateX(0) translateY(0) scale(1)', opacity: 1 },
      { transform: `translateX(${key[0] === 'j' ? '-65px' : '65px'}) translateY(15px) scale(.75)`, opacity: 0 },
    ], { duration: 300, easing: 'ease-in', fill: 'forwards' });
    exit.onfinish = () => node.remove();
  }
  for (let slot = 0; slot < 20; slot++) {
    const junior = slot < juniorCount;
    const key = junior ? `j${slot}` : `s${slot - juniorCount}`;
    let node = tokens.get(key);
    const entering = !node;
    if (!node) {
      node = document.createElement('img');
      node.className = `employee-token ${junior ? 'junior-token' : 'senior-token'}`;
      node.alt = '';
      node.draggable = false;
      node.src = `/investigation-file/assets/employees/${junior ? 'junior' : 'senior'}-0${slot % 4 + 1}.png`;
      chamber.append(node);
      tokens.set(key, node);
    }
    node.style.left = `${(slot % 10) * 9.5 + 2}%`;
    node.style.top = `${slot < 10 ? 8 : 58}px`;
    node.style.zIndex = String(slot < 10 ? 1 : 2);
    if (entering && !reduced && chamber.dataset.ready === 'true') {
      node.animate([
        { transform: `translateX(${junior ? '-75px' : '75px'}) translateY(-12px) scale(.7)`, opacity: 0 },
        { transform: 'translateX(0) translateY(5px) scale(1.07)', opacity: 1, offset: .8 },
        { transform: 'translateX(0) translateY(0) scale(1)', opacity: 1 },
      ], { duration: 430, easing: 'cubic-bezier(.18,.8,.26,1)' });
    }
  }
  chamber.dataset.ready = 'true';
  chamber.dataset.juniorCount = String(juniorCount);
  chamber.dataset.seniorCount = String(20 - juniorCount);
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
    const bar = $(`${group}RateBar`);
    bar.style.width = `${result * 100}%`;
    const resultRow = bar.closest('.result-row');
    resultRow.classList.remove('updated'); void resultRow.offsetWidth; resultRow.classList.add('updated');
    $(`${group}Mix`).setAttribute('aria-valuetext', `Junior ${pct(junior)}، Senior ${pct(1 - junior)}`);
    renderPopulation(group, junior);
  }
  const difference = rates.trained - rates.untrained;
  $('balanceBeam').style.transform = `rotate(${Math.max(-12, Math.min(12, difference * 25))}deg)`;
  $('rateBalance').setAttribute('aria-label', `ميزان معدلات الترقية الافتراضية: الحاضرين ${pct(rates.trained)}، غير الحاضرين ${pct(rates.untrained)}`);
  if (!labDiscoveryShown && difference > .015) {
    labDiscoveryShown = true;
    $('labDiscovery').classList.remove('hidden');
    reactFelfel('discovery');
    sound('proofPin');
    window.setTimeout(() => $('labDiscovery').classList.add('hidden'), 4300);
  }
  $('mixRelation').textContent = Math.abs(mix.trained - mix.untrained) < .0005 ? 'تركيبة المجموعتين متشابهة في التجربة دي' : 'تركيبة المجموعتين مختلفة في التجربة دي';
  if (playSound) sound('mixAdjustment');
}

document.querySelectorAll('.clip').forEach(el => el.addEventListener('click', () => {
  const i = Number(el.dataset.clip);
  if (state.selected.length !== 2) { $('pairMessage').textContent = 'اختار بطاقتين الأول، وبعدين اضغط المشبك.'; return; }
  state.pairs[i] = [...state.selected]; state.selected = [];
  updateCards(); updateClips(); reactFelfel('surprise'); sound('clipAttach');
  $('pairMessage').textContent = 'بص على النسب. لو حابب ترجع للمقارنة دي، احتفظ بيها.';
}));
document.querySelectorAll('[data-save-clip]').forEach(button => button.addEventListener('click', () => {
  const i = Number(button.dataset.saveClip);
  if (state.pairs[i].length !== 2) return;
  state.savedPairs[i] = [...state.pairs[i]];
  renderSavedPairs(); reactFelfel('discovery'); sound('proofPin');
  $('pairMessage').textContent = 'اتحفظت في ملف الأدلة. تقدر تبدّلها في أي وقت.';
}));
$('clearSelection').addEventListener('click', () => { state.selected = []; updateCards(); sound(); });

for (const id of ['trainedMix', 'untrainedMix']) {
  $(id).addEventListener('input', event => {
    const input = event.currentTarget;
    input.value = String(Math.round(Number(input.value) / 50) * 50);
    updateMix();
  });
  $(id).addEventListener('change', () => { updateMix({ playSound: true }); reactFelfel('thinking'); });
  $(id).addEventListener('keydown', event => {
    const input = event.currentTarget;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(input.value);
    const nearest = Math.round(current / 50) * 50;
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
    input.value = String(Math.max(0, Math.min(1000, current % 50 ? nearest : current + direction * 50)));
    updateMix({ playSound: true }); reactFelfel('thinking');
  });
}
$('resetMix').addEventListener('click', () => {
  $('trainedMix').value = '250';
  $('untrainedMix').value = String(share(false, 'junior') * 1000);
  updateMix({ playSound: true }); reactFelfel('magnifier');
  $('scaleMessage').textContent = 'رجعنا للسجل الأصلي بدقته. التغيير الجاي هيبقى بخطوات 5%.';
});
$('equalMix').addEventListener('click', () => {
  $('trainedMix').value = '500';
  $('untrainedMix').value = '500';
  updateMix({ playSound: true });
  $('scaleMessage').textContent = 'التوزيع الافتراضي بقى 50/50 في المجموعتين. قارن النتيجة بالسجل الأصلي.';
});
$('saveMix').addEventListener('click', () => {
  const mix = currentMix();
  const rates = counterfactualRates(mix.trained, mix.untrained);
  state.snapshot = { trainedShare: mix.trained, untrainedShare: mix.untrained, trainedRate: rates.trained, untrainedRate: rates.untrained, interpretation: null };
  renderSnapshot(); reactFelfel('discovery');
  sound('proofPin');
});
function renderSnapshot() {
  const snapshot = state.snapshot;
  if (!snapshot) { $('savedMix').innerHTML = ''; return; }
  const changed = Math.abs(snapshot.trainedShare - share(true, 'junior')) > 1e-9 ||
    Math.abs(snapshot.untrainedShare - share(false, 'junior')) > 1e-9;
  const observations = [
    ['composition-impact', changed ? 'غيّرت التركيبة، فمعدل الترقية الإجمالي اتحرك' : 'التركيبة زي الأصل، والمعدل الإجمالي ما اتحركش'],
    ['within-rates-change', 'معدل الترقية داخل Junior أو Senior نفسه اتغيّر'],
    ['causation', 'اللقطة دي تثبت إن البرنامج سبب الترقيات'],
  ];
  const firstKey = changed ? 'composition-impact' : 'unchanged';
  $('savedMix').innerHTML = `<div class="snapshot-heading"><b>لقطة من التجربة · افتراضية</b><button type="button" class="text-button" data-clear-snapshot>شيل اللقطة</button></div>
    <p>Junior: الحاضرين <bdi dir="ltr">${pct(snapshot.trainedShare)}</bdi> · غير الحاضرين <bdi dir="ltr">${pct(snapshot.untrainedShare)}</bdi></p>
    <p>معدل الترقية في اللقطة: الحاضرين <bdi dir="ltr">${pct(snapshot.trainedRate)}</bdi> · غير الحاضرين <bdi dir="ltr">${pct(snapshot.untrainedRate)}</bdi></p>
    <div class="snapshot-interpretation"><b>لو هتضيف ملاحظة للّقطة، إيه اللي لاحظته؟</b>
    ${observations.map(([key, label], i) => `<button type="button" class="observation-button" data-observation="${i === 0 ? firstKey : key}" aria-pressed="${snapshot.interpretation === (i === 0 ? firstKey : key)}">${label}</button>`).join('')}</div>`;
}
$('savedMix').addEventListener('click', event => {
  const observation = event.target.closest('[data-observation]');
  if (observation && state.snapshot) {
    state.snapshot.interpretation = observation.dataset.observation;
    renderSnapshot(); sound('proofPin');
  }
  if (event.target.closest('[data-clear-snapshot]')) {
    state.snapshot = null; renderSnapshot(); sound('sceneChange');
  }
});
const hints = [
  'لو رقم كبير قالك حكاية، اسأل الورق: مين اتحطّ مع مين في نفس المقارنة؟',
  'جرّب تحرّك شريط مجموعة واحدة. معدلها بيتحرك، ولا ثابت مكانه؟ السجل الأصلي ما لمسناهوش.',
  'بص على مستوى وظيفي واحد في كل مشبك، وبعدين بص على نسبة Junior في المجموعتين. الحكايتين متشابهتين؟',
];
function updateHintControl() {
  const remaining = hints.length - state.hint;
  $('hintCount').textContent = String(remaining).replace(/\d/g, digit => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);
  $('hintBtn').disabled = remaining === 0;
  $('hintBtn').setAttribute('aria-label', remaining ? `افتح تلميحًا، متبقي ${remaining}` : 'استخدمت التلميحات الثلاثة');
}
let hintScrollY = 0;
function closeHint(immediate = false) {
  const panel = $('hintPanel');
  if (panel.classList.contains('hidden')) return;
  $('hintVeil').classList.add('hidden');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, hintScrollY);
  document.documentElement.style.scrollBehavior = previousScrollBehavior;
  if (immediate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    panel.classList.add('hidden');
  } else {
    panel.querySelector('.hint-character').dataset.state = 'exit';
    window.setTimeout(() => panel.classList.add('hidden'), 260);
  }
  if (!$('hintBtn').classList.contains('hidden')) ($('hintBtn').disabled ? $('muteBtn') : $('hintBtn')).focus();
}
$('hintBtn').addEventListener('click', () => {
  if (state.hint >= hints.length || !$('hintPanel').classList.contains('hidden')) return;
  const index = state.hint++;
  updateHintControl();
  $('hintFelfel').src = index === 0 ? '/investigation-file/assets/felfel/idle.png' : '/investigation-file/assets/felfel/inspect.png';
  $('hintText').textContent = '';
  $('hintPanel').querySelector('.hint-bubble').classList.remove('speech-revealed');
  $('hintPanel').querySelector('.hint-character').dataset.state = 'entrance';
  $('hintVeil').classList.remove('hidden');
  $('hintPanel').classList.remove('hidden');
  hintScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${hintScrollY}px`;
  document.body.style.width = '100%';
  sound('sceneChange');
  window.setTimeout(() => {
    if ($('hintPanel').classList.contains('hidden')) return;
    $('hintPanel').querySelector('.hint-character').dataset.state = 'talking';
    $('hintPanel').querySelector('.hint-bubble').classList.add('speech-revealed');
    $('hintText').textContent = hints[index];
    $('dismissHint').focus();
  }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
});
$('dismissHint').addEventListener('click', () => closeHint());
$('hintVeil').addEventListener('click', () => closeHint());
$('hintPanel').addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); closeHint(); return; }
  if (event.key !== 'Tab') return;
  const focusables = [...$('hintPanel').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled)')];
  const first = focusables[0]; const last = focusables.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
updateHintControl();

const dialogue = [
  ['المدير المالي', '٣٥٪ للحاضرين، و٦٥٫٧٪ للي ماحضروش. أوقّع على إلغاء البرنامج؟'],
  ['مديرة الموارد البشرية', 'ثانية قبل التوقيع. السجلات المفصلة على المكتب؛ بصّ فيها الأول.'],
  ['المدير المالي', 'اتفضلوا. بس القلم مستني، والشاي قرب يبرد!'],
];
$('nextIntro').addEventListener('click', () => {
  beginRun(playerId);
  state.introStep++;
  if (state.introStep >= dialogue.length) { sound('officeEntry'); scene('investigation'); return; }
  sound('sceneChange');
  const [who, words] = dialogue[state.introStep];
  $('introSpeech').querySelector('.speaker').textContent = who;
  $('introSpeech').querySelector('p').textContent = words;
  $('introSpeech').dataset.speaker = state.introStep === 1 ? 'hr' : 'cfo';
  $('introSpeech').classList.remove('speech-enter'); void $('introSpeech').offsetWidth; $('introSpeech').classList.add('speech-enter');
  document.querySelector('.characters').classList.toggle('hr-speaking', state.introStep === 1);
  $('introHr').src = state.introStep === 1 ? '/investigation-file/assets/investigation/hr-concerned.png' : '/investigation-file/assets/investigation/hr.png';
  $('nextIntro').textContent = state.introStep === dialogue.length - 1 ? 'افتح التحقيق ←' : 'التالي ←';
});

function renderMeetingEvidence() {
  const saved = state.savedPairs.filter(ids => ids.length === 2);
  const observationLabels = {
    'composition-impact': 'التركيبة اتغيّرت، والمعدل الإجمالي اتحرك',
    unchanged: 'التركيبة والمعدل زي السجل الأصلي',
    'within-rates-change': 'معدل Junior أو Senior نفسه اتغيّر',
    causation: 'البرنامج سبب الترقيات',
  };
  $('meetingEvidence').innerHTML = `<b>من ملف أدلتك:</b>${saved.length ? saved.map(ids => `<div class="meeting-pair comparison-layout">${comparisonView(ids)}</div>`).join('') : '<p>لسه مفيش مقارنات محفوظة.</p>'}${state.snapshot ? `<div class="meeting-snapshot"><b>لقطة افتراضية</b><p>Junior: الحاضرين ${pct(state.snapshot.trainedShare)} · غير الحاضرين ${pct(state.snapshot.untrainedShare)}. معدل الترقية ${pct(state.snapshot.trainedRate)} مقابل ${pct(state.snapshot.untrainedRate)}.</p>${state.snapshot.interpretation ? `<p>ملاحظتك: ${observationLabels[state.snapshot.interpretation]}</p>` : ''}</div>` : ''}`;
}
function resetMeeting() {
  state.decision = null; state.reason = null;
  $('decisionStep').classList.remove('hidden');
  $('reasonStep').classList.add('hidden');
  document.querySelectorAll('[data-decision],[data-reason]').forEach(button => button.setAttribute('aria-pressed', 'false'));
}
$('faceCfo').addEventListener('click', () => {
  resetMeeting(); renderMeetingEvidence(); $('verdictMessage').textContent = '';
  reactFelfel('thinking', 'meetingFelfel');
  sound('sceneChange'); scene('confrontation');
});
$('backToDesk').addEventListener('click', () => { sound('sceneChange'); scene('investigation'); });
document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
  state.decision = button.dataset.decision;
  document.querySelectorAll('[data-decision]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  $('decisionStep').classList.add('hidden');
  $('reasonStep').classList.remove('hidden');
  reactFelfel('surprise', 'meetingFelfel');
  sound('sceneChange');
}));
$('backToDecision').addEventListener('click', () => {
  $('reasonStep').classList.add('hidden'); $('decisionStep').classList.remove('hidden'); sound('sceneChange');
});
document.querySelectorAll('[data-reason]').forEach(button => button.addEventListener('click', () => {
  state.reason = button.dataset.reason;
  reactFelfel('thinking', 'meetingFelfel');
  document.querySelectorAll('[data-reason]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  sound('button');
}));

function showEnding(result, reason = 'unsupported-decision') {
  finishRun(playerId, result, undefined, reason);
  $('ending').classList.toggle('success', result === 'success');
  $('ending').classList.toggle('failure', result !== 'success');
  $('endingReaction').src = result === 'success' ? '/investigation-file/assets/investigation/cfo-surprised.png' : '/investigation-file/assets/investigation/cfo.png';
  $('endingReaction').alt = result === 'success' ? 'المدير المالي متفاجئ' : 'المدير المالي يفكر في القرار';
  $('endingHr').src = result === 'success' ? '/investigation-file/assets/investigation/hr.png' : '/investigation-file/assets/investigation/hr-concerned.png';
  $('endingHr').alt = result === 'success' ? 'مديرة الموارد البشرية ارتاحت' : 'مديرة الموارد البشرية قلقة';
  $('endingFelfel').src = result === 'success' ? '/investigation-file/assets/felfel/celebrate.png' : '/investigation-file/assets/felfel/concerned.png';
  $('endingIcon').src = result === 'success' ? '/investigation-file/assets/simpson/success-checkmark.png' : '/investigation-file/assets/simpson/failure-x.png';
  $('endingIcon').alt = '';
  $('endingStampText').textContent = result === 'success' ? 'اعتراض في محلّه' : 'الحكم محتاج مراجعة';
  $('endingTitle').textContent = result === 'success' ? 'القرار اتوقف في وقته!' : 'الملف محتاج مراجعة';
  $('endingText').textContent = result === 'success'
    ? 'وقفّت قرار متسرّع بدليل واضح. دلوقتي نطلب تقييمًا أحسن قبل ما نحكم على البرنامج.'
    : reason === 'causation' ? 'فِلفِل بيقول: الأرقام شبه شاهد شاف نص المشهد. السجلات دي ما تثبتش إن التدريب سبب الترقيات.'
      : reason === 'aggregate' ? 'الرقم الإجمالي لفت النظر، بس جمع مجموعتين بتركيبة مختلفة ما يكفيش لوحده لقرار الإلغاء.'
        : 'تبريرك بيقول إن المقارنة داخل المستويات مختلفة، لكن قرار الإلغاء ما اتسقش معاه. جرّب تربط الحكم بالدليل.';
  $('revealStage').classList.add('hidden');
  document.querySelector('.end-card').classList.remove('hidden');
  scene('ending'); sound(result);
  window.setTimeout(() => sound(result === 'success' ? 'successAccent' : 'failureAccent'), 260);
}
const revealBars = (firstLabel, firstRate, secondLabel, secondRate) => `<div class="reveal-bars"><div class="reveal-bar"><div><b>${firstLabel}</b><strong dir="ltr">${pct(firstRate)}</strong></div><span><i style="width:${firstRate * 100}%"></i></span></div><div class="reveal-bar"><div><b>${secondLabel}</b><strong dir="ltr">${pct(secondRate)}</strong></div><span><i style="width:${secondRate * 100}%"></i></span></div></div>`;
const compositionBar = (label, junior) => `<div class="reveal-composition"><b>${label}</b><div><span style="width:${junior * 100}%"></span><span style="width:${(1 - junior) * 100}%"></span></div><small>Junior ${pct(junior)} · Senior ${pct(1 - junior)}</small></div>`;
let revealStep = 0;
let revealTimer = 0;
let revealPaused = false;
function stopRevealTimer() { window.clearTimeout(revealTimer); revealTimer = 0; }
function startRevealTimer() {
  stopRevealTimer();
  if (revealPaused || $('revealStage').classList.contains('hidden') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  revealTimer = window.setTimeout(() => advanceReveal(true), 9000);
}
function renderReveal() {
  const juniorTrained = records.find(r => r.id === 'jt');
  const juniorOther = records.find(r => r.id === 'ju');
  const seniorTrained = records.find(r => r.id === 'st');
  const seniorOther = records.find(r => r.id === 'su');
  const common = counterfactualRates(.5, .5);
  const beats = [
    ['التقرير الأول', 'المدير المالي شاف ٣٥٪ قدّام ٦٥٫٧٪. رقم كبير... بس لسه مش الحكاية كلها.', revealBars('حضروا · ١٤٠/٤٠٠', originalRates.trained, 'ماحضروش · ٤٦٠/٧٠٠', originalRates.untrained)],
    ['ملف Junior', 'لما نقارن Junior مع Junior، الحاضرين ٨٠ من ١٠٠، واللي ماحضروش ٤٥٠ من ٦٠٠.', revealBars('حضروا · ٨٠/١٠٠', rate(juniorTrained), 'ماحضروش · ٤٥٠/٦٠٠', rate(juniorOther))],
    ['ملف Senior', 'ونفس الحركة في Senior: الحاضرين ٦٠ من ٣٠٠، واللي ماحضروش ١٠ من ١٠٠.', revealBars('حضروا · ٦٠/٣٠٠', rate(seniorTrained), 'ماحضروش · ١٠/١٠٠', rate(seniorOther))],
    ['مين في كل مجموعة؟', 'آه! الحاضرين أغلبهم Senior، وغير الحاضرين أغلبهم Junior. خلطنا ناس بنِسَب مختلفة.', compositionBar('حضروا', share(true, 'junior')) + compositionBar('ماحضروش', share(false, 'junior'))],
    ['تجربة على الورق', 'لو خلّينا التركيبة واحدة، نص Junior ونص Senior للطرفين، الحساب الافتراضي هيبان بشكل تاني. ده مش سجل الشركة الأصلي.', revealBars('حضروا · افتراضي', common.trained, 'ماحضروش · افتراضي', common.untrained)],
    ['اسم الحيلة', 'دي مفارقة سيمبسون: الإجمالي بيقول اتجاه، وكل مستوى لوحده بيقول العكس. بس خد بالك، ده ما يثبتش إن التدريب سبب الترقيات؛ نحتاج تقييمًا إضافيًا.', '<div class="reveal-last">الإجمالي اتقلب بسبب اختلاف التركيبة. والسبب الحقيقي للترقيات لسه محتاج تحقيق.</div>'],
  ];
  const [title, speech, visual] = beats[revealStep];
  $('revealTitle').textContent = title;
  $('revealSpeech').textContent = speech;
  $('revealVisual').innerHTML = visual;
  $('revealFelfel').src = revealStep === 3 || revealStep === 5 ? '/investigation-file/assets/felfel/celebrate.png' : '/investigation-file/assets/felfel/inspect.png';
  $('revealFelfel').dataset.state = revealStep === 3 || revealStep === 5 ? 'discovery' : 'talking';
  $('revealProgress').textContent = `${revealStep + 1} / ${beats.length}`;
  $('nextReveal').textContent = revealStep === beats.length - 1 ? 'ارجع للنهاية' : 'اللي بعده ←';
  $('revealStage').classList.remove('reveal-pop'); void $('revealStage').offsetWidth; $('revealStage').classList.add('reveal-pop');
  $('pauseReveal').textContent = revealPaused ? 'كمّل الشرح' : 'إيقاف الشرح مؤقتًا';
  $('pauseReveal').setAttribute('aria-pressed', String(revealPaused));
  startRevealTimer();
}
$('openReveal').addEventListener('click', () => {
  revealStep = 0;
  revealPaused = false;
  document.querySelector('.end-card').classList.add('hidden');
  $('revealStage').classList.remove('hidden');
  renderReveal(); sound('sceneChange'); $('nextReveal').focus();
});
$('nextReveal').addEventListener('click', () => {
  advanceReveal(false);
});
$('pauseReveal').addEventListener('click', () => {
  revealPaused = !revealPaused;
  if (revealPaused) stopRevealTimer(); else startRevealTimer();
  $('pauseReveal').textContent = revealPaused ? 'كمّل الشرح' : 'إيقاف الشرح مؤقتًا';
  $('pauseReveal').setAttribute('aria-pressed', String(revealPaused)); sound('button');
});
$('replayReveal').addEventListener('click', () => { revealStep = 0; revealPaused = false; renderReveal(); sound('sceneChange'); });
function advanceReveal(fromTimer = false) {
  stopRevealTimer();
  if (revealStep < 5) { revealStep++; renderReveal(); if (!fromTimer) sound('sceneChange'); }
  else {
    $('revealStage').classList.add('hidden'); document.querySelector('.end-card').classList.remove('hidden'); $('openReveal').focus();
    if (!fromTimer) sound('sceneChange');
  }
}
$('closeReveal').addEventListener('click', () => {
  stopRevealTimer();
  $('revealStage').classList.add('hidden'); document.querySelector('.end-card').classList.remove('hidden'); $('openReveal').focus(); sound('sceneChange');
});
$('submitVerdict').addEventListener('click', () => {
  const result = resolveVerdict({ savedPairs: state.savedPairs, snapshot: state.snapshot }, state.decision, state.reason);
  if (result.status === 'needs-choice') { $('verdictMessage').textContent = 'اختار تبريرك الأول.'; return; }
  if (result.status === 'needs-evidence') {
    if (result.missing.includes('experiment-interpretation')) {
      $('scaleMessage').textContent = 'قرارك مدعوم، لكن ملاحظتك على اللقطة الافتراضية مش بتوصف اللي اتغير فيها. راجعها أو شيل اللقطة وارجع.';
      activateOfficeTab('labTab'); scene('investigation'); $('scaleMessage').focus(); return;
    }
    $('pairMessage').textContent = 'قرارك وتبريرك ماشيين مع بعض، بس المقارنات المحفوظة لسه مش كفاية لدعم الاعتراض. راجع المقارنات وبدّل اللي محتاج يتبدّل.';
    activateOfficeTab('evidenceTab'); scene('investigation'); $('pairMessage').focus(); return;
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
activateOfficeTab('evidenceTab');
const savedRun = readRun(playerId);
if (new URLSearchParams(location.search).get('showResult') === '1' && savedRun.status === 'completed') showEnding(savedRun.outcome, savedRun.failureReason);
