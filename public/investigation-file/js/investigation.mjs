import { records, rate, share, counterfactualRates, originalRates } from './case-data.mjs';
import { resolveVerdict } from './engine.mjs';
import { createAudioManager } from './audio.mjs';
import { beginRun, finishRun, readRun, saveCheckpoint } from './persistence.mjs';

const $ = id => document.getElementById(id);
const pct = n => `${(n * 100).toFixed(1).replace('.0', '')}%`;
const levelName = level => level === 'junior' ? 'Junior' : 'Senior';
const name = r => `${levelName(r.level)} · ${r.attended ? 'حضر' : 'ماحضرش'}`;
const comparisonCard = r => `<span class="comparison-card"><span class="comparison-name">${levelName(r.level)} · ${r.attended ? 'حضر' : 'ماحضرش'}</span><span class="comparison-count"><bdi dir="ltr">${r.promoted}/${r.total}</bdi> ترقّوا</span><strong dir="ltr">${pct(rate(r))}</strong></span>`;
const comparisonView = ids => ids.length === 2
  ? `<span class="comparison-side">${comparisonCard(records.find(r => r.id === ids[0]))}</span><span class="comparison-vs" aria-label="مقابل">مقابل</span><span class="comparison-side">${comparisonCard(records.find(r => r.id === ids[1]))}</span>`
  : '<span class="clip-empty">اختار بطاقتين من سجلات HR واضغط هنا</span>';
const state = {
  selected: [], labVisited: false,
  introStep: -1, decision: null, reason: null, hintNudged: new Set(),
};
const audio = createAudioManager();
const playerId = window.name || 'guest';
let platformPaused = false;
const platformEmbedded = window.parent !== window;
if (platformEmbedded) document.body.classList.add('platform-embedded');
const sound = (cue = 'button') => { if (!platformPaused) audio.play(cue); };
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const felfelAssets = {
  idle: 'idle', roaming: 'idle', entrance: 'jump', peek: 'peek', talking: 'ponder', thinking: 'ponder', magnifier: 'inspect', hint: 'ponder',
  surprise: 'celebrate', discovery: 'celebrate', celebration: 'celebrate', failure: 'concerned', exit: 'idle',
};
// Warm the alternate poses during the opening so the character never appears in pieces at a scene change.
for (const pose of ['inspect', 'celebrate', 'concerned', 'peek', 'ponder', 'run', 'jump']) {
  const image = new Image();
  image.src = `/investigation-file/assets/felfel/${pose}.png`;
  image.decode().catch(() => {});
}
let deskFelfelTimer;
let roamTimer;
let roamResumeTimer;
let roamIndex = 0;
let felfelBusy = false;
const actorAsset = (id, asset) => {
  const actor = $(id);
  if (!actor) return;
  actor.src = `/investigation-file/assets/investigation/${asset}.png`;
  actor.classList.remove('character-acting'); void actor.offsetWidth; actor.classList.add('character-acting');
};
function roamAnchors() {
  const narrow = window.innerWidth <= 700;
  return narrow
    ? [[14, 27], [83, 34], [14, 58], [84, 70]]
    : [[12, 27], [86, 31], [15, 63], [84, 67]];
}
function moveFelfel() {
  if (currentSceneId !== 'investigation' || felfelBusy || prefersReducedMotion()) return;
  const actor = $('deskFelfel');
  const [x, y] = roamAnchors()[roamIndex++ % roamAnchors().length];
  actor.src = '/investigation-file/assets/felfel/run.png';
  actor.dataset.state = 'roaming';
  actor.style.left = `${x}vw`; actor.style.top = `${y}svh`;
  window.clearTimeout(deskFelfelTimer);
  deskFelfelTimer = window.setTimeout(() => {
    if (currentSceneId !== 'investigation' || felfelBusy) return;
    actor.src = '/investigation-file/assets/felfel/idle.png'; actor.dataset.state = 'idle';
  }, 840);
}
function stopRoaming() { window.clearInterval(roamTimer); roamTimer = undefined; }
function startRoaming() {
  stopRoaming();
  window.clearTimeout(roamResumeTimer);
  if (prefersReducedMotion()) return;
  moveFelfel();
  roamTimer = window.setInterval(moveFelfel, 5200);
}
function pauseRoaming(delay = 2600) {
  stopRoaming();
  window.clearTimeout(roamResumeTimer);
  if (!prefersReducedMotion()) roamResumeTimer = window.setTimeout(() => { if (currentSceneId === 'investigation' && !$('hintPanel').classList.contains('hidden')) return; if (currentSceneId === 'investigation') startRoaming(); }, delay);
}
function reactFelfel(stateName, actor = 'deskFelfel') {
  const actorElement = $(actor);
  if (!actorElement) return;
  actorElement.src = `/investigation-file/assets/felfel/${felfelAssets[stateName] || 'idle'}.png`;
  actorElement.dataset.state = stateName;
  if (actor === 'deskFelfel') {
    pauseRoaming();
    window.clearTimeout(deskFelfelTimer);
    if (stateName !== 'idle') deskFelfelTimer = window.setTimeout(() => reactFelfel('idle'), 1100);
  }
}

let currentSceneId = 'intro';
function scene(id) {
  currentSceneId = id;
  for (const el of document.querySelectorAll('.scene')) el.classList.toggle('hidden', el.id !== id);
  $('hintBtn').classList.toggle('hidden', id !== 'investigation');
  document.body.classList.toggle('investigation-active', id === 'investigation');
  updateHintControl();
  if (!$('hintPanel').classList.contains('hidden')) closeHint(true);
  if (id === 'investigation') startRoaming(); else stopRoaming();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

const officeTabs = [['evidenceTab', 'evidenceWork'], ['labTab', 'analysisWork']];
function activateOfficeTab(tabId, focus = false) {
  const selectedIndex = officeTabs.findIndex(([id]) => id === tabId);
  if (selectedIndex < 0) return;
  if (tabId === 'labTab') {
    state.labVisited = true;
    $('faceCfo').disabled = false;
  }
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
  updateHintControl();
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
  $('cards').innerHTML = records.map(r => `<button class="record-card ${state.selected.includes(r.id) ? 'selected' : ''}" data-id="${r.id}" data-level="${r.level}" aria-pressed="${state.selected.includes(r.id)}"><span class="record-tag">${name(r)}</span><span class="record-numbers"><b>${r.promoted}</b> ترقّوا من <b>${r.total}</b></span><span class="record-rate" dir="ltr">${pct(rate(r))}</span><span class="record-foot">ملف موظفين</span></button>`).join('');
  for (const card of document.querySelectorAll('.record-card')) card.addEventListener('click', () => {
    const id = card.dataset.id;
    state.selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : state.selected.length === 2 ? [id] : [...state.selected, id];
    sound('recordSelect'); reactFelfel('magnifier'); updateCards();
    updateComparison();
    if (state.selected.length === 2) {
      sound('clipAttach');
      nudgeHint('evidence');
      if (window.matchMedia('(max-width: 700px)').matches) {
        const preview = $('mobileComparison');
        if (preview.getBoundingClientRect().bottom > innerHeight - 12) {
          preview.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'instant' : 'smooth' });
        }
      }
    }
  });
}

function updateComparison() {
  const ids = state.selected;
  const message = ids.length === 2 ? (() => {
    const [a, b] = ids.map(id => records.find(record => record.id === id));
    return `<div class="comparison-layout">${comparisonView(ids)}</div><p class="comparison-difference">الفرق بين المعدلين: <bdi dir="ltr">${pct(Math.abs(rate(a) - rate(b)))}</bdi>${a.level === b.level ? ' · نفس المستوى' : ' · مستويان مختلفان'}</p>`;
  })() : '<p>اختار سجلين وشوف الفرق هنا.</p>';
  $('comparisonResult').innerHTML = message;
  $('mobileComparison').innerHTML = message;
  $('pairMessage').textContent = ids.length === 2 ? 'جرّب مقارنة تانية من السجلات.' : 'اختار سجلين للمقارنة.';
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
function maybeRevealParadox() {
  if (labDiscoveryShown) return;
  const { trained, untrained } = currentMix();
  const rates = counterfactualRates(trained, untrained);
  if (rates.trained - rates.untrained <= .015) return;
  labDiscoveryShown = true;
  $('labDiscovery').classList.remove('hidden');
  document.querySelector('.experiment-board').classList.add('paradox-found');
  reactFelfel('discovery');
  sound('proofPin');
  window.setTimeout(() => $('labDiscovery').classList.add('hidden'), 4300);
}
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
      { transform: 'translateX(0) translateY(0) rotate(0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translateX(${key[0] === 'j' ? '-27px' : '27px'}) translateY(-6px) rotate(${key[0] === 'j' ? '-5deg' : '5deg'}) scale(.95)`, opacity: .9, offset: .5 },
      { transform: `translateX(${key[0] === 'j' ? '-90px' : '90px'}) translateY(12px) rotate(${key[0] === 'j' ? '-9deg' : '9deg'}) scale(.72)`, opacity: 0, offset: 1 },
    ], { duration: 390, easing: 'ease-in', fill: 'forwards' });
    exit.onfinish = () => node.remove();
  }
  for (let slot = 0; slot < 20; slot++) {
    const junior = slot < juniorCount;
    const key = junior ? `j${slot}` : `s${slot - juniorCount}`;
    let node = tokens.get(key);
    const entering = !node;
    if (!node) {
      node = document.createElement('img');
      const variant = (junior ? slot : slot - juniorCount) % 4;
      node.className = `employee-token ${junior ? 'junior-token' : 'senior-token'} variant-${variant + 1}`;
      node.alt = '';
      node.draggable = false;
      node.src = `/investigation-file/assets/employees/${junior ? 'junior' : 'senior'}-0${variant + 1}.png`;
      chamber.append(node);
      tokens.set(key, node);
    }
    node.style.left = `${(slot % 10) * 9 + 2 + (slot >= 10 ? 3 : 0)}%`;
    node.style.top = `${slot < 10 ? 14 : 91}px`;
    node.style.zIndex = String(slot < 10 ? 1 : 2);
    if (entering && !reduced && chamber.dataset.ready === 'true') {
      node.animate([
        { transform: `translateX(${junior ? '-90px' : '90px'}) translateY(10px) rotate(${junior ? '-8deg' : '8deg'}) scale(.72)`, opacity: 0, offset: 0 },
        { transform: `translateX(${junior ? '-34px' : '34px'}) translateY(-8px) rotate(${junior ? '4deg' : '-4deg'}) scale(.96)`, opacity: .94, offset: .48 },
        { transform: 'translateX(0) translateY(5px) rotate(2deg) scale(1.05)', opacity: 1, offset: .82 },
        { transform: 'translateX(0) translateY(0) scale(1)', opacity: 1 },
      ], { duration: 490, easing: 'cubic-bezier(.18,.8,.26,1)' });
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
    $(`${group}Mix`).style.setProperty('--junior-share', `${junior * 100}%`);
    $(`${group}WhatIf`).textContent = pct(result);
    $(`${group}NearRate`).textContent = pct(result);
    $(`${group}NearBar`).style.width = `${result * 100}%`;
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
  maybeRevealParadox();
  if (playSound) sound('mixAdjustment');
}

$('clearSelection').addEventListener('click', () => { state.selected = []; updateCards(); updateComparison(); sound(); });

for (const id of ['trainedMix', 'untrainedMix']) {
  $(id).addEventListener('input', event => {
    const input = event.currentTarget;
    input.value = String(Math.round(Number(input.value) / 50) * 50);
    updateMix();
  });
  $(id).addEventListener('change', () => { updateMix({ playSound: true }); reactFelfel('thinking'); nudgeHint('lab'); });
  $(id).addEventListener('keydown', event => {
    const input = event.currentTarget;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const current = Number(input.value);
    const nearest = Math.round(current / 50) * 50;
    const direction = ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1;
    input.value = String(Math.max(0, Math.min(1000, current % 50 ? nearest : current + direction * 50)));
    updateMix({ playSound: true }); reactFelfel('thinking'); nudgeHint('lab');
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
const hints = {
  evidence: 'الرقم الكبير عامل دوشة، بس جرّب تقارن موظفين من نفس المستوى. الحكاية لسه زي ما هي؟',
  lab: 'بصّ كل مجموعة فيها مين، وجرّب تغيّر التركيبة. رقم الترقيات هيفضل زي ما هو؟',
};
const activeHint = () => $('labTab').getAttribute('aria-selected') === 'true' ? 'lab' : 'evidence';
function updateHintControl() {
  $('hintBtn').disabled = false;
  $('hintBtn').setAttribute('aria-label', activeHint() === 'lab' ? 'افتح تلميح معمل التحليل' : 'افتح تلميح لوحة الأدلة');
}
let hintNudgeTimer;
function nudgeHint(context) {
  if (state.hintNudged.has(context) || activeHint() !== context || $('investigation').classList.contains('hidden')) return;
  state.hintNudged.add(context);
  const button = $('hintBtn');
  if (button.classList.contains('hidden')) return;
  button.classList.remove('hint-available');
  void button.offsetWidth;
  button.classList.add('hint-available');
  reactFelfel('peek');
  window.clearTimeout(hintNudgeTimer);
  hintNudgeTimer = window.setTimeout(() => button.classList.remove('hint-available'), 1000);
}
let hintScrollY = 0;
let hintSequence = 0;
const flight = () => {
  let actor = $('felfelFlight');
  if (actor) return actor;
  actor = document.createElement('img');
  actor.id = 'felfelFlight'; actor.alt = ''; actor.setAttribute('aria-hidden', 'true');
  document.body.append(actor);
  return actor;
};
function flyFelfel(from, to, pose, duration = 640) {
  const actor = flight();
  actor.src = `/investigation-file/assets/felfel/${pose}.png`;
  actor.style.left = `${from.left}px`; actor.style.top = `${from.top}px`;
  actor.style.width = `${from.width}px`; actor.style.height = `${from.height}px`;
  actor.classList.add('flying');
  const dx = to.left - from.left;
  const dy = to.top - from.top;
  actor.animate([
    { transform: 'translate(0, 0) scale(.86) rotate(-4deg)', opacity: .95 },
    { transform: `translate(${dx * .45}px, ${dy - 48}px) scale(1.45) rotate(4deg)`, opacity: 1, offset: .55 },
    { transform: `translate(${dx}px, ${dy}px) scale(${to.width / from.width}) rotate(0deg)`, opacity: 1 },
  ], { duration, easing: 'cubic-bezier(.2,.85,.22,1)', fill: 'forwards' });
  return actor;
}
function restoreDeskFelfel() {
  const actor = $('deskFelfel');
  actor.classList.remove('on-hint-flight');
  actor.src = '/investigation-file/assets/felfel/jump.png'; actor.dataset.state = 'entrance';
  window.setTimeout(() => { if (!felfelBusy) reactFelfel('idle'); }, 520);
}
function closeHint(immediate = false) {
  const panel = $('hintPanel');
  if (panel.classList.contains('hidden')) return;
  hintSequence++;
  felfelBusy = false;
  const reduced = immediate || prefersReducedMotion();
  const source = $('deskFelfel');
  const from = $('hintFelfel').getBoundingClientRect();
  const destination = source.getBoundingClientRect();
  $('hintVeil').classList.add('hidden');
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  const previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, hintScrollY);
  document.documentElement.style.scrollBehavior = previousScrollBehavior;
  if (reduced) {
    panel.classList.add('hidden');
    $('felfelFlight')?.classList.remove('flying');
    restoreDeskFelfel();
  } else {
    panel.querySelector('.hint-character').dataset.state = 'exit';
    flyFelfel(from, destination, 'run', 500);
    window.setTimeout(() => {
      panel.classList.add('hidden');
      $('felfelFlight')?.classList.remove('flying');
      restoreDeskFelfel();
      startRoaming();
    }, 470);
  }
  if (!$('hintBtn').classList.contains('hidden')) ($('hintBtn').disabled ? $('muteBtn') : $('hintBtn')).focus();
}
$('hintBtn').addEventListener('click', () => {
  if (!$('hintPanel').classList.contains('hidden')) return;
  const sequence = ++hintSequence;
  const context = activeHint();
  const source = $('deskFelfel');
  const from = source.getBoundingClientRect();
  const landing = { left: window.innerWidth * .54, top: Math.max(90, window.innerHeight * .17), width: Math.min(window.innerWidth * .31, 240), height: Math.min(window.innerHeight * .48, 340) };
  felfelBusy = true; stopRoaming(); source.classList.add('on-hint-flight');
  $('hintBtn').classList.remove('hint-available');
  $('hintFelfel').src = '/investigation-file/assets/felfel/peek.png';
  $('hintText').textContent = '';
  $('hintPanel').querySelector('.hint-bubble').classList.remove('speech-revealed');
  $('hintPanel').querySelector('.hint-character').dataset.state = 'entrance';
  $('hintPanel').classList.add('hint-arriving');
  $('hintVeil').classList.remove('hidden');
  $('hintPanel').classList.remove('hidden');
  hintScrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${hintScrollY}px`;
  document.body.style.width = '100%';
  sound('sceneChange');
  const reduced = prefersReducedMotion();
  if (!reduced) {
    flyFelfel(from, landing, 'run', 640);
    window.setTimeout(() => { const actor = $('felfelFlight'); if (actor) actor.src = '/investigation-file/assets/felfel/jump.png'; }, 330);
  }
  window.setTimeout(() => {
    if (sequence !== hintSequence || $('hintPanel').classList.contains('hidden')) return;
    $('hintPanel').classList.remove('hint-arriving');
    $('felfelFlight')?.classList.remove('flying');
    $('hintFelfel').src = '/investigation-file/assets/felfel/jump.png';
    $('hintPanel').querySelector('.hint-character').dataset.state = 'inspect';
  }, reduced ? 0 : 650);
  window.setTimeout(() => {
    if (sequence !== hintSequence || $('hintPanel').classList.contains('hidden')) return;
    $('hintPanel').querySelector('.hint-character').dataset.state = 'talking';
    $('hintPanel').querySelector('.hint-bubble').classList.add('speech-revealed');
    $('hintText').textContent = hints[context];
    $('dismissHint').focus();
  }, reduced ? 0 : 900);
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
  ['المدير المالي', 'أنا هلغي برنامج التدريب. التقرير بيقول إن اللي ماحضروش اترقّوا أكتر، ومش هنكمّل نصرف عليه كده.'],
  ['مديرة الموارد البشرية', 'طب استنى قبل ما تمضي. ملفات الموظفين على المكتب؛ نديها بصّة الأول.'],
  ['المدير المالي', 'ماشي، عندك لحد ما الشاي يبرد. بعدها القلم هيشتغل!'],
];
$('nextIntro').addEventListener('click', () => {
  if (state.introStep === -1) beginRun(playerId);
  state.introStep++;
  if (state.introStep >= dialogue.length) { sound('officeEntry'); scene('investigation'); return; }
  sound('sceneChange');
  renderIntroStep();
});
function renderIntroStep() {
  const [who, words] = dialogue[state.introStep];
  $('introSpeech').classList.remove('speech-idle');
  $('introSpeech').setAttribute('aria-hidden', 'false');
  $('introSpeech').querySelector('.speaker').textContent = who;
  $('introSpeech').querySelector('p').textContent = words;
  $('introSpeech').dataset.speaker = state.introStep === 1 ? 'hr' : 'cfo';
  $('introSpeech').classList.remove('speech-enter'); void $('introSpeech').offsetWidth; $('introSpeech').classList.add('speech-enter');
  document.querySelector('.characters').classList.toggle('hr-speaking', state.introStep === 1);
  document.querySelector('.characters').classList.toggle('cfo-speaking', state.introStep !== 1);
  actorAsset('introCfo', state.introStep === 0 || state.introStep === 2 ? 'cfo-presenting' : 'cfo');
  actorAsset('introHr', state.introStep === 1 ? 'hr-presenting' : 'hr-concerned');
  $('nextIntro').textContent = state.introStep === dialogue.length - 1 ? 'افتح التحقيق ←' : 'التالي ←';
}

function resetMeeting() {
  state.decision = null; state.reason = null;
  document.querySelectorAll('[data-decision],[data-reason]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  showMeetingStep('decision');
}
function showMeetingStep(step) {
  const reason = step === 'reason';
  $('decisionStep').hidden = reason;
  $('decisionStep').classList.toggle('hidden', reason);
  $('reasonStep').hidden = !reason;
  $('reasonStep').classList.toggle('hidden', !reason);
  $('submitVerdict').hidden = !reason;
  $('submitVerdict').classList.toggle('hidden', !reason);
  $('submitVerdict').disabled = !reason || !state.reason;
}
$('faceCfo').addEventListener('click', () => {
  if (!state.labVisited) return;
  resetMeeting(); $('verdictMessage').textContent = '';
  actorAsset('meetingCfo', 'cfo-presenting'); actorAsset('meetingHr', 'hr-presenting');
  reactFelfel('thinking', 'meetingFelfel');
  sound('sceneChange'); scene('confrontation');
});
$('backToDesk').addEventListener('click', () => { sound('sceneChange'); scene('investigation'); });
document.querySelectorAll('[data-decision]').forEach(button => button.addEventListener('click', () => {
  state.decision = button.dataset.decision;
  document.querySelectorAll('[data-decision]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  showMeetingStep('reason');
  actorAsset('meetingCfo', 'cfo-surprised'); actorAsset('meetingHr', 'hr-presenting');
  $('reasonStep').querySelector('[data-reason]').focus({ preventScroll: true });
  reactFelfel('surprise', 'meetingFelfel');
  sound('sceneChange');
}));
document.querySelectorAll('[data-reason]').forEach(button => button.addEventListener('click', () => {
  state.reason = button.dataset.reason;
  reactFelfel('thinking', 'meetingFelfel');
  actorAsset('meetingHr', button.dataset.reason === 'composition' ? 'hr-presenting' : 'hr-concerned');
  document.querySelectorAll('[data-reason]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
  $('submitVerdict').disabled = false;
  sound('button');
}));
$('editDecision').addEventListener('click', () => {
  showMeetingStep('decision');
  $('decisionStep').querySelector('[data-decision][aria-pressed="true"]')?.focus({ preventScroll: true });
});

function showEnding(result, reason = 'unsupported-decision') {
  finishRun(playerId, result, undefined, reason);
  $('ending').classList.toggle('success', result === 'success');
  $('ending').classList.toggle('failure', result !== 'success');
  $('endingReaction').src = result === 'success' ? '/investigation-file/assets/investigation/cfo-surprised.png' : '/investigation-file/assets/investigation/cfo.png';
  $('endingReaction').alt = result === 'success' ? 'المدير المالي متفاجئ' : 'المدير المالي يفكر في القرار';
  $('endingHr').src = result === 'success' ? '/investigation-file/assets/investigation/hr-presenting.png' : '/investigation-file/assets/investigation/hr-concerned.png';
  $('endingHr').alt = result === 'success' ? 'مديرة الموارد البشرية ارتاحت' : 'مديرة الموارد البشرية قلقة';
  $('endingFelfel').src = result === 'success' ? '/investigation-file/assets/felfel/celebrate.png' : '/investigation-file/assets/felfel/concerned.png';
  $('endingIcon').src = result === 'success' ? '/investigation-file/assets/simpson/success-checkmark.png' : '/investigation-file/assets/simpson/failure-x.png';
  $('endingIcon').alt = '';
  $('endingStampText').textContent = result === 'success' ? 'اعتراض في محلّه' : 'الحكم محتاج مراجعة';
  $('endingTitle').textContent = result === 'success' ? 'القرار اتوقف في وقته!' : 'الملف محتاج مراجعة';
  $('endingText').textContent = result === 'success'
    ? 'أنقذت القرار من توقيع مستعجل! الأرقام الكبيرة خبّت اختلاف تركيبة المجموعتين. لسه محتاجين تحقيق أكتر قبل ما نحكم على التدريب.'
    : reason === 'causation' ? 'اللي حضروا أعلى جوّه كل مستوى، بس ده لوحده ما يثبتش إن التدريب هو السبب. افتح الملف الأخير وشوف الصورة كلها.'
      : reason === 'aggregate' ? 'القلم سبق التحقيق بشوية! الرقم الإجمالي لوحده ما يكفيش؛ بصّ على تركيبة المجموعتين جوّه الملف الأخير.'
        : 'الحكم النهائي جه بدري. المجموعتين مش بنفس التركيبة، والسجلات وحدها ما تثبتش تأثير التدريب. افتح الملف الأخير.';
  $('revealStage').classList.add('hidden');
  document.querySelector('.end-card').classList.remove('hidden');
  scene('ending'); sound(result);
  window.setTimeout(() => sound(result === 'success' ? 'successAccent' : 'failureAccent'), 260);
}
const revealBars = (firstLabel, firstRate, secondLabel, secondRate) => `<div class="reveal-bars"><div class="reveal-bar"><div><b>${firstLabel}</b><strong dir="ltr">${pct(firstRate)}</strong></div><span><i style="width:${firstRate * 100}%"></i></span></div><div class="reveal-bar"><div><b>${secondLabel}</b><strong dir="ltr">${pct(secondRate)}</strong></div><span><i style="width:${secondRate * 100}%"></i></span></div></div>`;
const compositionBar = (label, junior) => `<div class="reveal-composition"><b>${label}</b><div><span style="width:${junior * 100}%"></span><span style="width:${(1 - junior) * 100}%"></span></div><small>Junior ${pct(junior)} · Senior ${pct(1 - junior)}</small></div>`;
let revealStep = 0;
function renderReveal() {
  const juniorTrained = records.find(r => r.id === 'jt');
  const juniorOther = records.find(r => r.id === 'ju');
  const seniorTrained = records.find(r => r.id === 'st');
  const seniorOther = records.find(r => r.id === 'su');
  const common = counterfactualRates(.5, .5);
  const beats = [
    ['التقرير الكبير', 'التقرير قال: اللي ماحضروش أحسن. طب نفتح الملفات الصغيرة؟', revealBars('حضروا · ١٤٠/٤٠٠', originalRates.trained, 'ماحضروش · ٤٦٠/٧٠٠', originalRates.untrained)],
    ['ملف Junior', 'بين الـJunior: اللي حضروا اترقّى منهم ٨٠٪، واللي ماحضروش ٧٥٪.', revealBars('حضروا · ٨٠/١٠٠', rate(juniorTrained), 'ماحضروش · ٤٥٠/٦٠٠', rate(juniorOther))],
    ['ملف Senior', 'وبين الـSenior: اللي حضروا ٢٠٪، واللي ماحضروش ١٠٪. لحظة... ده عكس التقرير!', revealBars('حضروا · ٦٠/٣٠٠', rate(seniorTrained), 'ماحضروش · ١٠/١٠٠', rate(seniorOther))],
    ['مين في كل مجموعة؟', 'السر هنا: المجموعتين مش بنفس التركيبة. واحدة فيها Junior أكتر بكتير.', compositionBar('حضروا', share(true, 'junior')) + compositionBar('ماحضروش', share(false, 'junior'))],
    ['تجربة على الورق', 'لما نجرّب نفس التركيبة للمجموعتين، الصورة بتتغير. دي تجربة حسابية، مش تعديل للسجلات.', revealBars('حضروا · افتراضي', common.trained, 'ماحضروش · افتراضي', common.untrained)],
    ['اسم الحيلة', 'دي مفارقة سيمبسون: الإجمالي خبّى اللي حصل جوّه كل مستوى. وبرضه السجلات وحدها ما تثبتش إن التدريب هو سبب الترقيات.', '<div class="reveal-last">الإجمالي اتقلب بسبب اختلاف التركيبة. سبب الترقيات الحقيقي لسه محتاج تحقيق.</div>'],
  ];
  const [title, speech, visual] = beats[revealStep];
  $('revealTitle').textContent = title;
  $('revealSpeech').textContent = speech;
  $('revealVisual').innerHTML = visual;
  $('revealFelfel').src = revealStep === 3 || revealStep === 5 ? '/investigation-file/assets/felfel/celebrate.png' : '/investigation-file/assets/felfel/ponder.png';
  $('revealFelfel').dataset.state = revealStep === 3 || revealStep === 5 ? 'discovery' : 'talking';
  $('revealProgress').textContent = `${revealStep + 1} / ${beats.length}`;
  $('nextReveal').textContent = revealStep === beats.length - 1 ? 'العب من جديد' : 'اللي بعده ←';
  $('revealStage').classList.remove('reveal-pop'); void $('revealStage').offsetWidth; $('revealStage').classList.add('reveal-pop');
}
$('openReveal').addEventListener('click', () => {
  revealStep = 0;
  document.querySelector('.end-card').classList.add('hidden');
  $('revealStage').classList.remove('hidden');
  $('revealStage').classList.add('reveal-opening');
  renderReveal(); sound('sceneChange'); $('nextReveal').focus();
  window.setTimeout(() => $('revealStage').classList.remove('reveal-opening'), 700);
});
$('nextReveal').addEventListener('click', advanceReveal);
function advanceReveal() {
  if (revealStep < 5) { revealStep++; renderReveal(); sound('sceneChange'); }
  else restartGame();
}
$('submitVerdict').addEventListener('click', () => {
  if (!$('confrontation').classList.contains('hidden') && !state.labVisited) return;
  const result = resolveVerdict(state.decision, state.reason);
  if (result.status === 'needs-choice') { $('verdictMessage').textContent = 'اختار القرار والتبرير قبل التأكيد.'; return; }
  showEnding(result.status, result.reason);
});
function restartGame() { beginRun(playerId); sound('sceneChange'); window.setTimeout(() => location.reload(), 220); }
$('replay').addEventListener('click', restartGame);
$('muteBtn').addEventListener('click', () => {
  const muted = audio.toggleMuted();
  $('muteBtn').setAttribute('aria-pressed', String(muted));
  $('muteBtn').setAttribute('aria-label', muted ? 'تشغيل المؤثرات الصوتية' : 'كتم المؤثرات الصوتية');
  $('muteBtn').textContent = muted ? '♪̸' : '♫';
});

updateCards(); updateComparison(); renderHistoricalReadout(); updateMix();
activateOfficeTab('evidenceTab');
const savedRun = readRun(playerId);
if (new URLSearchParams(location.search).get('showResult') === '1' && savedRun.status === 'completed') showEnding(savedRun.outcome, savedRun.failureReason);
function checkpoint() {
  if (state.introStep < 0 || currentSceneId === 'ending') return;
  saveCheckpoint(playerId, { scene: currentSceneId, introStep: state.introStep, selected: [...state.selected], labVisited: state.labVisited, hint: state.hint,
    decision: state.decision, reason: state.reason, trainedMix: Number($('trainedMix').value), untrainedMix: Number($('untrainedMix').value), tab: $('labTab').getAttribute('aria-selected') === 'true' ? 'lab' : 'evidence' });
}
if (savedRun.status === 'in-progress' && savedRun.checkpoint) {
  const saved = savedRun.checkpoint;
  state.introStep = saved.introStep;
  state.selected = [...saved.selected];
  state.labVisited = saved.labVisited;
  state.hint = saved.hint;
  state.decision = saved.decision ?? null;
  state.reason = saved.reason ?? null;
  $('trainedMix').value = String(saved.trainedMix);
  $('untrainedMix').value = String(saved.untrainedMix);
  updateCards(); updateComparison(); updateMix(); updateHintControl();
  if (state.introStep >= 0 && state.introStep < dialogue.length) renderIntroStep();
  if (saved.tab === 'lab' || saved.labVisited) activateOfficeTab(saved.tab === 'lab' ? 'labTab' : 'evidenceTab');
  if (saved.scene !== 'intro') scene(saved.scene);
  if (saved.scene === 'confrontation') {
    document.querySelectorAll('[data-decision]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.decision === state.decision)));
    document.querySelectorAll('[data-reason]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reason === state.reason)));
  }
}
function platformState() { const run = readRun(playerId); return { canPause: currentSceneId !== 'intro' && currentSceneId !== 'ending', paused: platformPaused, canSettings: !platformPaused, canRestart: true, progress: run.status === 'completed' ? 'complete' : run.status === 'in-progress' ? run.checkpoint ? 'resumable' : 'unavailable' : 'new' }; }
function notifyPlatform(type = 'state', id) { if (platformEmbedded) window.parent.postMessage({ channel: 'the-analyst-game', version: 1, type, id, state: platformState() }, location.origin); }
const settingsDialog = document.createElement('dialog');
settingsDialog.className = 'platform-settings';
settingsDialog.setAttribute('aria-label', 'إعدادات اللعبة');
settingsDialog.innerHTML = '<h2>إعدادات اللعبة</h2><button type="button" data-platform-sound>الصوت</button><button type="button" data-platform-restart>ابدأ من جديد</button><button type="button" data-platform-close>إغلاق</button>';
document.body.append(settingsDialog);
const soundSetting = settingsDialog.querySelector('[data-platform-sound]');
const syncSoundSetting = () => { soundSetting.textContent = audio.isMuted() ? 'تشغيل الصوت' : 'كتم الصوت'; };
soundSetting.addEventListener('click', () => { $('muteBtn').click(); syncSoundSetting(); });
settingsDialog.querySelector('[data-platform-restart]').addEventListener('click', () => { if (window.confirm('تبدأ التحقيق من الأول؟')) { beginRun(playerId); location.reload(); } });
settingsDialog.querySelector('[data-platform-close]').addEventListener('click', () => settingsDialog.close());
document.addEventListener('click', () => queueMicrotask(() => { checkpoint(); notifyPlatform(); }));
document.addEventListener('input', checkpoint);
window.addEventListener('pagehide', checkpoint);
window.addEventListener('message', event => {
  if (!platformEmbedded || event.source !== window.parent || event.origin !== location.origin) return;
  const data = event.data;
  if (data?.channel !== 'the-analyst-game' || data.version !== 1 || data.type !== 'command' || !Number.isInteger(data.id)) return;
  switch (data.action) {
    case 'state': break;
    case 'pause': platformPaused = true; audio.stop(); document.body.classList.add('platform-paused'); break;
    case 'resume': platformPaused = false; document.body.classList.remove('platform-paused'); break;
    case 'settings': syncSoundSetting(); settingsDialog.showModal(); break;
    case 'restart': if (window.confirm('تبدأ التحقيق من الأول؟')) { beginRun(playerId); location.reload(); } break;
    case 'prepareExit': checkpoint(); audio.stop(); break;
    default: return;
  }
  notifyPlatform('ack', data.id);
});
notifyPlatform();
