// Local review service only. No outbound networking, real users, OTP, or payments.
import http from 'node:http';
import { createServer } from 'vite';
const UI = 'http://127.0.0.1:8099';
const API = 'http://127.0.0.1:8100';
const owner = '00000000-0000-4000-a000-000000000099';
let scenario = 'returning';
let profile;
const reset = () => { profile = { user_id: owner, first_name: 'نور', last_name: 'أحمد', display_name: 'نور', gender: scenario === 'new' ? null : 'female', avatar_choice: scenario === 'new' ? null : 'sara', phone: '+201000000099', department: scenario === 'new' ? null : 'finance', industry: scenario === 'new' ? null : 'technology_telecom', department_other: null, industry_other: null, work_details_prompt_dismissed_at: null }; };
reset();
const user = () => ({ id: owner, aud: 'authenticated', role: 'authenticated', phone: '201000000099', phone_confirmed_at: '2026-11-01T00:00:00Z', created_at: '2026-11-01T00:00:00Z', app_metadata: { provider: 'phone', providers: ['phone'] }, user_metadata: {}, identities: [] });
const session = () => ({ access_token: ['local-preview', Buffer.from(JSON.stringify({ sub: owner, exp: Math.floor(Date.now()/1000)+86400 })).toString('base64url'), 'not-a-real-signature'].join('.'), token_type: 'bearer', refresh_token: 'local-preview-only', expires_at: Math.floor(Date.now()/1000)+86400, expires_in: 86400, user: user() });
const api = http.createServer(async (req, res) => {
  if (req.headers.origin && req.headers.origin !== UI) { res.writeHead(403); res.end(); return; }
  res.setHeader('Access-Control-Allow-Origin', UI);
  res.setHeader('Access-Control-Allow-Headers', 'authorization,apikey,content-type,x-client-info,x-supabase-api-version,prefer');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url, API);
  let raw = ''; for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const reply = (value, status=200) => { res.writeHead(status); res.end(JSON.stringify(value)); };
  if (url.pathname === '/__scenario' && req.method === 'POST') { scenario = ['new','returning','annual','locked','unknown','pending','expired'].includes(body.scenario) ? body.scenario : 'returning'; reset(); return reply({ session: session(), owner, scenario }); }
  if (url.pathname === '/auth/v1/token') return reply(session());
  if (url.pathname === '/auth/v1/user') return reply(user());
  if (url.pathname === '/auth/v1/logout') return reply({});
  if (url.pathname === '/rest/v1/profiles') {
    if (req.method === 'PATCH') {
      if (url.searchParams.get('user_id') !== `eq.${owner}`) return reply({ message: 'wrong local owner' },403);
      const allowed = ['first_name','last_name','display_name','gender','avatar_choice','department','department_other','industry','industry_other','work_details_prompt_dismissed_at'];
      for (const [key,value] of Object.entries(body)) if (allowed.includes(key)) profile[key]=value;
      return reply(null);
    }
    return reply(profile);
  }
  if (url.pathname === '/rest/v1/user_roles') return reply(null);
  if (url.pathname === '/rest/v1/rpc/my_game_access') return reply({ enforcement: scenario === 'unknown' ? null : !['new','returning'].includes(scenario), entitled: scenario === 'unknown' ? null : scenario === 'annual', expires_at: scenario === 'annual' ? '2027-11-01T00:00:00Z' : null });
  if (url.pathname === '/functions/v1/paymob-subscription') return reply({ snapshot: ['annual','pending','expired'].includes(scenario) ? { tier:'annual', status:scenario==='annual'?'active':scenario, expiresAt:scenario==='expired'?'2025-11-01T00:00:00Z':'2027-11-01T00:00:00Z' } : { tier:'free' }, orderState:scenario==='pending'?'pending':null });
  if (url.pathname === '/functions/v1/phone-auth') {
    if (body.action === 'signup') { scenario = 'new'; reset(); profile.first_name=body.first_name; profile.last_name=body.last_name; profile.display_name=body.first_name; }
    return reply({ ok:true, sent:true, cooldown:0 });
  }
  if (url.pathname.startsWith('/rest/v1/rpc/')) return reply(null);
  // Even in this synthetic preview, checkout/reconciliation are deliberately unavailable.
  return reply({ error:'local_preview_only', message:'No real services or payment actions in this preview.' },403);
});
api.listen(8100,'127.0.0.1');
process.env.VITE_SUPABASE_URL=API;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY='local-preview-only';
process.env.VITE_SUPABASE_PROJECT_ID='local-review';
const vite=await createServer({ mode:'review', server:{host:'127.0.0.1',port:8099,strictPort:true,headers:{'Content-Security-Policy':"default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8100 ws://127.0.0.1:8099; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self' data:; frame-src 'self';"}} });
await vite.listen();
console.log(`Isolated local review: ${UI}/tests/gaming-v2/preview.html`);
console.log('External connections blocked by CSP. All accounts and status responses are synthetic.');
const close=async()=>{await vite.close();api.close();process.exit(0)};
process.on('SIGINT',close);process.on('SIGTERM',close);
