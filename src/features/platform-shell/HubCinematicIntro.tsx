import { useEffect, useRef, useState } from 'react';
import './hub-cinematic-intro.css';

const SESSION_KEY = 'analyst-hub-cinematic-intro-v2';

function shouldPlayIntro() {
  try {
    return sessionStorage.getItem(SESSION_KEY) !== 'seen' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export default function HubCinematicIntro() {
  const [phase, setPhase] = useState<'playing' | 'fading' | 'hidden'>(() => shouldPlayIntro() ? 'playing' : 'hidden');
  const [ready, setReady] = useState(false);
  const [source] = useState(() => window.matchMedia('(max-width: 639px)').matches
    ? '/video/hub-intro-mobile.mp4' : '/video/hub-intro-desktop.mp4');
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(phase === 'playing');

  useEffect(() => {
    if (!startedRef.current) return;
    const video = videoRef.current;
    mediaRef.current = video;
    void video?.play().catch(() => setPhase('hidden'));
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => { if (motion.matches) setPhase('hidden'); };
    motion.addEventListener('change', onMotionChange);
    return () => {
      motion.removeEventListener('change', onMotionChange);
      video?.pause();
      video?.removeAttribute('src');
      video?.load();
    };
  }, []);

  useEffect(() => {
    const hub = document.querySelector<HTMLElement>('.hub-world .platform-container');
    if (hub) hub.inert = phase !== 'hidden';
    if (phase === 'hidden' && mediaRef.current) {
      mediaRef.current.pause();
      mediaRef.current.removeAttribute('src');
      mediaRef.current.load();
      mediaRef.current = null;
    }
    return () => { if (hub) hub.inert = false; };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const timer = window.setTimeout(() => setPhase('hidden'), 320);
    return () => window.clearTimeout(timer);
  }, [phase]);

  if (phase === 'hidden') return null;
  return <div className="hub-cinematic-intro" data-ready={ready} data-phase={phase} role="dialog" aria-modal="true" aria-label="مقدمة مركز الألعاب">
    <video ref={videoRef} src={source} autoPlay muted playsInline preload="auto" onLoadedData={() => setReady(true)} onPlaying={() => { try { sessionStorage.setItem(SESSION_KEY, 'seen'); } catch { /* Private storage can be unavailable. */ } }} onEnded={() => setPhase(current => current === 'playing' ? 'fading' : current)} onError={() => setPhase('hidden')} />
    <button type="button" className="hub-cinematic-skip" autoFocus onClick={() => setPhase(current => current === 'playing' ? 'fading' : current)}>تخطي المقدمة</button>
  </div>;
}
