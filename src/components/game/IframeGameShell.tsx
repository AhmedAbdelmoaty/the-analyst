import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlatformGameControls } from './PlatformGameControls';

type Action = 'state' | 'pause' | 'resume' | 'settings' | 'restart' | 'prepareExit';
type GameState = { canPause: boolean; paused: boolean; canSettings: boolean; canRestart: boolean; progress: 'new' | 'resumable' | 'complete' | 'unavailable' };
type Reply = { channel: 'the-analyst-game'; version: 1; type: 'state' | 'ack'; id?: number; state?: GameState };

/** The iframe owns gameplay and persistence. The host exposes only acknowledged capabilities. */
export function IframeGameShell({ userId, title, src, background }: { userId: string; title: string; src: string; background: string }) {
  const navigate = useNavigate();
  const frame = useRef<HTMLIFrameElement>(null);
  const sequence = useRef(0);
  const pending = useRef(new Map<number, () => void>());
  const exitTimer = useRef<number | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [waiting, setWaiting] = useState(false);

  const command = useCallback((action: Action, done?: () => void) => {
    if (!frame.current?.contentWindow) return;
    const id = ++sequence.current;
    if (done) pending.current.set(id, done);
    frame.current.contentWindow.postMessage({ channel: 'the-analyst-game', version: 1, type: 'command', action, id }, window.location.origin);
  }, []);

  useEffect(() => {
    const callbacks = pending.current;
    const receive = (event: MessageEvent<Reply>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data?.channel !== 'the-analyst-game' || data.version !== 1) return;
      if (data.state) setState(data.state);
      if (data.type === 'ack' && typeof data.id === 'number') {
        pending.current.get(data.id)?.();
        pending.current.delete(data.id);
      }
    };
    window.addEventListener('message', receive);
    return () => { window.removeEventListener('message', receive); callbacks.clear(); if (exitTimer.current !== null) window.clearTimeout(exitTimer.current); };
  }, []);

  const exit = () => {
    if (waiting) return;
    if (!frame.current?.contentWindow) { navigate('/app'); return; }
    setWaiting(true);
    command('prepareExit', () => { if (exitTimer.current !== null) window.clearTimeout(exitTimer.current); navigate('/app'); });
    // Same-origin games save synchronously. If the frame was unloaded, keep Home usable.
    exitTimer.current = window.setTimeout(() => navigate('/app'), 800);
  };

  return <main className="relative h-[100dvh] w-full overflow-hidden" style={{ background }}>
    <iframe ref={frame} key={userId} name={userId} title={title} src={src} allow="autoplay" className="block h-full w-full border-0" onLoad={() => { setState(null); command('state'); }} />
    <PlatformGameControls onHome={exit} onPause={state?.canPause && !state.paused ? () => command('pause') : undefined} onSettings={state?.canSettings ? () => command('settings') : undefined} canPause={Boolean(state?.canPause && !state.paused)} canSettings={Boolean(state?.canSettings)} />
    {state?.paused && <div className="absolute inset-0 z-40 grid place-items-center bg-black/55 p-4" dir="rtl"><div className="w-full max-w-sm rounded-xl bg-white p-5 text-center shadow-xl"><h2 className="text-xl font-bold">اللعبة متوقفة مؤقتًا</h2><button type="button" className="mt-4 min-h-11 rounded-lg bg-slate-900 px-6 font-bold text-white" onClick={() => command('resume')}>كمّل اللعب</button></div></div>}
  </main>;
}
