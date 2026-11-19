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
from urllib.parse import parse_qs, urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "docs"


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
            without_overflow(page)
            assert page.locator("html").get_attribute("dir") == "rtl"
            assert page.locator("#sections > section").count() == 11
            assert page.locator(".hero-image").evaluate("el => getComputedStyle(el).backgroundImage.includes('hero.webp')")
            missing_anchors = page.locator('a[href^="#"]').evaluate_all(
                "links => links.map(link => link.hash.slice(1)).filter(id => !document.getElementById(id))"
            )
            assert not missing_anchors, missing_anchors
            assert page.locator('meta[http-equiv="Content-Security-Policy"]').count() == 1
            assert page.locator('meta[name="referrer"]').get_attribute("content") == "no-referrer"
            external_links.update(page.locator('a[href^="https://"]').evaluate_all("links => links.map(link => link.href)"))
            if width <= 1100:
                page.locator("#menu").click()
                expect(page.locator("#nav")).to_be_visible()
                page.keyboard.press("Escape")
                expect(page.locator("#menu")).to_be_focused()
                expect(page.locator("#nav")).to_be_hidden()
                page.locator("#menu").click()
            page.locator('#nav a[href="#ask"]').click()
            expect(page).to_have_url(re.compile("#ask$"))
            if width <= 1100:
                expect(page.locator("#nav")).to_be_hidden()
            page.locator("#faq summary").first.click()
            expect(page.locator("#faq details").first).to_have_attribute("open", "")
            page.locator("#faq summary").first.click()
            expect(page.locator("#faq details").first).not_to_have_attribute("open", "")
            adhkar = page.locator("#adhkar")
            expect(adhkar.locator(".card")).to_have_count(22)
            adhkar.locator("select").select_option(label="بعد الصلاة")
            expect(adhkar.locator(".card:visible")).to_have_count(3)
            adhkar.locator("select").select_option("")
            expect(adhkar.locator(".card:visible")).to_have_count(22)
            faq = page.locator("#faq")
            faq.locator("select").select_option(label="الصيام")
            expect(faq.locator("details:visible")).to_have_count(4)
            faq.locator("select").select_option("")
            expect(faq.locator("details:visible")).to_have_count(11)
            first_surah = page.locator(".reading-list input").first
            first_surah.check()
            page.reload()
            expect(first_surah).to_be_checked()
            page.locator(".reading-panel button").click()
            expect(first_surah).not_to_be_checked()
            expect(page.locator("#ask-submit")).to_be_enabled()
            assert not page_errors, page_errors
            if width in (390, 1440):
                page.goto(origin, wait_until="load")
                page.screenshot(path=output / f"zad-{width}.png")
            results.append(f"Homepage {width}px: navigation, RTL, anchors, adhkar and FAQ topic filters, and reading persistence")
            context.close()

        context = browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        context.route(re.compile(r"^https?://"), lambda route: (
            route.continue_() if route.request.url.startswith(origin + "/") else route.abort()
        ))
        page.goto(origin)
        guide = page.locator("#library #discover-islam")
        expect(guide).not_to_have_attribute("open", "")
        expect(page.locator("#home a[href*='discover']")).to_have_count(0)
        guide.locator(":scope > summary").click()
        expect(guide).to_have_attribute("open", "")
        for code, direction in (("ar", "rtl"), ("en", "ltr"), ("fr", "ltr"), ("es", "ltr")):
            prefix = f"discover-{code}"
            locale = guide.locator(f"#{prefix}")
            guide.locator(f'.discover-languages a[href="#{prefix}"]').click()
            expect(page).to_have_url(f"{origin}/#{prefix}")
            expect(locale).to_have_attribute("open", "")
            expect(locale).to_have_attribute("lang", code)
            expect(locale).to_have_attribute("dir", direction)
            expect(guide.locator(".discover-locale[open]")).to_have_count(1)
            locale.locator(f'.discover-paths a[href="#{prefix}-shahada"]').click()
            expect(page).to_have_url(f"{origin}/#{prefix}-shahada")
            expect(locale.locator('.shahada-lines blockquote[lang="ar"][dir="rtl"]')).to_have_count(2)
            expect(locale.locator(".discover-transliteration")).to_have_count(0 if code == "ar" else 2)
            locale.locator(f'.discover-paths a[href="#{prefix}-next"]').click()
            locale.locator(f'#{prefix}-next a[href="#{prefix}-wudu"]').click()
            expect(page).to_have_url(f"{origin}/#{prefix}-wudu")
            expect(locale.locator(f"#{prefix}-wudu ol li")).to_have_count(6)
            expect(locale.locator(f"#{prefix}-prayer-basics ol li")).to_have_count(3)
            expect(locale.locator(f"#{prefix}-daily-life ul li")).to_have_count(3)
            locale.locator(f"#{prefix}-faq summary").first.click()
            expect(locale.locator(f"#{prefix}-faq details").first).to_have_attribute("open", "")
            without_overflow(page)
            results.append(f"Inline guide {code}: same-page navigation, Shahada, wudu, prayer, daily life and FAQ at 390px")
        page.locator('#discover-es-next a[href="#worship"]').click()
        expect(page.locator("#worship")).to_be_attached()
        expect(page).to_have_url(f"{origin}/#worship")
        page.goto(origin + "/discover/en/index.html")
        expect(page).to_have_url(f"{origin}/index.html#discover-en")
        expect(guide).to_have_attribute("open", "")
        expect(page.locator("#discover-en")).to_have_attribute("open", "")
        page.screenshot(path=output / "zad-discover-en.png")
        results.append("Legacy guide address returns to the inline language panel")
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

        page.route("https://api.aladhan.com/**", prayer)
        for city, method in (("riyadh", "4"), ("mecca", "4"), ("cairo", "5"), ("amman", "23"), ("dubai", "16")):
            if city == "riyadh":
                page.locator('#prayer-form button').click()
            else:
                page.locator("#city").select_option(city)
            expect(page.locator("#times strong")).to_have_count(5)
            assert calls[-1]["method"] == [method]
            assert calls[-1]["school"] == ["0"]
        state["fail"] = True
        page.locator('#prayer-form button').click()
        expect(page.locator("#prayer-status")).to_contain_text("تعذر تحميل")
        expect(page.locator("#times strong")).to_have_count(0)
        results.append("Prayer UI: five cities, parameters, five times and 503 recovery (simulated provider)")

        worker_script = """
            self.onmessage = ({data}) => {
              if (data.type === "init") self.postMessage({type:"ready"});
              else self.postMessage({type:"topic", id:"zakat_charity", answer:"Inert fabricated text"});
            };
        """
        page.route("**/assets/ask-worker.js", lambda route: route.fulfill(content_type="text/javascript", body=worker_script))
        page.add_init_script("Object.defineProperty(navigator, 'gpu', {value: {requestAdapter: async () => ({features: new Set(['shader-f16'])})}})")
        page.goto(origin)
        page.locator(".ask-optional summary").click()
        page.locator("#ask-enable").click()
        expect(page.locator("#ask-model-status")).to_contain_text("جاهز")
        page.locator("#ask-input").fill("هل يمكن دفع الزكاة عن أرضي؟")
        page.locator("#ask-submit").click()
        expect(page.locator("#ask-status")).to_contain_text("قد تساعدك")
        expect(page.locator("#ask-answer")).to_be_hidden()
        expect(page.locator('#ask-sources a[href="https://quran.com/9/60"]')).to_be_visible()
        assert "Inert fabricated text" not in page.locator("#ask-result").inner_text()
        assert not page_errors, page_errors
        results.append("AI browser worker suggests a source only and cannot display invented text (simulated model)")
        context.close()

        context = browser.new_context(java_script_enabled=False, reduced_motion="reduce")
        context.route(re.compile(r"^https?://"), lambda route: (
            route.continue_() if route.request.url.startswith(origin + "/") else route.abort()
        ))
        page = context.new_page()
        page.goto(origin, wait_until="domcontentloaded")
        page.locator("#discover-islam > summary").click()
        expect(page.locator("#discover-ar-shahada")).to_be_visible()
        page.locator('#discover-ar .discover-toc a[href="#discover-ar-wudu"]').click()
        expect(page).to_have_url(f"{origin}/#discover-ar-wudu")
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
            page.goto(origin, wait_until="domcontentloaded")
            page.evaluate("document.fonts.ready")
            integration["arabic_web_fonts"] = page.evaluate("Array.from(document.fonts).filter(font => font.status === 'loaded').length")
            for width in (320, 390, 1101, 1440):
                page.set_viewport_size({"width": width, "height": 900})
                without_overflow(page)
            integration["prayer"] = {}
            for city in ("riyadh", "mecca", "cairo", "amman", "dubai"):
                if city == "riyadh":
                    page.locator("#prayer-form button").click()
                else:
                    page.locator("#city").select_option(city)
                expect(page.locator("#prayer-status")).not_to_contain_text("جارٍ تحميل", timeout=12000)
                integration["prayer"][city] = {
                    "times_shown": page.locator("#times strong").count(),
                    "status": page.locator("#prayer-status").inner_text(),
                }
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
                    page.locator("#ask-input").fill("أريد مرجعًا يساعدني على معرفة مصارف الزكاة.")
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
              "/assets/ask.js", "/assets/hero.webp", "/assets/discover.css", "/assets/library-content.js"]
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
