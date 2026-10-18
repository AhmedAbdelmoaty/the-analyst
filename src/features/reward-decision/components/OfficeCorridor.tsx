import { useState } from 'react';
import { PORTRAITS, SHOT_ASSETS } from '../data/assets';
import type { DocumentId } from '../data/case';
import { ActionButton } from './Ui';

type Place = 'sales' | 'hr' | 'workbench';
const OFFICES = [
  { id: 'sales' as const, title: 'مكتب مدير المبيعات', name: 'حسام', shot: 'A11', portrait: PORTRAITS.hossam, doc: 'individual-records' as const },
  { id: 'hr' as const, title: 'مكتب الموارد البشرية', name: 'داليا', shot: 'A13', portrait: PORTRAITS.dalia, doc: 'policy' as const },
  { id: 'workbench' as const, title: 'مكتب المحلل', name: 'شاشة التحليل', shot: 'A15', portrait: null, doc: null },
];

export function OfficeCorridor({ visited, docs, onVisit, playSound }: { visited: ('sales'|'hr')[]; docs: DocumentId[]; onVisit: (place: Place) => void; playSound?: (type:'doorKnock'|'doorCreak')=>void }) {
  const [entering,setEntering] = useState<Place|null>(null);
  return <section className="rd-corridor" aria-label="مكاتب شركة روّاد"><header><small>شركة روّاد للأجهزة الكهربائية</small><h2>مكاتب شركة روّاد</h2></header><div className="rd-corridor-doors">{OFFICES.map(office=><ActionButton variant="quiet" key={office.id} data-dest={office.id} className={`rd-office-door ${entering===office.id?'is-entering':''}`} onPointerEnter={event=>{if(event.pointerType==='mouse')playSound?.('doorCreak');}} onClick={()=>{setEntering(office.id);playSound?.('doorKnock');onVisit(office.id);}}>
    <span className="rd-door-frame"><picture><source media="(max-width:640px)" srcSet={SHOT_ASSETS[office.shot].portrait}/><img src={SHOT_ASSETS[office.shot].landscape} alt=""/></picture><span className="rd-door-leaf"><span className="rd-door-window">{office.portrait&&<img src={office.portrait} alt=""/>}</span><i className="rd-door-handle"/></span></span>
    <span className="rd-door-plaque"><b>{office.title}</b><small>{office.name}</small></span>
    {office.doc&&<span className="rd-door-status">{docs.includes(office.doc)?'المستندات متاحة':visited.includes(office.id as 'sales'|'hr')?'تمت الزيارة':'مستند جديد'}</span>}
  </ActionButton>)}</div></section>;
}