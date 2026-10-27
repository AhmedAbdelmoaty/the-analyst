import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGamePlatformExit } from '@/lib/useGamePlatformExit';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { FileText, ClipboardList, NotebookPen, BarChart3 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DOCUMENTS, type DocumentId, type QuestionId, type ToolId } from './data/case';
import { scriptFor, type Line, type ScriptKey } from './data/script';
import { endingCalls } from './data/endingCalls';
import { addActiveMs, readActiveMs, trackRound } from '@/lib/analytics/rounds';
import { canSubmit, newRun, salesReady, type RewardRun } from './engine/model';
import { evaluateDeduction, SERVER_V3_EVALUATION_ENABLED } from './engine/deduction';
import { narrativeSpec, useNarrativeClock } from './engine/narrativeClock';
import { resolveScene } from './engine/resolveScene';
import { clearRun, inspectRun, saveRun } from './engine/persistence';
import { claimOwnership, mayWrite, releaseOwnership, takeOwnership } from './engine/ownership';
import { ScenePlayer } from './components/ScenePlayer';
import { DialoguePanel } from './components/DialoguePanel';
import { ActionButton, GameHud, OtherTabLayer, Panel, PauseLayer, ReplayButton } from './components/Ui';
import { CaseFile } from './components/CaseFile';
import { CaseTimer, ChartBoard, RoomFrame, RoomTabs } from './components/AnalysisRoom';
import { DeductionNotebook } from './components/DeductionNotebook';
import { FinalReport } from './components/FinalReport';
import { GameResults } from './components/GameResults';
import { DocumentReader } from './components/DocumentReader';
import { OfficeCorridor } from './components/OfficeCorridor';
import { IncomingCall } from './components/IncomingCall';
import impLogo from '@/assets/brand/imp-logo.webp';
import analystMark from '@/assets/brand/the-analyst-mark.png';
import './reward-decision.css';
import './reward-decision.polish.css';
import './reward-decision.stage.css';
import './reward-decision.world.css';
import './reward-decision.v2.css';
import { useSound } from '@/hooks/useSoundEffects';

const at = (r: RewardRun, phase: RewardRun['phase'], stage = ''): RewardRun => ({ ...r, phase, stage, dialogueIndex: 0, visibleGraphemes: 0 });
const TALK: Partial<Record<RewardRun['phase'], ScriptKey>> = { celebration: 'celebration', debate: 'debate', briefing: 'briefing', sales: 'sales', hr: 'hr' };
function dialogueFor(r: RewardRun, script: Record<ScriptKey, Line[]>): Line[] | null {
  const key = TALK[r.phase];
  return key && r.stage === 'talk' ? script[key] : null;
}
function afterDialogue(r: RewardRun): RewardRun {
  if (r.phase === 'celebration') return at(r, 'celebration', 'draft');
  if (r.phase === 'debate') return at(r, 'debate', 'door');
  if (r.phase === 'briefing') return at(r, 'briefing', 'done');
  if (r.phase === 'sales' || r.phase === 'hr') return at(r, 'hub');
  return r;
}
const ROOM_PHASES: RewardRun['phase'][] = ['workbench', 'notebook', 'report'];

export default function RewardDecisionGame() {
  const { user, profile } = useAuth();
  const { playSound } = useSound();
  const uid = user?.id ?? '';
  const initial = useRef(inspectRun(uid));
  const [run, setRun] = useState<RewardRun>(() => initial.current.status === 'ok' ? initial.current.run : newRun(uid));
  const [corrupt, setCorrupt] = useState(initial.current.status === 'corrupt');
  const [fileOpen, setFileOpen] = useState(false);
  const [focusDoc, setFocusDoc] = useState<DocumentId | null>(null);
  const [flyingDoc, setFlyingDoc] = useState<{ id: DocumentId; start: DOMRect; end: DOMRect } | null>(null);
  const pendingDoc = useRef<DocumentId | null>(null);
  const fileReturnFocus = useRef<HTMLElement | null>(null);
  const [filePulse, setFilePulse] = useState(false);
  const [documentNotice, setDocumentNotice] = useState(false);
  const [otherTab, setOtherTab] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const runRef = useRef(run); runRef.current = run;
  const saveTimer = useRef<number>();

  // ---- Admin statistics: observers only ----
  const statsRunning = run.phase !== 'cover' && run.phase !== 'debrief' && !run.paused && !otherTab;
  useEffect(() => {
    if (!statsRunning || !uid) return;
    const id = run.runId; let last = performance.now();
    const tick = () => { const now = performance.now(); if (document.visibilityState === 'visible') addActiveMs(uid, id, now - last); last = now; };
    const t = window.setInterval(tick, 5000);
    const onVis = () => { if (document.visibilityState === 'hidden') tick(); else last = performance.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { tick(); window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [statsRunning, uid, run.runId]);
  useEffect(() => {
    if (run.phase === 'cover' || !uid) return;
    trackRound(uid, { game: 'reward-decision', round_id: run.runId, type: 'stage', stage: run.phase, active_ms: readActiveMs(uid, run.runId) });
  }, [uid, run.runId, run.phase]);
  useEffect(() => {
    // Sent only once the server evaluator for rowad-v3 is approved and applied, so client and server never disagree.
    const s = run.submitted; if (!s || !uid || !SERVER_V3_EVALUATION_ENABLED) return;
    trackRound(uid, { game: 'reward-decision', round_id: run.runId, type: 'submit', stage: 'report', active_ms: readActiveMs(uid, run.runId),
      payload: { caseVersion: 'rowad-v3', answers: s.answers, usedTools: run.usedTools, docs: run.collectedDocs } });
  }, [uid, run.runId, run.submitted?.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (run.phase !== 'debrief' || !uid || !run.evaluation) return;
    trackRound(uid, { game: 'reward-decision', round_id: run.runId, type: 'complete', stage: 'debrief', active_ms: readActiveMs(uid, run.runId), payload: { outcome: run.evaluation.outcome, score: run.evaluation.score } });
  }, [uid, run.runId, run.phase]); // eslint-disable-line react-hooks/exhaustive-deps
  const lastAct = useRef(0);

  const persist = useCallback((r: RewardRun) => { if (r.phase === 'cover' || !mayWrite()) return; const result = saveRun(r); if (result === 'unavailable') setStorageOk(false); if (result === 'stale') { setOtherTab(true); setRun(x => ({ ...x, paused: true })); } }, []);
  const commit = useCallback((fn: (r: RewardRun) => RewardRun, quiet = false) => { const prev = runRef.current; const next = { ...fn(prev), revision: prev.revision + 1 }; runRef.current = next; setRun(next); window.clearTimeout(saveTimer.current); if (quiet) saveTimer.current = window.setTimeout(() => persist(runRef.current), 400); else persist(next); }, [persist]);
  const act = useCallback((fn: (r: RewardRun) => RewardRun) => { const now = Date.now(); if (now - lastAct.current < 260 || runRef.current.paused) return; lastAct.current = now; commit(fn); }, [commit]);

  const gameSound = useCallback((type: Parameters<typeof playSound>[0]) => { if (!runRef.current.paused && !otherTab && document.visibilityState === 'visible') playSound(type); }, [playSound, otherTab]);

  useEffect(() => { if (!uid || runRef.current.userId === uid) return; const result = inspectRun(uid); setCorrupt(result.status === 'corrupt'); const next = result.status === 'ok' ? result.run : newRun(uid); runRef.current = next; setRun(next); }, [uid]);
  const onLost = useCallback(() => { setOtherTab(true); setRun(r => ({ ...r, paused: true })); }, []);
  useEffect(() => { if (!uid || run.phase === 'cover') return; setOtherTab(!claimOwnership(uid, run.runId, onLost)); return () => releaseOwnership(); }, [uid, run.runId, run.phase, onLost]);
  useEffect(() => { const pause = (event: Event) => { if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') return; const cur = runRef.current; if (cur.phase === 'cover') return; window.clearTimeout(saveTimer.current); const next = { ...cur, paused: true, revision: cur.revision + 1 }; runRef.current = next; setRun(next); persist(next); }; document.addEventListener('visibilitychange', pause); window.addEventListener('pagehide', pause); return () => { document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', pause); }; }, [persist]);

  const gender = profile?.gender === 'female' ? 'female' : 'male';
  const script = useMemo(() => scriptFor(gender), [gender]);
  const calls = useMemo(() => run.evaluation ? endingCalls(run.evaluation.success, gender) : null, [run.evaluation, gender]);
  const linesOf = useCallback((r: RewardRun) => r.phase === 'resolution' && r.stage === 'talking' ? calls?.[r.endingCall]?.lines ?? null : dialogueFor(r, script), [calls, script]);
  const lines = useMemo(() => linesOf(run), [run, linesOf]);
  const line = lines && run.dialogueIndex < lines.length ? lines[run.dialogueIndex] : null;
  useEffect(() => { const id = line?.documentId; if (!id || runRef.current.collectedDocs.includes(id)) return; pendingDoc.current = id; commit(r => ({ ...r, collectedDocs: r.collectedDocs.includes(id) ? r.collectedDocs : [...r.collectedDocs, id] })); }, [line?.id, line?.documentId, commit]);

  const start = () => { const next = { ...newRun(uid), phase: 'celebration' as const, stage: 'intro', revision: 1 }; trackRound(uid, { game: 'reward-decision', round_id: next.runId, type: 'start', stage: 'celebration', active_ms: 0, payload: { version: next.caseVersion } }); setCorrupt(false); setOtherTab(false); runRef.current = next; setRun(next); claimOwnership(uid, next.runId, onLost); persist(next); };
  const advanceNarrative = useCallback((expectedKey: string) => {
    const current = runRef.current;
    const currentLines = linesOf(current);
    const currentLine = currentLines && current.dialogueIndex < currentLines.length ? currentLines[current.dialogueIndex] : null;
    const spec = narrativeSpec(current, currentLine);
    if (!spec || spec.key !== expectedKey || current.paused || otherTab || fileOpen || focusDoc || flyingDoc) return false;
    commit(r => {
      if (r.runId !== current.runId || r.phase !== current.phase || r.stage !== current.stage || r.dialogueIndex !== current.dialogueIndex) return r;
      if (!currentLine) {
        if (r.phase === 'resolution' && r.stage === 'office') return at(r, 'resolution', 'incoming');
        if (r.phase === 'resolution' && r.stage === 'gap') return { ...at(r, 'resolution', 'incoming'), endingCall: 1, callAnswered: false };
        if (r.phase === 'celebration' && r.stage === 'intro') return at(r, 'celebration', 'talk');
        if (r.phase === 'celebration' && r.stage === 'draft') return at(r, 'debate', 'talk');
        if (r.phase === 'debate' && r.stage === 'door') return at(r, 'briefing', 'talk');
        if (r.phase === 'briefing' && r.stage === 'done') return at(r, 'hub');
        return r;
      }
      if (r.dialogueIndex + 1 < (currentLines?.length ?? 0)) return { ...r, dialogueIndex: r.dialogueIndex + 1, visibleGraphemes: 0 };
      if (r.phase === 'resolution') return r.endingCall === 0
        ? { ...at(r, 'resolution', 'gap'), endingCall: 1, callAnswered: false }
        : at(r, 'debrief', 'results');
      return afterDialogue(r);
    });
    return true;
  }, [linesOf, commit, fileOpen, focusDoc, flyingDoc, otherTab]);
  const onVisible = useCallback((n: number) => commit(r => ({ ...r, visibleGraphemes: n }), true), [commit]);
  const visit = (place: 'sales' | 'hr') => act(r => at({ ...r, visited: r.visited.includes(place) ? r.visited : [...r.visited, place] }, place, 'talk'));
  const toHub = () => act(r => at(r, 'hub'));
  const openDocument = (id: DocumentId) => { fileReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFocusDoc(id); setFileOpen(false); gameSound('pageFlip'); };
  const openFile = () => { fileReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFocusDoc(null); setFileOpen(true); gameSound('pageFlip'); };
  const closeFile = () => { setFileOpen(false); setFocusDoc(null); window.requestAnimationFrame(() => fileReturnFocus.current?.focus()); };
  const closeDocument = (source: HTMLElement | null) => {
    const id = focusDoc;
    if (!id) return;
    // Collection already persisted on the scripted handoff; the flight is only presentation.
    const fresh = pendingDoc.current === id;
    const startRect = source?.getBoundingClientRect();
    const end = document.querySelector<HTMLElement>('[data-rd-file-target]')?.getBoundingClientRect();
    setFocusDoc(null);
    pendingDoc.current = null;
    if (fresh) {
      gameSound('stamp');
      if (startRect?.width && end && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setFlyingDoc({ id, start: startRect, end });
      else { setDocumentNotice(true); setFilePulse(true); }
    }
    window.requestAnimationFrame(() => fileReturnFocus.current?.focus());
  };
  useEffect(() => { if (!documentNotice && !filePulse) return; const timer = window.setTimeout(() => { setDocumentNotice(false); setFilePulse(false); }, 1800); return () => clearTimeout(timer); }, [documentNotice, filePulse]);
  const toggleTool = (id: ToolId) => commit(r => {
    if (r.paused || !salesReady(r.collectedDocs)) return r;
    const usedTools = r.usedTools.includes(id) ? r.usedTools : [...r.usedTools, id];
    const turningOn = !r.visibleTools.includes(id);
    const visibleTools = turningOn ? [...r.visibleTools, id] : r.visibleTools.filter(x => x !== id);
    return { ...r, usedTools, visibleTools, activeTool: turningOn ? id : visibleTools[visibleTools.length - 1] ?? null };
  });
  const answer = (q: QuestionId, id: string) => commit(r => r.submitted || r.paused ? r : { ...r, answers: { ...r.answers, [q]: id } });
  const submit = () => act(r => {
    if (!canSubmit(r)) return r;
    const answers = { center: r.answers.center as string, spread: r.answers.spread as string };
    // Frozen here: the evaluation is computed once from stable ids and never recomputed.
    return { ...r, phase: 'report', stage: 'sending', submitted: { answers, submittedAt: new Date().toISOString() }, evaluation: evaluateDeduction(answers) };
  });
  const sent = useCallback(() => commit(r => r.phase === 'report' && r.stage === 'sending' ? { ...at(r, 'resolution', 'office'), endingCall: 0, callAnswered: false } : r), [commit]);
  const takeControl = () => { takeOwnership(); const result = inspectRun(uid); const latest = result.status === 'ok' && result.run.runId === runRef.current.runId && result.run.revision >= runRef.current.revision ? result.run : runRef.current; const next = { ...latest, paused: false, revision: latest.revision + 1 }; runRef.current = next; setRun(next); setOtherTab(false); persist(next); };
  const exit = useGamePlatformExit(() => {
    commit(r => ({ ...r, paused: r.phase !== 'cover' && r.phase !== 'debrief' }));
    releaseOwnership();
  });
  const replay = () => { clearRun(uid); start(); };
  const frozen = run.paused || otherTab;
  useEffect(() => { if (frozen) setFlyingDoc(null); }, [frozen]);
  const sceneKey = resolveScene(run, gender, line);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const spec = useMemo(() => narrativeSpec(run, line), [run.runId, run.phase, run.stage, run.endingCall, run.dialogueIndex, line?.id, line?.text]);
  const onClockVisible = useCallback((n: number, key: string) => {
    const current = runRef.current;
    const active = linesOf(current);
    if (narrativeSpec(current, active && current.dialogueIndex < active.length ? active[current.dialogueIndex] : null)?.key === key) onVisible(n);
  }, [linesOf, onVisible]);
  const onClockDone = useCallback((key: string) => advanceNarrative(key), [advanceNarrative]);
  useNarrativeClock(spec, run.visibleGraphemes, !frozen && !fileOpen && !focusDoc && !flyingDoc, onClockVisible, onClockDone);

  const readTimer = useCallback(() => readActiveMs(uid, run.runId), [uid, run.runId]);
  const inRoom = ROOM_PHASES.includes(run.phase);
  const ready = salesReady(run.collectedDocs);
  const timer = <CaseTimer read={readTimer} running={!frozen && run.phase !== 'cover' && run.phase !== 'debrief'} />;
  const roomTabs = run.phase !== 'report' && <RoomTabs active={run.phase === 'notebook' ? 'notebook' : 'charts'} notebookLocked={!ready} onCharts={() => { gameSound('click'); commit(r => at(r, 'workbench')); }} onNotebook={() => { gameSound('pageFlip'); commit(r => at(r, 'notebook')); }} />;
  return <MotionConfig reducedMotion={frozen ? 'always' : 'user'}><main className={`rd-root ${frozen ? 'rd-paused' : ''}`} dir="rtl" data-phase={run.phase} data-stage={run.stage} data-scene={sceneKey}>
    <ScenePlayer sceneKey={sceneKey}>
      {run.phase !== 'cover' && run.phase !== 'debrief' && <GameHud count={run.collectedDocs.length} pulse={filePulse} phase={run.phase} hideFile={inRoom} timer={timer} onFile={openFile} onPause={() => { gameSound('click'); commit(r => ({ ...r, paused: true })); }} onExit={() => { gameSound('click'); exit(); }} />}
      <div className="rd-content"><AnimatePresence mode="wait"><motion.div key={`${inRoom ? 'room' : run.phase}-${inRoom ? '' : run.stage}-${run.endingCall}-${inRoom ? '' : sceneKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }}>
        {corrupt && run.phase === 'cover' && <section className="rd-cover"><h1>تعذر استعادة هذه الجولة</h1><span>يمكنك بدء جولة جديدة دون التأثير على حسابك أو اللعبة الأخرى.</span><ActionButton onClick={start}>بداية جديدة</ActionButton></section>}
        {!corrupt && run.phase === 'cover' && <section className="rd-cover"><img src={analystMark} alt="The Analyst" /><p>شركة روّاد للأجهزة الكهربائية</p><h1>قرار التكريم</h1><span>اقرأ المستندات، حلّل النتائج، وابعت تقريرك.</span><ActionButton onClick={start}>ابدأ الآن</ActionButton><img className="rd-imp" src={impLogo} alt="IMP" /></section>}
        {run.phase === 'celebration' && run.stage === 'draft' && <div className="rd-document-card"><p>ترشيح تكريم فريق المبيعات</p><b>بانتظار الاعتماد</b></div>}
        {line && <DialoguePanel line={line} lines={lines ?? []} index={run.dialogueIndex} total={lines?.length ?? 0} visible={run.visibleGraphemes} paused={frozen || fileOpen || Boolean(focusDoc)} gender={profile?.gender ?? null} delivered={line.documentId ? run.collectedDocs.includes(line.documentId) : false} onVisible={onVisible} onOpenDocument={openDocument} />}
        {run.phase === 'hub' && <OfficeCorridor visited={run.visited} docs={run.collectedDocs} gender={gender} playSound={gameSound} onVisit={place => place === 'workbench' ? act(r => at(r, 'workbench')) : visit(place)} />}
        {run.phase === 'workbench' && <RoomFrame kicker="محطة فحص البيانات" title="غرفة التحليل" subtitle="شغّل أدواتك عشان تقرأ شكل التوزيع لكل فريق." icon={<BarChart3 aria-hidden="true" />} onBack={toHub} onFile={openFile} tabs={roomTabs}>
          <ChartBoard ready={ready} used={run.usedTools} visible={run.visibleTools} active={run.activeTool} onToggle={toggleTool} onBack={toHub} playSound={gameSound} />
        </RoomFrame>}
        {run.phase === 'notebook' && <RoomFrame kicker="محطة فحص البيانات" title="دفتر الاستنتاجات" subtitle="سجّل ملاحظاتك التحليلية قبل تثبيت المراجعة." icon={<NotebookPen aria-hidden="true" />} onBack={toHub} onFile={openFile} tabs={roomTabs}>
          {ready ? <DeductionNotebook answers={run.answers} order={run.choiceOrder} page={run.notebookPage} used={run.usedTools} locked={Boolean(run.submitted)} onAnswer={answer} onPage={p => commit(r => ({ ...r, notebookPage: p }))} onCharts={() => commit(r => at(r, 'workbench'))} onReview={() => act(r => at(r, 'report'))} playSound={gameSound} />
            : <ChartBoard ready={false} used={[]} visible={[]} active={null} onToggle={() => undefined} onBack={toHub} />}
        </RoomFrame>}
        {run.phase === 'report' && <RoomFrame kicker="محطة فحص البيانات" title="تقديم التقرير النهائي" subtitle="راجع الاستنتاجات وبعدين ابعت التقرير لشريف." icon={<ClipboardList aria-hidden="true" />} onBack={toHub} onFile={openFile} className="rd2-room-report">
          <FinalReport runId={run.runId} answers={run.answers} docs={run.collectedDocs} sending={run.stage === 'sending'} onReview={() => act(r => r.submitted ? r : { ...at(r, 'notebook'), notebookPage: 0 })} onSubmit={submit} onSent={sent} playSound={gameSound} />
        </RoomFrame>}
        {run.phase === 'resolution' && run.stage === 'office' && <section className="rd-office-return" aria-label="العودة إلى مكتب المحلل"><p>بعد إرسال التقرير</p><h2>مكتب المحلل</h2></section>}
        {run.phase === 'resolution' && run.stage === 'gap' && <section className="rd-call-gap" aria-label="انتهت المكالمة"><span>انتهت المكالمة</span></section>}
        {run.phase === 'resolution' && run.stage === 'incoming' && calls && <IncomingCall caller={calls[run.endingCall].caller} paused={frozen} onAnswer={() => act(r => r.phase === 'resolution' && r.stage === 'incoming' && !r.callAnswered ? { ...at(r, 'resolution', 'talking'), callAnswered: true } : r)} />}
        {run.phase === 'debrief' && run.evaluation && <GameResults score={run.evaluation.score} activeMs={readActiveMs(uid, run.runId)} onReplay={replay} onExit={exit} playSound={gameSound} />}
        {run.phase === 'debrief' && !run.evaluation && <Panel title="الجولة السابقة انتهت"><p className="rd2-legacy">الجولة دي اتلعبت بنسخة أقدم من القضية. ابدأ جولة جديدة عشان تجرب القصة الجديدة.</p><div className="rd-actions"><ReplayButton onClick={replay} /><ActionButton onClick={exit}>الألعاب</ActionButton></div></Panel>}
      </motion.div></AnimatePresence></div>
    </ScenePlayer>
    {flyingDoc && (() => { const w = 150, h = 96; const sx = flyingDoc.start.left + flyingDoc.start.width / 2 - w / 2, sy = flyingDoc.start.top + Math.min(flyingDoc.start.height, 300) / 2 - h / 2; const ex = flyingDoc.end.left + flyingDoc.end.width / 2 - w / 2, ey = flyingDoc.end.top + flyingDoc.end.height / 2 - h / 2; return <motion.div className="rd-document-flight" key={flyingDoc.id} style={{ width: w, height: h }} initial={{ x: sx, y: sy, scale: 1, opacity: 1 }} animate={{ x: [sx, (sx + ex) / 2 - 40, ex], y: [sy, Math.min(sy, ey) - 90, ey], scale: [1, .7, .18], opacity: [1, 1, .6], rotate: [0, -8, 0] }} transition={{ duration: .6, delay: .15, ease: 'easeInOut', times: [0, .45, 1] }} onAnimationStart={() => gameSound('whoosh')} onAnimationComplete={() => { setFlyingDoc(null); gameSound('collect'); setFilePulse(true); setDocumentNotice(true); }}><FileText aria-hidden="true" /><span>{DOCUMENTS[flyingDoc.id].title}</span><i className="rd-flight-seal">✓</i></motion.div>; })()}
    {documentNotice && <div className="rd-document-notice" role="status">تم حفظ المستند</div>}
    {fileOpen && <CaseFile docs={run.collectedDocs} tools={run.usedTools} submitted={run.submitted} onClose={closeFile} />}
    {focusDoc && <DocumentReader id={focusDoc} onClose={closeDocument} />}
    {otherTab && run.phase !== 'cover' && <OtherTabLayer onTake={takeControl} />}
    {!otherTab && run.paused && run.phase !== 'cover' && <PauseLayer onContinue={() => commit(r => ({ ...r, paused: false }))} onExit={exit} />}
    {!storageOk && <div className="rd-storage-warning">الاستكمال بعد إغلاق الصفحة غير متاح حاليًا.</div>}
  </main></MotionConfig>;
}
