import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { SoundProvider } from '../src/hooks/useSoundEffects';
import '@fontsource/cairo/400.css';
import '@fontsource/cairo/700.css';
import { ScenePlayer } from '../src/features/reward-decision/components/ScenePlayer';
import { DialoguePanel } from '../src/features/reward-decision/components/DialoguePanel';
import { CaseFile } from '../src/features/reward-decision/components/CaseFile';
import { Workbench } from '../src/features/reward-decision/components/Workbench';
import { Recommendation } from '../src/features/reward-decision/components/Recommendation';
import { IncomingCall } from '../src/features/reward-decision/components/IncomingCall';
import { GameHud, Panel } from '../src/features/reward-decision/components/Ui';
import { SCRIPT } from '../src/features/reward-decision/data/script';
import { emptyDraft, type DraftReport } from '../src/features/reward-decision/engine/model';
import type { TeamId, ToolId } from '../src/features/reward-decision/data/case';
import '../src/features/reward-decision/reward-decision.css';
import '../src/features/reward-decision/reward-decision.polish.css';
import '../src/features/reward-decision/reward-decision.stage.css';
import '../src/features/reward-decision/reward-decision.world.css';
import { DocumentReader } from '../src/features/reward-decision/components/DocumentReader';
import { OfficeCorridor } from '../src/features/reward-decision/components/OfficeCorridor';

// Isolated visual fixture: it never mounts Auth, analytics, saves, or the game controller.
const pages = ['dialogue','file','analysis','recommendation','call','offices','debrief'] as const;
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
  const [active,setActive] = useState<TeamId>('marwan');
  const [draft,setDraft] = useState<DraftReport>(emptyDraft());
  const [caller,setCaller] = useState<'mahmoud'|'marwan'>('mahmoud');
  const switchPage = (next:Page) => { setPage(next); setFileOpen(false); };
  const shot = page === 'analysis' ? 'analyst-male' : page === 'recommendation' ? 'report-female' : page === 'offices' ? 'corridor' : 'hr-female';
  const line = SCRIPT.hr[lineIndex % SCRIPT.hr.length];
  return <main className="rd-root rd-preview" dir="rtl"><ScenePlayer sceneKey={shot}>
    <GameHud count={8} onFile={() => { setFocusDoc(null); setFileOpen(true); }} onPause={() => {}} onExit={() => {}} />
    <div className="rd-preview-menu" aria-label="شاشات المعاينة">{pages.map(id => <button key={id} onClick={() => switchPage(id)} aria-pressed={page===id}>{id}</button>)}</div>
    <div className="rd-content"><div>
      {page === 'dialogue' && <DialoguePanel line={line} lines={SCRIPT.hr} index={lineIndex % SCRIPT.hr.length} total={SCRIPT.hr.length} visible={visible} paused={fileOpen} gender="female" delivered={true} onVisible={setVisible} onAdvance={() => { setLineIndex(i => i+1); setVisible(999); }} onOpenDocument={id => { setFocusDoc(id); setFileOpen(false); }} />}
      {page === 'file' && <Panel title="ملف التحليل"><button className="rd-button rd-button-primary" onClick={() => setFileOpen(true)}>فتح ملف التحليل</button></Panel>}
      {page === 'analysis' && <Workbench used={tools} visible={tools} activeTeam={active} onToggle={id => setTools(x => x.includes(id) ? x.filter(t => t!==id) : [...x,id])} onTeam={setActive} onBack={() => switchPage('offices')} onRecommendation={() => switchPage('recommendation')} />}
      {page === 'recommendation' && <Recommendation draft={draft} docs={['sales-summary','individual-records','policy']} tools={tools} onChange={setDraft} onSubmit={() => switchPage('debrief')} onBack={() => switchPage('analysis')} />}
      {page === 'call' && <IncomingCall caller={caller} paused onAnswer={() => setCaller(x => x==='mahmoud'?'marwan':'mahmoud')} />}
      {false && <Panel title="مكاتب شركة روّاد"><div className="rd-office-map"><button><b>مكتب مدير المبيعات</b><small>حسام</small></button><button><b>مكتب الموارد البشرية</b><small>داليا</small></button><button onClick={() => switchPage('analysis')}><b>مكتب المحلل</b><small>شاشة التحليل</small></button></div></Panel>}
      {page === 'offices' && <OfficeCorridor visited={[]} docs={[]} onVisit={() => switchPage('dialogue')}/>}
      {page === 'debrief' && <Panel title="خلاصة قرارك"><div className="rd-final-report"><b>فريق محمود</b><span>سياسة التكريم</span><p>تظهر هنا خلاصة القرار وفق النتيجة.</p></div></Panel>}
    </div></div>
    {focusDoc && <DocumentReader id={focusDoc} onClose={() => setFocusDoc(null)}/>}
    {fileOpen && <CaseFile docs={['sales-summary','individual-records','policy']} tools={tools} focus={focusDoc} submitted={null} onClose={() => setFileOpen(false)} />}
  </ScenePlayer></main>;
}
const root = document.getElementById('root');
if (root) createRoot(root).render(<SoundProvider><Preview /></SoundProvider>);
