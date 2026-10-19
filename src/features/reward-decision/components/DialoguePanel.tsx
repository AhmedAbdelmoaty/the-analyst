import { useEffect, useRef } from 'react';
import { ChevronLeft, FileText } from 'lucide-react';
import { DOCUMENTS } from '../data/case';
import { PORTRAITS } from '../data/assets';
import { SPEAKERS, type Line } from '../data/script';
import { graphemes } from '../engine/narrativeClock';
import { dialogueTone } from '../presentation';

export function DialoguePanel({ line, lines, index, total, visible, paused, gender, delivered, onVisible, onOpenDocument, onCardShown }: {
  line: Line; lines: readonly Line[]; index: number; total: number; visible: number; paused: boolean;
  gender: 'male' | 'female' | null; delivered?: boolean; onVisible: (n: number) => void;
  onOpenDocument?: (id: NonNullable<Line['documentId']>) => void;
  onCardShown?: (id: NonNullable<Line['documentId']>, element: HTMLElement) => void;
}) {
  const parts = graphemes(line.text);
  const shown = Math.min(visible, parts.length);
  const cardRef = useRef<HTMLButtonElement>(null);
  const who = SPEAKERS[line.speaker];
  const portrait = line.speaker === 'player' ? PORTRAITS[gender === 'female' ? 'player_female' : 'player_male']
    : line.speaker === 'narrator' ? null : PORTRAITS[line.speaker];
  const done = shown >= parts.length;
  useEffect(() => {
    if (done && !paused && line.documentId && cardRef.current) onCardShown?.(line.documentId, cardRef.current);
  }, [done, paused, line.documentId, onCardShown]);

  return <section className={`rd-dialogue rd-dialogue-${dialogueTone(lines, line.speaker)}`} data-line={line.id} data-speaker={line.speaker}>
    {portrait ? <span className="rd-portrait" aria-hidden="true"><b>{who.name.slice(0, 1)}</b><img src={portrait} alt="" onError={event => { event.currentTarget.hidden = true; }}/></span>
      : <span className="rd-initial" aria-hidden="true">{who.name.slice(0, 1)}</span>}
    <div><header><span>{who.name}</span><small>{who.role}</small><em>{index + 1}/{total}</em></header>
      <button className="rd-dialogue-copy" disabled={done || paused} onClick={() => onVisible(parts.length)}
        aria-label="إظهار النص كاملًا"><p>{parts.slice(0, shown).join('')}{!done && <i aria-hidden="true"/>}</p></button>
      {done && line.documentId && <button ref={cardRef} className={`rd-inline-document ${delivered ? 'is-delivered' : ''}`}
        onClick={() => { if (line.documentId) onOpenDocument?.(line.documentId); }}>
        <FileText/><span><small>{delivered ? 'محفوظ في ملف التحليل' : 'مستند جديد'}</small><b>{DOCUMENTS[line.documentId].title}</b></span><ChevronLeft/>
      </button>}
    </div>
  </section>;
}
