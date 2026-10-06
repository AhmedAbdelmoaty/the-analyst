import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { DOCUMENTS } from '../data/case';
import { PORTRAITS } from '../data/assets';
import { SPEAKERS, type Line } from '../data/script';

const splitGraphemes = (text: string): string[] => { const Seg = (Intl as unknown as { Segmenter?: new (l:string,o:{granularity:string}) => { segment:(t:string)=>Iterable<{segment:string}> } }).Segmenter; return Seg ? Array.from(new Seg('ar',{granularity:'grapheme'}).segment(text), s => s.segment) : Array.from(text); };
export function DialoguePanel({ line, index, total, visible, paused, gender, delivered, onVisible, onAdvance, onOpenDocument }: { line:Line; index:number; total:number; visible:number; paused:boolean; gender:'male'|'female'|null; delivered?:boolean; onVisible:(n:number)=>void; onAdvance:()=>void; onOpenDocument?:(id:NonNullable<Line['documentId']>)=>void }) {
  const graphemes = useMemo(() => splitGraphemes(line.text), [line.text]); const shown = Math.min(visible,graphemes.length); const lock = useRef(0);
  useEffect(() => { if(paused || shown>=graphemes.length) return; const delay=Math.max(24,Math.min(42,1900/graphemes.length)); const id=window.setTimeout(()=>onVisible(Math.min(graphemes.length,shown+1)),delay); return()=>clearTimeout(id); },[paused,shown,graphemes.length,onVisible]);
  const who=SPEAKERS[line.speaker]; const portrait=line.speaker==='player'?PORTRAITS[gender==='female'?'player_female':'player_male']:PORTRAITS[line.speaker]; const done=shown>=graphemes.length;
  const click=()=>{ if(paused)return; const now=Date.now(); if(now-lock.current<220)return; lock.current=now; if(!done)onVisible(graphemes.length);else onAdvance(); };
  return <section className={`rd-dialogue rd-dialogue-${who.tone}`} data-line={line.id} data-speaker={line.speaker}>
    {portrait?<span className="rd-portrait" aria-hidden="true"><b>{who.name.slice(0,1)}</b><img src={portrait} alt="" onError={e=>{e.currentTarget.hidden=true}}/></span>:<span className="rd-initial" aria-hidden="true">{who.name.slice(0,1)}</span>}
    <div><header><span>{who.name}</span><small>{who.role}</small><em>{index+1}/{total}</em></header><button className="rd-dialogue-copy" onClick={click} aria-label={done?'متابعة الحوار':'إكمال النص'}><p>{graphemes.slice(0,shown).join('')}{!done&&<i aria-hidden="true"/>}</p>{done&&<ChevronLeft className="rd-next"/>}</button>
      {done&&line.documentId&&<button className={`rd-inline-document ${delivered?'is-delivered':''}`} onClick={()=>{ if(line.documentId) onOpenDocument?.(line.documentId); }}><FileText/><span><small>{delivered?'محفوظ في ملف التحليل':'مستند جديد'}</small><b>{DOCUMENTS[line.documentId].title}</b></span><ChevronLeft/></button>}
    </div>
  </section>;
}