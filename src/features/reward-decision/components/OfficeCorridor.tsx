import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Briefcase, Users } from 'lucide-react';
import type { DocumentId } from '../data/case';

type Place = 'sales' | 'hr' | 'workbench';
const OFFICES = [
  { id: 'sales' as const, title: 'مكتب مدير المبيعات', name: 'حسام', Icon: Briefcase, doc: 'individual-records' as const },
  { id: 'hr' as const, title: 'مكتب الموارد البشرية', name: 'داليا', Icon: Users, doc: 'policy' as const },
  { id: 'workbench' as const, title: 'مكتب المحلل', name: 'شاشة التحليل', Icon: BarChart3, doc: null },
];

/** Location markers over the corridor scene (the ScenePlayer artwork stays visible behind). */
export function OfficeCorridor({ visited, docs, onVisit, playSound }: { visited: ('sales'|'hr')[]; docs: DocumentId[]; onVisit: (place: Place) => void; playSound?: (type:'doorKnock'|'doorCreak')=>void; gender?: 'male'|'female' }) {
  const [entering,setEntering] = useState<Place|null>(null);
  return <section className="rd-corridor rd-locations" aria-label="مكاتب شركة روّاد">
    <header><small>شركة روّاد للأجهزة الكهربائية</small><h2>اختر وجهتك</h2></header>
    <div className="rd-location-row">{OFFICES.map((office, i) => {
      const isNew = office.doc !== null && !docs.includes(office.doc) && !visited.includes(office.id as 'sales'|'hr');
      const done = office.doc !== null && visited.includes(office.id as 'sales'|'hr');
      return <motion.button type="button" key={office.id} data-dest={office.id} disabled={entering!==null}
        className={`rd-location ${entering===office.id?'is-entering':''} ${done?'is-visited':''}`}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 * i, duration: .3 }}
        whileHover={{ y: -4 }} whileTap={{ scale: .95 }}
        onPointerEnter={event=>{if(event.pointerType==='mouse')playSound?.('doorCreak');}}
        onClick={()=>{setEntering(office.id);playSound?.('doorKnock');onVisit(office.id);}}>
        <span className="rd-location-icon"><office.Icon aria-hidden="true"/></span>
        <span className="rd-location-text"><b>{office.title}</b><small>{office.name}</small></span>
        {isNew && <span className="rd-location-new">مستند جديد</span>}
        {done && <span className="rd-location-done">تمت الزيارة</span>}
      </motion.button>;
    })}</div>
  </section>;
}
