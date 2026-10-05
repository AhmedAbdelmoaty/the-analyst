import { registerSW } from 'virtual:pwa-register';
const blocked = () => {
  const host = window.location.hostname;
  return !import.meta.env.PROD || window !== window.top || /^id-preview--|^preview--/.test(host) || host === 'lovableproject.com' || host.endsWith('.lovableproject.com') || host === 'lovableproject-dev.com' || host.endsWith('.lovableproject-dev.com') || host === 'beta.lovable.dev' || host.endsWith('.beta.lovable.dev') || new URLSearchParams(location.search).get('sw') === 'off';
};
export function registerAppWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (blocked()) {
    navigator.serviceWorker.getRegistrations().then(registrations => registrations.filter(r => r.active?.scriptURL.endsWith('/sw.js') || r.installing?.scriptURL.endsWith('/sw.js')).forEach(r => void r.unregister()));
    return;
  }
  const update = registerSW({ immediate: true, onNeedRefresh() { window.dispatchEvent(new Event('analyst-update-ready')); } });
  window.addEventListener('analyst-apply-update', () => void update(true));
}
