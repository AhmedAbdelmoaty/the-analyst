import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const serviceUrl = env.match(/VITE_SUPABASE_URL=["']?([^"'\r\n]+)/)![1];
const storageKey = `sb-${new URL(serviceUrl).hostname.split('.')[0]}-auth-token`;
export const owner = '00000000-0000-4000-a000-000000000002';
export async function mockAccount(page: Page, options: { guest?: boolean; incomplete?: boolean; missingName?: boolean; plans?: boolean; enforcement?: boolean | null; entitled?: boolean | null; phone?: string; confirmed?: boolean; profileError?: boolean } = {}) {
  let profile = { user_id: owner, first_name: options.missingName ? '' : 'نور', last_name: options.missingName ? '' : 'أحمد', display_name: options.missingName ? '' : 'نور', gender: options.incomplete ? null : 'female', avatar_choice: options.incomplete ? null : 'sara', phone: '+201000000002', department: options.incomplete ? null : 'finance', industry: options.incomplete ? null : 'technology_telecom', department_other: null, industry_other: null, work_details_prompt_dismissed_at: null };
  const user = { id: owner, aud: 'authenticated', role: 'authenticated', phone: options.phone ?? '201000000002', phone_confirmed_at: options.confirmed === false ? null : '2026-10-01T00:00:00Z', created_at: '2026-10-01T00:00:00Z', app_metadata: { provider: 'phone', providers: ['phone'] }, user_metadata: {}, identities: [] };
  const session = { access_token: 'local-mock-only', token_type: 'bearer', refresh_token: 'local-mock-only', expires_at: Math.floor(Date.now() / 1000) + 86400, expires_in: 86400, user };
  const patches: unknown[] = [];
  const forbidden: string[] = [];
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin === 'http://127.0.0.1:8097') return route.continue();
    if (url.origin !== serviceUrl) return route.fulfill({ status: 200, body: '', contentType: 'text/plain' });
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/auth/v1/token') return json(session);
    if (url.pathname === '/auth/v1/logout') return json({});
    if (url.pathname === '/rest/v1/profiles') {
      if (route.request().method() === 'PATCH') {
        const patch = route.request().postDataJSON(); patches.push({ patch, filter: url.searchParams.get('user_id') });
        if (options.profileError) return json({ message: 'local simulated save failure', code: 'test' }, 400);
        profile = { ...profile, ...patch }; return json(null);
      }
      return json(profile);
    }
    if (url.pathname === '/rest/v1/user_roles') return json(null);
    if (url.pathname.endsWith('/my_game_access')) return json({ enforcement: options.enforcement === undefined ? false : options.enforcement, entitled: options.entitled === undefined ? false : options.entitled, expires_at: null });
    if (url.pathname.endsWith('/paymob-subscription')) return json({ snapshot: null, orderState: null });
    if (url.pathname.includes('/functions/')) { forbidden.push(url.pathname); return json({ error: 'blocked-by-local-test' }, 403); }
    if (url.pathname.includes('/rpc/')) return json(null);
    forbidden.push(url.pathname); return json({ error: 'unhandled-local-mock' }, 403);
  });
  await page.addInitScript(({ storageKey, session, options }) => {
    if (!sessionStorage.getItem('v2-fixture-initialized')) {
      if (!options.guest) localStorage.setItem(storageKey, JSON.stringify(session));
      localStorage.setItem('analyst-install-later', '1');
      if (options.plans) sessionStorage.setItem('analyst-onboarding-v1', 'plans');
      sessionStorage.setItem('v2-fixture-initialized', '1');
    }
  }, { storageKey, session, options });
  return { patches, forbidden };
}
