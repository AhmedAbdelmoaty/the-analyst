import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Check, HelpCircle, RotateCcw, Save } from 'lucide-react';
import { EVIDENCE, EVIDENCE_ORDER, TEAMS, type EvidenceId, type TeamId } from '../data/case';
import { stats } from '../engine/statistics';
import { evidenceFigures } from '../engine/evidence';
import type { ToolState } from '../engine/model';
import { ActionButton, Panel } from './Ui';

const TEAM_IDS: TeamId[] = ['marwan', 'mahmoud'];
/** Fixed, non-sorted presentation order of the individual cards (indices into the sorted record). */
const SHUFFLE = [6, 2, 9, 0, 4, 7, 1, 8, 3, 5];
const SCALE_MIN = 70, SCALE_MAX = 150;
const pos = (v: number) => `${((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100}%`;
const sortedMembers = (t: TeamId) => [...TEAMS[t].members].sort((a, b) => a.value - b.value);
const shuffledMembers = (t: TeamId) => SHUFFLE.map(i => TEAMS[t].members[i]);
const medianIds = (t: TeamId) => { const s = sortedMembers(t); return [s[4].id, s[5].id]; };
const endIds = (t: TeamId) => { const s = sortedMembers(t); return [s[0].id, s[9].id]; };

function Result({ id }: { id: EvidenceId }) {
  const f = evidenceFigures(id);
  return <div className="rd-tool-result" data-testid="tool-result">{TEAM_IDS.map(t => <div key={t}><small>{TEAMS[t].name}</small><strong>{f[t]}</strong></div>)}</div>;
}

function Cards({ team, sorted, selected, onPick, hit }: { team: TeamId; sorted: boolean; selected: string[]; onPick?: (id: string) => void; hit?: (id: string) => boolean }) {
  const list = sorted ? sortedMembers(team) : shuffledMembers(team);
  return (
    <div className="rd-cards-row">
      <b>{TEAMS[team].name}</b>
      <div className="rd-cards">
        {list.map((m, i) => (
          <motion.button layout transition={{ duration: 0.25 }} key={m.id} type="button" data-card={m.id}
            className={`rd-card ${selected.includes(m.id) ? 'picked' : ''} ${hit?.(m.id) ? 'hit' : ''}`}
            onClick={() => onPick?.(m.id)} disabled={!onPick} aria-pressed={selected.includes(m.id)}>
            {sorted && <small>{i + 1}</small>}<span>{m.value}%</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Scale({ team, mode, band, line }: { team: TeamId; mode: 'mean' | 'actual'; band?: [number, number]; line?: number }) {
  const s = stats(team);
  const seen: Record<number, number> = {};
  return (
    <div className="rd-scale-row">
      <b>{TEAMS[team].name}</b>
      <div className="rd-scale" dir="ltr">
        {band && <span className="rd-band" style={{ left: pos(band[0]), width: `calc(${pos(band[1])} - ${pos(band[0])})` }} />}
        <span className="rd-mean" style={{ left: pos(s.mean) }} title="المتوسط" />
        {line !== undefined && <span className="rd-threshold" style={{ left: pos(line) }}><em>{line}%</em></span>}
        {s.values.map((v, i) => {
          const stack = (seen[v] = (seen[v] ?? -1) + 1); // equal values stack vertically, never shift their value
          return <span key={i} className={`rd-dot ${line !== undefined && v >= line ? 'over' : ''}`} style={{ left: pos(mode === 'mean' ? s.mean : v), bottom: `${0.35 + stack * 0.55}rem` }} />;
        })}
      </div>
    </div>
  );
}

const ticks = <div className="rd-scale-ticks" dir="ltr">{[70, 85, 100, 125, 150].map(t => <span key={t} style={{ left: pos(t) }}>{t}</span>)}</div>;

function Tool({ id, st, set, policy, onOpenPolicy }: { id: EvidenceId; st: ToolState; set: (s: ToolState) => void; policy: boolean; onOpenPolicy: () => void }) {
  const [hint, setHint] = useState('');
  const pick = (cid: string, ok: (cid: string) => boolean, msg: string) => {
    if (!ok(cid)) { setHint(msg); return; }
    setHint('');
    set({ ...st, selected: st.selected.includes(cid) ? st.selected.filter(x => x !== cid) : [...st.selected, cid] });
  };
  switch (id) {
    case 'ev_mean': {
      const placed = (t: TeamId) => st.selected.includes(t);
      return <>
        <p className="rd-lead">ضع بطاقتي الفريقين في مساحة المقارنة.</p>
        <div className="rd-team-pick">{TEAM_IDS.map(t => <button key={t} data-place={t} className={placed(t) ? 'selected' : ''} onClick={() => !placed(t) && set({ ...st, selected: [...st.selected, t] })}>{placed(t) ? `${TEAMS[t].name} في المقارنة` : `ضع بطاقة ${TEAMS[t].name}`}</button>)}</div>
        {TEAM_IDS.every(placed) && <Result id={id} />}
      </>;
    }
    case 'ev_median': {
      const target = TEAM_IDS.flatMap(medianIds);
      const done = target.every(x => st.selected.includes(x));
      return <>
        {st.step === 0 ? <><p className="rd-lead">رتّب نتائج كل فريق أولًا.</p>{TEAM_IDS.map(t => <Cards key={t} team={t} sorted={false} selected={[]} />)}<ActionButton onClick={() => set({ step: 1, selected: [] })}>ترتيب النتائج</ActionButton></>
          : <><p className="rd-lead">حدّد موضع المنتصف في كل فريق. في عشر نتائج يقع المنتصف بين البطاقتين الخامسة والسادسة.</p>
            {TEAM_IDS.map(t => <Cards key={t} team={t} sorted selected={st.selected} onPick={cid => pick(cid, x => medianIds(t).includes(x), 'المنتصف بين البطاقتين الخامسة والسادسة بعد الترتيب.')} />)}
            {!done && <ActionButton variant="quiet" onClick={() => set({ ...st, selected: target })}>عرض موضع المنتصف</ActionButton>}</>}
        {hint && <p className="rd-hint">{hint}</p>}
        {done && <Result id={id} />}
      </>;
    }
    case 'ev_range': {
      const target = TEAM_IDS.flatMap(endIds);
      const done = target.every(x => st.selected.includes(x));
      return <>
        <p className="rd-lead">حدّد أقل وأعلى بطاقة في كل فريق.</p>
        {TEAM_IDS.map(t => <Cards key={t} team={t} sorted={st.step === 1} selected={st.selected} onPick={cid => pick(cid, x => endIds(t).includes(x), 'حدد طرفَي النتائج بعد ترتيبها.')} />)}
        {st.step === 0 && !done && <ActionButton variant="secondary" onClick={() => set({ ...st, step: 1 })}>ترتيب النتائج</ActionButton>}
        {hint && <p className="rd-hint">{hint}</p>}
        {done && <Result id={id} />}
      </>;
    }
    case 'ev_sd':
      return <>
        {st.step === 0 && <><p className="rd-lead">انقل النتائج من البطاقات إلى المقياس.</p>{TEAM_IDS.map(t => <Cards key={t} team={t} sorted={false} selected={[]} />)}<ActionButton onClick={() => set({ ...st, step: 1 })}>نقل النتائج إلى المقياس</ActionButton></>}
        {st.step >= 1 && <><p className="rd-lead">{st.step === 1 ? 'الخط يمثل متوسط كل فريق. أظهر ابتعاد النتائج عنه.' : 'كل نقطة في موضع نتيجتها الفعلية على نفس المقياس.'}</p>
          {TEAM_IDS.map(t => <Scale key={t} team={t} mode={st.step === 1 ? 'mean' : 'actual'} />)}{ticks}
          {st.step === 1 && <ActionButton onClick={() => set({ ...st, step: 2 })}>إظهار الابتعاد عن المتوسط</ActionButton>}</>}
        {st.step === 2 && <Result id={id} />}
      </>;
    case 'ev_iqr':
      return <>
        {st.step === 0 && <><p className="rd-lead">رتّب النتائج أولًا.</p>{TEAM_IDS.map(t => <Cards key={t} team={t} sorted={false} selected={[]} />)}<ActionButton onClick={() => set({ ...st, step: 1 })}>ترتيب النتائج</ActionButton></>}
        {st.step >= 1 && <>{TEAM_IDS.map(t => { const s = stats(t); return <Scale key={t} team={t} mode="actual" band={st.step === 2 ? [s.q1, s.q3] : undefined} />; })}{ticks}
          {st.step === 1 && <ActionButton onClick={() => set({ ...st, step: 2 })}>كشف نطاق النصف الأوسط</ActionButton>}</>}
        {st.step === 2 && <Result id={id} />}
      </>;
    case 'ev_threshold':
      if (!policy) return <><p className="rd-lead">الفحص ده محتاج نص معيار التكريم.</p><ActionButton variant="secondary" onClick={onOpenPolicy}>فتح وثيقة المعيار</ActionButton></>;
      return <>
        <p className="rd-lead">{st.step === 0 ? 'طبّق معيار 85% من الوثيقة على الفريقين.' : 'النقاط عند الخط أو بعده بلغت المعيار.'}</p>
        {TEAM_IDS.map(t => <Scale key={t} team={t} mode="actual" line={st.step === 1 ? 85 : undefined} />)}{ticks}
        {st.step === 0 && <ActionButton onClick={() => set({ ...st, step: 1 })}>تطبيق المعيار</ActionButton>}
        {st.step === 1 && <Result id={id} />}
      </>;
  }
}

const complete = (id: EvidenceId, st: ToolState) => {
  if (id === 'ev_mean') return TEAM_IDS.every(t => st.selected.includes(t));
  if (id === 'ev_median') return TEAM_IDS.flatMap(medianIds).every(x => st.selected.includes(x));
  if (id === 'ev_range') return TEAM_IDS.flatMap(endIds).every(x => st.selected.includes(x));
  if (id === 'ev_threshold') return st.step === 1;
  return st.step === 2;
};

export function Workbench({ available, saved, policy, active, tools, onOpen, onTool, onSave, onBack, onOpenPolicy, onRecommendation, onLeaders }: {
  available: boolean; saved: EvidenceId[]; policy: boolean; active: EvidenceId | null; tools: Partial<Record<EvidenceId, ToolState>>;
  onOpen: (id: EvidenceId | null) => void; onTool: (id: EvidenceId, s: ToolState) => void; onSave: (id: EvidenceId) => void;
  onBack: () => void; onOpenPolicy: () => void; onRecommendation: () => void; onLeaders: () => void;
}) {
  const [help, setHelp] = useState(false);
  if (!available) return <Panel title="طاولة الفحص" onBack={onBack}><p>افتح كشف نتائج الأفراد من مكتب المبيعات علشان تبدأ الفحص.</p><ActionButton onClick={onBack}>العودة</ActionButton></Panel>;
  if (active) {
    const e = EVIDENCE[active];
    const st = tools[active] ?? { step: 0, selected: [] };
    const ok = complete(active, st);
    return (
      <Panel title={`${e.action} · ${e.title}`} onBack={() => onOpen(null)}>
        <div className="rd-tool" data-tool={active}>
          <button className="rd-help-toggle" onClick={() => setHelp(h => !h)}><HelpCircle /> ما هذا المقياس؟</button>
          {help && <p className="rd-help">{e.meaning}</p>}
          <Tool id={active} st={st} set={s => onTool(active, s)} policy={policy} onOpenPolicy={onOpenPolicy} />
          <div className="rd-actions">
            {ok && <ActionButton disabled={saved.includes(active)} onClick={() => onSave(active)}>{saved.includes(active) ? <><Check /> محفوظة في الملف</> : <><Save /> حفظ المقارنة</>}</ActionButton>}
            {(st.step > 0 || st.selected.length > 0) && <ActionButton variant="secondary" onClick={() => onTool(active, { step: 0, selected: [] })}><RotateCcw /> إعادة الفحص</ActionButton>}
            <ActionButton variant="secondary" onClick={() => onOpen(null)}>أدوات أخرى</ActionButton>
          </div>
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="طاولة الفحص" onBack={onBack}>
      <p className="rd-lead">اختر فعل فحص. النتيجة تظهر بعد ما تنفّذه.</p>
      <div className="rd-tool-grid">{EVIDENCE_ORDER.map(id => <button key={id} data-open-tool={id} onClick={() => onOpen(id)}><BarChart3 /><b>{EVIDENCE[id].action}</b><small>{saved.includes(id) ? 'محفوظة في الملف' : tools[id] ? 'استكمال الفحص' : 'ابدأ الفحص'}</small></button>)}</div>
      <div className="rd-actions">
        <ActionButton variant="secondary" onClick={onLeaders}>استيضاح من القائدين</ActionButton>
        {saved.length >= 2 && policy && <ActionButton onClick={onRecommendation}>تجهيز التوصية</ActionButton>}
      </div>
    </Panel>
  );
}
