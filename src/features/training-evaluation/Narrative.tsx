import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, DoorOpen } from "lucide-react";
import { audioPosition, playVoice, preloadVoices, stopVoice, sfx, whoosh } from "./audio";
import { VOICE_DURATIONS } from "./content";
import { GameButton } from "./GameButton";
import { DialogueGuard } from "./dialogueGuard";
import { useActiveTimer, useRuntime, useSavedState } from "./runtime";
import "./narrative.css";

export { preloadVoices };
type Props = { text: string; voice?: string; name: string; role?: string; image: string;
  index?: number; total?: number; onNext: () => void; onPrevious?: () => void;
  transitionSound?: boolean; tone?: "dark" | "light"; call?: boolean; autoAdvance?: boolean; canNext?: boolean };

export function NarrativeLine({ text, voice, name, role, image, index = 0, total = 1,
  onNext, onPrevious, transitionSound = true, tone = "dark", call, autoAdvance = true, canNext = true }: Props) {
  const { paused, update } = useRuntime();
  const [visit, setVisit] = useSavedState("narrativeVisit", 0);
  const identity = `${text}:${visit}`;
  const guard = useRef(new DialogueGuard());
  const callbacks = useRef({ onNext, onPrevious, paused, autoAdvance, canNext });
  callbacks.current = { onNext, onPrevious, paused, autoAdvance, canNext };
  const [progress, setProgress] = useState(0);
  const [fallback, setFallback] = useState(false);
  const [ready, setReady] = useState(false);
  const fallbackDuration = (voice ? VOICE_DURATIONS[voice] ?? Math.max(2, text.length * .045) : Math.max(2, text.length * .045)) * 1000;
  const move = (back = false) => {
    if (callbacks.current.paused || (!back && !callbacks.current.canNext) || (back && !callbacks.current.onPrevious) || !guard.current.accept(identity, performance.now())) return;
    stopVoice();
    update(r => ({ ...r, ui: { ...r.ui, "global:voice": null } }));
    if (transitionSound || back) setVisit(v => v + 1);
    if (transitionSound) whoosh();
    if (back) callbacks.current.onPrevious?.(); else callbacks.current.onNext();
  };
  const moveRef = useRef(move); moveRef.current = move;
  const left = useActiveTimer(`speech:${identity}`, fallbackDuration, () => { if (callbacks.current.autoAdvance) moveRef.current(); }, fallback);
  useEffect(() => {
    setProgress(0); setFallback(false); setReady(false);
    const readyTimer = window.setTimeout(() => setReady(true), 450);
    let alive = true;
    const sound = voice ? playVoice(voice, () => { if (alive) { setProgress(1); if (callbacks.current.autoAdvance) moveRef.current(); } }) : null;
    const fail = () => { if (alive) setFallback(true); };
    if (!sound) fail();
    sound?.addEventListener("error", fail);
    sound?.addEventListener("playbackblocked", fail);
    const tick = window.setInterval(() => {
      if (!alive || callbacks.current.paused || !sound) return;
      if (sound.duration > 0) setProgress(Math.min(1, sound.currentTime / sound.duration));
      update(r => ({ ...r, ui: { ...r.ui, "global:voice": audioPosition() } }));
    }, 100);
    return () => { alive = false; clearInterval(tick); clearTimeout(readyTimer); sound?.removeEventListener("error", fail); sound?.removeEventListener("playbackblocked", fail); stopVoice(); };
  }, [identity, voice, update]);
  const fraction = fallback ? 1 - left / fallbackDuration : progress;
  const chars = Array.from(text);
  // The first character appears with the scene; the rest follow actual playback, not a separate typing clock.
  const visible = chars.slice(0, Math.max(1, Math.ceil(chars.length * fraction))).join("");
  return <div className="g-stage"><section className={`g-dialogue ${tone} g-narrative`} aria-label={`محادثة ${name}`}>
    <span className={`g-portrait ${call ? "is-call" : ""}`}><img src={image} alt={name} /></span>
    <div><header><span>{name}</span>{role && <small>{role}</small>}<em>{index + 1}/{total}</em></header>
      <div className="g-copy"><p>{visible}{fraction < 1 && <i />}</p></div>
      <footer><GameButton className="secondary" disabled={!ready || !onPrevious} onClick={() => move(true)}><ChevronRight />رجوع</GameButton>
        <GameButton className="primary" disabled={!ready || !canNext} onClick={() => move()}>التالي<ChevronLeft /></GameButton></footer>
    </div></section></div>;
}

export function SceneGate({ label, onGo }: { label: string; onGo: () => void }) {
  const [ready, setReady] = useState(false);
  const used = useRef(false);
  useEffect(() => { const id = window.setTimeout(() => setReady(true), 600); return () => clearTimeout(id); }, []);
  return <div className="g-stage center"><section className="g-arrive"><GameButton className="primary big" disabled={!ready} onClick={() => {
    if (used.current) return; used.current = true; stopVoice(); sfx.tap(); onGo();
  }}><DoorOpen />{label}</GameButton></section></div>;
}