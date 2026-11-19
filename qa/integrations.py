"""Check Zad's external dependencies without downloading weights or running inference."""

import argparse
import json
import os
from pathlib import Path
import re
from urllib.parse import parse_qs, urlsplit

from audit import SITE, section_address, without_overflow
from playwright.sync_api import expect, sync_playwright
from scenarios import PUBLIC, Suite, new_visit, verified_answer

CITIES = {
    "riyadh": (24.7136, 46.6753, "Asia/Riyadh", 4),
    "mecca": (21.3891, 39.8579, "Asia/Riyadh", 4),
    "medina": (24.4539, 39.6142, "Asia/Riyadh", 4),
    "jeddah": (21.4858, 39.1925, "Asia/Riyadh", 4),
    "dammam": (26.4207, 50.0888, "Asia/Riyadh", 4),
}
PRAYERS = ("Fajr", "Dhuhr", "Asr", "Maghrib", "Isha")


def prayer_contract(page):
    outcomes = {}
    for city, (lat, lon, zone, method) in CITIES.items():
        with page.expect_response(lambda response: response.url.startswith("https://api.aladhan.com/v1/timings/"),
                                  timeout=15000) as response_info:
            if city == "riyadh":
                page.locator("#prayer-form button").click()
            else:
                page.locator("#city").select_option(city)
        response = response_info.value
        assert response.status == 200
        path = urlsplit(response.url)
        query = parse_qs(path.query)
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        meta = data["meta"]
        date = path.path.rsplit("/", 1)[-1]
        assert data["date"]["gregorian"]["date"] == date
        assert query["timezonestring"] == [zone] and meta["timezone"] == zone
        assert query["method"] == [str(method)] and meta["method"]["id"] == method
        assert query["school"] == ["0"] and meta["school"] == "STANDARD"
        assert abs(meta["latitude"] - lat) <= 0.001 and abs(meta["longitude"] - lon) <= 0.001
        times = [data["timings"][name][:5] for name in PRAYERS]
        expect(page.locator("#times strong")).to_have_text(times)
        expect(page.locator("#prayer-status")).to_contain_text("أم القرى")
        outcomes[city] = {"date": date, "zone": zone, "method": method, "provider": meta["method"]["name"],
                          "times": times, "cors": response.header_value("access-control-allow-origin")}
    return outcomes


def web_fonts(page):
    font_names = page.evaluate("""async () => {
      await document.fonts.ready;
      return [...new Set([...document.fonts].filter(font => font.status === 'loaded').map(font => font.family))];
    }""")
    assert {"Amiri", "Tajawal"} <= set(font_names), font_names
    without_overflow(page)
    return {"loaded_families": font_names}


def blocked_fonts(page):
    expect(page.locator("h1")).to_be_visible()
    page.evaluate("document.fonts.ready")
    assert page.evaluate("[...document.fonts].every(font => font.status !== 'loaded')")
    verified_answer(page)
    without_overflow(page)


def model_probe_script():
    worker = (SITE / "assets/ask-worker.js").read_text(encoding="utf-8")
    config = dict(re.findall(r'^const (runtime|model) = "([^"]+)";', worker, flags=re.M))
    assert set(config) == {"runtime", "model"}
    return r"""
const config = CONFIG;
const fetchPublic = async (url, method = "GET", headers = {}) => {
  const response = await fetch(url, {method, headers, credentials:"omit", signal: AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error("HTTP " + response.status + " for " + new URL(url).hostname);
  return response;
};
self.onmessage = async () => {
  let phase = "runtime import";
  try {
    const runtime = await import(config.runtime);
    if (typeof runtime.CreateMLCEngine !== "function") throw new Error("CreateMLCEngine is missing");

    phase = "model registry";
    const entry = runtime.prebuiltAppConfig.model_list.find(model => model.model_id === config.model);
    if (!entry) throw new Error("Model is missing from the pinned runtime");
    const repo = entry.model.replace(/\/$/, "") + "/resolve/main/";

    phase = "model configuration";
    const manifest = await (await fetchPublic(repo + "mlc-chat-config.json")).json();
    if (manifest.model_type !== "qwen2") throw new Error("Unexpected model architecture");
    if (!Array.isArray(manifest.tokenizer_files) || !manifest.tokenizer_files.length) {
      throw new Error("Missing tokenizer declaration");
    }
    const cache = await (await fetchPublic(repo + "ndarray-cache.json")).json();
    if (!Array.isArray(cache.records) || !cache.records.length) throw new Error("Missing weight references");

    phase = "WebAssembly and tokenizer";
    const wasm = await fetchPublic(entry.model_lib, "GET", {Range:"bytes=0-7"});
    const reader = wasm.body.getReader();
    const prefix = (await reader.read()).value;
    await reader.cancel();
    if (!prefix || prefix[0] !== 0 || prefix[1] !== 97 || prefix[2] !== 115 || prefix[3] !== 109) {
      throw new Error("WebAssembly signature does not match");
    }
    await Promise.all(manifest.tokenizer_files.map(file => fetchPublic(repo + file, "HEAD")));

    phase = "weight file metadata";
    if (cache.records.some(record => !/^params_shard_\d+\.bin$/.test(record.dataPath))) {
      throw new Error("Unexpected weight filename");
    }
    let sizesChecked = 0;
    for (let offset = 0; offset < cache.records.length; offset += 4) {
      await Promise.all(cache.records.slice(offset, offset + 4).map(async record => {
        const headers = (await fetchPublic(repo + record.dataPath, "HEAD")).headers;
        const length = headers.get("content-length");
        if (length !== null && typeof record.nbytes === "number") {
          if (Number(length) !== record.nbytes) throw new Error("Weight size mismatch");
          sizesChecked++;
        }
      }));
    }
    self.postMessage({
      runtime: config.runtime,
      model: entry.model_id,
      architecture: manifest.model_type,
      wasm: {host:new URL(entry.model_lib).hostname, content_type:wasm.headers.get("content-type"), signature:true},
      tokenizers: manifest.tokenizer_files.length,
      weight_headers: cache.records.length,
      weight_sizes_checked: sizesChecked,
      parameter_bytes: cache.metadata?.ParamBytes ?? null
    });
  } catch (error) {
    self.postMessage({error: phase + " · " + error.message});
  }
};
""".replace("CONFIG", json.dumps(config))


def model_dependencies(page):
    script = model_probe_script()
    page.route("**/assets/ask-worker.js*", lambda route: route.fulfill(
        body=script, content_type="text/javascript"))
    outcome = page.evaluate("""() => new Promise(resolve => {
      const url = new URL(document.querySelector('#ask-script').dataset.worker, location.href);
      const worker = new Worker(url, {type:'module'});
      const timer = setTimeout(() => finish({error:'Dependency checks timed out'}), 90000);
      function finish(value) {
        clearTimeout(timer);
        worker.terminate();
        resolve(value);
      }
      worker.onmessage = ({data}) => finish(data);
      worker.onerror = () => finish({error:'Module worker failed to load'});
      worker.postMessage('check');
    })""")
    assert "error" not in outcome, outcome
    return outcome


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--webkit", action="store_true")
    parser.add_argument("--assets-only", action="store_true",
                        help="Check only font and model dependencies.")
    args = parser.parse_args()
    suite = Suite()
    with sync_playwright() as playwright:
        device = playwright.devices["iPhone 13"]
        with playwright.chromium.launch(executable_path=os.getenv("ZAD_CHROMIUM", "/usr/bin/chromium")) as browser:
            if not args.assets_only:
                suite.run("Chromium · عقد AlAdhan الحي للمدن الخمس",
                          lambda: new_visit(browser, section_address(PUBLIC, "prayer"), prayer_contract))
            suite.run("Chromium · تحميل الخطين من Google Fonts",
                      lambda: new_visit(browser, section_address(PUBLIC, "ask"), web_fonts))
            suite.run("Chromium · العمل عند توقف خطوط Google",
                      lambda: new_visit(browser, section_address(PUBLIC, "ask"), blocked_fonts, viewport={"width": 320, "height": 840},
                                        setup=lambda page: page.route(re.compile(r"https://fonts\.(?:googleapis|gstatic)\.com/"), lambda route: route.abort())))
            suite.run("Chromium · استيراد WebLLM وملفات النموذج الخارجية",
                      lambda: new_visit(browser, section_address(PUBLIC, "ask"), model_dependencies))
        if args.webkit:
            with playwright.webkit.launch() as browser:
                if not args.assets_only:
                    suite.run("WebKit · عقد AlAdhan الحي للمدن الخمس",
                              lambda: new_visit(browser, section_address(PUBLIC, "prayer"), prayer_contract, device=device))
                suite.run("WebKit · تحميل الخطين من Google Fonts",
                          lambda: new_visit(browser, section_address(PUBLIC, "ask"), web_fonts, device=device))
                suite.run("WebKit · استيراد WebLLM وملفات النموذج الخارجية",
                          lambda: new_visit(browser, section_address(PUBLIC, "ask"), model_dependencies, device=device))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(suite.results, indent=2, ensure_ascii=False) + "\n")
    if any(row["status"] == "failed" for row in suite.results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
