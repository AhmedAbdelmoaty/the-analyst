import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { SoundProvider } from '../src/hooks/useSoundEffects';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/700.css';
import { ScenePlayer } from '../src/features/reward-decision/components/ScenePlayer';
import { DialoguePanel } from '../src/features/reward-decision/components/DialoguePanel';
import { CaseFile } from '../src/features/reward-decision/components/CaseFile';
import { CaseTimer, ChartBoard, RoomFrame, RoomTabs } from '../src/features/reward-decision/components/AnalysisRoom';
import { DeductionNotebook } from '../src/features/reward-decision/components/DeductionNotebook';
import { FinalReport } from '../src/features/reward-decision/components/FinalReport';
import { GameResults } from '../src/features/reward-decision/components/GameResults';
import { IncomingCall } from '../src/features/reward-decision/components/IncomingCall';
import { GameHud, Panel } from '../src/features/reward-decision/components/Ui';
import { SCRIPT } from '../src/features/reward-decision/data/script';
import { newRun } from '../src/features/reward-decision/engine/model';
import type { QuestionId, ToolId } from '../src/features/reward-decision/data/case';
import '../src/features/reward-decision/reward-decision.css';
import '../src/features/reward-decision/reward-decision.polish.css';
import '../src/features/reward-decision/reward-decision.stage.css';
import '../src/features/reward-decision/reward-decision.world.css';
import '../src/features/reward-decision/reward-decision.v2.css';
import { DocumentReader } from '../src/features/reward-decision/components/DocumentReader';
import { OfficeCorridor } from '../src/features/reward-decision/components/OfficeCorridor';

// Isolated visual fixture: it never mounts Auth, analytics, saves, or the game controller.
const pages = ['dialogue','file','analysis','notebook','report','call','offices','debrief','debrief-loss'] as const;
type Page = typeof pages[number];
// Entrypoint intentionally mounts this isolated fixture rather than exporting it.
// eslint-disable-next-line react-refresh/only-export-components
function Preview() {
  const [page,setPage] = useState<Page>('dialogue');
  const [lineIndex,setLineIndex] = useState(0);
  const [visible,setVisible] = useState(999);
  const [fileOpen,setFileOpen] = useState(false);
  const [focusDoc,setFocusDoc] = useState<'policy'|'sales-summary'|'individual-records'|null>(null);
  const [tools,setTools] = useState<ToolId[]>(['mean','median','range','sd','iqr']);
  const [run0] = useState(() => newRun('preview'));
  const [answers,setAnswers] = useState<Record<QuestionId,string|null>>({center:null,spread:null});
  const [qp,setQp] = useState<0|1>(0);
  const [sending,setSending] = useState(false);
  const [caller,setCaller] = useState<'mahmoud'|'marwan'>('mahmoud');
  const switchPage = (next:Page) => { setPage(next); setFileOpen(false); };
  const shot = page === 'analysis' || page === 'notebook' ? 'analyst-male' : page === 'report' ? 'report-female' : page.startsWith('debrief') ? 'completed-folder' : page === 'offices' ? 'corridor' : 'hr-female';
  const line = SCRIPT.hr[lineIndex % SCRIPT.hr.length];
  return <main className="rd-root rd-preview" dir="rtl" data-phase={page==='analysis'?'workbench':page==='notebook'?'notebook':page==='report'?'report':page.startsWith('debrief')?'debrief':page}><ScenePlayer sceneKey={shot}>
    <GameHud count={8} onFile={() => { setFocusDoc(null); setFileOpen(true); }} onPause={() => {}} onExit={() => {}} />
    <div className="rd-preview-menu" aria-label="شاشات المعاينة">{pages.map(id => <button key={id} onClick={() => switchPage(id)} aria-pressed={page===id}>{id}</button>)}</div>
    <div className="rd-content"><div>
      {page === 'dialogue' && <DialoguePanel line={line} lines={SCRIPT.hr} index={lineIndex % SCRIPT.hr.length} total={SCRIPT.hr.length} visible={visible} paused={fileOpen} gender="female" delivered={true} onVisible={setVisible} onAdvance={() => { setLineIndex(i => i+1); setVisible(999); }} onOpenDocument={id => { setFocusDoc(id); setFileOpen(false); }} />}
      {page === 'file' && <Panel title="ملف التحليل"><button className="rd-button rd-button-primary" onClick={() => setFileOpen(true)}>فتح ملف التحليل</button></Panel>}
      {page === 'analysis' && <RoomFrame kicker="محطة فحص البيانات" title="غرفة التحليل" subtitle="شغّل أدواتك عشان تقرأ شكل التوزيع لكل فريق." icon={null} onBack={() => switchPage('offices')} onFile={() => setFileOpen(true)} timer={<CaseTimer read={() => 267000} running={false}/>} tabs={<RoomTabs active="charts" onCharts={() => {}} onNotebook={() => switchPage('notebook')}/>}><ChartBoard ready used={tools} visible={tools} active={tools[tools.length-1] ?? null} onToggle={id => setTools(x => x.includes(id) ? x.filter(t => t!==id) : [...x,id])} onBack={() => switchPage('offices')}/></RoomFrame>}
      {page === 'notebook' && <RoomFrame kicker="محطة فحص البيانات" title="دفتر الاستنتاجات" subtitle="سجّل ملاحظاتك التحليلية قبل تثبيت المراجعة." icon={null} onBack={() => switchPage('offices')} onFile={() => setFileOpen(true)} timer={<CaseTimer read={() => 267000} running={false}/>} tabs={<RoomTabs active="notebook" onCharts={() => switchPage('analysis')} onNotebook={() => {}}/>}><DeductionNotebook answers={answers} order={run0.choiceOrder} page={qp} used={tools} locked={false} onAnswer={(q,id) => setAnswers(a => ({...a,[q]:id}))} onPage={setQp} onCharts={() => switchPage('analysis')} onReview={() => switchPage('report')}/></RoomFrame>}
      {page === 'report' && <RoomFrame kicker="محطة فحص البيانات" title="تقديم التقرير النهائي" subtitle="راجع الاستنتاجات وبعدين ابعت التقرير لشريف." icon={null} onBack={() => switchPage('offices')} onFile={() => setFileOpen(true)} timer={<CaseTimer read={() => 267000} running={false}/>}><FinalReport runId={run0.runId} answers={{center:answers.center ?? 'center_a',spread:answers.spread ?? 'spread_c'}} docs={['sales-summary','individual-records','policy']} sending={sending} onReview={() => switchPage('notebook')} onSubmit={() => setSending(true)} onSent={() => switchPage('debrief')}/></RoomFrame>}
      {page === 'call' && <IncomingCall caller={caller} paused onAnswer={() => setCaller(x => x==='mahmoud'?'marwan':'mahmoud')} />}
      {false && <Panel title="مكاتب شركة روّاد"><div className="rd-office-map"><button><b>مكتب مدير المبيعات</b><small>حسام</small></button><button><b>مكتب الموارد البشرية</b><small>داليا</small></button><button onClick={() => switchPage('analysis')}><b>مكتب المحلل</b><small>شاشة التحليل</small></button></div></Panel>}
      {page === 'offices' && <OfficeCorridor visited={[]} docs={[]} onVisit={() => switchPage('dialogue')}/>}
      {page === 'debrief' && <GameResults score={2} activeMs={267000} onReplay={() => switchPage('analysis')} onExit={() => {}}/>}
      {page === 'debrief-loss' && <GameResults score={1} activeMs={267000} onReplay={() => switchPage('analysis')} onExit={() => {}}/>}
    </div></div>
    {focusDoc && <DocumentReader id={focusDoc} onClose={() => setFocusDoc(null)}/>}
    {fileOpen && <CaseFile docs={['sales-summary','individual-records','policy']} tools={tools} focus={focusDoc} submitted={null} onClose={() => setFileOpen(false)} />}
  </ScenePlayer></main>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<SoundProvider><Preview /></SoundProvider>);
