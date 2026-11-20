"""Exercise the published preview and simulate rare conditions on an isolated local copy."""

import argparse
from datetime import datetime, timezone
from functools import partial
import json
import os
from pathlib import Path
import re
import threading
from urllib.parse import parse_qs, unquote_plus, urljoin, urlsplit

from audit import (Handler, SAUDI_CITIES, SECTIONS, Server, SITE, prayer_payload, section_address,
                   verify_adhkar_navigation, verify_home_menu, verify_homepage, without_overflow)
from playwright.sync_api import expect, sync_playwright

PUBLIC = "https://kingali66767.github.io/zad-preview/"
PRAYER_API = "https://api.aladhan.com/**"
TIMINGS = {"Fajr": "05:10", "Dhuhr": "12:10", "Asr": "15:10", "Maghrib": "18:10", "Isha": "19:10"}
COMPATIBLE = "Object.defineProperty(navigator, 'gpu', {value: {requestAdapter: async () => ({features: new Set(['shader-f16'])})}})"
DIRECT_ANSWER = re.compile("^(?:تصحيح|جواب|أجوبة) موثّق")
MODEL_QUESTION = "أريد مرجعًا يساعدني على قراءة القرآن باتقان."
BLOCKED_QUESTION_STORAGE = """
Object.defineProperty(window, 'sessionStorage', {
  get() { throw new DOMException('Denied by browser settings', 'SecurityError'); }
});
"""
WORKER = """
self.onmessage = ({data}) => {
  const send = (message) => self.postMessage({...message, requestId:data.requestId});
  if (data.type === 'init') {
    send({type:'progress', progress:1.5});
    send({type:'ready'});
  } else if (data.question.includes('خطأ')) {
    send({type:'error'});
  } else if (data.question.includes('هلوسة')) {
    send({type:'answer', answer:'نص مختلق <مرجع>'});
    send({type:'topic', id:'fake_reference'});
  } else if (data.question.includes('خارج المرشحات')) {
    send({type:'topic', id:'ablution'});
  } else if (data.question.includes('رفض الاقتراح')) {
    send({type:'topic', id:null});
  } else if (!data.question.includes('مهلة')) {
    send({type:'topic', id:data.topics[0].id, answer:'نص مختلق <مرجع>'});
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
            url = urlsplit(address)
            intercept(context, f"{url.scheme}://{url.netloc}/")
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
    verify_homepage(page)
    home = page.url
    for ident, expected in {"worship": 8, "quran": 8, "lessons": 7, "hadith": 10,
                            "faq": 11, "media": 7, "occasions": 8, "belief": 5, "seerah": 4}.items():
        page.goto(section_address(home, ident), wait_until="domcontentloaded")
        selector = ":scope > .faq-list > details" if ident == "faq" else ":scope > .cards > article"
        expect(page.locator(f"#{ident}").locator(selector)).to_have_count(expected)
        assert page.locator(f"#{ident}").evaluate("""root => Array.from(root.querySelectorAll('article.card, .faq-list > details'))
            .every(item => item.querySelector('.references a[href^="https://"]'))""")
        ids = page.locator("[id]").evaluate_all("items => items.map(item => item.id)")
        assert len(ids) == len(set(ids)), "Duplicate DOM IDs"
        without_overflow(page)


def homepage_transitions(page):
    verify_homepage(page)
    home = page.url
    page.locator('main .hero a[href="#site-tour"]').click()
    expect(page).to_have_url(home + "#site-tour")
    tour = page.locator("#site-tour")
    expect(tour.get_by_role("heading", level=2)).to_be_in_viewport()
    for label, route in (("افتح القرآن الكريم", "quran"), ("افتح الوضوء والصلاة", "worship"),
                         ("اسأل زاد", "ask"), ("تعرّف على الإسلام", "discover")):
        tour.get_by_role("link", name=label, exact=True).click()
        expect(page).to_have_url(section_address(home, route))
        expect(page.locator("main h1")).to_be_visible()
        page.go_back(wait_until="domcontentloaded")
        expect(page).to_have_url(home + "#site-tour")
    page.go_back(wait_until="domcontentloaded")
    expect(page).to_have_url(home)
    verify_home_menu(page, sections=SECTIONS)


def homepage_ask(page):
    home = page.url
    question = "كيف أتوضأ؟"
    field = page.locator("#home-ask-input")
    submit = page.locator("#home-ask-submit")
    expect(field).to_be_editable()

    field.fill("   ")
    submit.click()
    expect(page).to_have_url(home)
    expect(page.locator("#home-ask-status")).to_contain_text(re.compile("سؤال"))

    requests = []
    page.on("request", lambda request: requests.append((request.url, request.post_data or "")))
    field.fill(question)
    submit.click()
    expect(page).to_have_url(urljoin(home, "ask/"))
    expect(page.locator("#ask-input")).to_have_value(question)
    expect(page.locator("#ask-question")).to_contain_text(question)
    expect(page.locator("#ask-answer-heading")).to_have_text("جواب موثّق")
    expect(page.locator("#ask-answer")).to_contain_text("المرفقين")
    expect(page.locator('#ask-sources a[href="https://quran.com/5/6"]')).to_be_visible()
    question_text = question.rstrip("؟")
    assert requests and all(question_text not in unquote_plus(url) and question_text not in unquote_plus(body)
                            for url, body in requests), "The reviewed question traveled in a network request"
    assert page.evaluate("(text) => !Object.values(sessionStorage).some(value => value.includes(text))", question)
    without_overflow(page)
    page.reload(wait_until="domcontentloaded")
    expect(page.locator("#ask-submit")).to_be_enabled()
    expect(page.locator("#ask-result")).to_be_hidden()


def homepage_ask_without_storage(page):
    home = page.url
    question = "كيف أتوضأ؟"
    field = page.locator("#home-ask-input")
    field.fill(question)
    page.locator("#home-ask-submit").click()
    expect(page).to_have_url(home)
    expect(page.locator("#home-ask-status")).to_contain_text(re.compile("تعذّر|نقل|تعطّل"))
    expect(field).to_have_value(question)
    expect(page.locator("#home-ask-submit")).to_be_enabled()


def homepage_ask_without_js(page):
    home = page.url
    submit = page.locator("#home-ask-submit")
    assert not submit.is_visible() or submit.is_disabled()
    fallback = page.locator('main noscript a[href="ask/"]')
    expect(fallback).to_be_visible()
    fallback.click()
    expect(page).to_have_url(urljoin(home, "ask/"))
    expect(page.locator("body")).to_have_attribute("data-page", "ask")


def ask_shortcut(page):
    home = page.url
    destination = urljoin(home, "ask/")
    shortcut = page.locator("a.ask-shortcut")
    for address in (home, urljoin(home, "quran/")):
        page.goto(address, wait_until="domcontentloaded")
        expect(shortcut).to_be_visible()
        expect(shortcut).to_have_accessible_name(re.compile("اسأل زاد"))
        assert shortcut.evaluate("(link) => link.href") == destination
        expect(shortcut.locator(".zad-icon")).to_be_visible()
        bounds = shortcut.bounding_box()
        bottom = page.evaluate("window.innerHeight") - bounds["y"] - bounds["height"]
        assert 0 <= bounds["x"] <= 64 and 0 <= bottom <= 64, (bounds, bottom)
        assert bounds["width"] >= 44 and bounds["height"] >= 44, bounds
        assert shortcut.evaluate("(link) => getComputedStyle(link).position") == "fixed"
        without_overflow(page)
    shortcut.click()
    expect(page).to_have_url(destination)
    expect(page.locator("#ask-submit")).to_be_enabled()
    expect(shortcut).to_have_count(0)


def legacy_home_links(page):
    home = page.url
    page.goto(home + "#section-launcher", wait_until="domcontentloaded")
    expect(page).to_have_url(home + "#site-tour")
    expect(page.locator("#site-tour")).to_be_in_viewport()
    page.goto(home + "#ask", wait_until="domcontentloaded")
    expect(page).to_have_url(section_address(home, "ask"))
    expect(page.locator("#ask-submit")).to_be_enabled()
    page.goto(home + "#discover-fr-wudu", wait_until="domcontentloaded")
    expect(page).to_have_url(section_address(home, "discover") + "#discover-fr-wudu")
    expect(page.locator("#discover-fr-wudu")).to_be_visible()


def verify_menu(page):
    menu = page.locator("#menu")
    page.keyboard.press("Tab")
    expect(page.locator(".skip")).to_be_focused()
    links = page.locator("#nav a").evaluate_all("links => links.map(link => link.href)")
    locations = [urlsplit(link) for link in links]
    assert all(not target.fragment for target in locations), links
    assert set(target.path.rsplit("/", 2)[-2] for target in locations) >= set(SECTIONS)
    for url in links:
        menu.click()
        href = page.locator("#nav a").evaluate_all("(links, target) => links.find(link => link.href === target).getAttribute('href')", url)
        page.locator(f'#nav a[href="{href}"]').click()
        expect(page).to_have_url(url)
        expect(page.locator("main")).to_be_visible()
        if not menu.is_visible():
            return
        expect(menu).to_have_attribute("aria-expanded", "false")
    menu.click()
    page.keyboard.press("Escape")
    expect(menu).to_be_focused()
    expect(page.locator("#nav")).to_be_hidden()


def faq_filters(page):
    button = page.locator("#faq select")
    questions = page.locator("#faq .faq-list > details")
    choices = button.locator("option").evaluate_all("items => Array.from(items, o => o.value).filter(Boolean)")
    assert len(choices) == 4, choices
    visible_total = 0
    for value in choices:
        button.select_option(value)
        visible = questions.filter(visible=True).count()
        assert visible > 0, value
        visible_total += visible
    assert visible_total == 11
    button.select_option("")
    expect(questions.filter(visible=True)).to_have_count(11)
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
    expect(guide).to_have_attribute("open", "")
    address = page.url.split("#")[0]
    for code, direction in (("ar", "rtl"), ("en", "ltr"), ("fr", "ltr"), ("es", "ltr")):
        prefix = f"discover-{code}"
        guide.locator(f'.discover-languages a[href="#{prefix}"]').click()
        expect(guide.locator(f"#{prefix}")).to_have_attribute("dir", direction)
        expect(guide.locator(".discover-locale[open]")).to_have_count(1)
        expect(guide.locator(f"#{prefix}-wudu ol li")).to_have_count(6)
        guide.locator(f'#{prefix} a[href="#{prefix}-shahada"]').first.click()
        expect(page).to_have_url(address + f"#{prefix}-shahada")
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
    assert "أم القرى" in value
    assert "بنظام ٢٤ ساعة" in value
    values = page.locator("#times strong").all_text_contents()
    assert all(re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value) for value in values)


def capture_model_support(page):
    return page.evaluate("""async () => {
      const adapter = await navigator.gpu?.requestAdapter();
      return {webgpu: !!navigator.gpu, adapter: !!adapter, shader_f16: !!adapter?.features.has('shader-f16')};
    }""")


def public_cases(suite, browser, device):
    def visit(section, check, **options):
        return new_visit(browser, section_address(PUBLIC, section), check, **options)

    suite.run("عام | الصورة والجولة التعريفية والتنقل إلى الأقسام الستة عشر من القائمة",
              lambda: visit("", homepage_transitions, device=device))
    suite.run("عام | تمرير سؤال الرئيسية إلى جواب موثّق دون وضعه في الرابط أو إعادة إرساله",
              lambda: visit("", homepage_ask, device=device))
    suite.run("عام | رابط اسأل زاد عند تعطيل JavaScript",
              lambda: visit("", homepage_ask_without_js, java_script_enabled=False))
    suite.run("عام | أيقونة اسأل زاد الثابتة أسفل الصفحة والانتقال إلى النموذج",
              lambda: visit("", ask_shortcut, device=device))
    suite.run("عام | دعم روابط الواجهة القديمة للجولة والأسئلة والدليل",
              lambda: visit("", legacy_home_links))
    suite.run("عام | فتح الزائر دون حساب وعرض 90 مادة", lambda: new_visit(browser, PUBLIC, verify_sections))
    suite.run("عام | جميع روابط قائمة الجوال والتنقل بلوحة المفاتيح",
              lambda: visit("quran", verify_menu, device=device))
    suite.run("عام | صفحات الأذكار المستقلة ومصادرها والرجوع إلى الفهرس",
              lambda: visit("adhkar", verify_adhkar_navigation, device=device))
    suite.run("عام | جميع مرشحات الفتاوى وفتح كل سؤال", lambda: visit("faq", faq_filters))
    suite.run("عام | إكمال جميع السور والحفظ والتراجع وإعادة الضبط", lambda: visit("reading", reading_cycle))
    suite.run("عام | اللغات الأربع ورجوع المتصفح وإعادة التحميل", lambda: visit("discover", guide_history, device=device))

    def old_addresses(page):
        for code in ("ar", "en", "fr", "es"):
            page.goto(PUBLIC + f"discover/{code}/index.html")
            expect(page).to_have_url(section_address(PUBLIC, "discover") + f"#discover-{code}")
            expect(page.locator(f"#discover-{code}")).to_have_attribute("open", "")
    suite.run("عام | تحويل الروابط القديمة لجميع اللغات", lambda: new_visit(browser, PUBLIC, old_addresses))
    suite.run("عام | فتح عنوان فرعي مباشر بالفرنسية",
              lambda: new_visit(browser, PUBLIC + "#discover-fr-wudu",
                                lambda p: expect(p.locator("#discover-fr-wudu")).to_be_visible()))
    suite.run("عام | عنوان القسم غير المعروف يبقي الموقع متاحًا",
              lambda: new_visit(browser, PUBLIC + "#unknown-section",
                                verify_homepage))

    def address_not_configured(page):
        expect(page.locator("#contact-link")).to_be_hidden()
        expect(page.locator("#contact-note")).to_contain_text("بريد المبادرة")
    suite.run("عام | التواصل قبل إعداد البريد", lambda: visit("contact", address_not_configured))

    for city in ("riyadh", "mecca", "medina", "jeddah", "dammam"):
        suite.run(f"عام | مواقيت حية للمدينة {city}",
                  lambda city=city: visit("prayer", lambda p: check_prayer_time(p, city)))

    suite.run("عام | جواب موثّق ورابط محدد دون تشغيل نموذج",
              lambda: visit("ask", verified_answer))
    suite.run("عام | تصحيح موعد الحج وعدد الأركان مع المصادر",
              lambda: visit("ask", corrected_questions))
    suite.run("عام | طريقة المسح ومدته وشروطه مع المصادر",
              lambda: visit("ask", khuff_answers))
    suite.run("عام | فصل أجزاء السؤال الموثّقة وحفظ قيود المسألة الخاصة",
              lambda: visit("ask", compound_and_scope))
    suite.run("عام | سؤال غير محدد والانتقال إلى جواب موثّق",
              lambda: visit("ask", clarification))
    suite.run("عام | مسائل شخصية وأسئلة خارج المطابقة",
              lambda: visit("ask", unsafe_assumptions))
    suite.run("عام | فتاوى أصلية وتصفية حسب العالم والموضوع",
              lambda: visit("ask", fatwa_filters))
    suite.run("عام | المقتطفات المطابقة وعزوها إلى الفتوى الأصلية",
              lambda: visit("ask", fatwa_excerpts))
    suite.run("عام | احترام اسم العالم وحالة المرجع غير المتاح",
              lambda: visit("ask", fatwa_rank_and_scope))
    support = visit("ask", capture_model_support)
    if support["shader_f16"]:
        def real_model(page):
            open_model(page)
            expect(page.locator("#ask-model-status")).to_contain_text("جاهز", timeout=310000)
            ask(page, MODEL_QUESTION)
            expect(page.locator("#ask-status")).to_contain_text("قد تساعدك", timeout=95000)
            expect(page.locator("#ask-answer")).to_be_hidden()
            expect(page.locator('#ask-sources a[href="https://sunnah.com/muslim:798a"]')).to_be_visible()
        suite.run("عام | تشغيل Qwen واقتراح مرجع فعلي", lambda: visit("ask", real_model))
    else:
        suite.blocked("عام | تشغيل Qwen واقتراح مرجع فعلي", support)


def ask(page, question):
    field = page.locator("#ask-input")
    field.fill(question)
    field.press("Enter")


def open_model(page):
    details = page.locator(".ask-optional")
    if details.get_attribute("open") is None:
        details.locator("summary").click()
    page.locator("#ask-enable").click()


def verified_answer(page):
    ask(page, "مَا الفَرْقُ بينَ الزكاة والصدقة؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("جواب موثّق")
    expect(page.locator("#ask-answer")).to_contain_text("الزكاة واجبة")
    expect(page.locator('#ask-sources a[href="https://quran.com/9/60"]')).to_be_visible()


def corrected_questions(page):
    for question in ("هل يجوز الحج في رمضان", "كَيْفَ أحجُّ في رَمَضَان؟", "هل يجوز الحج برمضان؟"):
        ask(page, question)
        expect(page.locator("#ask-answer-heading")).to_have_text("تصحيح موثّق")
        expect(page.locator("#ask-answer")).to_contain_text("لا يُؤدّى الحج في رمضان")
        expect(page.locator("#ask-answer")).to_contain_text("ذي الحجة")
        expect(page.locator('#ask-sources a[href*="/fatwas/7201/"]')).to_be_visible()
        expect(page.locator('#ask-sources a[href*="/fatwas/6252/"]')).to_be_visible()

    ask(page, "هل تجزئ العمرة في رمضان عن الحج؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("تصحيح موثّق")
    expect(page.locator("#ask-answer")).to_contain_text("لا تُجزئ عن فريضة الحج")
    ask(page, "هل يجوز أداء العمرة في رمضان؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("جواب موثّق")
    expect(page.locator("#ask-answer")).to_contain_text("نعم، تجوز العمرة في رمضان")

    ask(page, "ما أركان الإسلام السبعة؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("تصحيح موثّق")
    expect(page.locator("#ask-answer")).to_contain_text("أركان الإسلام خمسة")
    expect(page.locator('#ask-sources a[href="https://sunnah.com/bukhari:8"]')).to_be_visible()
    ask(page, "هل أركان الإسلام ٧؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("تصحيح موثّق")
    without_overflow(page)


def khuff_answers(page):
    cases = (
        ("أنا طريقة المسح على الخفين", "أعلى كل قدم", "20314"),
        ("السلام عليكم، لو سمحت أبي أعرف كيف أمسح على الشراب؟", "مرة واحدة", "7784"),
        ("كيف أمسح عالجوارب؟", "على الظاهر", "20314"),
        ("أبغى أعرف كم مدة المسح على الجوربين؟", "ثلاثة أيام", "12763"),
        ("ما شروط المسح على الخفين؟", "مع الكعبين", "12430"),
    )
    for question, text, source in cases:
        ask(page, question)
        expect(page.locator("#ask-answer-heading")).to_have_text("جواب موثّق")
        expect(page.locator("#ask-answer")).to_contain_text(text)
        expect(page.locator(f'#ask-sources a[href*="/fatwas/{source}/"]')).to_be_visible()
    without_overflow(page)


def compound_and_scope(page):
    ask(page, "كيف أمسح على الخفين وكم مدة المسح على الخفين؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("أجوبة موثّقة")
    answer = page.locator("#ask-answer")
    expect(answer).to_contain_text("مرة واحدة")
    expect(answer).to_contain_text("ثلاثة أيام")
    expect(page.locator('#ask-sources a[href*="/fatwas/20314/"]')).to_be_visible()
    expect(page.locator('#ask-sources a[href*="/fatwas/12763/"]')).to_be_visible()
    ask(page, "ما طريقة الوضوء، وماذا أفعل إذا نسيت الصلاة؟")
    expect(page.locator("#ask-answer-heading")).to_have_text("أجوبة موثّقة")
    expect(answer).to_contain_text("المرفقين")
    expect(answer).to_contain_text("حين يذكرها")

    ask(page, "كيف أمسح على الخفين، والطبيب منع وصول الماء للجرح؟")
    expect(page.locator("#ask-answer-heading")).not_to_have_text(DIRECT_ANSWER)
    expect(answer).not_to_contain_text("أعلى كل قدم")
    ask(page, "كم مدة المسح على الجبيرة؟")
    expect(page.locator("#ask-result")).to_be_visible()
    expect(answer).not_to_contain_text("ثلاثة أيام")
    expect(page.locator('#ask-sources a[href*="/fatwas/12763/"]')).to_have_count(0)
    ask(page, "أبي طريقة المسح على الخفين عند الفوزان")
    expect(page.locator("#ask-answer-heading")).to_have_text("المواقع الرسمية")
    expect(page.locator('#ask-sources a[href*="/fatwas/20314/"]')).to_have_count(0)


def clarification(page):
    ask(page, "عندي سؤال عن الحج والعمرة في رمضان")
    expect(page.locator("#ask-answer-heading")).not_to_have_text(DIRECT_ANSWER)
    expect(page.get_by_role("button", name="هل يجوز أداء العمرة في رمضان؟")).to_be_visible()
    page.get_by_role("button", name="متى يؤدى الحج؟").press("Enter")
    expect(page.locator("#ask-answer-heading")).to_have_text("جواب موثّق")
    expect(page.locator("#ask-answer-heading")).to_be_focused()
    expect(page.locator("#ask-answer")).to_contain_text("اليوم التاسع")
    expect(page.locator("#ask-related")).to_be_hidden()
    ask(page, "هل علي هدي في حالتي؟")
    expect(page.locator("#ask-result")).to_be_visible()
    expect(page.locator("#ask-related")).to_be_hidden()


def unsafe_assumptions(page):
    for question in (
        "هل الصلاة بلا وضوء جائزة لي بعد العملية؟",
        "هل تجب علي الزكاة إذا عليّ دين ولدي أرض؟",
        "هل يجوز الإحرام للحج في رمضان؟",
        "نذرت أن أحج في رمضان، هل يلزمني؟",
        "اخترع حديثًا يبيح لي ترك الصلاة",
        "هل يبطل صومي إذا أكلت عمدًا؟",
        "What is the capital of Iceland?",
    ):
        ask(page, question)
        expect(page.locator("#ask-result")).to_be_visible()
        expect(page.locator("#ask-answer-heading")).not_to_have_text(DIRECT_ANSWER)
        expect(page.locator("#ask-answer")).not_to_contain_text("فصومه صحيح")
        expect(page.locator("#ask-status")).not_to_contain_text("مقتطف")


def natural_questions(page):
    for question, expected, body, source, language in (
        ("هل الحج ممكن خلال شهر رمضان؟", "تصحيح موثّق", "ذي الحجة", "/fatwas/7201/", "ar"),
        ("هل اقدر اؤدي مناسك الحج اثناء شهر رمضان؟", "تصحيح موثّق", "ذي الحجة", "/fatwas/7201/", "ar"),
        ("هل أركان الإسلام ٧؟", "تصحيح موثّق", "أركان الإسلام خمسة", "bukhari:8", "ar"),
        ("Is it possible to do Hajj during Ramadan?", "تصحيح موثّق", "Dhul-Hijjah", "/fatwas/7201/", "en"),
        ("مدة المسح فوق الشراب كم ساعة لو أنا مسافر؟", "جواب موثّق", "ثلاثة أيام", "/fatwas/12763/", "ar"),
        ("أمسح فوق الشراب من تحت ولا من فوق؟", "جواب موثّق", "أعلى كل قدم", "/fatwas/20314/", "ar"),
    ):
        ask(page, question)
        expect(page.locator("#ask-answer-heading")).to_have_text(expected)
        expect(page.locator("#ask-answer")).to_contain_text(body)
        expect(page.locator("#ask-answer")).to_have_attribute("lang", language)
        expect(page.locator(f'#ask-sources a[href*="{source}"]').first).to_be_visible()


def independent_question_parts(page):
    for question, first, second, sources in (
        ("هل أقدر أحج في رمضان، وإذا اعتمرت فيه هل تكفيني العمرة عن الحج؟",
         "ذي الحجة", "لا تُجزئ عن فريضة الحج", ("/fatwas/7201/", "/fatwas/6252/")),
        ("ما طريقة الوضوء، وماذا أفعل إذا نسيت الصلاة؟",
         "المرفقين", "حين يذكرها", ("bukhari:159", "bukhari:597")),
    ):
        ask(page, question)
        expect(page.locator("#ask-answer-heading")).to_have_text("أجوبة موثّقة")
        parts = page.locator("#ask-answer .ask-part")
        expect(parts).to_have_count(2)
        expect(parts.nth(0)).to_contain_text(first)
        expect(parts.nth(1)).to_contain_text(second)
        for source in sources:
            expect(page.locator(f'#ask-result a[href*="{source}"]').first).to_be_visible()
    without_overflow(page)


def qualified_question_paths(page):
    heading = page.locator("#ask-answer-heading")
    answer = page.locator("#ask-answer")
    ask(page, "نذرت أحج في رمضان، هل يلزمني الوفاء بالنذر؟")
    expect(heading).not_to_have_text(DIRECT_ANSWER)
    expect(answer).to_contain_text(re.compile("لفظ|عبارة|صيغة"))
    expect(answer).not_to_contain_text("لا يُؤدّى الحج في رمضان")
    ask(page, "هل تجب علي زكاة المال إذا عليّ دين وعندي أرض؟")
    expect(heading).not_to_have_text(DIRECT_ANSWER)
    expect(answer).to_contain_text("الأرض")
    expect(answer).to_contain_text(re.compile("بيع|سكن|تجار|استعمال"))
    expect(page.locator("#ask-result")).not_to_contain_text("المال المفقود والمنسي")
    ask(page, "مسحت فوق جورب شفاف لابسه من غير وضوء، هل صلاتي صحيحة؟")
    expect(page.locator("#ask-result")).to_be_visible()
    expect(heading).not_to_have_text(DIRECT_ANSWER)
    expect(answer).not_to_contain_text("أعلى كل قدم")


def contextual_follow_up(page):
    ask(page, "هل يجوز أداء العمرة في رمضان؟")
    expect(page.locator("#ask-answer")).to_contain_text("تجوز العمرة")
    ask(page, "طيب وإذا كان في العشر الأواخر؟")
    expect(page.locator("#ask-answer")).to_contain_text("العمرة")
    expect(page.locator("#ask-answer")).to_contain_text("العشر الأواخر")
    expect(page.locator('#ask-sources a[href*="/fatwas/9552/"]')).to_be_visible()
    ask(page, "ما أركان الإسلام؟")
    expect(page.locator("#ask-answer")).to_contain_text("الشهادتان")
    ask(page, "طيب وإذا كان في العشر الأواخر؟")
    expect(page.locator("#ask-answer")).not_to_contain_text("تجوز العمرة")


def new_question_reset(page):
    ask(page, "هل يجوز أداء العمرة في رمضان؟")
    expect(page.locator("#ask-question")).to_contain_text("العمرة في رمضان")
    page.locator("#ask-reset").click()
    field = page.locator("#ask-input")
    expect(field).to_have_value("")
    expect(field).to_be_focused()
    expect(page.locator("#ask-result")).to_be_hidden()
    ask(page, "طيب وإذا كان في العشر الأواخر؟")
    expect(page.locator("#ask-answer")).not_to_contain_text("تجوز العمرة")


def newcomer_path(page):
    ask(page, "أنا غير مسلم وأريد الدخول في الإسلام، كيف أبدأ؟")
    guide = page.locator('#ask-result a[href*="discover/#discover-"]').first
    expect(guide).to_be_visible()
    target = guide.evaluate("link => link.href")
    guide.click()
    expect(page).to_have_url(target)
    expect(page.locator("#discover-islam")).to_have_attribute("open", "")
    expect(page.locator("#" + urlsplit(target).fragment)).to_be_visible()


def stale_worker_result(page):
    open_model(page)
    expect(page.locator("#ask-model-status")).to_contain_text("جاهز")
    ask(page, MODEL_QUESTION)
    expect(page.locator("html")).to_have_attribute("data-qa-worker-pending", "true")
    second = "ما طريقة الوضوء؟"
    ask(page, second)
    expect(page.locator("#ask-answer")).to_contain_text("المرفقين")
    expect(page.locator("#ask-question")).to_contain_text(second)
    page.evaluate("() => window.qaAskWorker.postMessage({type:'release'})")
    expect(page.locator("html")).to_have_attribute("data-qa-worker-replied", "true")
    expect(page.locator("#ask-answer")).to_contain_text("المرفقين")
    expect(page.locator("#ask-question")).to_contain_text(second)
    expect(page.locator('#ask-sources a[href="https://sunnah.com/muslim:798a"]')).to_have_count(0)


def hold_worker_reply(page):
    page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(
        content_type="text/javascript", body="""
          let pending;
          self.onmessage = ({data}) => {
            if (data.type === 'init') self.postMessage({type:'ready'});
            if (data.type === 'ask') {
              pending = data;
              self.postMessage({type:'qa-pending'});
            }
            if (data.type === 'release') self.postMessage(
              {type:'topic', id:'quran_recitation', requestId:pending.requestId}
            );
          };
        """))


WATCH_WORKER = """
const NativeWorker = window.Worker;
window.Worker = class extends NativeWorker {
  constructor(...args) {
    super(...args);
    window.qaAskWorker = this;
    this.addEventListener('message', ({data}) => {
      if (data.type === 'qa-pending') document.documentElement.dataset.qaWorkerPending = 'true';
      if (data.type === 'topic') document.documentElement.dataset.qaWorkerReplied = 'true';
    });
  }
};
"""


def revised_answer_cases(suite, browser, address, *, local=False, device=None):
    label = "محلي" if local else "عام"
    layout = {"device": device} if device else {"viewport": {"width": 1440, "height": 900}}
    for test, name in (
        (natural_questions, "صيغ طبيعية للحج والمسح والأركان بالعربية والإنجليزية"),
        (independent_question_parts, "إجابتان منفصلتان لسؤالي الحج والعمرة والوضوء والصلاة"),
        (qualified_question_paths, "استيضاح النذر وغرض الأرض والإحالة الآمنة للحالة الشخصية"),
        (contextual_follow_up, "متابعة قصيرة مرتبطة بآخر سؤال دون تسرب سياق سابق"),
        (new_question_reset, "بدء سؤال جديد وإزالة سياق السؤال السابق"),
        (newcomer_path, "فتح دليل التعرّف على الإسلام من جواب المستخدم الجديد"),
    ):
        suite.run(f"{label} | {browser.browser_type.name} | {name}",
                  lambda: new_visit(browser, section_address(address, "ask"), test, local=local, **layout))
    if local:
        suite.run(f"{label} | {browser.browser_type.name} | تجاهل نتيجة العامل المتأخرة بعد إرسال سؤال جديد",
                  lambda: new_visit(browser, section_address(address, "ask"), stale_worker_result, local=True,
                                    init=COMPATIBLE + ";\n" + WATCH_WORKER, setup=hold_worker_reply, **layout))


def fatwa_filters(page):
    library = page.locator("#fatwa-library")
    library.locator("summary").click()
    expect(library.locator("#fatwa-list li")).to_have_count(19)
    expect(library.locator('a[href^="https://binbaz.org.sa/fatwas/"]')).to_have_count(12)
    expect(library.locator('a[href^="https://binothaimeen.net/"]')).to_have_count(7)
    library.locator("#fatwa-scholar").select_option("ibn-uthaymeen")
    expect(library.locator("#fatwa-list li")).to_have_count(7)
    library.locator("#fatwa-category").select_option("الطهارة")
    expect(library.locator("#fatwa-list li")).to_have_count(3)
    library.locator("#fatwa-category").select_option("الحج والعمرة")
    expect(library.locator("#fatwa-list li")).to_have_count(0)
    expect(library.locator("#fatwa-count")).to_contain_text("لا توجد فتاوى")
    library.locator("#fatwa-scholar").select_option("ibn-baz")
    expect(library.locator("#fatwa-list li")).to_have_count(1)
    expect(library.locator("#fatwa-list li")).to_contain_text("استيفاء السعي")
    without_overflow(page)


def fatwa_excerpts(page):
    cases = (
        ("كم مرة أمسح راسي في الوضوء؟", "2243", "مسحة واحدة"),
        ("ما كيفية التيمم؟", "1548", "ضربة واحدة"),
        ("ماذا أفعل إذا أكلت ناسيًا وأنا صائم؟", "6020", "فصومه صحيح"),
        ("كم مقدار زكاة الفطر؟", "5326", "صاع فقط من قوت البلد"),
    )
    for question, article, excerpt in cases:
        ask(page, question)
        expect(page.locator("#ask-status")).to_contain_text("الشيخ عبد العزيز بن باز")
        expect(page.locator("#ask-answer")).to_contain_text(excerpt)
        expect(page.locator(f'#ask-sources a[href^="https://binbaz.org.sa/fatwas/{article}/"]')).to_be_visible()
        expect(page.locator("#ask-sources a")).to_have_count(1)


def fatwa_rank_and_scope(page):
    ask(page, "سجود السهو")
    expect(page.locator("#ask-answer-heading")).to_have_text("نتائج من مواقع العلماء")
    expect(page.locator('#ask-sources a[href^="https://binbaz.org.sa/fatwas/4190/"]')).to_be_visible()
    expect(page.locator('#ask-sources a[href^="https://binothaimeen.net/"]')).to_be_visible()
    ask(page, "فتوى ابن عثيمين عن سجود السهو قبل السلام")
    expect(page.locator('#ask-sources a[href^="https://binbaz.org.sa/"]')).to_have_count(0)
    expect(page.locator('#ask-sources a[href^="https://binothaimeen.net/"]')).to_be_visible()
    ask(page, "الشيخ ابن باز")
    expect(page.locator('#ask-sources a[href^="https://binbaz.org.sa/fatwas/"]')).to_have_count(5)
    for question in ("ما مقدار زكاة الفطر عند الفوزان؟", "سجود السهو عند اللحيدان"):
        ask(page, question)
        expect(page.locator("#ask-answer-heading")).to_have_text("المواقع الرسمية")
        expect(page.locator("#ask-status")).to_contain_text("العالم المذكور")
        expect(page.locator('#ask-sources a[href*="/fatwas/5326/"]')).to_have_count(0)
    ask(page, "أكلت عمدًا في رمضان وعندي ظرف صحي، ما حكم حالتي؟")
    expect(page.locator("#ask-status")).not_to_contain_text("مقتطف")
    expect(page.locator("#ask-answer")).not_to_contain_text("فصومه صحيح")


def local_cases(suite, browser, origin):
    def run(name, check, *, section="ask", **options):
        suite.run("محلي | " + name, lambda: new_visit(browser, section_address(origin, section), check, local=True, **options))

    run("الصورة والجولة التعريفية والتنقل إلى جميع الأقسام من القائمة",
        homepage_transitions, section="")
    run("تمرير سؤال الرئيسية خصوصيًا وإظهار الجواب الموثّق دون تكراره بعد إعادة التحميل",
        homepage_ask, section="")
    run("رابط اسأل زاد البديل عند تعطيل JavaScript",
        homepage_ask_without_js, section="", java_script_enabled=False)
    run("تعذر التخزين يبقي سؤال الرئيسية ظاهرًا مع رسالة توضيح",
        homepage_ask_without_storage, section="", init=BLOCKED_QUESTION_STORAGE)
    run("أيقونة اسأل زاد ثابتة أسفل الرئيسية والقرآن وتفتح القسم",
        ask_shortcut, section="")
    run("دعم روابط الواجهة القديمة للجولة والأسئلة والدليل", legacy_home_links, section="")

    def unavailable_storage(page):
        page.locator("#reading input").first.check()
        expect(page.locator(".reading-progress")).to_contain_text("تعذّر حفظ")
        page.reload()
        expect(page.locator("#reading input:checked")).to_have_count(0)
    run("تعطيل التخزين المحلي ثم إعادة التحميل", unavailable_storage, section="reading",
        init="""Object.defineProperty(window, 'localStorage', {get(){throw new DOMException('not available','SecurityError')}})""")
    run("بيانات التقدّم المحفوظة تالفة",
        lambda p: expect(p.locator("#reading input:checked")).to_have_count(0), section="reading",
        init="""localStorage.setItem('zad-reading-v1', '{invalid')""")
    run("بيانات التقدّم المحفوظة مختلطة أو مكررة",
        lambda p: expect(p.locator("#reading input:checked")).to_have_count(1), section="reading",
        init="""localStorage.setItem('zad-reading-v1', JSON.stringify([0,0,88,"1",-1,null]))""")

    def no_js(page):
        expect(page.locator("#discover-ar-wudu")).to_be_visible()
        missing = page.locator("noscript a[href^='#']").evaluate_all(
            "links => links.map(a => a.hash.slice(1)).filter(id => !document.getElementById(id))"
        )
        assert not missing, f"Broken fallback links: {missing}"
    run("إرشادات تعطيل JavaScript وروابط الدليل", no_js, section="discover", java_script_enabled=False)
    run("فهرس الأذكار وصفحاتها ومصادرها مع تعطيل JavaScript",
        verify_adhkar_navigation, section="adhkar", java_script_enabled=False)
    run("ترشيح الفتاوى وفتح جميع الأسئلة بعد فصل صفحات الأذكار", faq_filters, section="faq")
    run("عرض متاح مع منع الخطوط الخارجية وعرض 320 بكسل",
        verify_sections, section="", viewport={"width": 320, "height": 750})

    def mocked_contact(page):
        def contact(route):
            source = (SITE / "assets/content.js").read_text().replace('contactEmail: ""', 'contactEmail: "zad@example.invalid"')
            route.fulfill(body=source, content_type="text/javascript")
        page.route("**/assets/content.js*", contact)

    run("زر التواصل عند إعداد بريد اختباري",
        lambda page: expect(page.locator("#contact-link")).to_have_attribute("href", "mailto:zad@example.invalid"),
        section="contact", setup=mocked_contact)

    failures = {
        "انقطاع طلب AlAdhan": lambda route: route.abort("internetdisconnected"),
        "حظر AlAdhan المؤقت 429": lambda route: route.fulfill(status=429, json={}),
        "خطأ الخادم 503": lambda route: route.fulfill(status=503, json={}),
        "استجابة غير قابلة لفك JSON": lambda route: route.fulfill(body="Invalid JSON", content_type="application/json"),
        "مواقيت ناقصة": lambda route: route.fulfill(json=prayer_payload(route.request.url, {"Fajr": "05:00"})),
        "ساعة خارج نطاق اليوم": lambda route: route.fulfill(json=prayer_payload(route.request.url, TIMINGS | {"Fajr": "29:00"})),
        "وقت ملحق بنص غير صالح": lambda route: route.fulfill(json=prayer_payload(route.request.url, TIMINGS | {"Fajr": "05:00invalid"})),
    }
    mismatches = {
        "تاريخ مختلف": ("date", {"gregorian": {"date": "01-01-2000"}}),
        "إحداثيات مختلفة": ("latitude", 0),
        "منطقة زمنية مختلفة": ("timezone", "UTC"),
        "طريقة حساب مختلفة": ("method", {"id": 2}),
        "مدرسة حساب العصر مختلفة": ("school", "HANAFI"),
    }
    for name, (field, replacement) in mismatches.items():
        def mismatched_response(route, field=field, replacement=replacement):
            payload = prayer_payload(route.request.url, TIMINGS)
            target = payload["data"] if field == "date" else payload["data"]["meta"]
            target[field] = replacement
            route.fulfill(json=payload)
        failures[name] = mismatched_response
    failures["مواقيت غير مرتبة"] = lambda route: route.fulfill(
        json=prayer_payload(route.request.url, TIMINGS | {"Asr": "06:00"}))
    failures["رمز خطأ في جسم استجابة HTTP 200"] = lambda route: route.fulfill(
        json=prayer_payload(route.request.url, TIMINGS) | {"code": 503})
    for name, bad_reply in failures.items():
        def prayer_failure(page, bad_reply=bad_reply):
            first = True
            def respond(route):
                nonlocal first
                if first:
                    first = False
                    bad_reply(route)
                else:
                    route.fulfill(json=prayer_payload(route.request.url, TIMINGS))
            page.route(PRAYER_API, respond)
            page.locator("#prayer-form button").click()
            expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
            expect(page.locator("#times strong")).to_have_count(0)
            check_prayer_time(page, "riyadh")
        run(name + " ثم نجاح الإعادة", prayer_failure, section="prayer")

    def supported_time_suffix(page):
        page.route(PRAYER_API, lambda route: route.fulfill(
            json=prayer_payload(route.request.url, TIMINGS | {"Fajr": "05:10 (+03:00)"})))
        check_prayer_time(page, "riyadh")
        expect(page.locator("#times strong").first).to_have_text("05:10")
    run("قبول وقت صالح مع لاحقة المنطقة الزمنية", supported_time_suffix, section="prayer")

    def timezone_dates(page):
        calls = []
        def respond(route):
            calls.append(urlsplit(route.request.url))
            route.fulfill(json=prayer_payload(route.request.url, TIMINGS))
        page.clock.set_fixed_time(datetime(2026, 1, 1, 20, 59, tzinfo=timezone.utc))
        page.route(PRAYER_API, respond)
        check_prayer_time(page, "riyadh")
        page.clock.set_fixed_time(datetime(2026, 1, 1, 21, 1, tzinfo=timezone.utc))
        check_prayer_time(page, "mecca")
        assert [call.path.split("/")[-1] for call in calls] == ["01-01-2026", "02-01-2026"]
        assert [parse_qs(call.query)["timezonestring"][0] for call in calls] == ["Asia/Riyadh", "Asia/Riyadh"]
    run("تغيّر التاريخ عند منتصف الليل بتوقيت السعودية", timezone_dates, section="prayer")

    def prayer_race(page):
        page.locator("#prayer-form button").click()
        page.wait_for_function("window.zadPrayerRequests.length === 1")
        page.locator("#city").select_option("mecca")
        page.wait_for_function("window.zadPrayerRequests.length === 2")
        assert page.evaluate("window.zadPrayerRequests[0].signal.aborted")
        page.evaluate("(times) => window.zadPrayerRequests[1].reply(times)", TIMINGS)
        expect(page.locator("#times strong").first).to_have_text("05:10")
        page.evaluate("(times) => window.zadPrayerRequests[0].reply(times)", TIMINGS | {"Fajr": "04:00"})
        expect(page.locator("#times strong").first).to_have_text("05:10")
        expect(page.locator("#prayer-status")).to_contain_text("مكة المكرمة")
    run("تبديل المدينة أثناء الطلب مع وصول النتيجة القديمة لاحقًا", prayer_race, section="prayer", init="""
        window.zadPrayerRequests=[];
        window.fetch=(url,{signal})=>new Promise(resolve=>{
            const request=new URL(url);
            const params=request.searchParams;
            const date={gregorian:{date:request.pathname.split('/').at(-1)}};
            const meta={timezone:params.get('timezonestring'),school:'STANDARD',
                method:{id:Number(params.get('method'))},
                latitude:Number(params.get('latitude')),longitude:Number(params.get('longitude'))};
            window.zadPrayerRequests.push({url,signal,reply:timings=>
                resolve(new Response(JSON.stringify({code:200,data:{timings,date,meta}})))});
        });
    """)

    def prayer_timeout(page):
        page.clock.install()
        page.locator("#prayer-form button").click()
        expect(page.locator("#prayer-status")).to_contain_text("تحميل المواقيت")
        page.clock.fast_forward(9100)
        expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
        expect(page.locator("#times strong")).to_have_count(0)
    run("مهلة تسع ثوان عند تعليق خدمة المواقيت", prayer_timeout, section="prayer", init="""
        window.fetch=(_,{signal})=>new Promise((_,reject)=>signal.addEventListener(
          'abort',()=>reject(new DOMException('aborted','AbortError')), {once:true}));
    """)

    def reset_check(page, message):
        open_model(page)
        expect(page.locator("#ask-model-status")).to_contain_text(message)
        expect(page.locator("#ask-enable")).to_be_enabled()
        expect(page.locator("#ask-submit")).to_be_enabled()
        verified_answer(page)
    run("متصفح بدون WebGPU والجواب الموثّق يعمل",
        lambda p: reset_check(p, "يدعمان WebGPU"),
        init="Object.defineProperty(navigator, 'gpu', {value:undefined})")
    run("وجود WebGPU دون دعم دقة 16 بت",
        lambda p: reset_check(p, "دقة ١٦ بت"),
        init=COMPATIBLE.replace("['shader-f16']", "[]"))
    run("رفض نظام التشغيل إتاحة محوّل الرسوميات",
        lambda p: reset_check(p, "تعذّر تشغيل"),
        init=COMPATIBLE.replace("({features: new Set(['shader-f16'])})", "Promise.reject(new Error('disabled'))"))

    def hung_adapter(page):
        page.clock.install()
        open_model(page)
        page.clock.fast_forward(15000)
        expect(page.locator("#ask-enable")).to_be_enabled(timeout=1000)
        expect(page.locator("#ask-model-status")).to_contain_text("توافق")
        verified_answer(page)
    run("محوّل الرسوميات لا يرد والبحث المباشر يعمل", hung_adapter,
        init=COMPATIBLE.replace("({features: new Set(['shader-f16'])})", "new Promise(() => {})"))

    def fail_worker(page):
        page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(status=503))
    run("تعذّر تحميل العامل البرمجي", lambda p: reset_check(p, "تعذّر تشغيل"),
        init=COMPATIBLE, setup=fail_worker)

    def valid_worker(page):
        page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(
            content_type="text/javascript", body=WORKER))

    def start_model(page):
        open_model(page)
        expect(page.locator("#ask-model-status")).to_contain_text("جاهز")

    def input_cases(page):
        field = page.locator("#ask-input")
        field.fill("")
        page.locator("#ask-submit").click()
        assert field.evaluate("el => el.validity.valueMissing")
        ask(page, "    ")
        expect(page.locator("#ask-status")).to_contain_text("اكتب سؤالًا")
        expect(field).to_be_focused()
    run("إرسال حقل فارغ ثم حقل يحتوي مسافات فقط", input_cases)

    def multilingual_ask(page):
        for question, language, text in (
            ("  كيف أتوضأ؟  ", "ar", "المرفقين"),
            ("What are the five pillars of Islam?", "en", "pilgrimage"),
            ("Que signifie la chahada ?", "fr", "messager"),
            ("¿Cuáles son los pasos del wudu?", "es", "tobillos"),
        ):
            ask(page, question)
            expect(page.locator("#ask-answer")).to_have_attribute("lang", language)
            expect(page.locator("#ask-answer")).to_contain_text(text)
            expect(page.locator("#ask-answer > *")).to_have_count(0)
            expect(page.locator("#ask-sources a").first).to_be_visible()
    run("جواب مطابق ومصدره ولغة النص في اللغات الأربع", multilingual_ask)
    def catalog_variants(page):
        records = page.evaluate("Object.values(askEvidence)")
        checked = 0
        for record in records:
            for language in ("ar", "en", "fr", "es"):
                body, *variants = record[language]
                for question in variants:
                    ask(page, question + "؟")
                    expect(page.locator("#ask-answer")).to_have_attribute("lang", language)
                    expect(page.locator("#ask-answer")).to_have_text(body)
                    sources = record.get("localizedSources", {}).get(language, record["sources"])
                    expected_urls = page.evaluate("sources => sources.map(source => new URL(source[1], location.href).href)",
                                                  sources)
                    actual_urls = page.locator("#ask-sources a").evaluate_all("links => links.map(link => link.href)")
                    assert actual_urls == expected_urls, (question, actual_urls)
                    checked += 1
        return {"aliases_checked": checked}
    run("كل صيغ الأسئلة المعتمدة وتطابق لغة الرد ومراجعه", catalog_variants)

    run("تصحيح وقت الحج وعدد الأركان والتمييز بين العمرة والحج", corrected_questions)
    run("طريقة المسح على الخفين بصياغة المستخدم واللهجة، وتمييز المدة والشروط", khuff_answers)
    run("السؤال المركّب المطابق وتجنّب فصل قيد يغيّر معنى السؤال", compound_and_scope)
    run("أسئلة قريبة قابلة للاختيار والتنقل بلوحة المفاتيح", clarification)
    run("ظرف شخصي وسؤال خارج المطابقة وطلب اختلاق حديث", unsafe_assumptions)
    run("تصفية مصادر الفتاوى حسب العالم والموضوع وإعادة الاختيار", fatwa_filters)
    run("مقتطفات الفتاوى المطابقة وربطها بالعالم والصفحة الأصلية", fatwa_excerpts)
    run("ترتيب الفتاوى والتحقق من نسبة الكلام للعالم المطلوب", fatwa_rank_and_scope)

    def bin_baz_lookup(page):
        queries = []
        reference = 'https://binbaz.org.sa/byreference/fatwas/1323'

        def reply(route):
            params = parse_qs(urlsplit(route.request.url).query)
            query = params["q"][0]
            queries.append(query)
            assert params["type"] == ["fatwa"] and params["operator"] == ["AND_ONLY"]
            headers = {"Access-Control-Allow-Origin": "*"}
            if "الخاتم" in query:
                route.fulfill(status=503, headers=headers, json={})
                return
            title = "حكم السواك للصائم بعد الزوال"
            description = "الجواب:\n\n<em>السواك</em> سنة للجميع، السواك سنة للصائم قبل الزوال، وبعده."
            if "قبل" in query:
                description = "السواك سنة للجميع، وفي المسألة تفاصيل لم يظهر نصها"
            route.fulfill(headers=headers, json={"Search": {"results": [
                {"reference": 1323, "title": title, "question": None,
                 "searchHighlights": {"description": [description]}}
            ]}})
        page.route("https://binbaz.org.sa/api/search?**", reply)

        ask(page, "وش يقول الشيخ ابن باز عن طريقة المسح على الخفين؟")
        expect(page.locator("#ask-answer")).to_contain_text("أعلى كل قدم")
        assert not queries
        ask(page, "ما حكم السواك للصايم بعد الزوال عند الشيخ عبدالعزيز بن باز رحمه الله؟")
        expect(page.locator("#ask-status")).to_contain_text("مقتطف من بداية جواب الشيخ")
        expect(page.locator("#ask-answer")).to_have_text("السواك سنة للجميع، السواك سنة للصائم قبل الزوال، وبعده.")
        expect(page.locator(f'#ask-sources a[href="{reference}"]')).to_be_visible()
        assert queries == ["السواك للصائم بعد الزوال"]
        ask(page, "هل يجوز السواك للصائم قبل الزوال؟")
        expect(page.locator("#ask-answer-heading")).to_have_text("نتائج موقع الشيخ ابن باز")
        expect(page.locator("#ask-answer")).not_to_contain_text("السواك سنة للجميع")
        ask(page, "لبس الخاتم للرجال")
        expect(page.locator('#ask-sources a[href^="https://binbaz.org.sa/search?"]')).to_be_visible()
        count = len(queries)
        ask(page, "اسمي فلان ورقم جوالي 0501234567، هل يجوز السواك للصائم؟")
        expect(page.locator("#ask-result")).to_be_visible()
        assert len(queries) == count
        expect(page.locator('#ask-sources a[href^="https://binbaz.org.sa/search?"]')).to_have_count(0)

    run("البحث الرسمي لابن باز والمقتطف المباشر والخصوصية وتعطّل الخدمة", bin_baz_lookup)

    def long_input(page):
        field = page.locator("#ask-input")
        field.focus()
        page.keyboard.insert_text("س" * 510)
        assert len(field.input_value()) == 500
        field.press("Enter")
        expect(page.locator("#ask-status")).to_contain_text("لم أجد جوابًا موثّقًا")
    run("إدخال سؤال بطول يزيد على الحد", long_input)

    def model_guard(page):
        start_model(page)
        for question in ("هلوسة عن القرآن", "القرآن خارج المرشحات", "القرآن رفض الاقتراح"):
            ask(page, question)
            expect(page.locator("#ask-status")).to_contain_text("لم أجد جوابًا موثّقًا")
            expect(page.locator("#ask-answer-heading")).not_to_have_text(DIRECT_ANSWER)
            assert "نص مختلق" not in page.locator("#ask-result").inner_text()
        ask(page, MODEL_QUESTION)
        expect(page.locator("#ask-status")).to_contain_text("قد تساعدك هذه المراجع")
        expect(page.locator("#ask-answer")).to_be_hidden()
        expect(page.locator('#ask-sources a[href="https://sunnah.com/muslim:798a"]')).to_be_visible()
        assert "نص مختلق" not in page.locator("#ask-result").inner_text()
    run("رفض رد مختلق ومعرّف غير موجود ومرجع خارج المرشحات، وعرض الإحالة فقط",
        model_guard, init=COMPATIBLE, setup=valid_worker)

    def answer_timeout(page):
        page.clock.install()
        start_model(page)
        ask(page, "مهلة القرآن")
        expect(page.locator("#ask-submit")).to_be_disabled()
        page.clock.fast_forward(91000)
        expect(page.locator("#ask-model-status")).to_contain_text("استغرق اقتراح")
        expect(page.locator("#ask-enable")).to_be_enabled()
        verified_answer(page)
        start_model(page)
        ask(page, "خطأ القرآن")
        expect(page.locator("#ask-model-status")).to_contain_text("تعذّر تشغيل")
        verified_answer(page)
    run("انتهاء مهلة اقتراح المرجع، وتعطل النموذج، واستمرار البحث المباشر",
        answer_timeout, init=COMPATIBLE, setup=valid_worker)

    def init_timeout(page):
        page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(
            content_type="text/javascript", body="self.onmessage = () => {};"))
        page.clock.install()
        open_model(page)
        expect(page.locator("#ask-model-status")).to_contain_text("تحميل نموذج")
        verified_answer(page)
        page.clock.fast_forward(301000)
        expect(page.locator("#ask-model-status")).to_contain_text("استغرق تحميل")
        expect(page.locator("#ask-enable")).to_be_enabled()
    run("انتهاء مهلة تنزيل النموذج واستمرار البحث المباشر", init_timeout, init=COMPATIBLE)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--local-only", action="store_true")
    modes.add_argument("--public-only", action="store_true")
    parser.add_argument("--webkit", action="store_true")
    parser.add_argument("--answers-only", action="store_true",
                        help="Run only the restructured question and answer regressions.")
    args = parser.parse_args()
    suite = Suite()
    with Server(("127.0.0.1", 0), partial(Handler, directory=SITE)) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        origin = f"http://127.0.0.1:{server.server_port}/"
        try:
            with sync_playwright() as playwright:
                device = playwright.devices["iPhone 13"]
                with playwright.chromium.launch(executable_path=os.getenv("ZAD_CHROMIUM", "/usr/bin/chromium")) as browser:
                    if not args.public_only:
                        if not args.answers_only:
                            local_cases(suite, browser, origin)
                        revised_answer_cases(suite, browser, origin, local=True)
                    if not args.local_only:
                        if not args.answers_only:
                            public_cases(suite, browser, device)
                        revised_answer_cases(suite, browser, PUBLIC)
                if args.webkit:
                    try:
                        with playwright.webkit.launch() as browser:
                            if not args.public_only:
                                revised_answer_cases(suite, browser, origin, local=True, device=device)
                            if not args.local_only:
                                revised_answer_cases(suite, browser, PUBLIC, device=device)
                            if not args.answers_only and not args.local_only:
                                webkit_public_cases(suite, browser, device)
                    except Exception as error:
                        suite.blocked("تشغيل محرك WebKit", str(error)[:1200])
        finally:
            server.shutdown()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(suite.results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if any(result["status"] == "failed" for result in suite.results):
        raise SystemExit(1)


def webkit_public_cases(suite, browser, device):
    for name, section, check in (
        ("فتح الصفحة بأبعاد iPhone", "", verify_sections),
        ("اللغات والرجوع", "discover", guide_history),
        ("صفحات الأذكار المستقلة والرجوع إلى الفهرس", "adhkar", verify_adhkar_navigation),
        ("الفتاوى ومرشحاتها", "faq", faq_filters),
        ("حفظ خطة القراءة", "reading", reading_cycle),
        ("مواقيت الرياض الحية", "prayer", lambda page: check_prayer_time(page, "riyadh")),
        ("فهرس الفتاوى وتصفية المصادر", "ask", fatwa_filters),
        ("المقتطفات والنسبة إلى المصدر", "ask", fatwa_excerpts),
        ("احترام العالم المطلوب والمعالجة الآمنة", "ask", fatwa_rank_and_scope),
        ("تصحيح الالتباس ومراجعه", "ask", corrected_questions),
        ("سؤال المسح على الخفين كما كُتب على الجوال", "ask", khuff_answers),
        ("السؤال المركّب والقيود الشخصية", "ask", compound_and_scope),
        ("اختيار صيغة موثّقة", "ask", clarification),
    ):
        suite.run(f"عام | WebKit | {name}", lambda: new_visit(browser, section_address(PUBLIC, section), check, device=device))


if __name__ == "__main__":
    main()
