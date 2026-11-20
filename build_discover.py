"""Build Zad's section pages, homepage, and guide redirects."""

import argparse
import json
import re
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
ARABIC_SHAHADA = (
    "أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللَّهُ",
    "وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللَّهِ",
)
CONVERSION_GUIDE = "https://www.islamreligion.com/articles/204/how-to-convert-to-islam-and-become-muslim"
REVISION = "20261120-2"
# Set an HTTPS /ask endpoint only after authorizing the Responses API costs.
ASK_AGENT_ENDPOINT = ""
SECTIONS = {
    "quran": "القرآن الكريم",
    "lessons": "الخطب والدروس",
    "hadith": "الأحاديث الصحيحة",
    "faq": "أسئلة وأجوبة شرعية",
    "media": "المحاضرات والتلاوات",
    "occasions": "المناسبات الإسلامية",
    "belief": "العقيدة وأصول الإيمان",
    "seerah": "السيرة النبوية",
    "ask": "اسأل زاد",
    "prayer": "مواقيت الصلاة",
    "worship": "الوضوء والصلاة",
    "adhkar": "الأذكار اليومية",
    "reading": "خطة القراءة",
    "discover": "تعرّف على الإسلام",
    "sources": "مصادر المكتبة",
    "contact": "تواصل معنا",
}
TEMPLATED_SECTIONS = {"ask", "prayer", "sources", "contact"}
STYLES = ("style.css", "discover.css", "section-icons.css", "glass.css", "sections.css")
ASK_SCRIPTS = ("ask-evidence.js", "fatwa-sources.js", "ask-intents.js", "ask.js")


def link(href, label, attributes=""):
    return f'<a href="{escape(href)}"{attributes}>{escape(label)}</a>'


def item_list(items, ordered=False):
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{escape(item)}</li>" for item in items) + f"</{tag}>"


def render_language(code, data):
    prefix = f"discover-{code}"
    about = data["about"]
    pillars = data["pillars"]
    shahada = data["shahada"]
    next_steps = data["next"]
    faq = data["faq"]
    wudu = data["wudu"]
    prayer = data["prayer"]
    living = data["living"]
    paths = data["paths"]
    quran = "https://quran.com/" + (f"{code}/" if code in {"en", "fr", "es"} else "")
    topics = {
        "about": about, "pillars": pillars, "shahada": shahada,
        "next": next_steps, "wudu": wudu, "prayer-basics": prayer, "daily-life": living, "faq": faq,
    }
    def references(entries):
        return f'<p class="discover-sources">{escape(data["sources"])} · ' + " · ".join(
            link(url, label) for url, label in entries
        ) + "</p>"

    practice = shahada["practice"]
    lines = []
    for arabic, line in zip(ARABIC_SHAHADA, practice["lines"], strict=True):
        phonetic = line["phonetic"]
        transliteration = f'<p class="discover-transliteration" dir="ltr">{escape(phonetic)}</p>' if phonetic else ""
        lines.append(
            f'<li><blockquote lang="ar" dir="rtl">{arabic}</blockquote>'
            f'{transliteration}<p>{escape(line["meaning"])}</p></li>'
        )
    faq_items = "\n".join(
        f"<details><summary>{escape(question)}</summary><p>{escape(answer)}</p></details>"
        for question, answer in faq["items"]
    )
    active = " open" if code == "ar" else ""
    return f'''<details class="discover-locale" id="{prefix}" name="discover-language" lang="{code}" dir="{data["direction"]}"{active}>
<summary>{escape(data["name"])}</summary>
<div class="discover-intro">
<h3>{escape(data["title"])}</h3>
<p>{escape(data["intro"])}</p>
<div class="actions discover-paths">
{link(f"#{prefix}-about", paths["explore"], ' class="button green"')}
{link(f"#{prefix}-shahada", paths["join"], ' class="button discover-outline"')}
{link(f"#{prefix}-next", paths["begin"], ' class="button discover-outline"')}
</div>
</div>
<div class="discover-layout">
<nav class="discover-toc" aria-label="{escape(data["contents"])}">
<strong>{escape(data["contents"])}</strong>
{"".join(link(f"#{prefix}-{ident}", topic["title"]) for ident, topic in topics.items())}
</nav>
<div class="discover-content">
<section id="{prefix}-about">
<h4>{escape(about["title"])}</h4>
<p>{escape(about["body"])}</p>
<p>{escape(about["ethics"])}</p>
{references([(quran + "112", "Qur’an 112"), (quran + "2/136", "Qur’an 2:136"), (quran + "33/40", "Qur’an 33:40"), (quran + "26/192-195", "Qur’an 26:192–195"), (quran + "2/177", "Qur’an 2:177")])}
</section>
<section id="{prefix}-pillars">
<h4>{escape(pillars["title"])}</h4>
{item_list(pillars["items"], ordered=True)}
{references([("https://sunnah.com/bukhari:8", "Sahih al-Bukhari 8")])}
</section>
<section id="{prefix}-shahada" class="discover-shahada">
<h4>{escape(shahada["title"])}</h4>
<p>{escape(shahada["body"])}</p>
<h5>{escape(practice["title"])}</h5>
<p>{escape(practice["intro"])}</p>
<ol class="shahada-lines">{"".join(lines)}</ol>
<p>{escape(shahada["next"])}</p>
{references([("https://sunnah.com/bukhari:8", "Sahih al-Bukhari 8"), (quran + "2/256", "Qur’an 2:256")])}
</section>
<section id="{prefix}-next">
<h4>{escape(next_steps["title"])}</h4>
{item_list(next_steps["items"], ordered=True)}
<h5>{escape(next_steps["bath"]["title"])}</h5>
<p>{escape(next_steps["bath"]["body"])}</p>
<p class="discover-bath-source">{link("https://islamqa.info/ar/answers/81949", next_steps["bath_source"])}</p>
<div class="actions">{link(f"#{prefix}-wudu", wudu["title"], ' class="button green"')}
{link(f"#{prefix}-prayer-basics", prayer["title"], ' class="button discover-outline"')}
{link(quran + "1", next_steps["quran"], ' class="button discover-outline"')}
{link("../worship/", next_steps["guide"], ' class="button discover-outline"')}</div>
</section>
<section id="{prefix}-wudu">
<h4>{escape(wudu["title"])}</h4>
<p>{escape(wudu["intro"])}</p>
{item_list(wudu["items"], ordered=True)}
<p>{escape(wudu["note"])}</p>
{references([(quran + "5/6", "Qur’an 5:6"), ("https://sunnah.com/bukhari:159", "Sahih al-Bukhari 159")])}
</section>
<section id="{prefix}-prayer-basics">
<h4>{escape(prayer["title"])}</h4>
<p>{escape(prayer["intro"])}</p>
{item_list(prayer["items"], ordered=True)}
{references([("https://sunnah.com/bukhari:757", "Sahih al-Bukhari 757"), ("https://sunnah.com/bukhari:831", "Sahih al-Bukhari 831"), ("https://sunnah.com/muslim:582", "Sahih Muslim 582")])}
</section>
<section id="{prefix}-daily-life">
<h4>{escape(living["title"])}</h4>
<p>{escape(living["intro"])}</p>
{item_list(living["items"])}
{references([(quran + "31/15", "Qur’an 31:15"), (quran + "5/3", "Qur’an 5:3"), (quran + "2/177", "Qur’an 2:177")])}
</section>
<section id="{prefix}-faq">
<h4>{escape(faq["title"])}</h4>
<div class="faq-list">{faq_items}</div>
{references([(CONVERSION_GUIDE, "IslamReligion.com (English)"), (quran + "2/256", "Qur’an 2:256"), (quran + "4/171", "Qur’an 4:171"), (quran + "19/30-36", "Qur’an 19:30–36")])}
</section>
</div>
</div>
</details>
'''


def render_guide(languages):
    arabic = languages["ar"]
    switch = " ".join(
        link(f"#discover-{code}", locale["name"], f' lang="{code}" dir="{locale["direction"]}"')
        for code, locale in languages.items()
    )
    content = "".join(render_language(code, locale) for code, locale in languages.items())
    return f'''<details class="wrap discover discover-section" id="discover-islam" open>
<summary><span class="zad-icon" data-icon="discover-islam" aria-hidden="true"></span> {escape(arabic["title"])}</summary>
<p>دليل لغير المسلمين والمسلمين الجدد، يتناول الشهادتين والوضوء والصلاة.</p>
<nav class="discover-languages" aria-label="{escape(arabic["language"])}">{switch}</nav>
{content}</details>'''


def render_redirect(code, data):
    destination = f"../#discover-{code}"
    return f'''<!doctype html>
<html lang="{code}" dir="{data["direction"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="refresh" content="0;url={destination}">
<link rel="canonical" href="{destination}">
<title>{escape(data["title"])} | Zad</title>
</head>
<body><p>{link(destination, data["title"])}</p></body>
</html>
'''

def icon(key):
    return f'<span class="zad-icon" data-icon="{key}" aria-hidden="true"></span>'


def render_home():
    templates = ROOT / "page-templates"
    return "\n".join(
        (templates / f"home-{part}.html").read_text(encoding="utf-8").strip()
        for part in ("ask", "hero", "tour")
    )


def render_header(slug, base):
    if slug == "home":
        brand = (
            f'<div class="launcher-brand"><span class="route-brand" aria-hidden="true">{icon("brand")}</span>'
            '<span class="launcher-wordmark">زاد</span></div>'
        )
    else:
        brand = f'''<a class="route-back" href="{base}">{icon("home")}<span>الرئيسية</span></a>
<a class="route-brand" href="{base}" aria-label="زاد، الرئيسية">{icon("brand")}</a>'''
    items = []
    for route, title in SECTIONS.items():
        shape = "" if slug == "home" else icon("discover-islam" if route == "discover" else route)
        selected = ' aria-current="page"' if route == slug else ""
        items.append(f'<a href="{base}{route}/" data-section-link="{route}"{selected}>{shape}<span>{escape(title)}</span></a>')
    links = "\n".join(items)
    return f'''{brand}
<button id="menu" class="menu" aria-expanded="false" aria-controls="nav" type="button">{icon("menu")}<span>الأقسام</span></button>
<nav id="nav" aria-label="أقسام زاد" aria-expanded="false">
{links}
</nav>'''


def render_page(slug, body):
    is_home = slug == "home"
    base = "" if is_home else "../"
    assets = base + "assets/"
    title = "زاد | منصة التوعية الدينية" if is_home else f"{SECTIONS[slug]} | زاد"
    styles = "\n".join(f'<link rel="stylesheet" href="{assets}{name}?v={REVISION}">' for name in STYLES)
    scripts = []
    if slug == "contact" or (slug in SECTIONS and slug not in TEMPLATED_SECTIONS and slug != "discover"):
        scripts.extend(("content.js", "library-content.js"))
    scripts.append("site.js")
    if slug == "prayer":
        scripts.append("prayer.js")
    if slug == "ask":
        scripts.extend(ASK_SCRIPTS)
    script_tags = []
    for name in scripts:
        attributes = f' id="ask-script" data-worker="{assets}ask-worker.js?v={REVISION}"' if name == "ask.js" else ""
        script_tags.append(f'<script{attributes} src="{assets}{name}?v={REVISION}" defer></script>')
    scripts_markup = "\n".join(script_tags)
    capabilities = {"prayer": "connect-src https://api.aladhan.com; ", "ask": "worker-src 'self'; "}.get(slug, "")
    if slug == "ask" and ASK_AGENT_ENDPOINT:
        endpoint = urlsplit(ASK_AGENT_ENDPOINT)
        if (endpoint.scheme != "https" or endpoint.path != "/ask" or endpoint.query or endpoint.fragment
                or not re.fullmatch(r"[A-Za-z0-9.-]+", endpoint.netloc) or not endpoint.hostname):
            raise ValueError("ASK_AGENT_ENDPOINT must be an HTTPS URL ending in /ask.")
        capabilities += f"connect-src https://{endpoint.netloc}; "
    if slug == "ask":
        body = body.replace("{{ASK_AGENT_ENDPOINT}}", escape(ASK_AGENT_ENDPOINT, quote=True))
    header = render_header(slug, base)
    footer = "" if is_home else '<footer class="section-footer"><p>زاد · مبادرة توعوية مستقلة غير رسمية</p></footer>'
    shortcut = "" if slug == "ask" else f'<a class="ask-shortcut" href="{base}ask/" aria-label="اسأل زاد">{icon("ask")}</a>'
    main_class = "launcher-shell" if is_home else "section-main"
    return f'''<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="زاد، منصة عربية مستقلة للتوعية الدينية. القرآن الكريم والأحاديث الصحيحة والدروس ومواقيت الصلاة.">
<meta name="theme-color" content="#102c24">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; {capabilities}base-uri 'none'; form-action 'none'; object-src 'none'">
<title>{escape(title)}</title>
{styles}
{scripts_markup}
</head>
<body data-page="{slug}">
<a class="skip" href="#main">تجاوز إلى المحتوى</a>
<header class="route-header">
<div class="route-top">
{header}
</div>
</header>
<main id="main" class="{main_class}">
{body}
</main>
{footer}
{shortcut}
</body>
</html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if published pages need regeneration.")
    args = parser.parse_args()
    languages = {}
    for path in sorted((ROOT / "discover-content").glob("*.json")):
        if not re.fullmatch(r"[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*", path.stem):
            parser.error(f"Invalid language tag: {path.stem}")
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["direction"] not in {"rtl", "ltr"}:
            parser.error(f"Invalid direction in {path.name}")
        languages[path.stem] = data
    if "ar" not in languages:
        parser.error("The Arabic default translation is required.")
    docs = ROOT / "docs"
    outputs = {docs / "index.html": render_page("home", render_home())}
    for slug, title in SECTIONS.items():
        if slug == "discover":
            body = f'<h1 class="visually-hidden">{escape(title)}</h1>\n' + render_guide(languages)
        elif slug in TEMPLATED_SECTIONS:
            body = (ROOT / "page-templates" / f"{slug}.html").read_text(encoding="utf-8").strip()
        else:
            body = (f'<div class="wrap" id="sections" data-section="{slug}"></div>\n'
                    f'<noscript><p class="wrap">{escape(title)} · فعّل جافاسكربت لعرض مواد القسم.</p></noscript>')
        outputs[docs / slug / "index.html"] = render_page(slug, body)
    for code, data in languages.items():
        outputs[docs / "discover" / code / "index.html"] = render_redirect(code, data)
    for output, page in outputs.items():
        if args.check:
            if not output.is_file() or output.read_text(encoding="utf-8") != page:
                parser.error(f"Run python3 build_discover.py to regenerate {output.relative_to(ROOT)}")
        else:
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
