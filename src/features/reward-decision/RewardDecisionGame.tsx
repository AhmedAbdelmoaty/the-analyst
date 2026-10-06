import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Building2, FileSpreadsheet, MessageCircle, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LINES, OPTIONAL, OPTIONAL_IDS, SCRIPT, type Line, type OptionalId } from './data/script';
import { POLICY, TEAMS, type TeamId } from './data/case';
import { newRun, evaluate, effectiveLinks, shotFor, type Link, type RewardRun } from './engine/model';
import { attachmentNote } from './engine/evidence';
import { clearRun, inspectRun, saveRun } from './engine/persistence';
import { claimOwnership, mayWrite, releaseOwnership, takeOwnership } from './engine/ownership';
import { ScenePlayer } from './components/ScenePlayer';
import { DialoguePanel } from './components/DialoguePanel';
import { ActionButton, GameHud, OtherTabLayer, Panel, PauseLayer, ReplayButton } from './components/Ui';
import { CaseFile } from './components/CaseFile';
import { Workbench } from './components/Workbench';
import { Recommendation } from './components/Recommendation';
import { MeetingDefense } from './components/Meeting';
import impLogo from '@/assets/brand/imp-logo.webp';
import analystMark from '@/assets/brand/the-analyst-mark.png';
import './reward-decision.css';

/** Lines spoken in the current (phase, stage); null when the stage is not a dialogue. */
function linesFor(r: RewardRun): Line[] | null {
  const s = r.stage;
  if (r.phase === 'celebration' && s === 'talk') return SCRIPT.D01;
  if (r.phase === 'debate' && s === 'talk') return SCRIPT.D02;
  if (r.phase === 'briefing' && s === 'talk') return SCRIPT.D03;
  if (r.phase === 'sales' && s === 'talk') return SCRIPT.D04;
  if (r.phase === 'hr' && s === 'talk') return SCRIPT.D05;
  if (r.phase === 'meeting') {
    if (s === 'open') return SCRIPT.D06;
    if (s === 'objection') return [r.submitted?.teamId === 'mahmoud' ? LINES.objectionMahmoud : LINES.objectionMarwan];
    if (s === 'followup') return [LINES.followup];
  }
  if (r.phase === 'resolution' && s === 'decision') return SCRIPT.D07;
  if (r.phase === 'resolution' && s === 'ending') return [r.outcome === 'insufficient' ? LINES.endingInsufficient : LINES.endingMismatch];
  if (r.phase === 'debrief' && s === 'talk') return SCRIPT.D08;
  return null;
}

const at = (r: RewardRun, phase: RewardRun['phase'], stage: string): RewardRun => ({ ...r, phase, stage, dialogueIndex: 0, visibleGraphemes: 0 });

/** Next state once the last line of a dialogue stage is acknowledged. */
function afterDialogue(r: RewardRun): RewardRun {
  switch (`${r.phase}:${r.stage}`) {
    case 'celebration:talk': return at(r, 'celebration', 'draft');
    case 'debate:talk': return at(r, 'debate', 'door');
    case 'briefing:talk': return at(r, 'briefing', 'done');
    case 'sales:talk': return at(r, 'sales', 'menu');
    case 'hr:talk': return at(r, 'hr', 'doc');
    case 'meeting:open': return at(r, 'meeting', 'objection');
    case 'meeting:objection': return at(r, 'meeting', 'defend');
    case 'meeting:followup': return at(r, 'meeting', 'defend');
    case 'resolution:decision': return at(r, 'resolution', 'paper');
    case 'resolution:ending': return at(r, 'resolution', 'choices');
    case 'debrief:talk': return at(r, 'debrief', 'notes');
    default: return r;
  }
}

/** A delay that only counts down while the game is running (pause freezes it). */
function useActiveDelay(active: boolean, paused: boolean, ms: number, onDone: () => void) {
  const left = useRef(ms);
  const cb = useRef(onDone); cb.current = onDone;
  useEffect(() => { if (!active) left.current = ms; }, [active, ms]);
  useEffect(() => {
    if (!active || paused) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now(); left.current -= now - last; last = now;
      if (left.current <= 0) { window.clearInterval(id); left.current = ms; cb.current(); }
    }, 100);
    return () => window.clearInterval(id);
  }, [active, paused, ms]);
}

const DEBRIEF = [
  ['الإجمالي', '95% مقابل 88% — بداية صحيحة، مش الصورة كلها.'],
  ['نتائج الأفراد', 'الوسيط يوضح المنتصف، ومقاييس التشتت توضح التقارب.'],
  ['معيار 85%', '4 من 10 مقابل 10 من 10.'],
  ['التقارب', 'في الحالة دي، فريق محمود جمع تحقيق المطلوب وتقارب الأداء.'],
];

export default function RewardDecisionGame() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const uid = user?.id ?? '';
  const initial = useRef(inspectRun(uid));
  const [run, setRun] = useState<RewardRun>(() => (initial.current.status === 'ok' ? initial.current.run : newRun(uid)));
  const [corrupt, setCorrupt] = useState(initial.current.status === 'corrupt');
  const [fileOpen, setFileOpen] = useState(false);
  const [otherTab, setOtherTab] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const runRef = useRef(run); runRef.current = run;
  const saveTimer = useRef<number>();
  const lastAct = useRef(0);

  const persist = useCallback((r: RewardRun) => {
    if (r.phase === 'cover' || !mayWrite()) return;
    const res = saveRun(r);
    if (res === 'unavailable') setStorageOk(false);
    if (res === 'stale') { setOtherTab(true); setRun(x => ({ ...x, paused: true })); }
  }, []);

  /** Meaningful actions save immediately; typing progress is batched (≤400ms) and flushed on pause/pagehide. */
  const commit = useCallback((fn: (r: RewardRun) => RewardRun, quiet = false) => {
    const prev = runRef.current;
    const next = { ...fn(prev), revision: prev.revision + 1 };
    runRef.current = next; setRun(next);
    window.clearTimeout(saveTimer.current);
    if (quiet) saveTimer.current = window.setTimeout(() => persist(runRef.current), 400);
    else persist(next);
  }, [persist]);

  /** Click guard: rapid double taps cannot fire two transitions. */
  const act = useCallback((fn: (r: RewardRun) => RewardRun) => {
    const now = Date.now();
    if (now - lastAct.current < 300 || runRef.current.paused) return;
    lastAct.current = now; commit(fn);
  }, [commit]);

  // Account change: drop the old run and load this user's snapshot.
  useEffect(() => {
    if (!uid || runRef.current.userId === uid) return;
    const res = inspectRun(uid);
    setCorrupt(res.status === 'corrupt');
    setRun(res.status === 'ok' ? res.run : newRun(uid));
  }, [uid]);

  const onLost = useCallback(() => { setOtherTab(true); setRun(r => ({ ...r, paused: true })); }, []);
  useEffect(() => {
    if (!uid || run.phase === 'cover') return;
    setOtherTab(!claimOwnership(uid, run.runId, onLost));
    return () => releaseOwnership();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, run.runId, run.phase === 'cover', onLost]);

  // Leaving the page pauses and flushes the snapshot at once.
  useEffect(() => {
    const pause = (e: Event) => {
      if (e.type === 'visibilitychange' && document.visibilityState !== 'hidden') return;
      const cur = runRef.current;
      if (cur.phase === 'cover') return;
      window.clearTimeout(saveTimer.current);
      const next = { ...cur, paused: true, revision: cur.revision + 1 };
      runRef.current = next; setRun(next); persist(next);
    };
    document.addEventListener('visibilitychange', pause);
    window.addEventListener('pagehide', pause);
    return () => { document.removeEventListener('visibilitychange', pause); window.removeEventListener('pagehide', pause); };
  }, [persist]);

  const start = () => {
    window.clearTimeout(saveTimer.current);
    const next: RewardRun = { ...newRun(uid), phase: 'celebration', stage: 'intro', revision: 1 };
    setCorrupt(false); setOtherTab(false);
    runRef.current = next; setRun(next);
    claimOwnership(uid, next.runId, onLost);
    persist(next);
  };

  const takeControl = () => {
    takeOwnership();
    const res = inspectRun(uid); // continue from the latest progress of the other tab, never overwrite it
    const latest = res.status === 'ok' && res.run.runId === runRef.current.runId && res.run.revision >= runRef.current.revision ? res.run : runRef.current;
    const next = { ...latest, paused: false, revision: latest.revision + 1 };
    runRef.current = next; setRun(next); setOtherTab(false); persist(next);
  };

  const visitNow = (r: RewardRun, place: 'sales' | 'hr'): RewardRun => {
    const revisit = r.visited.includes(place);
    return { ...at(r, place, revisit ? (place === 'sales' ? 'menu' : 'doc') : 'talk'), pendingDestination: null, visited: revisit ? r.visited : [...r.visited, place], optional: { ...r.optional, leadersOpen: false } };
  };
  const visit = (place: 'sales' | 'hr') => act(r => r.completedCameos.includes('mahmoud-pass')
    ? visitNow(r, place)
    : { ...at(r, 'hub', 'cameo'), pendingDestination: place, completedCameos: [...r.completedCameos, 'mahmoud-pass'] });
  const finishCameo = () => commit(r => (r.stage === 'cameo' && r.pendingDestination ? visitNow(r, r.pendingDestination) : r));

  useActiveDelay(run.phase === 'hub' && run.stage === 'cameo', run.paused || otherTab, 1500, finishCameo);
  useActiveDelay(run.phase === 'resolution' && run.stage === 'news', run.paused || otherTab, 3000, () => commit(r => (r.stage === 'news' ? { ...at(r, 'debrief', 'reveal'), debriefStep: 0 } : r)));

  const lines = linesFor(run);
  const line = lines && run.dialogueIndex < lines.length ? lines[run.dialogueIndex] : null;
  const advance = () => commit(r => {
    const ls = linesFor(r);
    if (!ls) return r;
    return r.dialogueIndex + 1 < ls.length ? { ...r, dialogueIndex: r.dialogueIndex + 1, visibleGraphemes: 0 } : afterDialogue(r);
  });
  const onVisible = useCallback((n: number) => commit(r => ({ ...r, visibleGraphemes: n }), true), [commit]);
  const onOptVisible = useCallback((n: number) => commit(r => ({ ...r, optional: { ...r.optional, visible: n } }), true), [commit]);

  const ask = (id: OptionalId) => act(r => ({ ...r, optional: { ...r.optional, id, index: 0, visible: 0 } }));
  const advanceOptional = () => commit(r => {
    const id = r.optional.id; if (!id) return r;
    if (r.optional.index + 1 < OPTIONAL[id].lines.length) return { ...r, optional: { ...r.optional, index: r.optional.index + 1, visible: 0 } };
    return { ...r, optional: { ...r.optional, id: null, index: 0, visible: 0, asked: r.optional.asked.includes(id) ? r.optional.asked : [...r.optional.asked, id] } };
  });
  const questions = (place: 'sales' | 'hr' | 'leaders') => (
    <div className="rd-questions">{OPTIONAL_IDS.filter(id => OPTIONAL[id].place === place).map(id => (
      <button key={id} data-optional={id} onClick={() => ask(id)}><MessageCircle />{OPTIONAL[id].lines[0].text}{run.optional.asked.includes(id) && <small>تم</small>}</button>
    ))}</div>
  );

  const saveDocs = (...docs: string[]) => act(r => ({ ...r, collectedDocs: [...new Set([...r.collectedDocs, ...docs])] }));
  const toHub = () => act(r => ({ ...at(r, 'hub', ''), activeTool: null }));
  const review = () => act(r => ({ ...at(r, 'workbench', ''), activeTool: null, outcome: null, reviewCount: r.reviewCount + 1 }));
  const confirmDefense = (l: Link) => act(r => {
    const withDefense = { ...r, meeting: { ...r.meeting, defense: l } };
    if (evaluate(withDefense) !== 'supported' && !r.meeting.followupUsed) return { ...at(withDefense, 'meeting', 'followup'), meeting: { defense: l, followupUsed: true } };
    return at(withDefense, 'meeting', 'review');
  });
  const decide = () => act(r => { const outcome = evaluate(r); return { ...at(r, 'resolution', outcome === 'supported' ? 'decision' : 'ending'), outcome }; });
  const exit = () => { commit(r => ({ ...r, paused: r.phase !== 'cover' })); releaseOwnership(); navigate('/app'); };

  const canRecommend = run.evidence.length >= 2 && run.collectedDocs.includes('policy') && run.openedIndividualRecords;
  const shot = shotFor(run);
  const frozen = run.paused || otherTab;
  const optId = run.optional.id;

  return (
    <MotionConfig reducedMotion={frozen ? 'always' : 'user'}>
      <main className={`rd-root ${frozen ? 'rd-paused' : ''}`} dir="rtl" data-phase={run.phase} data-stage={run.stage} data-shot={shot}>
        <ScenePlayer shotId={shot}>
          {run.phase !== 'cover' && <GameHud count={run.evidence.length + run.collectedDocs.length} onFile={() => setFileOpen(true)} onPause={() => commit(r => ({ ...r, paused: true }))} onExit={exit} />}
          <div className="rd-content">
            <AnimatePresence mode="wait">
              <motion.div key={`${run.phase}-${run.stage}-${shot}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
                {corrupt && run.phase === 'cover' && <section className="rd-cover"><h1>تعذر استعادة هذه الجولة</h1><span>تقدر تبدأ جولة جديدة من «قرار التكريم». حسابك واللعبة الأخرى ما اتأثروش.</span><ActionButton onClick={start}>بداية جديدة</ActionButton></section>}
                {!corrupt && run.phase === 'cover' && <section className="rd-cover"><img src={analystMark} alt="The Analyst" /><p>قضية جديدة</p><h1>قرار التكريم</h1><span>راجع الترشيح، وافحص الأدلة، ودافع عن قرارك.</span><ActionButton onClick={start}>ابدأ الآن</ActionButton><img className="rd-imp" src={impLogo} alt="IMP" /></section>}

                {run.phase === 'celebration' && run.stage === 'intro' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r, 'celebration', 'talk'))}>متابعة</ActionButton></div>}
                {run.phase === 'celebration' && run.stage === 'draft' && <div className="rd-document-card"><p>تكريم فريق المبيعات</p><b>بانتظار الاعتماد</b><ActionButton onClick={() => act(r => at(r, 'debate', 'talk'))}>متابعة</ActionButton></div>}
                {run.phase === 'debate' && run.stage === 'door' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r, 'briefing', 'talk'))}>دخول مكتب شريف</ActionButton></div>}
                {run.phase === 'briefing' && run.stage === 'done' && <div className="rd-bottom-action"><ActionButton onClick={() => act(r => at(r, 'hub', ''))}>فتح الملف</ActionButton></div>}

                {line && <DialoguePanel line={line} index={run.dialogueIndex} total={lines!.length} visible={run.visibleGraphemes} paused={frozen} gender={profile?.gender ?? null} onVisible={onVisible} onAdvance={advance} />}

                {run.phase === 'hub' && run.stage === 'cameo' && <div className="rd-cameo"><p>محمود يراجع طلبًا على جهاز لوحي ويحييك بإيماءة.</p><ActionButton variant="secondary" onClick={finishCameo}>متابعة</ActionButton></div>}
                {run.phase === 'hub' && run.stage !== 'cameo' && <Panel title="مساحة التحقيق">
                  <p className="rd-lead">اختار ترتيب التحقيق. كل المستندات تفضل محفوظة في ملف القضية.</p>
                  <div className="rd-destinations">
                    <button data-dest="sales" onClick={() => visit('sales')}><Users /><b>المبيعات</b><small>{run.collectedDocs.includes('sales') ? 'تم حفظ التقرير' : 'مكتب حسام'}</small></button>
                    <button data-dest="hr" onClick={() => visit('hr')}><Building2 /><b>الموارد البشرية</b><small>{run.collectedDocs.includes('policy') ? 'تم حفظ المعيار' : 'مكتب داليا'}</small></button>
                    <button data-dest="workbench" onClick={() => act(r => ({ ...at(r, 'workbench', '') }))}><FileSpreadsheet /><b>مكتبك · طاولة الفحص</b><small>{run.openedIndividualRecords ? 'الأدوات متاحة' : 'تحتاج كشف الأفراد'}</small></button>
                  </div>
                  <div className="rd-actions">
                    {run.openedIndividualRecords && <ActionButton variant="secondary" onClick={() => act(r => ({ ...r, optional: { ...r.optional, leadersOpen: true } }))}>استيضاح من القائدين</ActionButton>}
                    {canRecommend && <ActionButton onClick={() => act(r => at(r, 'recommendation', ''))}>تجهيز التوصية</ActionButton>}
                  </div>
                </Panel>}

                {run.phase === 'sales' && run.stage === 'menu' && <Panel title="تقرير المبيعات المعتمد" onBack={toHub}>
                  <div className="rd-report"><div><b>فريق مروان</b><strong>9.5 مليون</strong><span>متوسط تحقيق المستهدف 95%</span></div><div><b>فريق محمود</b><strong>8.8 مليون</strong><span>متوسط تحقيق المستهدف 88%</span></div></div>
                  <small className="rd-note">10 أفراد لكل فريق · المستهدف مليون للفرد</small>
                  {questions('sales')}
                  <div className="rd-actions">
                    <ActionButton variant="secondary" onClick={() => act(r => ({ ...at(r, 'sales', 'doc'), openedIndividualRecords: true, collectedDocs: [...new Set([...r.collectedDocs, 'records'])] }))}>فتح كشف الأفراد</ActionButton>
                    <ActionButton disabled={run.collectedDocs.includes('sales')} onClick={() => saveDocs('sales')}>{run.collectedDocs.includes('sales') ? 'محفوظ في الملف' : 'حفظ في الملف'}</ActionButton>
                  </div>
                </Panel>}
                {run.phase === 'sales' && run.stage === 'doc' && <Panel title="كشف نتائج الأفراد" onBack={() => act(r => at(r, 'sales', 'menu'))}>
                  <div className="rd-teams">{(['marwan', 'mahmoud'] as TeamId[]).map(t => <div key={t}><b>{TEAMS[t].name}</b>{TEAMS[t].members.map(m => <span key={m.id}>{m.name}<i>{m.value}%</i></span>)}</div>)}</div>
                  <div className="rd-actions">
                    <ActionButton disabled={run.collectedDocs.includes('sales')} onClick={() => saveDocs('sales', 'records')}>{run.collectedDocs.includes('sales') ? 'محفوظ في الملف' : 'حفظ في الملف'}</ActionButton>
                    <ActionButton variant="secondary" onClick={() => act(r => at(r, 'workbench', ''))}>طاولة الفحص</ActionButton>
                    <ActionButton variant="secondary" onClick={toHub}>مساحة التحقيق</ActionButton>
                  </div>
                </Panel>}
                {run.phase === 'hr' && run.stage === 'doc' && <Panel title="وثيقة معيار التكريم" onBack={toHub}>
                  <div className="rd-policy">{POLICY}</div>
                  {questions('hr')}
                  <div className="rd-actions">
                    <ActionButton disabled={run.collectedDocs.includes('policy')} onClick={() => saveDocs('policy')}>{run.collectedDocs.includes('policy') ? 'محفوظ في الملف' : 'حفظ في الملف'}</ActionButton>
                    <ActionButton variant="secondary" onClick={toHub}>مساحة التحقيق</ActionButton>
                  </div>
                </Panel>}

                {run.phase === 'workbench' && <Workbench available={run.openedIndividualRecords} saved={run.evidence} policy={run.collectedDocs.includes('policy')} active={run.activeTool} tools={run.tools}
                  onOpen={id => act(r => ({ ...r, activeTool: id }))}
                  onTool={(id, s) => commit(r => ({ ...r, tools: { ...r.tools, [id]: s } }))}
                  onSave={id => act(r => ({ ...r, evidence: r.evidence.includes(id) ? r.evidence : [...r.evidence, id] }))}
                  onBack={toHub} onOpenPolicy={() => visit('hr')} onRecommendation={() => act(r => at(r, 'recommendation', ''))}
                  onLeaders={() => act(r => ({ ...r, optional: { ...r.optional, leadersOpen: true } }))} />}

                {run.phase === 'recommendation' && <Recommendation team={run.draft.teamId} links={run.draft.links} evidence={run.evidence}
                  onTeam={teamId => commit(r => ({ ...r, draft: { ...r.draft, teamId } }))}
                  onLink={(i, l) => commit(r => { const links = [...r.draft.links]; while (links.length < 2) links.push({ evidenceId: '', claimId: '' }); links[i] = l; return { ...r, draft: { ...r.draft, links } }; })}
                  onBack={() => act(r => at(r, 'workbench', ''))}
                  onSubmit={() => act(r => r.phase !== 'recommendation' ? r : ({ ...at(r, 'meeting', 'open'), submitted: { teamId: r.draft.teamId as TeamId, links: r.draft.links as Link[] }, meeting: { defense: null, followupUsed: false }, outcome: null }))} />}

                {run.phase === 'meeting' && run.stage === 'defend' && run.submitted && <MeetingDefense team={run.submitted.teamId} evidence={run.evidence} current={run.meeting.defense} followup={run.meeting.followupUsed} onConfirm={confirmDefense} onReview={review} />}
                {run.phase === 'meeting' && run.stage === 'review' && <Panel title="شريف يراجع التوصية">
                  <p className="rd-lead">التوصية والمرفقات والحجة الأخيرة قدام شريف.</p>
                  <div className="rd-actions"><ActionButton onClick={decide}>اعتماد التوصية</ActionButton><ActionButton variant="secondary" onClick={review}>العودة للفحص</ActionButton></div>
                </Panel>}

                {run.phase === 'resolution' && run.stage === 'paper' && <section className="rd-decision-paper" data-testid="decision-paper"><p>شركة روّاد للأجهزة الكهربائية</p><h2>قرار التكريم المعتمد</h2><p>يُعتمد تكريم فريق محمود على معيار الأداء الجماعي.</p><ActionButton onClick={() => act(r => at(r, 'resolution', 'news'))}>متابعة</ActionButton></section>}
                {run.phase === 'resolution' && run.stage === 'news' && <div className="rd-cameo"><p>الخبر يوصل لمحمود وفريقه.</p><ActionButton variant="secondary" onClick={() => act(r => ({ ...at(r, 'debrief', 'reveal'), debriefStep: 0 }))}>متابعة</ActionButton></div>}
                {run.phase === 'resolution' && run.stage === 'choices' && <Panel title="الملف يحتاج مراجعة">
                  <div className="rd-actions"><ActionButton variant="secondary" onClick={review}>مراجعة الملف</ActionButton><ActionButton onClick={() => act(r => ({ ...at(r, 'debrief', 'reveal'), debriefStep: 0 }))}>عرض خلاصة التجربة</ActionButton></div>
                </Panel>}

                {run.phase === 'debrief' && run.stage === 'reveal' && <Panel title="خلاصة التجربة">
                  <ol className="rd-debrief">{DEBRIEF.slice(0, run.debriefStep + 1).map(([b, s]) => <motion.li key={b} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><b>{b}</b><span>{s}</span></motion.li>)}</ol>
                  <ActionButton onClick={() => act(r => r.debriefStep < DEBRIEF.length - 1 ? { ...r, debriefStep: r.debriefStep + 1 } : at(r, 'debrief', 'talk'))}>التالي</ActionButton>
                </Panel>}
                {run.phase === 'debrief' && run.stage === 'notes' && <Panel title="خلاصة التجربة">
                  <ol className="rd-debrief">{DEBRIEF.map(([b, s]) => <li key={b}><b>{b}</b><span>{s}</span></li>)}</ol>
                  <h3 className="rd-subtitle">مرفقاتك</h3>
                  <ul className="rd-notes" data-testid="attachment-notes">{effectiveLinks(run).map((l, i) => <li key={i}>{attachmentNote(l)}</li>)}</ul>
                  <div className="rd-actions"><ReplayButton onClick={() => { clearRun(uid); start(); }} /><ActionButton onClick={exit}>الألعاب</ActionButton></div>
                </Panel>}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScenePlayer>

        {run.optional.leadersOpen && !optId && <div className="rd-modal" dir="rtl"><Panel title="استيضاح من القائدين" onBack={() => act(r => ({ ...r, optional: { ...r.optional, leadersOpen: false } }))}>
          <p className="rd-lead">أسئلة قصيرة واختيارية لمروان ومحمود.</p>{questions('leaders')}
          <ActionButton variant="secondary" onClick={() => act(r => ({ ...r, optional: { ...r.optional, leadersOpen: false } }))}>إغلاق</ActionButton>
        </Panel></div>}
        {optId && <div className="rd-modal rd-optional" dir="rtl"><DialoguePanel line={OPTIONAL[optId].lines[run.optional.index]} index={run.optional.index} total={OPTIONAL[optId].lines.length} visible={run.optional.visible} paused={frozen} gender={profile?.gender ?? null} onVisible={onOptVisible} onAdvance={advanceOptional} /></div>}
        {fileOpen && <CaseFile docs={run.collectedDocs} evidence={run.evidence} onClose={() => setFileOpen(false)} />}
        {otherTab && run.phase !== 'cover' && <OtherTabLayer onTake={takeControl} />}
        {!otherTab && run.paused && run.phase !== 'cover' && <PauseLayer onContinue={() => commit(r => ({ ...r, paused: false }))} />}
        {!storageOk && <div className="rd-storage-warning">الاستكمال بعد إغلاق الصفحة غير متاح حاليًا.</div>}
      </main>
    </MotionConfig>
  );
}
