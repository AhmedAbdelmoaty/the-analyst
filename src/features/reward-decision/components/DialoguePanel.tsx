import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { PORTRAITS } from '../data/assets';
import { SPEAKERS, type Line } from '../data/script';

const MS_PER_GRAPHEME = 34; // ≈30 graphemes/second, per the contract

const splitGraphemes = (text: string): string[] => {
  const Seg = (Intl as unknown as { Segmenter?: new (l: string, o: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  return Seg ? Array.from(new Seg('ar', { granularity: 'grapheme' }).segment(text), s => s.segment) : Array.from(text);
};

export function DialoguePanel({ line, index, total, visible, paused, gender, onVisible, onAdvance }: {
  line: Line; index: number; total: number; visible: number; paused: boolean; gender: 'male' | 'female' | null;
  onVisible: (n: number) => void; onAdvance: () => void;
}) {
  const graphemes = useMemo(() => splitGraphemes(line.text), [line.text]);
  const shown = Math.min(visible, graphemes.length);
  const lock = useRef(0);
  useEffect(() => {
    if (paused || shown >= graphemes.length) return;
    const id = window.setTimeout(() => onVisible(Math.min(graphemes.length, shown + 1)), MS_PER_GRAPHEME);
    return () => clearTimeout(id);
  }, [paused, shown, graphemes.length, onVisible]);
  const who = SPEAKERS[line.speaker];
  const portrait = line.speaker === 'player' ? PORTRAITS[gender === 'female' ? 'player_female' : 'player_male'] : PORTRAITS[line.speaker];
  const done = shown >= graphemes.length;
  const click = () => {
    if (paused) return;
    const now = Date.now();
    if (now - lock.current < 220) return; // rapid taps never skip several lines
    lock.current = now;
    if (!done) onVisible(graphemes.length); else onAdvance();
  };
  return (
    <button className="rd-dialogue" data-line={line.id} data-speaker={line.speaker} onClick={click} aria-label={done ? 'متابعة الحوار' : 'إكمال النص'}>
      {portrait ? <img src={portrait} alt="" /> : <span className="rd-initial" aria-hidden="true">{who.name.slice(0, 1)}</span>}
      <div>
        <header><span>{who.name}</span><small>{who.role}</small><em>{index + 1}/{total}</em></header>
        <p>{graphemes.slice(0, shown).join('')}{!done && <i aria-hidden="true" />}</p>
      </div>
      {done && <ChevronLeft className="rd-next" />}
    </button>
  );
}
