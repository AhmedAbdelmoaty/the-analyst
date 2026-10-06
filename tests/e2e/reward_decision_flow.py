"""Browser verification for the redesigned Reward Decision flow."""
import asyncio, base64, json, sys, time
import traceback
from pathlib import Path
from playwright.async_api import async_playwright

BASE="http://localhost:8080"; REF="cfpyfwcccjzzhltyordf"; UID="00000000-0000-4000-8000-00000000e2e1"
OUT=Path('/tmp/browser/reward-decision-v2');OUT.mkdir(parents=True,exist_ok=True)
def b64(d):return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')
exp=int(time.time())+86400;jwt=f"{b64({'alg':'HS256','typ':'JWT'})}.{b64({'sub':UID,'role':'authenticated','exp':exp,'aud':'authenticated'})}.sig"
user={'id':UID,'aud':'authenticated','role':'authenticated','phone':'201000000000','app_metadata':{},'user_metadata':{},'created_at':'2026-01-01T00:00:00Z'}
session={'access_token':jwt,'refresh_token':'r','token_type':'bearer','expires_in':86400,'expires_at':exp,'user':user}
profile={'first_name':'اختبار','last_name':'آلي','display_name':'اختبار','gender':'male','avatar_choice':'male','phone':'201000000000'}

async def mock(ctx):
 async def handle(route):
  u=route.request.url
  if '/rest/v1/profiles' in u:return await route.fulfill(json=profile)
  if '/rest/v1/user_roles' in u:return await route.fulfill(status=200,body='null',headers={'content-type':'application/json'})
  if '/auth/v1/user' in u:return await route.fulfill(json=user)
  if '/auth/v1/token' in u:return await route.fulfill(json=session)
  return await route.fulfill(json=[])
 await ctx.route(f'https://{REF}.supabase.co/**',handle)
async def open_game(ctx,clear=False):
 p=await ctx.new_page();await p.goto(BASE);await p.evaluate(f"localStorage.setItem('sb-{REF}-auth-token',{json.dumps(json.dumps(session))});localStorage.setItem('the-analyst:install-dismissed','1')")
 if clear:await p.evaluate("Object.keys(localStorage).filter(k=>k.includes('reward-decision')).forEach(k=>localStorage.removeItem(k))")
 await p.goto(f'{BASE}/games/reward-decision');await p.wait_for_selector('.rd-root',timeout=20000);return p
async def state(p):return await p.eval_on_selector('.rd-root','e=>({phase:e.dataset.phase,stage:e.dataset.stage,shot:e.dataset.shot})')
async def button(p,name):await p.get_by_role('button',name=name,exact=True).first.click();await p.wait_for_timeout(300)
async def talk(p):
 for _ in range(20):
  d=p.locator('.rd-dialogue');
  if not await d.count():break
  await p.locator('.rd-dialogue-copy').click();await p.wait_for_timeout(280)
async def to_hub(p):
 await button(p,'ابدأ الآن');await button(p,'متابعة');await talk(p);await button(p,'متابعة');await talk(p);await button(p,'دخول مكتب شريف');await talk(p);await button(p,'الذهاب إلى المكاتب');assert (await state(p))['phase']=='hub'
async def gather(p):
 await p.locator('[data-dest=sales]').click();await p.wait_for_timeout(300);await talk(p);assert (await state(p))['phase']=='hub'
 await p.locator('[data-dest=hr]').click();await p.wait_for_timeout(300);await talk(p);assert (await state(p))['phase']=='hub'
 saved=json.loads(await p.evaluate(f"localStorage.getItem('the-analyst:reward-decision:v1:{UID}')"));assert saved['collectedDocs']==['sales-summary','individual-records','policy']
async def analyze(p,tools):
 await p.locator('[data-dest=workbench]').click();await p.wait_for_timeout(300)
 for t in tools:await p.locator(f'[data-tool-toggle={t}]').click();await p.wait_for_timeout(300)
async def recommend(p,team,args,doc='policy'):
 await button(p,'تجهيز التوصية');await p.locator(f'[data-team={team}]').click();await p.get_by_label('المستند المرجعي').select_option(doc);await p.get_by_label('الحجة 1').select_option(args[0]);await p.get_by_label('الحجة 2').select_option(args[1]);await button(p,'تقديم التوصية')
async def finish(p):await talk(p);assert (await state(p))['phase']=='resolution';await button(p,'عرض الخلاصة');return await p.locator('.rd-final-report').inner_text()

async def scenario(ctx,team,args,expected,shot):
 p=await open_game(ctx,True);await to_hub(p);await gather(p);await analyze(p,['mean','median','range','sd','iqr'])
 if expected=='تدعم القرار':
  await p.reload();await p.wait_for_selector('.rd-root');await button(p,'متابعة اللعب');assert (await state(p))['phase']=='workbench';assert await p.locator('[data-tool-toggle].active').count()==5
  await button(p,'تجهيز التوصية');await p.locator(f'[data-team={team}]').click();await p.get_by_label('المستند المرجعي').select_option('policy');await p.get_by_label('الحجة 1').select_option(args[0]);await p.reload();await p.wait_for_selector('.rd-root');await button(p,'متابعة اللعب');assert await p.get_by_label('الحجة 1').input_value()==args[0];await p.get_by_label('الحجة 2').select_option(args[1]);await button(p,'تقديم التوصية')
 else:await recommend(p,team,args)
 s=await state(p);assert s['shot']==shot,s
 meeting=await p.locator('.rd-dialogue').get_attribute('data-line');assert meeting=='meeting_01';await p.reload();await p.wait_for_selector('.rd-root');assert await p.get_by_test_id('pause-layer').count()==1;await button(p,'متابعة اللعب');assert await p.locator('.rd-dialogue').get_attribute('data-line')=='meeting_01'
 text=await finish(p);assert expected in text;text_all=await p.locator('body').inner_text();assert 'استيضاح' not in text_all and 'دفاع' not in text_all
 await p.close()

async def handoff_pause_mobile(ctx,width):
 p=await open_game(ctx,True);await to_hub(p);await p.locator('[data-dest=sales]').click();await p.wait_for_timeout(300)
 await p.locator('.rd-dialogue-copy').click();await p.wait_for_timeout(280);assert await p.locator('.rd-inline-document').count()==1
 await p.locator('.rd-inline-document').click();assert await p.get_by_test_id('analysis-file').count()==1;await p.get_by_label('إغلاق الملف').click();line=await p.locator('.rd-dialogue').get_attribute('data-line');assert line=='sales_01'
 assert 'rd-dialogue-dark' in (await p.locator('.rd-dialogue').get_attribute('class'))
 await p.wait_for_timeout(400);await p.locator('.rd-dialogue-copy').click();await p.wait_for_timeout(400);assert await p.locator('.rd-dialogue').get_attribute('data-speaker')=='player';assert 'rd-dialogue-light' in (await p.locator('.rd-dialogue').get_attribute('class'))
 await p.reload();await p.wait_for_selector('.rd-root');await button(p,'متابعة اللعب');assert await p.locator('.rd-dialogue').get_attribute('data-line')=='sales_01'
 saved=json.loads(await p.evaluate(f"localStorage.getItem('the-analyst:reward-decision:v1:{UID}')"));assert saved['collectedDocs'].count('sales-summary')==1
 await p.screenshot(path=str(OUT/f'mobile_{width}.png'));assert await p.locator('.rd-hud').evaluate('(e)=>e.getBoundingClientRect().right<=innerWidth')
 await p.close()

async def migration(ctx):
 p=await open_game(ctx,True);old={'schemaVersion':2,'gameId':'reward-decision','caseVersion':'rowad-v1','userId':UID,'runId':'legacy','revision':6,'phase':'meeting','stage':'defend','evidence':['ev_threshold','ev_range'],'tools':{'ev_range':{'step':2,'selected':[]}},'collectedDocs':['sales','records','policy'],'openedIndividualRecords':True,'draft':{'teamId':'mahmoud','links':[{'evidenceId':'ev_threshold'},{'evidenceId':'ev_range'}]}}
 await p.evaluate(f"localStorage.setItem('the-analyst:reward-decision:v1:{UID}',{json.dumps(json.dumps(old))})");await p.reload();await p.wait_for_selector('.rd-root');
 if await p.get_by_test_id('pause-layer').count():await button(p,'متابعة اللعب')
 s=await state(p);assert s['phase']=='recommendation' and s['stage']=='',s;assert not await p.locator('[data-stage=defend]').count();await p.close()

async def main():
 failures=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch(headless=True)
  cases=[('supported',('mahmoud',['records-coverage','range-mahmoud'],'تدعم القرار','A18'),1280),('weak',('mahmoud',['median-proves-all','sd-mahmoud'],'لا تثبت المطلوب','A18'),390),('spread-only',('mahmoud',['range-mahmoud','iqr-mahmoud'],'لا تثبتان انتشار','A18'),1280),('wrong-team',('marwan',['records-coverage','range-mahmoud'],'فريق مروان','A18'),390)]
  for name,args,w in cases:
   ctx=await b.new_context(viewport={'width':w,'height':900 if w>400 else 844});await mock(ctx)
   try:await scenario(ctx,*args);print('PASS',name)
   except Exception as e:failures.append(f'{name}: {e!r}')
   await ctx.close()
  for w in (320,360,390):
   ctx=await b.new_context(viewport={'width':w,'height':844});await mock(ctx)
   try:await handoff_pause_mobile(ctx,w);print('PASS mobile',w)
   except Exception as e:failures.append(f'mobile {w}: {e!r}\n{traceback.format_exc()}')
   await ctx.close()
  ctx=await b.new_context(viewport={'width':1280,'height':900});await mock(ctx)
  try:await migration(ctx);print('PASS migration')
  except Exception as e:failures.append(f'migration: {e!r}')
  await ctx.close();await b.close()
 print('\n'.join(failures));sys.exit(1 if failures else 0)
asyncio.run(main())