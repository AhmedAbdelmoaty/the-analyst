import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{outcome: "accepted" | "dismissed"}> }
let pending: InstallEvent | null = null;
const listeners = new Set<() => void>();
const broadcast = () => listeners.forEach(fn => fn());
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as Navigator & {standalone?: boolean}).standalone === true);
// Capture the one-shot browser event before React or the session check mounts.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); pending = event as InstallEvent; broadcast(); });
  window.addEventListener('appinstalled', () => { pending = null; sessionStorage.removeItem('analyst-install-later'); broadcast(); });
}
type Value = {available: boolean; standalone: boolean; deferred: boolean; guidance: string | null; install: () => Promise<void>; dismiss: () => void};
const Context = createContext<Value | null>(null);
export const useInstall = () => { const value = useContext(Context); if (!value) throw new Error('InstallProvider required'); return value; };
export function InstallProvider({children}: {children: ReactNode}) {
  const [, refresh] = useState(0);
  useEffect(() => { const fn = () => refresh(n => n + 1); listeners.add(fn); window.matchMedia('(display-mode: standalone)').addEventListener('change', fn); return () => {listeners.delete(fn);window.matchMedia('(display-mode: standalone)').removeEventListener('change', fn);}; }, []);
  const standalone = isStandalone();
  const deferred = localStorage.getItem('analyst-install-later') === '1';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const guidance = ios ? 'على iPhone: افتح قائمة المشاركة، ثم اختر «إضافة إلى الشاشة الرئيسية».' : !pending ? 'يمكنك إضافة الموقع من قائمة المتصفح إلى الشاشة الرئيسية إذا كان الخيار متاحًا.' : null;
  const dismiss = () => {localStorage.setItem('analyst-install-later','1'); broadcast();};
  const install = async () => { const event = pending; if (!event || standalone) return; pending = null; broadcast(); try { await event.prompt(); const {outcome} = await event.userChoice; if (outcome === 'dismissed') dismiss(); } catch { dismiss(); } };
  return <Context.Provider value={{available: !!pending && !standalone, standalone, deferred, guidance, install, dismiss}}>{children}</Context.Provider>;
}
