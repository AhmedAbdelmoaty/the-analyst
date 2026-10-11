import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useSceneAmbience } from '@/hooks/useSceneAudio';
import { PORTRAITS } from '../data/assets';
import { SPEAKERS, type Speaker } from '../data/script';
import { ActionButton } from './Ui';

export function IncomingCall({ caller, paused, onAnswer }: {
  caller: Extract<Speaker, 'mahmoud' | 'marwan'>;
  paused: boolean;
  onAnswer: () => void;
}) {
  useSceneAmbience(paused ? null : 'phone_ringtone');
  const who = SPEAKERS[caller];
  const portrait = PORTRAITS[caller];

  return <motion.section className="rd-incoming-call" data-testid="rd-incoming-call" data-caller={caller} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
    <p>مكالمة واردة</p>
    <motion.div className="rd-caller-avatar" animate={paused ? undefined : { scale: [1, 1.04, 1] }} transition={{ duration: 1.25, repeat: Infinity }}>
      {portrait ? <img src={portrait} alt="" /> : <span aria-hidden="true">{who.name.slice(0, 1)}</span>}
    </motion.div>
    <h2>{who.name}</h2>
    <span>{who.role}</span>
    <div className="rd-call-ringing"><Phone aria-hidden="true" /><b>بيرن…</b></div>
    <ActionButton onClick={onAnswer} aria-label={`الرد على ${who.name}`}><Phone aria-hidden="true" /> الرد</ActionButton>
  </motion.section>;
}