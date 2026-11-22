"""Run Chromium browser checks and bounded load tests against a loopback-only server."""

import argparse
import functools
import json
import os
import re
import statistics
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from http.client import HTTPConnection
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "docs"
SECTIONS = ("quran", "lessons", "hadith", "faq", "ask", "media", "occasions", "belief", "seerah",
            "worship", "adhkar", "reading", "prayer", "discover", "sources", "contact")
SAUDI_CITIES = ("riyadh", "mecca", "medina", "jeddah", "dammam", "khobar", "taif", "buraydah", "hail",
                "tabuk", "abha", "jazan", "najran", "albaha", "sakaka", "arar", "hofuf")
ADHKAR_CATEGORIES = ("morning", "evening", "after-prayer", "sleep", "waking", "home", "food",
                    "daily-life", "mosque", "travel", "distress", "general")
SITE_LANGUAGES = {"ar": "rtl", "en": "ltr", "ur": "rtl", "zh": "ltr", "fr": "ltr"}
GUIDE_LANGUAGES = {**SITE_LANGUAGES, "es": "ltr"}


def section_address(origin, section=""):
    return origin.rstrip("/") + "/" + (section + "/" if section else "")


class Server(ThreadingHTTPServer):
    request_queue_size = 128


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):
        pass


def prayer_payload(url, timings):
    request = urlsplit(url)
    params = parse_qs(request.query)
    return {
        "code": 200,
        "data": {
            "timings": timings,
            "date": {"gregorian": {"date": request.path.rsplit("/", 1)[-1]}},
            "meta": {
                "latitude": float(params["latitude"][0]),
                "longitude": float(params["longitude"][0]),
                "timezone": params["timezonestring"][0],
                "method": {"id": int(params["method"][0])},
                "school": "STANDARD",
            },
        },
    }


def without_overflow(page):
    widths = page.evaluate("({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth })")
    assert widths["content"] <= widths["viewport"], (page.url, widths)


def verify_adhkar_navigation(page, *, categories=ADHKAR_CATEGORIES):
    index = page.url
    site = urljoin(index, "../")
    section = page.locator("main #adhkar")
    expect(section).to_be_visible()
    destinations = section.locator("a.adhkar-category-link")
    expect(destinations).to_have_count(len(ADHKAR_CATEGORIES))
    assert set(destinations.evaluate_all("links => links.map(link => link.href)")) == {
        urljoin(index, f"{slug}/") for slug in ADHKAR_CATEGORIES
    }
    expect(section.locator("select")).to_have_count(0)
    without_overflow(page)

    counts = {}
    excerpts = {}
    sources = set()
    for slug in categories:
        section.locator(f'a.adhkar-category-link[href$="{slug}/"]').click()
        expect(page).to_have_url(urljoin(index, f"{slug}/"))
        page.wait_for_load_state("load")
        expect(page.locator("main h1")).to_be_visible()
        assert set(page.locator("header #nav a").evaluate_all("links => links.map(link => link.href)")) == {
            urljoin(site, f"{route}/") for route in SECTIONS
        }, slug
        assert page.locator('link[rel="stylesheet"][href*="/assets/style.css"]').evaluate("link => !!link.sheet"), slug
        category = page.locator("main section#adhkar-category")
        expect(category).to_be_visible()
        expect(category.locator("select")).to_have_count(0)
        cards = category.locator("article.card")
        expect(cards.first).to_be_visible()
        content = cards.evaluate_all(r"""cards => cards.map(card => ({
            sources: [...card.querySelectorAll('a[href^="https://"]')].map(link => link.href),
            quotes: [...card.querySelectorAll('blockquote')].map(quote =>
                quote.innerText.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ')
            )
        }))""")
        assert all(item["sources"] for item in content), (slug, content)
        counts[slug] = len(content)
        excerpts[slug] = {quote for item in content for quote in item["quotes"] if quote}
        sources.update(url for item in content for url in item["sources"])
        without_overflow(page)
        return_link = category.locator('a[href="../"]').first
        expect(return_link).to_be_visible()
        return_link.click()
        expect(page).to_have_url(index)
        expect(section).to_be_visible()
    if "morning" in counts and "evening" in counts:
        assert counts["morning"] >= 6 and counts["evening"] >= 6, counts
        assert excerpts["morning"] - excerpts["evening"], "Missing morning-only dhikr"
        assert excerpts["evening"] - excerpts["morning"], "Missing evening-only dhikr"
    return {"cards_by_category": counts, "sources": sorted(sources)}


def verify_homepage(page):
    hero = page.locator("main .hero")
    expect(hero).to_be_visible()
    assert page.locator("body").evaluate("element => getComputedStyle(element).backgroundColor === 'rgb(255, 255, 255)'")
    expect(page.get_by_role("heading", level=1)).to_have_count(1)
    identity = hero.locator(".hero-identity")
    expect(identity.locator(".hero-identity-name strong")).to_have_text("زاد")
    expect(identity.locator(".hero-identity-name small")).to_have_text("منصة التوعية الدينية")
    for brand_mark in (page.locator(".launcher-brand .route-brand"), identity.locator(".hero-identity-mark")):
        expect(brand_mark).to_be_visible()
        assert brand_mark.evaluate("""element => getComputedStyle(element, '::before').backgroundImage
            .includes('/assets/ministry-of-defense-logo.jpg')""")
    expect(identity.locator(".hero-audience strong")).to_have_text("فرع الشؤون الدينية")
    expect(identity.locator(".hero-audience span")).to_have_text("خدمة توعوية لضباط وأفراد وزارة الدفاع")
    ministry_logo = identity.get_by_role("img", name="شعار وزارة الدفاع السعودية", exact=True)
    expect(ministry_logo).to_be_visible()
    assert ministry_logo.evaluate("async image => { await image.decode(); return image.naturalWidth === 1200; }")
    for layer in (page.locator("body"), hero):
        assert layer.evaluate("""element => getComputedStyle(element, '::before').backgroundImage
            .includes('/assets/ministry-of-defense-logo.jpg')""")
    headline = identity.get_by_role("heading", level=1)
    assert headline.evaluate("""element => {
        const style = getComputedStyle(element);
        return style.color === 'rgb(41, 80, 77)' && style.fontFamily.includes('IBM Plex Sans Arabic');
    }""")
    expect(headline).to_have_text("زاد منصة التوعية الدينية")
    verse = identity.locator(".hero-verse blockquote")
    expect(verse).to_have_text("﴿وَأَعِدُّوا لَهُم مَّا اسْتَطَعْتُم مِّن قُوَّةٍ﴾")
    expect(verse).to_have_attribute("lang", "ar")
    expect(verse).to_have_attribute("dir", "rtl")
    frame = identity.locator(".hero-verse")
    expect(frame.locator("figcaption")).to_have_text("سورة الأنفال، الآية ٦٠")
    expect(frame.locator("a, blockquote[cite]")).to_have_count(0)
    assert frame.evaluate("""async frame => {
        const url = new URL('assets/bradley-backdrop.webp', location.href);
        const style = getComputedStyle(frame);
        if (!style.backgroundImage.includes(url.href) || style.backgroundSize.split(',')[1].trim() !== 'cover') return false;
        const image = new Image();
        image.src = url;
        await image.decode();
        return image.naturalWidth > 0;
    }""")
    calendar = hero.get_by_role("region", name="التقويم اليومي")
    expect(calendar.locator("[data-calendar-weekday]")).to_have_text(re.compile(r"\S"))
    gregorian = calendar.locator("[data-calendar-gregorian]")
    hijri = calendar.locator("[data-calendar-hijri]")
    expect(gregorian).to_have_attribute("datetime", re.compile(r"^\d{4}-\d{2}-\d{2}$"))
    expect(hijri).to_have_attribute("datetime", gregorian.get_attribute("datetime"))
    expect(hijri).to_be_visible()
    expect(hero.locator(".hero-image")).to_have_count(0)
    action = hero.get_by_role("link", name="ابدأ الجولة", exact=True)
    expect(action).to_be_visible()
    expect(action).to_have_attribute("href", "#site-tour")
    form = page.locator("main #home-ask-form")
    field = form.locator("#home-ask-input")
    expect(form).to_be_visible()
    expect(field).to_be_editable()
    expect(field).to_have_accessible_name(re.compile("سؤال"))
    assert field.get_attribute("name") is None, "Submitting without JavaScript must not put the question in a URL"
    expect(form.locator("#home-ask-submit")).to_be_enabled()
    tour = page.locator("#site-tour")
    expect(tour.get_by_role("heading", level=2)).to_be_visible()
    assert hero.bounding_box()["y"] < tour.bounding_box()["y"], "The hero must appear above the tour"
    assert form.bounding_box()["y"] < tour.bounding_box()["y"], "The question form must appear above the tour"
    items = tour.locator(".site-tour-stops > .site-tour-card")
    expect(items).to_have_count(3)
    for item in items.all():
        expect(item).to_be_visible()
        heading = item.get_by_role("heading", level=3)
        body = item.locator("p")
        expect(heading).to_be_visible()
        expect(body).to_be_visible()
        assert all(re.search(r"[\u0621-\u064a]", text.inner_text()) for text in (heading, body))
    assert tour.get_by_role("link").evaluate_all("links => links.map(link => link.getAttribute('href'))") == [
        "quran/", "worship/", "prayer/", "adhkar/travel/", "ask/", "discover/"
    ]
    expect(page.locator("#sections, #section-launcher, .launcher-link, " +
                        ", ".join(f"#{section}" for section in SECTIONS))).to_have_count(0)
    links_outside_menu = page.locator("a[href]").evaluate_all(
        "links => links.filter(link => !link.closest('header #nav, .ask-shortcut, #site-tour')).map(link => link.href)"
    )
    destinations = {urljoin(page.url, section + "/") for section in SECTIONS}
    assert not destinations.intersection(links_outside_menu), links_outside_menu
    without_overflow(page)


def verify_home_menu(page, *, sections=("quran",)):
    home = page.url
    header = page.locator("header.route-header")
    menu = header.get_by_role("button", name="الأقسام", exact=True)
    logo = header.locator(".launcher-brand")
    nav = header.locator("#nav")
    expect(menu).to_be_visible()
    expect(logo).to_be_visible()
    menu_position = menu.bounding_box()
    logo_position = logo.bounding_box()
    assert menu_position["x"] + menu_position["width"] <= logo_position["x"], (menu_position, logo_position)
    assert menu_position["y"] < page.locator("main .hero").bounding_box()["y"]
    expect(menu).to_have_attribute("aria-controls", "nav")
    expect(menu).to_have_attribute("aria-expanded", "false")
    expect(nav).to_be_hidden()
    menu.press("Enter")
    expect(menu).to_have_attribute("aria-expanded", "true")
    expect(nav).to_be_visible()
    without_overflow(page)
    links = nav.get_by_role("link")
    expect(links).to_have_count(len(SECTIONS))
    expect(nav.locator(".zad-icon")).to_have_count(0)
    assert set(links.evaluate_all("links => links.map(link => link.href)")) == {
        urljoin(home, section + "/") for section in SECTIONS
    }
    page.keyboard.press("Escape")
    expect(nav).to_be_hidden()
    expect(menu).to_have_attribute("aria-expanded", "false")
    expect(menu).to_be_focused()
    for index, section in enumerate(sections):
        menu.click()
        link = nav.locator(f'a[data-section-link="{section}"]')
        if index == 0:
            link.press("Enter")
        else:
            link.click()
        expect(page).to_have_url(urljoin(home, section + "/"))
        expect(page.locator("body")).to_have_attribute("data-page", section)
        expect(page.locator("main")).to_be_visible()
        without_overflow(page)
        page.go_back(wait_until="domcontentloaded")
        expect(page).to_have_url(home)
        expect(menu).to_be_visible()
        expect(nav).to_be_hidden()
    without_overflow(page)


def browser_checks(origin, output, live):
    results = []
    external_links = set()
    integration = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.getenv("ZAD_CHROMIUM", "/usr/bin/chromium"))
        for width in (320, 375, 390, 768, 1024, 1101, 1440):
            context = browser.new_context(viewport={"width": width, "height": 900}, reduced_motion="reduce")
            context.route(re.compile(r"^https?://"), lambda route: (
                route.continue_() if route.request.url.startswith(origin + "/") else route.abort()
            ))
            page = context.new_page()
            page_errors = []
            page.on("pageerror", lambda error: page_errors.append(str(error)))
            response = page.goto(origin, wait_until="load")
            assert response.status == 200
            assert page.locator("html").get_attribute("dir") == "rtl"
            verify_homepage(page)
            verify_home_menu(page)
            missing_anchors = page.locator('a[href^="#"]').evaluate_all(
                "links => links.map(link => link.hash.slice(1)).filter(id => !document.getElementById(id))"
            )
            assert not missing_anchors, missing_anchors
            assert page.locator('meta[http-equiv="Content-Security-Policy"]').count() == 1
            assert page.locator('meta[name="referrer"]').get_attribute("content") == "no-referrer"
            if width == 1440:
                for section in SECTIONS:
                    page.goto(section_address(origin, section))
                    external_links.update(page.locator('main a[href^="https://"]').evaluate_all(
                        "links => links.map(link => link.href)"
                    ))
                assert external_links, "No source links found across the section pages"
                page.goto(origin)
            page.goto(section_address(origin, "quran"))
            expect(page.locator("#sections > section")).to_have_count(1)
            expect(page.locator("#quran")).to_be_visible()
            page.locator("#menu").click()
            expect(page.locator("#nav")).to_be_visible()
            page.keyboard.press("Escape")
            expect(page.locator("#menu")).to_be_focused()
            expect(page.locator("#nav")).to_be_hidden()
            page.locator("#menu").click()
            page.locator('#nav a[href="../ask/"]').click()
            expect(page).to_have_url(section_address(origin, "ask"))
            expect(page.locator("#ask-submit")).to_be_enabled()
            expect(page.locator("#nav")).to_be_hidden()
            page.goto(section_address(origin, "faq"))
            page.locator("#faq summary").first.click()
            expect(page.locator("#faq details").first).to_have_attribute("open", "")
            page.locator("#faq summary").first.click()
            expect(page.locator("#faq details").first).not_to_have_attribute("open", "")
            page.goto(section_address(origin, "adhkar"))
            categories = ADHKAR_CATEGORIES if width == 1440 else ("after-prayer",)
            external_links.update(verify_adhkar_navigation(page, categories=categories)["sources"])
            page.goto(section_address(origin, "faq"))
            faq = page.locator("#faq")
            faq.locator("select").select_option(label="الصيام")
            expect(faq.locator("details:visible")).to_have_count(4)
            faq.locator("select").select_option("")
            expect(faq.locator("details:visible")).to_have_count(11)
            page.goto(section_address(origin, "reading"))
            first_surah = page.locator(".reading-list input").first
            first_surah.check()
            page.reload()
            expect(first_surah).to_be_checked()
            page.locator(".reading-panel button").click()
            expect(first_surah).not_to_be_checked()
            assert not page_errors, page_errors
            if width in (390, 1440):
                page.goto(origin, wait_until="load")
                page.screenshot(path=output / f"zad-{width}.png")
            results.append(f"Homepage {width}px: top-left section menu, navigation, RTL, Adhkar and FAQ, and reading persistence")
            context.close()

        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        context.route(re.compile(r"^https?://"), lambda route: (
            route.continue_() if route.request.url.startswith(origin + "/") else route.abort()
        ))
        guide_url = section_address(origin, "discover")
        page.goto(guide_url)
        guide = page.locator("#discover-islam")
        expect(guide).to_have_attribute("open", "")
        for code, direction in GUIDE_LANGUAGES.items():
            prefix = f"discover-{code}"
            locale = guide.locator(f"#{prefix}")
            guide.locator(f'.discover-languages a[href="#{prefix}"]').click()
            expect(page).to_have_url(f"{guide_url}#{prefix}")
            expect(locale).to_have_attribute("open", "")
            expect(locale).to_have_attribute("lang", code)
            expect(locale).to_have_attribute("dir", direction)
            expect(guide.locator(".discover-locale[open]")).to_have_count(1)
            locale.locator(f'.discover-paths a[href="#{prefix}-shahada"]').click()
            expect(page).to_have_url(f"{guide_url}#{prefix}-shahada")
            expect(locale.locator('.shahada-lines blockquote[lang="ar"][dir="rtl"]')).to_have_count(2)
            expect(locale.locator(".discover-transliteration")).to_have_count(0 if code == "ar" else 2)
            locale.locator(f'.discover-paths a[href="#{prefix}-next"]').click()
            locale.locator(f'#{prefix}-next a[href="#{prefix}-wudu"]').click()
            expect(page).to_have_url(f"{guide_url}#{prefix}-wudu")
            expect(locale.locator(f"#{prefix}-wudu ol li")).to_have_count(6)
            expect(locale.locator(f"#{prefix}-prayer-basics ol li")).to_have_count(3)
            expect(locale.locator(f"#{prefix}-daily-life ul li")).to_have_count(3)
            locale.locator(f"#{prefix}-faq summary").first.click()
            expect(locale.locator(f"#{prefix}-faq details").first).to_have_attribute("open", "")
            without_overflow(page)
            results.append(f"Inline guide {code}: same-page navigation, Shahada, wudu, prayer, daily life and FAQ at 390px")
        page.locator(f'#discover-{code}-next a[href="../worship/"]').click()
        expect(page.locator("#worship")).to_be_attached()
        expect(page).to_have_url(section_address(origin, "worship"))
        page.goto(origin + "/discover/en/index.html")
        expect(page).to_have_url(f"{guide_url}#discover-en")
        expect(guide).to_have_attribute("open", "")
        expect(page.locator("#discover-en")).to_have_attribute("open", "")
        page.screenshot(path=output / "zad-discover-en.png")
        results.append("Legacy guide address returns to the inline language panel")
        page.goto(section_address(origin, "contact"))
        expect(page.locator("#contact-link")).to_be_hidden()
        assert not page_errors, page_errors

        calls = []
        state = {"fail": False}
        times = {"Fajr": "04:47", "Dhuhr": "12:00", "Asr": "15:12", "Maghrib": "17:21", "Isha": "18:51"}

        def prayer(route):
            query = parse_qs(urlsplit(route.request.url).query)
            calls.append(query)
            if state["fail"]:
                route.fulfill(status=503, json={"message": "unavailable"})
            else:
                route.fulfill(json=prayer_payload(route.request.url, times))

        inline_blocked = page.evaluate("""() => new Promise(resolve => {
            const timer = setTimeout(() => resolve(false), 1500);
            document.addEventListener("securitypolicyviolation", event => {
                if (event.blockedURI === "inline" && event.effectiveDirective.startsWith("script-src")) {
                    clearTimeout(timer);
                    resolve(true);
                }
            }, { once: true });
            const script = document.createElement("script");
            script.text = "void 0";
            document.head.append(script);
        })""")
        assert inline_blocked, "Document CSP did not block the inline policy test"
        results.append("Chromium enforced CSP and blocked an inert inline script")

        page.goto(section_address(origin, "prayer"))
        page.route("https://api.aladhan.com/**", prayer)
        assert page.locator("#city option").evaluate_all("items => items.map(option => option.value)") == list(SAUDI_CITIES)
        for city in SAUDI_CITIES:
            if city == "riyadh":
                page.locator('#prayer-form button').click()
            else:
                page.locator("#city").select_option(city)
            expect(page.locator("#times strong")).to_have_count(5)
            assert calls[-1]["method"] == ["4"]
            assert calls[-1]["timezonestring"] == ["Asia/Riyadh"]
            assert calls[-1]["school"] == ["0"]
        state["fail"] = True
        page.locator('#prayer-form button').click()
        expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
        expect(page.locator("#times strong")).to_have_count(0)
        results.append("Prayer UI: 17 Saudi cities, parameters, five times and 503 recovery (simulated provider)")

        worker_script = """
            self.onmessage = ({data}) => {
              if (data.type === "init") self.postMessage({type:"ready"});
              else self.postMessage({type:"topic", id:"quran_recitation", requestId:data.requestId,
                                     answer:"Inert fabricated text"});
            };
        """
        page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(content_type="text/javascript", body=worker_script))
        page.add_init_script("Object.defineProperty(navigator, 'gpu', {value: {requestAdapter: async () => ({features: new Set(['shader-f16'])})}})")
        page.goto(section_address(origin, "ask"))
        page.locator(".ask-optional summary").click()
        page.locator("#ask-enable").click()
        expect(page.locator("#ask-model-status")).to_contain_text("جاهز")
        page.locator("#ask-input").fill("أريد مرجعًا يساعدني على قراءة القرآن باتقان.")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-status")).to_contain_text("قد تساعدك")
        expect(page.locator("#ask-answer")).to_be_hidden()
        expect(page.locator('#ask-sources a[href="https://sunnah.com/muslim:798a"]')).to_be_visible()
        assert "Inert fabricated text" not in page.locator("#ask-result").inner_text()
        assert not page_errors, page_errors
        results.append("AI browser worker suggests a source only and cannot display invented text (simulated model)")
        context.close()

        context = browser.new_context(java_script_enabled=False, reduced_motion="reduce")
        context.route(re.compile(r"^https?://"), lambda route: (
            route.continue_() if route.request.url.startswith(origin + "/") else route.abort()
        ))
        page = context.new_page()
        page.goto(guide_url, wait_until="domcontentloaded")
        expect(page.locator("#discover-ar-shahada")).to_be_visible()
        page.locator('#discover-ar .discover-toc a[href="#discover-ar-wudu"]').click()
        expect(page).to_have_url(f"{guide_url}#discover-ar-wudu")
        expect(page.locator("#discover-ar-wudu ol li")).to_have_count(6)
        page.locator("#discover-en > summary").click()
        expect(page.locator("#discover-en-shahada")).to_be_visible()
        results.append("Inline guide works with JavaScript disabled")
        if live:
            context = browser.new_context()
            page = context.new_page()
            context.route(re.compile(r"^https?://"), lambda route: (
                route.continue_() if route.request.url.startswith((
                    origin + "/", "https://api.aladhan.com/",
                    "https://fonts.googleapis.com/", "https://fonts.gstatic.com/",
                ))
                else route.abort()
            ))
            page.goto(section_address(origin, "quran"), wait_until="domcontentloaded")
            page.evaluate("document.fonts.ready")
            integration["arabic_web_fonts"] = page.evaluate("Array.from(document.fonts).filter(font => font.status === 'loaded').length")
            for width in (320, 390, 1101, 1440):
                page.set_viewport_size({"width": width, "height": 900})
                without_overflow(page)
            integration["prayer"] = {}
            page.goto(section_address(origin, "prayer"))
            for city in ("riyadh", "mecca", "medina", "jeddah", "dammam"):
                if city == "riyadh":
                    page.locator("#prayer-form button").click()
                else:
                    page.locator("#city").select_option(city)
                expect(page.locator("#prayer-status")).not_to_contain_text("جارٍ تحميل", timeout=12000)
                integration["prayer"][city] = {
                    "times_shown": page.locator("#times strong").count(),
                    "status": page.locator("#prayer-status").inner_text(),
                }
            page.goto(section_address(origin, "ask"))
            integration["webgpu"] = page.evaluate("""async () => {
                try {
                    const adapter = await navigator.gpu?.requestAdapter();
                    return { api: Boolean(navigator.gpu), adapter: Boolean(adapter),
                             shader_f16: Boolean(adapter?.features.has("shader-f16")) };
                } catch (err) {
                    return { error: String(err) };
                }
            }""")
            if integration["webgpu"].get("shader_f16"):
                page.unroute_all()
                context.unroute_all()
                page.locator(".ask-optional summary").click()
                page.locator("#ask-enable").click()
                try:
                    expect(page.locator("#ask-model-status")).to_contain_text("جاهز", timeout=310000)
                    page.locator("#ask-input").fill("أريد مرجعًا يساعدني على قراءة القرآن باتقان.")
                    page.locator("#ask-submit").click()
                    expect(page.locator("#ask-result")).to_be_visible(timeout=95000)
                    integration["suggested_sources"] = page.locator("#ask-sources a").evaluate_all("links => links.map(link => link.href)")
                except AssertionError:
                    integration["model_error"] = page.locator("#ask-model-status").inner_text()
            else:
                page.locator(".ask-optional summary").click()
                page.locator("#ask-enable").click()
                expect(page.locator("#ask-enable")).to_be_enabled(timeout=11000)
                integration["model_start_status"] = page.locator("#ask-model-status").inner_text()
            context.close()
        browser.close()
    return results, sorted(external_links), integration


def load_checks(port):
    assets = ["/", "/assets/style.css", "/assets/content.js", "/assets/site.js",
              "/assets/ask.js", "/assets/ministry-of-defense-logo.jpg", "/assets/discover.css", "/assets/library-content.js"]
    results = []
    for clients in (10, 30, 60, 120, 240):
        start_gate = threading.Barrier(clients)
        start = time.monotonic()

        def fetch_batch(offset):
            connection = HTTPConnection("127.0.0.1", port, timeout=10)
            response_times = []
            failures = 0
            total_bytes = 0
            start_gate.wait(12)
            try:
                for i in range(24):
                    before = time.monotonic()
                    try:
                        connection.request("GET", assets[(i + offset) % len(assets)])
                        response = connection.getresponse()
                        body = response.read()
                        if response.status != 200 or not body:
                            failures += 1
                        total_bytes += len(body)
                    except (OSError, ValueError):
                        failures += 1
                        connection.close()
                    response_times.append((time.monotonic() - before) * 1000)
            finally:
                connection.close()
            return response_times, failures, total_bytes

        with ThreadPoolExecutor(max_workers=clients) as pool:
            batches = list(pool.map(fetch_batch, range(clients)))
        elapsed = time.monotonic() - start
        samples = [sample for latencies, _, _ in batches for sample in latencies]
        errors = sum(count for _, count, _ in batches)
        results.append({
            "clients": clients, "requests": len(samples), "errors": errors,
            "successful_requests_per_second": round((len(samples) - errors) / elapsed, 1),
            "p50_ms": round(statistics.median(samples), 1),
            "p95_ms": round(statistics.quantiles(samples, n=100)[94], 1),
            "bytes": sum(count for _, _, count in batches),
        })
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--skip-load", action="store_true")
    parser.add_argument("--live", action="store_true", help="Also test the real prayer service and try the model if GPU support is available.")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    handler = functools.partial(Handler, directory=SITE)
    with Server(("127.0.0.1", 0), handler) as server:
        port = server.server_port
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            browser, links, integration = browser_checks(f"http://127.0.0.1:{port}", args.output, args.live)
            result = {"browser": browser, "external_links": links, "integration": integration}
            if not args.skip_load:
                result["load"] = load_checks(port)
        finally:
            server.shutdown()
    data = json.dumps(result, ensure_ascii=False, indent=2)
    print(data)
    (args.output / "results.json").write_text(data + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
