import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Building2, FileSpreadsheet, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DOCUMENTS, TEAMS, type DocumentId, type ToolId } from './data/case';
import { SCRIPT, type Line } from './data/script';
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
import { meetingLines } from './components/Meeting';
import impLogo from '@/assets/brand/imp-logo.webp';
import analystMark from '@/assets/brand/the-analyst-mark.png';
import './reward-decision.css';

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
  if (r.phase === 'meeting') return at(r, 'resolution', 'impact');
  return r;
}

export default function RewardDecisionGame() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id ?? '';
  const initial = useRef(inspectRun(uid));
  const [run, setRun] = useState<RewardRun>(() => initial.current.status === 'ok' ? initial.current.run : newRun(uid));
  const [corrupt, setCorrupt] = useState(initial.current.status === 'corrupt');
  const [fileOpen, setFileOpen] = useState(false);
  const [focusDoc, setFocusDoc] = useState<DocumentId | null>(null);
  const [flyingDoc, setFlyingDoc] = useState<DocumentId | null>(null);
  const [otherTab, setOtherTab] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const runRef = useRef(run); runRef.current = run;
  const saveTimer = useRef<number>();
  const lastAct = useRef(0);

  const persist = useCallback((r: RewardRun) => { if (r.phase === 'cover' || !mayWrite()) return; const result = saveRun(r); if (result === 'unavailable') setStorageOk(false); if (result === 'stale') { setOtherTab(true); setRun(x => ({ ...x, paused: true })); } }, []);
  const commit = useCallback((fn: (r: RewardRun) => RewardRun, quiet = false) => { const prev = runRef.current; const next = { ...fn(prev), revision: prev.revision + 1 }; runRef.current = next; setRun(next); window.clearTimeout(saveTimer.current); if (quiet) saveTimer.current = window.setTimeout(() => persist(runRef.current), 400); else persist(next); }, [persist]);
  const act = useCallback((fn: (r: RewardRun) => RewardRun) => { const now = Date.now(); if (now - lastAct.current < 260 || runRef.current.paused) return; lastAct.current = now; commit(fn); }, [commit]);

  useEffect(() => { if (!uid || runRef.current.userId === uid) return; const result = inspectRun(uid); setCorrupt(result.status === 'corrupt'); const next = result.status === 'ok' ? result.run : newRun(uid); runRef.current = next; setRun(next); }, [uid]);
  const onLost = useCallback(() => { setOtherTab(true); setRun(r => ({ ...r, paused: true })); }, []);
  useEffect(() => { if (!uid || run.phase === 'cover') return; setOtherTab(!claimOwnership(uid, run.runId, onLost)); return () => releaseOwnership(); }, [uid, run.runId, run.phase, onLost]);
  useEffect(() => { const pause = (event: Event) => { if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') return; const cur = runRef.current; if (cur.phase === 'cover') return; window.clearTimeout(saveTimer.current); const next = { ...cur, paused: true, revision: cur.revision + 1 }; runRef.current = next; setRun(next); persist(next); }; document.addEventListener('visibilitychange', pause); window.addEventListener('pagehide', pause); return () => { document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', pause); }; }, [persist]);

  const lines = useMemo(() => dialogueFor(run), [run.phase, run.stage, run.submitted, run.evaluation]);
  const line = lines && run.dialogueIndex < lines.length ? lines[run.dialogueIndex] : null;
  useEffect(() => { const id = line?.documentId; if (!id || runRef.current.collectedDocs.includes(id)) return; setFlyingDoc(id); commit(r => ({ ...r, collectedDocs: r.collectedDocs.includes(id) ? r.collectedDocs : [...r.collectedDocs, id] })); }, [line?.id, line?.documentId, commit]);

  const start = () => { const next = { ...newRun(uid), phase: 'celebration' as const, stage: 'intro', revision: 1 }; setCorrupt(false); setOtherTab(false); runRef.current = next; setRun(next); claimOwnership(uid, next.runId, onLost); persist(next); };
  const advance = () => commit(r => { const active = dialogueFor(r); if (!active) return r; return r.dialogueIndex + 1 < active.length ? { ...r, dialogueIndex: r.dialogueIndex + 1, visibleGraphemes: 0 } : afterDialogue(r); });
  const onVisible = useCallback((n: number) => commit(r => ({ ...r, visibleGraphemes: n }), true), [commit]);
  const visit = (place: 'sales' | 'hr') => act(r => at({ ...r, visited: r.visited.includes(place) ? r.visited : [...r.visited, place] }, place, 'talk'));
  const toHub = () => act(r => at(r, 'hub'));
  const openDocument = (id: DocumentId) => { setFocusDoc(id); setFileOpen(true); };
  const toggleTool = (id: ToolId) => act(r => { const usedTools = r.usedTools.includes(id) ? r.usedTools : [...r.usedTools, id]; const visibleTools = r.visibleTools.includes(id) ? r.visibleTools.filter(x => x !== id) : [...r.visibleTools, id]; return { ...r, usedTools, visibleTools }; });
  const submit = () => act(r => { const [a1, a2] = r.draft.arguments; if (!r.draft.teamId || !r.draft.documentId || !a1 || !a2 || r.submitted) return r; const submitted: FinalReport = { teamId: r.draft.teamId, documentId: r.draft.documentId, arguments: [a1, a2], submittedAt: new Date().toISOString() }; return { ...at(r, 'meeting', 'open'), submitted, evaluation: evaluateReport(submitted, r.usedTools, r.collectedDocs), meetingIndex: 0 }; });
  const takeControl = () => { takeOwnership(); const result = inspectRun(uid); const latest = result.status === 'ok' && result.run.runId === runRef.current.runId && result.run.revision >= runRef.current.revision ? result.run : runRef.current; const next = { ...latest, paused: false, revision: latest.revision + 1 }; runRef.current = next; setRun(next); setOtherTab(false); persist(next); };
  const exit = () => { commit(r => ({ ...r, paused: r.phase !== 'cover' })); releaseOwnership(); navigate('/app'); };
  const frozen = run.paused || otherTab;
  const shot = shotFor(run);
  const outcomeTitle = run.evaluation?.outcome === 'supported' ? 'قرار مدعوم' : run.evaluation?.outcome === 'criterion_mismatch' ? 'التوصية لا تحقق المعيار' : 'ترشيح غير مدعوم';
  const impact = run.evaluation?.outcome === 'supported' ? 'في تقرير الشهر التالي، استمر انتشار الأداء المقبول داخل الفريق المتقارب وتحسنت نتيجته الإجمالية.' : run.evaluation?.outcome === 'criterion_mismatch' ? 'في تقرير الشهر التالي، تراجعت بعض النتائج الاستثنائية، فظهر أن المتوسط المرتفع لم يكن منتشرًا بين أغلب أفراد الفريق.' : 'اختيار الفريق المناسب وحده لم يكن كافيًا؛ احتاج القرار إلى مستند صحيح وحجتين تثبتان مستوى الأداء وتقارب النتائج.';

  return <MotionConfig reducedMotion={frozen ? 'always' : 'user'}><main className={`rd-root ${frozen ? 'rd-paused' : ''}`} dir="rtl" data-phase={run.phase} data-stage={run.stage} data-shot={shot}>
    <ScenePlayer shotId={shot}>
      {run.phase !== 'cover' && <GameHud count={run.collectedDocs.length + run.usedTools.length} onFile={() => { setFocusDoc(null); setFileOpen(true); }} onPause={() => commit(r => ({ ...r, paused: true }))} onExit={exit}/>} 
      <div className="rd-content"><AnimatePresence mode="wait"><motion.div key={`${run.phase}-${run.stage}-${shot}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:.2}}>
        {corrupt && run.phase === 'cover' && <section className="rd-cover"><h1>تعذر استعادة هذه الجولة</h1><span>يمكنك بدء جولة جديدة دون التأثير على حسابك أو اللعبة الأخرى.</span><ActionButton onClick={start}>بداية جديدة</ActionButton></section>}
        {!corrupt && run.phase === 'cover' && <section className="rd-cover"><img src={analystMark} alt="The Analyst"/><p>شركة روّاد للأجهزة الكهربائية</p><h1>قرار التكريم</h1><span>اقرأ المستندات، حلّل النتائج، وابنِ توصيتك.</span><ActionButton onClick={start}>ابدأ الآن</ActionButton><img className="rd-imp" src={impLogo} alt="IMP"/></section>}
        {run.phase === 'celebration' && run.stage === 'intro' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'celebration','talk'))}>متابعة</ActionButton></div>}
        {run.phase === 'celebration' && run.stage === 'draft' && <div className="rd-document-card"><p>ترشيح تكريم فريق المبيعات</p><b>بانتظار الاعتماد</b><ActionButton onClick={() => act(r => at(r,'debate','talk'))}>متابعة</ActionButton></div>}
        {run.phase === 'debate' && run.stage === 'door' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'briefing','talk'))}>دخول مكتب شريف</ActionButton></div>}
        {run.phase === 'briefing' && run.stage === 'done' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r,'hub'))}>الذهاب إلى المكاتب</ActionButton></div>}
        {line && <DialoguePanel line={line} index={run.dialogueIndex} total={lines?.length ?? 0} visible={run.visibleGraphemes} paused={frozen} gender={profile?.gender ?? null} delivered={line.documentId ? run.collectedDocs.includes(line.documentId) : false} onVisible={onVisible} onAdvance={advance} onOpenDocument={openDocument}/>} 
        {run.phase === 'hub' && <Panel title="مكاتب شركة روّاد"><div className="rd-office-map">
          <button data-dest="sales" onClick={() => visit('sales')}><Users/><b>مكتب مدير المبيعات</b><small>{run.collectedDocs.includes('individual-records')?'المستندات متاحة':'حسام'}</small></button>
          <button data-dest="hr" onClick={() => visit('hr')}><Building2/><b>مكتب الموارد البشرية</b><small>{run.collectedDocs.includes('policy')?'السياسة متاحة':'داليا'}</small></button>
          <button data-dest="workbench" onClick={() => act(r => at(r,'workbench'))}><FileSpreadsheet/><b>مكتب المحلل</b><small>{run.usedTools.length?`${run.usedTools.length} مقارنات محفوظة`:'شاشة التحليل'}</small></button>
        </div></Panel>}
        {run.phase === 'workbench' && <Workbench used={run.usedTools} visible={run.visibleTools} activeTeam={run.activeTeamChart} onToggle={toggleTool} onTeam={activeTeamChart => commit(r => ({...r,activeTeamChart}))} onBack={toHub} onRecommendation={() => act(r => at(r,'recommendation'))}/>} 
        {run.phase === 'recommendation' && <Recommendation draft={run.draft} docs={run.collectedDocs} tools={run.usedTools} onChange={draft => commit(r => ({...r,draft}))} onSubmit={submit} onBack={() => act(r => at(r,'workbench'))}/>} 
        {run.phase === 'resolution' && run.stage === 'impact' && <section className="rd-impact"><p>تقرير الشهر التالي</p><h2>{outcomeTitle}</h2><span>{impact}</span><div className="rd-actions"><ActionButton onClick={() => act(r => at(r,'debrief','notes'))}>عرض الخلاصة</ActionButton></div></section>}
        {run.phase === 'debrief' && run.submitted && run.evaluation && <Panel title="خلاصة قرارك"><div className="rd-final-report"><b>{TEAMS[run.submitted.teamId].name}</b><span>{DOCUMENTS[run.submitted.documentId].title}</span>{run.submitted.arguments.map((id,i)=><p key={id} className={run.evaluation?.argumentValidity[i]?'valid':'weak'}>{argumentNote(id,run.evaluation?.argumentValidity[i]??false)}</p>)}</div><div className="rd-actions"><ReplayButton onClick={() => { clearRun(uid); start(); }}/><ActionButton onClick={exit}>الألعاب</ActionButton></div></Panel>}
      </motion.div></AnimatePresence></div>
    </ScenePlayer>
    {flyingDoc && <div className="rd-document-flight" onAnimationEnd={() => setFlyingDoc(null)}><FileSpreadsheet/><span>{DOCUMENTS[flyingDoc].title}</span></div>}
    {fileOpen && <CaseFile docs={run.collectedDocs} tools={run.usedTools} focus={focusDoc} onClose={() => { setFileOpen(false); setFocusDoc(null); }}/>} 
    {otherTab && run.phase !== 'cover' && <OtherTabLayer onTake={takeControl}/>} 
    {!otherTab && run.paused && run.phase !== 'cover' && <PauseLayer onContinue={() => commit(r => ({...r,paused:false}))}/>} 
    {!storageOk && <div className="rd-storage-warning">الاستكمال بعد إغلاق الصفحة غير متاح حاليًا.</div>}
  </main></MotionConfig>;
}