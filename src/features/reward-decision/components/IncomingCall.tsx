import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useSceneAmbience } from '@/hooks/useSceneAudio';
import { PORTRAITS } from '../data/assets';
import { SPEAKERS, type Speaker } from '../data/script';

export function IncomingCall({ caller, paused, onAnswer }: {
  caller: Extract<Speaker, 'mahmoud' | 'marwan'>;
  paused: boolean;
  onAnswer: () => void;
}) {
  useSceneAmbience(paused ? null : 'phone_ringtone');
  const who = SPEAKERS[caller];
  const portrait = PORTRAITS[caller];

  return <motion.section className="rd-incoming-call" data-testid="rd-incoming-call" data-caller={caller} initial={{ opacity: 0, y: 24, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .28 }}>
    <div className="rd-phone-speaker" aria-hidden="true" />
    <div className="rd-phone-screen"><p>مكالمة واردة</p>
      <motion.div className="rd-caller-avatar" animate={paused ? { scale: 1 } : { scale: [1, 1.045, 1] }} transition={paused ? { duration: 0 } : { duration: 1.25, repeat: Infinity }}>
        {portrait ? <img src={portrait} alt="" /> : <span aria-hidden="true">{who.name.slice(0, 1)}</span>}
      </motion.div>
      <h2>{who.name}</h2><span>{who.role}</span>
      <div className="rd-call-ringing"><Phone aria-hidden="true" /><b>بيرن…</b></div>
    </div>
    <div className="rd-phone-controls"><button className="rd-answer-button" onClick={onAnswer} aria-label={`الرد على ${who.name}`}><Phone aria-hidden="true" /></button><span>الرد على المكالمة</span></div>
  </motion.section>;
}
