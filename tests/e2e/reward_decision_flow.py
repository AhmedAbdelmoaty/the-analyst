"""
End-to-end check of «قرار التكريم» against the local dev server.
Uses a mocked player session (fake JWT + mocked profile REST calls) so it never touches real accounts.
Run: python3 tests/e2e/reward_decision_flow.py
"""
import asyncio, base64, json, sys, time
from pathlib import Path
from playwright.async_api import async_playwright

BASE = "http://localhost:8080"
REF = "cfpyfwcccjzzhltyordf"
UID = "00000000-0000-4000-8000-00000000e2e1"
OUT = Path("/tmp/browser/reward-decision"); OUT.mkdir(parents=True, exist_ok=True)
errors: list[str] = []
results: list[str] = []

def b64(d): return base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip("=")
exp = int(time.time()) + 3600 * 24
jwt = f"{b64({'alg':'HS256','typ':'JWT'})}.{b64({'sub':UID,'role':'authenticated','exp':exp,'aud':'authenticated'})}.sig"
user = {"id": UID, "aud": "authenticated", "role": "authenticated", "phone": "201000000000", "app_metadata": {}, "user_metadata": {}, "created_at": "2026-01-01T00:00:00Z"}
session = {"access_token": jwt, "refresh_token": "r", "token_type": "bearer", "expires_in": 86400, "expires_at": exp, "user": user}
profile = {"first_name": "اختبار", "last_name": "آلي", "display_name": "اختبار", "gender": "male", "avatar_choice": "male", "phone": "201000000000"}

async def mock(ctx):
    async def handle(route):
        url = route.request.url
        if "/rest/v1/profiles" in url: return await route.fulfill(json=profile)
        if "/rest/v1/user_roles" in url: return await route.fulfill(status=200, body="null", headers={"content-type": "application/json"})
        if "/auth/v1/user" in url: return await route.fulfill(json=user)
        if "/auth/v1/token" in url: return await route.fulfill(json=session)
        return await route.fulfill(json=[])
    await ctx.route(f"https://{REF}.supabase.co/**", handle)

async def open_game(ctx, clear=False):
    page = await ctx.new_page()
    page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
    page.on("console", lambda m: m.type == "error" and not m.text.startswith("Warning:") and "reward" in m.text.lower() and errors.append(m.text))
    await page.goto(BASE)
    await page.evaluate(f"localStorage.setItem('sb-{REF}-auth-token', {json.dumps(json.dumps(session))}); localStorage.setItem('the-analyst:install-dismissed','1')")
    if clear: await page.evaluate(f"Object.keys(localStorage).filter(k=>k.includes('reward-decision')).forEach(k=>localStorage.removeItem(k))")
    await page.goto(f"{BASE}/games/reward-decision")
    await page.wait_for_selector(".rd-root", timeout=20000)
    return page

async def state(page): return await page.evaluate("(()=>{const m=document.querySelector('.rd-root');return m?{phase:m.dataset.phase,stage:m.dataset.stage,shot:m.dataset.shot}:null})()")
async def click(page, sel): await page.locator(sel).first.click(); await page.wait_for_timeout(380)
async def btn(page, text): await page.get_by_role("button", name=text, exact=True).first.click(); await page.wait_for_timeout(380)

async def talk(page, limit=40):
    shots = []
    for _ in range(limit):
        d = page.locator(".rd-dialogue")
        if await d.count() == 0: break
        lid = await d.first.get_attribute("data-line")
        if not shots or shots[-1][0] != lid: shots.append((lid, (await state(page))["shot"]))
        await d.first.click(); await page.wait_for_timeout(360)
    return [x[1] for x in shots]

async def resume_if_paused(page):
    if await page.get_by_test_id("pause-layer").count(): await btn(page, "متابعة اللعب")

async def to_hub(page):
    await btn(page, "ابدأ الآن"); s = await state(page); assert s["shot"] == "A01", s
    await btn(page, "متابعة")
    await page.wait_for_selector(".rd-dialogue"); first = await page.locator(".rd-dialogue").get_attribute("data-line")
    assert first == "d01_01", first
    await page.screenshot(path=str(OUT / "1_first_dialogue.png"))
    sh = await talk(page); assert set(sh) == {"A02"}, sh
    assert (await state(page))["shot"] == "A03"; await btn(page, "متابعة")
    sh = await talk(page); assert sh[:3] == ["A04"] * 3 and set(sh[3:]) == {"A05"}, sh
    await btn(page, "دخول مكتب شريف")
    sh = await talk(page); assert sh[:5] == ["A07"] * 5 and set(sh[5:]) == {"A08"}, sh
    await btn(page, "فتح الملف"); assert (await state(page))["phase"] == "hub"

async def gather(page, tools):
    await click(page, "[data-dest=hr]"); s = await state(page); assert s["shot"] == "A10", s  # cameo first time
    await page.wait_for_timeout(1900); s = await state(page); assert s["phase"] == "hr" and s["shot"] == "A13", s
    await talk(page); assert (await state(page))["shot"] == "A14"
    await click(page, "[data-optional=opt_hr_01]"); await talk(page)
    await btn(page, "حفظ في الملف"); await btn(page, "مساحة التحقيق")
    await click(page, "[data-dest=sales]"); assert (await state(page))["shot"] == "A11"  # no second cameo
    await talk(page); await btn(page, "حفظ في الملف"); await btn(page, "فتح كشف الأفراد")
    assert (await state(page))["shot"] == "A12"; await btn(page, "طاولة الفحص")
    for t in tools: await run_tool(page, t)

async def run_tool(page, t):
    await click(page, f"[data-open-tool={t}]"); assert (await state(page))["shot"] == "A16"
    if t == "ev_mean":
        await click(page, "[data-place=marwan]"); await click(page, "[data-place=mahmoud]")
    elif t == "ev_median":
        await btn(page, "ترتيب النتائج"); await page.wait_for_timeout(300)
        await click(page, "[data-card=m01]")  # wrong card → hint, no selection
        assert await page.locator(".rd-hint").count() == 1
        for c in ["m05", "m06", "b05", "b06"]: await click(page, f"[data-card={c}]")
    elif t == "ev_range":
        for c in ["m01", "m10", "b01", "b10"]: await click(page, f"[data-card={c}]")
    elif t == "ev_sd":
        await btn(page, "نقل النتائج إلى المقياس"); await btn(page, "إظهار الابتعاد عن المتوسط")
    elif t == "ev_iqr":
        await btn(page, "ترتيب النتائج"); await btn(page, "كشف نطاق النصف الأوسط")
    elif t == "ev_threshold":
        await btn(page, "تطبيق المعيار")
    assert await page.get_by_test_id("tool-result").count() == 1, t
    await btn(page, "حفظ المقارنة"); await btn(page, "أدوات أخرى")

async def recommend(page, team, links, reload=False):
    await btn(page, "تجهيز التوصية"); assert (await state(page))["shot"] == "A17"
    await click(page, f"[data-team={team}]")
    for i, (ev, cl) in enumerate(links, 1):
        await page.get_by_label(f"الدليل {i}").select_option(ev); await page.get_by_label(f"التفسير {i}").select_option(cl); await page.wait_for_timeout(120)
        if reload and i == 1:
            await page.wait_for_timeout(300); await page.reload(); await page.wait_for_selector(".rd-root"); await resume_if_paused(page)
            assert await page.get_by_label("الدليل 1").input_value() == ev and await page.get_by_label("التفسير 1").input_value() == cl
            assert "selected" in (await page.locator(f"[data-team={team}]").get_attribute("class"))
            results.append("reload inside recommendation kept team + first attachment")
    await btn(page, "تقديم التوصية")

async def meeting(page, defense, expect_followup, second=None):
    sh = await talk(page); assert set(sh[:-1]) == {"A18"} and sh[-1] in ("A19", "A20"), sh
    obj = sh[-1:]
    await page.get_by_label("دليل الدفاع").select_option(defense[0]); await page.get_by_label("تفسير الدفاع").select_option(defense[1])
    await btn(page, "تأكيد الحجة")
    if expect_followup:
        s = await state(page); assert s["shot"] == "A21" and s["stage"] == "followup", s
        await talk(page)
        d2 = second or defense
        await page.get_by_label("دليل الدفاع").select_option(d2[0]); await page.get_by_label("تفسير الدفاع").select_option(d2[1]); await btn(page, "تأكيد الحجة")
    assert (await state(page))["stage"] == "review"
    await btn(page, "اعتماد التوصية")
    return obj

async def scenario_supported(ctx):
    page = await open_game(ctx, clear=True)
    await to_hub(page)
    await gather(page, ["ev_threshold", "ev_median", "ev_range"])
    # reload inside a tool keeps tool + step
    await click(page, "[data-open-tool=ev_sd]"); await btn(page, "نقل النتائج إلى المقياس")
    await page.reload(); await page.wait_for_selector(".rd-root")
    assert await page.get_by_test_id("pause-layer").count() == 1; s = await state(page); assert s["shot"] == "A16", s
    await resume_if_paused(page); assert await page.get_by_role("button", name="إظهار الابتعاد عن المتوسط").count() == 1
    results.append("reload inside SD tool restored step 1 paused")
    await btn(page, "أدوات أخرى")
    # case file shows numbers
    await page.get_by_label("فتح ملف القضية").click(); await page.wait_for_timeout(300)
    txt = await page.get_by_test_id("case-file").inner_text(); assert "4 من 10" in txt and "المدى 77" in txt, txt[:300]
    await page.screenshot(path=str(OUT / "2_case_file.png")); await page.get_by_label("إغلاق الملف").click()
    # reload in recommendation keeps the draft
    await recommend(page, "mahmoud", [("ev_threshold", "coverage"), ("ev_median", "middle")], reload=True)
    obj = await meeting(page, ("ev_range", "spread"), expect_followup=False)
    assert obj == ["A19"], obj
    sh = await talk(page); assert set(sh) == {"A21"}, sh
    assert (await state(page))["shot"] == "A22"; await page.screenshot(path=str(OUT / "3_decision.png")); await btn(page, "متابعة")
    assert (await state(page))["shot"] == "A23"; await page.wait_for_timeout(3400)
    assert (await state(page))["phase"] == "debrief"
    for _ in range(4): await btn(page, "التالي")
    await talk(page); notes = await page.get_by_test_id("attachment-notes").inner_text()
    assert "لا يثبت" not in notes.split("\n")[0], notes
    await page.screenshot(path=str(OUT / "4_debrief.png"))
    results.append("supported ending: A18→A19→defence→A21 D07→A22→A23(3s)→debrief, notes: " + notes.replace("\n", " | "))
    await page.close()

async def scenario_insufficient(ctx):
    page = await open_game(ctx, clear=True)
    await to_hub(page); await gather(page, ["ev_mean", "ev_median", "ev_threshold"])
    await recommend(page, "mahmoud", [("ev_mean", "aggregate"), ("ev_median", "middle")])
    # reload inside the meeting dialogue
    await page.wait_for_selector(".rd-dialogue"); await page.locator(".rd-dialogue").click(); await page.wait_for_timeout(400)
    await page.locator(".rd-dialogue").click(); await page.wait_for_timeout(400)
    line_before = await page.locator(".rd-dialogue").get_attribute("data-line")
    await page.wait_for_timeout(600); await page.reload(); await page.wait_for_selector(".rd-root")
    await resume_if_paused(page); line_after = await page.locator(".rd-dialogue").get_attribute("data-line")
    assert line_before == line_after == "d06_02", (line_before, line_after)
    results.append("reload inside meeting dialogue resumed on d06_02")
    obj = await meeting(page, ("ev_median", "middle"), expect_followup=True, second=("ev_threshold", "coverage"))
    assert obj == ["A19"]
    s = await state(page); assert s["shot"] == "A24" and s["stage"] == "ending", s
    line = await page.locator(".rd-dialogue").get_attribute("data-line"); assert line == "ending_insufficient", line
    await talk(page); await page.screenshot(path=str(OUT / "5_insufficient.png"))
    # review → fix → supported
    await btn(page, "مراجعة الملف"); assert (await state(page))["phase"] == "workbench"
    await run_tool(page, "ev_iqr")
    await recommend(page, "mahmoud", [("ev_threshold", "coverage"), ("ev_iqr", "spread")])
    await meeting(page, ("ev_iqr", "spread"), expect_followup=False)
    assert (await state(page))["stage"] == "decision"
    results.append("insufficient ending (follow-up d06_04 at A21, then A24) → review → resubmit → supported")
    await page.close()

async def scenario_mismatch(ctx):
    page = await open_game(ctx, clear=True)
    await to_hub(page); await gather(page, ["ev_threshold", "ev_range"])
    await recommend(page, "marwan", [("ev_threshold", "coverage"), ("ev_range", "spread")])
    obj = await meeting(page, ("ev_range", "spread"), expect_followup=True)
    assert obj == ["A20"], obj
    assert await page.locator(".rd-dialogue").get_attribute("data-line") == "ending_mismatch"
    await talk(page); await btn(page, "عرض خلاصة التجربة")
    results.append("mismatch ending: objection at A20, ending_mismatch at A24, debrief reachable")
    await page.close()

async def scenario_pause_and_tabs(ctx):
    page = await open_game(ctx, clear=True)
    await btn(page, "ابدأ الآن"); await btn(page, "متابعة"); await page.wait_for_selector(".rd-dialogue")
    await page.wait_for_timeout(500)
    # hide the page → paused, typing frozen
    await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
    await page.wait_for_timeout(100); t1 = await page.locator(".rd-dialogue p").inner_text(); await page.wait_for_timeout(700); t2 = await page.locator(".rd-dialogue p").inner_text()
    assert t1 == t2, (t1, t2)
    await page.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'))")
    layer = page.get_by_test_id("pause-layer"); assert await layer.count() == 1
    btns = await layer.get_by_role("button").all_inner_texts(); assert btns == ["متابعة اللعب"], btns
    await page.screenshot(path=str(OUT / "6_pause.png"))
    await btn(page, "متابعة اللعب"); await page.wait_for_timeout(500)
    assert len(await page.locator(".rd-dialogue p").inner_text()) > len(t2)
    results.append("hidden page froze typing; return layer has only «متابعة اللعب»")
    # second tab: refused, then takes control; first tab must stop writing
    await talk(page); await btn(page, "متابعة")  # now in debate
    page2 = await open_game(ctx)
    await page2.wait_for_timeout(500)
    assert await page2.get_by_test_id("other-tab-layer").count() == 1
    await page2.get_by_role("button", name="نقل التحكم هنا").click(); await page2.wait_for_timeout(600)
    assert await page.get_by_test_id("other-tab-layer").count() == 1, "first tab did not yield"
    s2 = await state(page2); assert s2["phase"] == "debate", s2
    await talk(page2); await page2.wait_for_timeout(500)
    saved = json.loads(await page2.evaluate(f"localStorage.getItem('the-analyst:reward-decision:v1:{UID}')"))
    # first tab tries to act; nothing may be written
    await page.locator(".rd-dialogue, button").first.click(force=True); await page.wait_for_timeout(500)
    saved2 = json.loads(await page2.evaluate(f"localStorage.getItem('the-analyst:reward-decision:v1:{UID}')"))
    assert saved2["revision"] == saved["revision"] and saved2["stage"] == "door", (saved["revision"], saved2["revision"], saved2["stage"])
    await page2.wait_for_timeout(2500)
    lease = await page2.evaluate(f"Object.keys(localStorage).filter(k=>k.includes(':owner:')).map(k=>JSON.parse(localStorage.getItem(k)).at)")
    assert lease and max(lease) > time.time() * 1000 - 2600, lease
    results.append("second tab refused, took control, lease renewed; old tab blocked and did not overwrite progress")
    await page.close(); await page2.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for name, fn, vp in [("supported", scenario_supported, (1280, 1800)), ("insufficient", scenario_insufficient, (390, 844)), ("mismatch", scenario_mismatch, (1280, 900)), ("pause/tabs", scenario_pause_and_tabs, (1280, 1800))]:
            ctx = await b.new_context(viewport={"width": vp[0], "height": vp[1]}); await mock(ctx)
            try: await fn(ctx); print("PASS", name)
            except Exception as e:
                import traceback; print("FAIL", name, repr(e)[:600]); traceback.print_exc(limit=3)
                for pg in ctx.pages: await pg.screenshot(path=str(OUT / f"fail_{name.replace('/','_')}.png"))
            await ctx.close()
        await b.close()
    print("\n".join(results)); print("errors:", errors[:10])
asyncio.run(main())
