"""Exercise the published preview and simulate rare conditions on an isolated local copy."""

import argparse
from datetime import datetime, timezone
from functools import partial
import json
import os
from pathlib import Path
import re
import threading
from urllib.parse import parse_qs, urlsplit

from audit import Handler, Server, SITE, without_overflow
from playwright.sync_api import expect, sync_playwright

PUBLIC = "https://kingali66767.github.io/zad-preview/"
PRAYER_API = "https://api.aladhan.com/**"
TIMINGS = {"Fajr": "05:10", "Dhuhr": "12:10", "Asr": "15:10", "Maghrib": "18:10", "Isha": "19:10"}
COMPATIBLE = "Object.defineProperty(navigator, 'gpu', {value: {requestAdapter: async () => ({features: new Set(['shader-f16'])})}})"
WORKER = """
self.onmessage = ({data}) => {
  if (data.type === 'init') {
    self.postMessage({type:'progress', progress:1.5});
    self.postMessage({type:'ready'});
  } else if (data.question === 'تعذّر') {
    self.postMessage({type:'error', stage:'ask'});
  } else if (data.question !== 'مهلة') {
    const truncated = data.question === 'اقتطاع';
    const answer = data.question;
    setTimeout(() => self.postMessage({type:'answer', answer, truncated}), 100);
  }
};
"""


class Suite:
    def __init__(self):
        self.results = []

    def run(self, name, check):
        try:
            details = check()
        except Exception as error:
            self.results.append({"name": name, "status": "failed", "detail": str(error)[:1800]})
            print("FAIL", name, str(error).splitlines()[0], flush=True)
        else:
            row = {"name": name, "status": "passed"}
            if details:
                row["detail"] = details
            self.results.append(row)
            print("PASS", name, flush=True)

    def blocked(self, name, detail):
        self.results.append({"name": name, "status": "blocked", "detail": detail})
        print("BLOCKED", name, detail, flush=True)


def intercept(context, origin):
    context.route(re.compile(r"^https?://"), lambda route: (
        route.continue_() if route.request.url.startswith(origin) else route.abort()
    ))


def new_visit(browser, address, check, *, local=False, device=None, init=None, setup=None, **options):
    settings = {"viewport": {"width": 390, "height": 844}, "reduced_motion": "reduce"}
    settings.update(device or {})
    settings.update(options)
    context = browser.new_context(**settings)
    try:
        if local:
            intercept(context, address.split("#")[0])
        page = context.new_page()
        page.set_default_timeout(5000)
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        if init:
            page.add_init_script(init)
        if setup:
            setup(page)
        response = page.goto(address, wait_until="domcontentloaded", timeout=15000)
        assert response and response.status == 200, (response.status if response else None, address)
        details = check(page)
        assert not errors, errors
        return details
    finally:
        context.close()


def verify_sections(page):
    for ident, expected in {"worship": 8, "adhkar": 22, "quran": 8, "lessons": 7, "hadith": 10,
                            "faq": 11, "media": 7, "occasions": 8, "belief": 5, "seerah": 4}.items():
        selector = ":scope > .faq-list > details" if ident == "faq" else ":scope > .cards > article"
        expect(page.locator(f"#{ident}").locator(selector)).to_have_count(expected)
    assert page.locator("#sections").evaluate("""root => Array.from(root.querySelectorAll('article.card, .faq-list > details'))
        .every(item => item.querySelector('.references a[href^="https://"]'))""")
    ids = page.locator("[id]").evaluate_all("items => items.map(item => item.id)")
    assert len(ids) == len(set(ids)), "Duplicate DOM IDs"
    without_overflow(page)


def verify_menu(page):
    menu = page.locator("#menu")
    page.keyboard.press("Tab")
    expect(page.locator(".skip")).to_be_focused()
    for url in page.locator("#nav a").evaluate_all("items => Array.from(items, a => a.hash)"):
        menu.click()
        page.locator(f'#nav a[href="{url}"]').click()
        expect(page).to_have_url(re.compile(re.escape(url) + "$"))
        expect(page.locator(url)).to_be_visible()
        expect(menu).to_have_attribute("aria-expanded", "false")
    menu.click()
    page.keyboard.press("Escape")
    expect(menu).to_be_focused()
    expect(page.locator("#nav")).to_be_hidden()


def all_filters(page):
    for section, total, categories in (("adhkar", 22, 6), ("faq", 11, 4)):
        button = page.locator(f"#{section} select")
        selector = f"#{section} .card" if section == "adhkar" else f"#{section} .faq-list > details"
        choices = button.locator("option").evaluate_all("items => Array.from(items, o => o.value).filter(Boolean)")
        assert len(choices) == categories, choices
        visible_total = 0
        for value in choices:
            button.select_option(value)
            visible = page.locator(selector + ":visible").count()
            assert visible > 0, value
            visible_total += visible
        assert visible_total == total
        button.select_option("")
        expect(page.locator(selector + ":visible")).to_have_count(total)
    questions = page.locator("#faq .faq-list > details")
    for question in questions.all():
        question.locator("summary").press("Enter")
        expect(question).to_have_attribute("open", "")
        expect(question.locator(".references a").first).to_be_visible()
        question.locator("summary").press("Space")
        expect(question).not_to_have_attribute("open", "")


def reading_cycle(page):
    boxes = page.locator("#reading input[type=checkbox]")
    expect(boxes).to_have_count(7)
    for box in boxes.all():
        box.check()
    expect(page.locator(".reading-progress")).to_contain_text("٧ من ٧")
    page.reload()
    expect(page.locator("#reading input:checked")).to_have_count(7)
    boxes.nth(2).uncheck()
    expect(page.locator(".reading-progress")).to_contain_text("٦ من ٧")
    page.reload()
    expect(boxes.nth(2)).not_to_be_checked()
    page.locator(".reading-panel button").click()
    page.reload()
    expect(page.locator("#reading input:checked")).to_have_count(0)


def guide_history(page):
    guide = page.locator("#discover-islam")
    expect(guide).not_to_have_attribute("open", "")
    guide.locator(":scope > summary").click()
    for code, direction in (("ar", "rtl"), ("en", "ltr"), ("fr", "ltr"), ("es", "ltr")):
        prefix = f"discover-{code}"
        guide.locator(f'.discover-languages a[href="#{prefix}"]').click()
        expect(guide.locator(f"#{prefix}")).to_have_attribute("dir", direction)
        expect(guide.locator(".discover-locale[open]")).to_have_count(1)
        expect(guide.locator(f"#{prefix}-wudu ol li")).to_have_count(6)
        guide.locator(f'#{prefix} a[href="#{prefix}-shahada"]').first.click()
        expect(page).to_have_url(PUBLIC + f"#{prefix}-shahada")
        expect(guide.locator(f"#{prefix}-shahada blockquote")).to_have_count(2)
        without_overflow(page)
    page.go_back()
    expect(page.locator("#discover-es")).to_have_attribute("open", "")
    page.go_back()
    expect(page.locator("#discover-fr")).to_have_attribute("open", "")
    page.go_forward()
    expect(page.locator("#discover-es")).to_have_attribute("open", "")
    page.reload()
    expect(page.locator("#discover-es")).to_have_attribute("open", "")


def check_prayer_time(page, city):
    if city == "riyadh":
        page.locator("#prayer-form button").click()
    else:
        page.locator("#city").select_option(city)
    expect(page.locator("#times strong")).to_have_count(5, timeout=12000)
    value = page.locator("#prayer-status").inner_text()
    assert city in ("riyadh", "mecca") and "أم القرى" in value or city not in ("riyadh", "mecca")
    assert "بنظام ٢٤ ساعة" in value
    values = page.locator("#times strong").all_text_contents()
    assert all(re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value) for value in values)


def capture_model_support(page):
    return page.evaluate("""async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return {webgpu: !!navigator.gpu, adapter: !!adapter, shader_f16: !!adapter?.features.has('shader-f16')};
    }""")


def public_cases(suite, browser, device):
    suite.run("عام | فتح الزائر دون حساب وعرض 90 مادة", lambda: new_visit(browser, PUBLIC, verify_sections))
    suite.run("عام | جميع روابط قائمة الجوال والتنقل بلوحة المفاتيح",
              lambda: new_visit(browser, PUBLIC, verify_menu, device=device))
    suite.run("عام | جميع مرشحات الأذكار والفتاوى وفتح كل سؤال", lambda: new_visit(browser, PUBLIC, all_filters))
    suite.run("عام | إكمال جميع السور والحفظ والتراجع وإعادة الضبط", lambda: new_visit(browser, PUBLIC, reading_cycle))
    suite.run("عام | اللغات الأربع ورجوع المتصفح وإعادة التحميل", lambda: new_visit(browser, PUBLIC, guide_history, device=device))

    def old_addresses(page):
        for code in ("ar", "en", "fr", "es"):
            page.goto(PUBLIC + f"discover/{code}/index.html")
            expect(page).to_have_url(PUBLIC + f"index.html#discover-{code}")
            expect(page.locator(f"#discover-{code}")).to_have_attribute("open", "")
    suite.run("عام | تحويل الروابط القديمة لجميع اللغات", lambda: new_visit(browser, PUBLIC, old_addresses))
    suite.run("عام | فتح عنوان فرعي مباشر بالفرنسية",
              lambda: new_visit(browser, PUBLIC + "#discover-fr-wudu",
                                lambda p: expect(p.locator("#discover-fr-wudu")).to_be_visible()))
    suite.run("عام | عنوان القسم غير المعروف يبقي الموقع متاحًا",
              lambda: new_visit(browser, PUBLIC + "#unknown-section",
                                lambda p: expect(p.locator("#quran")).to_be_visible()))

    def address_not_configured(page):
        expect(page.locator("#contact-link")).to_be_hidden()
        expect(page.locator("#contact-note")).to_contain_text("بريد المبادرة")
    suite.run("عام | التواصل قبل إعداد البريد", lambda: new_visit(browser, PUBLIC, address_not_configured))

    for city in ("riyadh", "mecca", "cairo", "amman", "dubai"):
        suite.run(f"عام | مواقيت حية للمدينة {city}",
                  lambda city=city: new_visit(browser, PUBLIC, lambda p: check_prayer_time(p, city)))

    support = new_visit(browser, PUBLIC, capture_model_support)
    if support["shader_f16"]:
        def real_model(page):
            page.locator("#ask-enable").click()
            expect(page.locator("#ask-submit")).to_be_enabled(timeout=310000)
            page.locator("#ask-input").fill("ما الفرق بين الزكاة والصدقة؟ اشرح بإيجاز.")
            page.locator("#ask-submit").click()
            expect(page.locator("#ask-result")).to_be_visible(timeout=95000)
            assert len(page.locator("#ask-answer").inner_text().strip()) > 10
        suite.run("عام | تحميل Qwen وتوليد رد عربي حقيقي", lambda: new_visit(browser, PUBLIC, real_model))
    else:
        suite.blocked("عام | تحميل Qwen وتوليد رد عربي حقيقي", support)


def local_cases(suite, browser, origin):
    def run(name, check, **options):
        suite.run("محلي | " + name, lambda: new_visit(browser, origin, check, local=True, **options))

    def unavailable_storage(page):
        page.locator("#reading input").first.check()
        expect(page.locator(".reading-progress")).to_contain_text("تعذّر حفظ")
        page.reload()
        expect(page.locator("#reading input:checked")).to_have_count(0)
    run("تعطيل التخزين المحلي ثم إعادة التحميل", unavailable_storage,
        init="""Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('not available','SecurityError')}})""")
    run("بيانات التقدّم المحفوظة تالفة",
        lambda p: expect(p.locator("#reading input:checked")).to_have_count(0),
        init="""localStorage.setItem('zad-reading-v1', '{invalid')""")
    run("بيانات التقدّم المحفوظة مختلطة أو مكررة",
        lambda p: expect(p.locator("#reading input:checked")).to_have_count(1),
        init="""localStorage.setItem('zad-reading-v1', JSON.stringify([0,0,88,"1",-1,null]))""")

    def no_js(page):
        page.locator("#discover-islam > summary").click()
        expect(page.locator("#discover-ar-wudu")).to_be_visible()
        missing = page.locator("noscript a[href^='#']").evaluate_all(
            "links => links.map(a => a.hash.slice(1)).filter(id => !document.getElementById(id))"
        )
        assert not missing, f"Broken fallback links: {missing}"
    run("إرشادات تعطيل JavaScript وروابط الدليل", no_js, java_script_enabled=False)
    run("عرض متاح مع منع الخطوط الخارجية وعرض 320 بكسل",
        verify_sections, viewport={"width": 320, "height": 750})

    def mocked_contact(page):
        def contact(route):
            source = (SITE / "assets/content.js").read_text().replace('contactEmail: ""', 'contactEmail: "zad@example.invalid"')
            route.fulfill(body=source, content_type="text/javascript")
        page.route("**/assets/content.js", contact)

    run("زر التواصل عند إعداد بريد اختباري",
        lambda page: expect(page.locator("#contact-link")).to_have_attribute("href", "mailto:zad@example.invalid"),
        setup=mocked_contact)

    failures = {
        "انقطاع طلب AlAdhan": lambda route: route.abort("internetdisconnected"),
        "حظر AlAdhan المؤقت 429": lambda route: route.fulfill(status=429, json={}),
        "خطأ الخادم 503": lambda route: route.fulfill(status=503, json={}),
        "استجابة غير قابلة لفك JSON": lambda route: route.fulfill(body="Invalid JSON", content_type="application/json"),
        "مواقيت ناقصة": lambda route: route.fulfill(json={"data": {"timings": {"Fajr": "05:00"}}}),
        "ساعة خارج نطاق اليوم": lambda route: route.fulfill(json={"data": {"timings": TIMINGS | {"Fajr": "29:00"}}}),
        "وقت ملحق بنص غير صالح": lambda route: route.fulfill(json={"data": {"timings": TIMINGS | {"Fajr": "05:00invalid"}}}),
    }
    for name, bad_reply in failures.items():
        def prayer_failure(page, bad_reply=bad_reply):
            first = True
            def respond(route):
                nonlocal first
                if first:
                    first = False
                    bad_reply(route)
                else:
                    route.fulfill(json={"data": {"timings": TIMINGS}})
            page.route(PRAYER_API, respond)
            page.locator("#prayer-form button").click()
            expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
            expect(page.locator("#times strong")).to_have_count(0)
            check_prayer_time(page, "riyadh")
        run(name + " ثم نجاح الإعادة", prayer_failure)

    def supported_time_suffix(page):
        page.route(PRAYER_API, lambda route: route.fulfill(
            json={"data": {"timings": TIMINGS | {"Fajr": "05:10 (+03:00)"}}}))
        check_prayer_time(page, "riyadh")
        expect(page.locator("#times strong").first).to_have_text("05:10")
    run("قبول وقت صالح مع لاحقة المنطقة الزمنية", supported_time_suffix)

    def timezone_dates(page):
        calls = []
        def respond(route):
            calls.append(urlsplit(route.request.url))
            route.fulfill(json={"data": {"timings": TIMINGS}})
        page.clock.set_fixed_time(datetime(2026, 1, 1, 21, 30, tzinfo=timezone.utc))
        page.route(PRAYER_API, respond)
        check_prayer_time(page, "riyadh")
        check_prayer_time(page, "cairo")
        assert [call.path.split("/")[-1] for call in calls] == ["02-01-2026", "01-01-2026"]
        assert [parse_qs(call.query)["timezonestring"][0] for call in calls] == ["Asia/Riyadh", "Africa/Cairo"]
    run("اختلاف تاريخ مدينتين قرب منتصف الليل", timezone_dates)

    def prayer_race(page):
        page.locator("#prayer-form button").click()
        page.wait_for_function("window.zadPrayerRequests.length === 1")
        page.locator("#city").select_option("cairo")
        page.wait_for_function("window.zadPrayerRequests.length === 2")
        assert page.evaluate("window.zadPrayerRequests[0].signal.aborted")
        page.evaluate("(times) => window.zadPrayerRequests[1].reply(times)", TIMINGS)
        expect(page.locator("#times strong").first).to_have_text("05:10")
        page.evaluate("(times) => window.zadPrayerRequests[0].reply(times)", TIMINGS | {"Fajr": "04:00"})
        expect(page.locator("#times strong").first).to_have_text("05:10")
        expect(page.locator("#prayer-status")).to_contain_text("القاهرة")
    run("تبديل المدينة أثناء الطلب مع وصول النتيجة القديمة لاحقًا", prayer_race, init="""
        window.zadPrayerRequests=[];
        window.fetch=(url,{signal})=>new Promise(resolve=>window.zadPrayerRequests.push({
            url,signal,reply:timings=>resolve(new Response(JSON.stringify({data:{timings}})))
        }));
    """)

    def prayer_timeout(page):
        page.clock.install()
        page.locator("#prayer-form button").click()
        expect(page.locator("#prayer-status")).to_contain_text("تحميل المواقيت")
        page.clock.fast_forward(9100)
        expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
        expect(page.locator("#times strong")).to_have_count(0)
    run("مهلة تسع ثوان عند تعليق خدمة المواقيت", prayer_timeout, init="""
        window.fetch=(_,{signal})=>new Promise((_,reject)=>signal.addEventListener(
          'abort',()=>reject(new DOMException('aborted','AbortError')), {once:true}));
    """)

    def reset_check(page, message):
        page.locator("#ask-enable").click()
        expect(page.locator("#ask-status")).to_contain_text(message)
        expect(page.locator("#ask-enable")).to_be_enabled()
        expect(page.locator("#ask-submit")).to_be_disabled()
    run("متصفح بدون WebGPU", lambda p: reset_check(p, "يدعمان WebGPU"),
        init="Object.defineProperty(navigator, 'gpu', {value:undefined})")
    run("وجود WebGPU دون دعم دقة 16 بت", lambda p: reset_check(p, "دقة ١٦ بت"),
        init=COMPATIBLE.replace("['shader-f16']", "[]"))
    run("رفض نظام التشغيل إتاحة محوّل الرسوميات", lambda p: reset_check(p, "تعذّر تشغيل"),
        init=COMPATIBLE.replace("({features: new Set(['shader-f16'])})", "Promise.reject(new Error('disabled'))"))

    def hung_adapter(page):
        page.clock.install()
        page.locator("#ask-enable").click()
        page.clock.fast_forward(15000)
        expect(page.locator("#ask-enable")).to_be_enabled(timeout=1000)
        expect(page.locator("#ask-status")).to_contain_text("توافق")
    run("محوّل الرسوميات لا يرد", hung_adapter,
        init=COMPATIBLE.replace("({features: new Set(['shader-f16'])})", "new Promise(() => {})"))

    def fail_worker(page):
        page.route("**/assets/ask-worker.js", lambda route: route.fulfill(status=503))
    run("تعذّر تحميل العامل البرمجي", lambda p: reset_check(p, "تعذّر تشغيل"),
        init=COMPATIBLE, setup=fail_worker)

    def valid_worker(page):
        page.route("**/assets/ask-worker.js", lambda route: route.fulfill(
            content_type="text/javascript", body=WORKER))

    def start_model(page):
        page.locator("#ask-enable").click()
        expect(page.locator("#ask-submit")).to_be_enabled()

    def input_cases(page):
        start_model(page)
        field = page.locator("#ask-input")
        field.fill("")
        page.locator("#ask-submit").click()
        assert field.evaluate("el => el.validity.valueMissing")
        field.fill("    ")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-status")).to_contain_text("اكتب سؤالًا")
        expect(field).to_be_focused()
    run("إرسال حقل فارغ ثم حقل يحتوي مسافات فقط", input_cases, init=COMPATIBLE, setup=valid_worker)

    def multilingual_ask(page):
        start_model(page)
        field = page.locator("#ask-input")
        for question in ("  سؤال بالعربية؟  ", "A question in English", "Une question en français",
                         "Una pregunta en español", "نص <مرجع> & رمز"):
            field.fill(question)
            field.press("Enter")
            expect(page.locator("#ask-answer")).to_have_text(question.strip())
            expect(page.locator("#ask-answer > *")).to_have_count(0)
        field.fill("اقتطاع")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-status")).to_contain_text("الحد الأقصى")
    run("تمرير أربع لغات وعرض النص الآمن والتنبيه عند اقتطاع الرد",
        multilingual_ask, init=COMPATIBLE, setup=valid_worker)

    def long_input(page):
        start_model(page)
        field = page.locator("#ask-input")
        field.focus()
        page.keyboard.insert_text("س" * 510)
        assert len(field.input_value()) == 500
        field.press("Enter")
        expect(page.locator("#ask-answer")).to_have_text("س" * 500)
    run("إدخال سؤال بطول يزيد على الحد", long_input, init=COMPATIBLE, setup=valid_worker)

    def answer_timeout(page):
        page.clock.install()
        start_model(page)
        page.locator("#ask-input").fill("مهلة")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-submit")).to_be_disabled()
        page.clock.fast_forward(91000)
        expect(page.locator("#ask-status")).to_contain_text("استغرق توليد")
        expect(page.locator("#ask-enable")).to_be_enabled()
        start_model(page)
        page.locator("#ask-input").fill("نجح")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-answer")).to_have_text("نجح")
    run("انتهاء مهلة التوليد وإعادة تشغيله بنجاح", answer_timeout, init=COMPATIBLE, setup=valid_worker)

    def init_timeout(page):
        page.route("**/assets/ask-worker.js", lambda route: route.fulfill(
            content_type="text/javascript", body="self.onmessage = () => {};"))
        page.clock.install()
        page.locator("#ask-enable").click()
        expect(page.locator("#ask-status")).to_contain_text("تحميل نموذج")
        page.clock.fast_forward(301000)
        expect(page.locator("#ask-status")).to_contain_text("استغرق تحميل")
        expect(page.locator("#ask-enable")).to_be_enabled()
    run("انتهاء مهلة تحميل النموذج", init_timeout, init=COMPATIBLE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--local-only", action="store_true")
    modes.add_argument("--public-only", action="store_true")
    parser.add_argument("--webkit", action="store_true")
    args = parser.parse_args()
    suite = Suite()
    with Server(("127.0.0.1", 0), partial(Handler, directory=SITE)) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_port}/"
        try:
            with sync_playwright() as playwright:
                with playwright.chromium.launch(executable_path=os.getenv("ZAD_CHROMIUM", "/usr/bin/chromium")) as browser:
                    if not args.public_only:
                        local_cases(suite, browser, origin)
                    if not args.local_only:
                        public_cases(suite, browser, playwright.devices["iPhone 13"])
                if args.webkit and not args.local_only:
                    try:
                        with playwright.webkit.launch() as browser:
                            suite.run("عام | فتح الصفحة في WebKit بأبعاد iPhone",
                                      lambda: new_visit(browser, PUBLIC, verify_sections, device=playwright.devices["iPhone 13"]))
                            device = playwright.devices["iPhone 13"]
                            suite.run("عام | اللغات والرجوع في WebKit",
                                      lambda: new_visit(browser, PUBLIC, guide_history, device=device))
                            suite.run("عام | الأذكار والفتاوى في WebKit",
                                      lambda: new_visit(browser, PUBLIC, all_filters, device=device))
                            suite.run("عام | حفظ خطة القراءة في WebKit",
                                      lambda: new_visit(browser, PUBLIC, reading_cycle, device=device))
                            suite.run("عام | مواقيت الرياض الحية في WebKit",
                                      lambda: new_visit(browser, PUBLIC, lambda p: check_prayer_time(p, "riyadh"), device=device))
                    except Exception as error:
                        suite.blocked("عام | تشغيل محرك WebKit", str(error)[:1200])
        finally:
            server.shutdown()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(suite.results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if any(result["status"] == "failed" for result in suite.results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
