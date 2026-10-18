import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DOCUMENTS, TEAMS, type DocumentId, type ToolId } from './data/case';
import { SCRIPT, type Line } from './data/script';
import { endingCalls } from './data/endingCalls';
import { addActiveMs, readActiveMs, trackRound } from '@/lib/analytics/rounds';
import { evaluateReport, newRun, shotFor, type FinalReport, type RewardRun } from './engine/model';
import { argumentNote } from './engine/evidence';
import { clearRun, inspectRun, saveRun } from './engine/persistence';
import { claimOwnership, mayWrite, releaseOwnership, takeOwnership } from './engine/ownership';
import { ScenePlayer } from './components/ScenePlayer';
import { DialoguePanel } from './components/DialoguePanel';
import { ActionButton, GameHud, OtherTabLayer, Panel, PauseLayer, ReplayButton } from './components/Ui';
import { CaseFile } from './components/CaseFile';
import { Workbench } from './components/Workbench';
import { Recommendation } from './components/Recommendation';
import { PresentationSequence } from './components/PresentationSequence';
import { DocumentReader } from './components/DocumentReader';
import { OfficeCorridor } from './components/OfficeCorridor';
import { meetingLines } from './components/Meeting';
import { IncomingCall } from './components/IncomingCall';
import impLogo from '@/assets/brand/imp-logo.webp';
import analystMark from '@/assets/brand/the-analyst-mark.png';
import './reward-decision.css';
import './reward-decision.polish.css';
import './reward-decision.stage.css';
import './reward-decision.world.css';
import { useSound } from '@/hooks/useSoundEffects';

const at = (r: RewardRun, phase: RewardRun['phase'], stage = ''): RewardRun => ({ ...r, phase, stage, dialogueIndex: 0, visibleGraphemes: 0 });
function dialogueFor(r: RewardRun): Line[] | null {
  if (r.phase === 'celebration' && r.stage === 'talk') return SCRIPT.celebration;
  if (r.phase === 'debate' && r.stage === 'talk') return SCRIPT.debate;
  if (r.phase === 'briefing' && r.stage === 'talk') return SCRIPT.briefing;
  if (r.phase === 'sales' && r.stage === 'talk') return SCRIPT.sales;
  if (r.phase === 'hr' && r.stage === 'talk') return SCRIPT.hr;
  if (r.phase === 'meeting' && r.submitted && r.evaluation) return meetingLines(r.submitted, r.evaluation);
  return null;
}
function afterDialogue(r: RewardRun): RewardRun {
  if (r.phase === 'celebration') return at(r, 'celebration', 'draft');
  if (r.phase === 'debate') return at(r, 'debate', 'door');
  if (r.phase === 'briefing') return at(r, 'briefing', 'done');
  if (r.phase === 'sales' || r.phase === 'hr') return at(r, 'hub');
  if (r.phase === 'meeting') return { ...at(r, 'resolution', 'office'), endingCall: 0, callAnswered: false };
  return r;
}

export default function RewardDecisionGame() {
  const { user, profile } = useAuth();
  const { playSound } = useSound();
  const navigate = useNavigate();
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
  const [presenting, setPresenting] = useState<FinalReport | null>(null);
  const finishPresentation = useCallback(() => setPresenting(null), []);
  const [otherTab, setOtherTab] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const runRef = useRef(run); runRef.current = run;
  const saveTimer = useRef<number>();

  // ---- Admin statistics: observers only; the run, dialogue and calls are untouched ----
  const statsRunning = run.phase !== 'cover' && !run.paused && !otherTab;
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
    const s = run.submitted; if (!s || !uid) return;
    trackRound(uid, { game: 'reward-decision', round_id: run.runId, type: 'submit', stage: 'meeting', active_ms: readActiveMs(uid, run.runId),
      payload: { teamId: s.teamId, documentId: s.documentId, arguments: s.arguments, usedTools: run.usedTools, docs: run.collectedDocs } });
  }, [uid, run.runId, run.submitted?.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (run.phase !== 'debrief' || !uid) return;
    trackRound(uid, { game: 'reward-decision', round_id: run.runId, type: 'complete', stage: 'debrief', active_ms: readActiveMs(uid, run.runId), payload: { outcome: run.evaluation?.outcome } });
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
  const calls = useMemo(() => run.submitted && run.evaluation ? endingCalls(run.submitted, run.evaluation, gender) : null, [run.submitted, run.evaluation, gender]);
  const lines = useMemo(() => run.phase === 'resolution' && run.stage === 'talking' ? calls?.[run.endingCall]?.lines ?? null : dialogueFor(run), [run, calls]);
  const line = lines && run.dialogueIndex < lines.length ? lines[run.dialogueIndex] : null;
  useEffect(() => { const id = line?.documentId; if (!id || runRef.current.collectedDocs.includes(id)) return; pendingDoc.current = id; commit(r => ({ ...r, collectedDocs: r.collectedDocs.includes(id) ? r.collectedDocs : [...r.collectedDocs, id] })); }, [line?.id, line?.documentId, commit]);
  const start = source.getBoundingClientRect(), end = target?.getBoundingClientRect();
    if (!end || !start.width || start.bottom < 0 || start.top > window.innerHeight || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDocumentNotice(true); window.setTimeout(() => setDocumentNotice(false), 1800); return; }
    setFlyingDoc({ id, start, end });
  }, [otherTab]);
  useEffect(() => { const id = run.submitted?.submittedAt; if (!id || id === lastSubmitted.current) return; lastSubmitted.current = id; setSubmittedStamp(true); const timer = window.setTimeout(() => setSubmittedStamp(false), 1100); return () => window.clearTimeout(timer); }, [run.submitted?.submittedAt]);

  const start = () => { const next = { ...newRun(uid), phase: 'celebration' as const, stage: 'intro', revision: 1 }; trackRound(uid, { game: 'reward-decision', round_id: next.runId, type: 'start', stage: 'celebration', active_ms: 0, payload: { version: next.caseVersion } }); setCorrupt(false); setOtherTab(false); runRef.current = next; setRun(next); claimOwnership(uid, next.runId, onLost); persist(next); };
  const advance = () => { if (fileOpen || focusDoc || presenting) return; commit(r => {
    const active = r.phase === 'resolution' && r.stage === 'talking' ? calls?.[r.endingCall]?.lines ?? null : dialogueFor(r);
    if (!active) return r;
    if (r.dialogueIndex + 1 < active.length) return { ...r, dialogueIndex: r.dialogueIndex + 1, visibleGraphemes: 0 };
    if (r.phase === 'resolution') return r.endingCall === 0
      ? { ...at(r, 'resolution', 'gap'), endingCall: 1, callAnswered: false }
      : at(r, 'debrief', 'notes');
    return afterDialogue(r);
  }); };
  const onVisible = useCallback((n: number) => commit(r => ({ ...r, visibleGraphemes: n }), true), [commit]);
  const visit = (place: 'sales' | 'hr') => act(r => at({ ...r, visited: r.visited.includes(place) ? r.visited : [...r.visited, place] }, place, 'talk'));
  const toHub = () => act(r => at(r, 'hub'));
  const openDocument = (id: DocumentId) => { fileReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFocusDoc(id); setFileOpen(false); gameSound('paperRustle'); };
  const openFile = () => { fileReturnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setFocusDoc(null); setFileOpen(true); gameSound('paperRustle'); };
  const closeFile = () => { setFileOpen(false); setFocusDoc(null); window.requestAnimationFrame(() => fileReturnFocus.current?.focus()); };
  const closeDocument = (source: HTMLElement | null) => {
    const id = focusDoc;
    if (!id) return;
    // Collection already persisted on the scripted handoff, never waits for this animation.
    const start = source?.getBoundingClientRect();
    const end = document.querySelector<HTMLElement>('[data-rd-file-target]')?.getBoundingClientRect();
    setFocusDoc(null);
    pendingDoc.current = null;
    gameSound('stamp');
    if (start?.width && end && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setFlyingDoc({id,start,end});
    else { setDocumentNotice(true); setFilePulse(true); }
    window.requestAnimationFrame(() => fileReturnFocus.current?.focus());
  };
  useEffect(() => { if (!documentNotice && !filePulse) return; const timer=window.setTimeout(()=>{setDocumentNotice(false);setFilePulse(false);},1800); return()=>clearTimeout(timer); },[documentNotice,filePulse]);
  const toggleTool = (id: ToolId) => act(r => { const usedTools = r.usedTools.includes(id) ? r.usedTools : [...r.usedTools, id]; const visibleTools = r.visibleTools.includes(id) ? r.visibleTools.filter(x => x !== id) : [...r.visibleTools, id]; return { ...r, usedTools, visibleTools }; });
  const submit = () => act(r => { const [a1, a2] = r.draft.arguments; if (!r.draft.teamId || !r.draft.documentId || !a1 || !a2 || r.submitted) return r; const submitted: FinalReport = { teamId: r.draft.teamId, documentId: r.draft.documentId, arguments: [a1, a2], submittedAt: new Date().toISOString() }; setPresenting(submitted); return { ...at(r, 'meeting', 'open'), submitted, evaluation: evaluateReport(submitted, r.usedTools, r.collectedDocs), meetingIndex: 0 }; });
  const takeControl = () => { takeOwnership(); const result = inspectRun(uid); const latest = result.status === 'ok' && result.run.runId === runRef.current.runId && result.run.revision >= runRef.current.revision ? result.run : runRef.current; const next = { ...latest, paused: false, revision: latest.revision + 1 }; runRef.current = next; setRun(next); setOtherTab(false); persist(next); };
  const exit = () => { commit(r => ({ ...r, paused: r.phase !== 'cover' })); releaseOwnership(); navigate('/app'); };
  const frozen = run.paused || otherTab;
  useEffect(() => { if (frozen) setFlyingDoc(null); }, [frozen]);
  const shot = shotFor(run);
  useEffect(() => {
    if (run.phase !== 'resolution' || (run.stage !== 'office' && run.stage !== 'gap')) return;
    const delay = run.stage === 'office' ? 1000 : 700;
    let remaining = delay;
    let startedAt = 0;
    let timer: number | undefined;
    const clear = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      if (runRef.current.paused || otherTab || timer !== undefined) return;
      startedAt = performance.now();
      timer = window.setTimeout(() => commit(r => r.phase === 'resolution' && (r.stage === 'office' || r.stage === 'gap') ? { ...at(r, 'resolution', 'incoming'), callAnswered: false } : r), remaining);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') { if (timer !== undefined) remaining = Math.max(0, remaining - (performance.now() - startedAt)); clear(); }
      else schedule();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clear(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [run.phase, run.stage, run.paused, otherTab, commit]);

  return <MotionConfig reducedMotion={frozen ? 'always' : 'user'}><main className={`rd-root ${frozen ? 'rd-paused' : ''}`} dir="rtl" data-phase={run.phase} data-stage={run.stage} data-shot={shot}>
    <ScenePlayer shotId={shot}>
      {run.phase !== 'cover' && <GameHud count={run.collectedDocs.length} pulse={filePulse} phase={run.phase} onFile={openFile} onPause={() => { gameSound('click'); commit(r => ({ ...r, paused: true })); }} onExit={() => { gameSound('click'); exit(); }}/>}
      <div className="rd-content"><AnimatePresence mode="wait"><motion.div key={`${run.phase}-${run.stage}-${run.endingCall}-${shot}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.35}}>
        {corrupt && run.phase === 'cover' && <section className="rd-cover"><h1>تعذر استعادة هذه الجولة</h1><span>يمكنك بدء جولة جديدة دون التأثير على حسابك أو اللعبة الأخرى.</span><ActionButton onClick={start}>بداية جديدة</ActionButton></section>}
        {!corrupt && run.phase === 'cover' && <section className="rd-cover"><img src={analystMark} alt="The Analyst"/><p>شركة روّاد للأجهزة الكهربائية</p><h1>قرار التكريم</h1><span>اقرأ المستندات، حلّل النتائج، وابنِ توصيتك.</span><ActionButton onClick={start}>ابدأ الآن</ActionButton><img className="rd-imp" src={impLogo} alt="IMP"/></section>}
        {run.phase === 'celebration' && run.stage === 'intro' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'celebration','talk'))}>متابعة</ActionButton></div>}
        {run.phase === 'celebration' && run.stage === 'draft' && <div className="rd-document-card"><p>ترشيح تكريم فريق المبيعات</p><b>بانتظار الاعتماد</b><ActionButton onClick={() => act(r => at(r,'debate','talk'))}>متابعة</ActionButton></div>}
        {run.phase === 'debate' && run.stage === 'door' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'briefing','talk'))}>دخول مكتب شريف</ActionButton></div>}
        {run.phase === 'briefing' && run.stage === 'done' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'hub'))}>الذهاب إلى المكاتب</ActionButton></div>}
        {line && <DialoguePanel line={line} lines={lines ?? []} index={run.dialogueIndex} total={lines?.length ?? 0} visible={run.visibleGraphemes} paused={frozen || fileOpen || Boolean(focusDoc) || Boolean(presenting)} gender={profile?.gender ?? null} delivered={line.documentId ? run.collectedDocs.includes(line.documentId) : false} onVisible={onVisible} onAdvance={advance} onOpenDocument={openDocument}/>}
        {run.phase === 'hub' && <OfficeCorridor visited={run.visited} docs={run.collectedDocs} playSound={gameSound} onVisit={place => place==='workbench'?act(r=>at(r,'workbench')):visit(place)}/>}
        {run.phase === 'workbench' && <Workbench used={run.usedTools} visible={run.visibleTools} activeTeam={run.activeTeamChart} onToggle={toggleTool} onTeam={activeTeamChart => commit(r => ({...r,activeTeamChart}))} onBack={toHub} onRecommendation={() => act(r => at(r,'recommendation'))} playSound={gameSound}/>} 
        {run.phase === 'recommendation' && <Recommendation draft={run.draft} docs={run.collectedDocs} tools={run.usedTools} onChange={draft => commit(r => ({...r,draft}))} onSubmit={submit} onBack={() => act(r => at(r,'workbench'))} playSound={gameSound}/>} 
        {run.phase === 'resolution' && run.stage === 'office' && <section className="rd-office-return" aria-label="العودة إلى مكتب المحلل"><p>بعد الاجتماع</p><h2>مكتب المحلل</h2></section>}
        {run.phase === 'resolution' && run.stage === 'gap' && <section className="rd-call-gap" aria-label="انتهت المكالمة"><span>انتهت المكالمة</span></section>}
        {run.phase === 'resolution' && run.stage === 'incoming' && calls && <IncomingCall caller={calls[run.endingCall].caller} paused={frozen} onAnswer={() => act(r => r.phase === 'resolution' && r.stage === 'incoming' && !r.callAnswered ? { ...at(r, 'resolution', 'talking'), callAnswered: true } : r)}/>} 
        {run.phase === 'debrief' && run.submitted && run.evaluation && <Panel title="خلاصة قرارك"><div className="rd-final-report"><small className="rd-final-label">التقرير المقدّم</small><b>{TEAMS[run.submitted.teamId].name}</b><span>{DOCUMENTS[run.submitted.documentId].title}</span><p className={run.evaluation.outcome==='supported'?'valid':'weak'}>{run.evaluation.reason==='complete'?'التوصية تجمع دليلًا صحيحًا على انتشار مستوى الأداء ودليلًا صحيحًا على تقارب النتائج.':run.evaluation.reason==='wrong_team'?'التوصية لا تحقق معيار التكريم الجماعي في بيانات الفترة.':run.evaluation.reason==='wrong_document'?'التقرير لم يستند إلى سياسة التكريم المعتمدة.':run.evaluation.reason==='missing_performance'?'حجتا التشتت لا تثبتان انتشار مستوى الأداء المقبول.':run.evaluation.reason==='missing_spread'?'التقرير لا يثبت تقارب نتائج الفريق.':'واحدة أو أكثر من الحجج لا تثبت المطلوب بالتفسير المختار.'}</p>{run.submitted.arguments.map((id,i)=><p key={id} className={run.evaluation?.argumentValidity[i]?'valid':'weak'}>{argumentNote(id,run.evaluation?.argumentValidity[i]??false)}</p>)}<span className="rd-final-stamp">تم تقديم التوصية</span></div><div className="rd-actions"><ReplayButton onClick={() => { clearRun(uid); start(); }}/><ActionButton onClick={exit}>الألعاب</ActionButton></div></Panel>}
      </motion.div></AnimatePresence></div>
    </ScenePlayer>
    {flyingDoc && <motion.div className="rd-document-flight" key={flyingDoc.id} initial={{ x: flyingDoc.start.left, y: flyingDoc.start.top, width: flyingDoc.start.width, height: flyingDoc.start.height, opacity: 1 }} animate={{ x: flyingDoc.end.left, y: flyingDoc.end.top, width: flyingDoc.end.width, height: flyingDoc.end.height, opacity: .4 }} transition={{ duration: .65, delay: .3, ease: 'easeInOut' }} onAnimationStart={() => gameSound('whoosh')} onAnimationComplete={() => { setFlyingDoc(null); gameSound('collect'); setFilePulse(true); }}><FileText aria-hidden="true"/><span>{DOCUMENTS[flyingDoc.id].title}</span><i className="rd-flight-seal">محفوظ</i></motion.div>}
    {documentNotice && <div className="rd-document-notice" role="status">المستند في ملف التحليل</div>}
    {fileOpen && <CaseFile docs={run.collectedDocs} tools={run.usedTools} submitted={run.submitted} onClose={closeFile}/>}
    {focusDoc && <DocumentReader id={focusDoc} onClose={closeDocument}/>}
    {presenting && <PresentationSequence report={presenting} paused={frozen} onComplete={finishPresentation} playSound={gameSound}/>}
    {otherTab && run.phase !== 'cover' && <OtherTabLayer onTake={takeControl}/>} 
    {!otherTab && run.paused && run.phase !== 'cover' && <PauseLayer onContinue={() => commit(r => ({...r,paused:false}))}/>} 
    {!storageOk && <div className="rd-storage-warning">الاستكمال بعد إغلاق الصفحة غير متاح حاليًا.</div>}
  </main></MotionConfig>;
}
