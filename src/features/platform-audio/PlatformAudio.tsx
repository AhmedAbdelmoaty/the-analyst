import { useEffect, useLayoutEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { platformAudio } from './mixer';
import type { MusicContext } from './manifest';

const screens = new Set(['/', '/login', '/signup', '/forgot-password', '/plans', '/plans/choose', '/setup', '/app', '/profile/work', '/subscription', '/subscription/summary']);
export function musicContextForPath(pathname: string): MusicContext | null {
  if (!screens.has(pathname)) return null;
  return pathname === '/setup' ? 'setup' : pathname === '/app' ? 'hub' : 'entry';
}
export const usePlatformAudio = () => useSyncExternalStore(platformAudio.subscribe, platformAudio.snapshot, platformAudio.snapshot);

export default function PlatformAudio() {
  const { pathname } = useLocation();
  // Layout phase silences the shell before game narration's passive effects run.
  useLayoutEffect(() => { platformAudio.setContext(musicContextForPath(pathname)); }, [pathname]);
  useEffect(() => {
    document.documentElement.dataset.platformMotion = platformAudio.snapshot().reducedMotion ? 'off' : 'on';
    const gesture = (event: Event) => { if (!(event.target as Element)?.closest('[data-platform-sound-toggle]')) platformAudio.unlock(); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') gesture(event); };
    const move = () => platformAudio.pointerMoved();
    const visibility = () => platformAudio.visibilityChanged();
    window.addEventListener('pointerdown', gesture); window.addEventListener('keydown', key);
    window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('pointerdown', gesture); window.removeEventListener('keydown', key);
      window.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', visibility);
      platformAudio.setContext(null);
    };
  }, []);
  return null;
}
