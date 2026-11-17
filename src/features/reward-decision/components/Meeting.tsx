import { motion } from 'framer-motion';
import { ArrowLeft, Check, Scale } from 'lucide-react';
import type { Level1Decision } from '../data/case';
import { PORTRAITS } from '../data/assets';

const OPTIONS: { id: Level1Decision; person: string; title: string; reason: string; portrait: string }[] = [
  { id: 'marwan', person: 'مروان', title: 'تكريم فريق مروان', reason: 'المتوسط الأعلى (95%)', portrait: PORTRAITS.marwan },
  { id: 'mahmoud', person: 'محمود', title: 'تكريم فريق محمود', reason: 'الوسيط الأعلى (88%)', portrait: PORTRAITS.mahmoud },
  { id: 'defer', person: 'داليا', title: 'تأجيل القرار لمراجعة مؤشرات إضافية', reason: 'المتوسط والوسيط غير كافيين', portrait: PORTRAITS.dalia },
];

export function DecisionBoard({ selected, onSelect, onConfirm }: {
  selected?: Level1Decision;
  onSelect: (decision: Level1Decision) => void;
  onConfirm: () => void;
}) {
  return <section className="rd-decision-board" aria-labelledby="rd-decision-title">
    <header><span><Scale aria-hidden="true" /></span><div><p>قاعة الاجتماعات</p><h2 id="rd-decision-title">قرارك هيحسم التكريم</h2><small>اختار التوصية اللي هتتحول لقرار رسمي.</small></div></header>
    <div className="rd-decision-cards" role="radiogroup" aria-label="خيارات قرار التكريم">
      {OPTIONS.map((option, index) => {
        const isSelected = selected === option.id;
        return <motion.button key={option.id} type="button" role="radio" aria-checked={isSelected} className={`rd-decision-card ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(option.id)} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }} whileTap={{ scale: .97 }}>
          <span className="rd-decision-check" aria-hidden="true"><Check /></span>
          <img src={option.portrait} alt="" />
          <small>{option.person}</small><strong>{option.title}</strong><p>{option.reason}</p>
        </motion.button>;
      })}
    </div>
    <motion.button type="button" className="rd2-btn rd2-btn-gold rd2-btn-lg rd-decision-confirm" disabled={!selected} onClick={onConfirm} whileTap={selected ? { scale: .97 } : undefined}>اعتماد القرار الرسمي <ArrowLeft aria-hidden="true" /></motion.button>
  </section>;
}
