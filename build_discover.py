"""Build Zad's section pages, homepage, and guide redirects."""

import argparse
import csv
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
REVISION = "20261123-1"
# Set an HTTPS /ask endpoint only after authorizing the Responses API costs.
ASK_AGENT_ENDPOINT = ""
SECTIONS = {
    "military": "زاد العسكري",
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
MILITARY_ROUTES = ("service", "ethics", "starter", "southern-border")
STYLES = ("style.css", "discover.css", "section-icons.css", "glass.css", "sections.css")
ASK_SCRIPTS = ("ask-evidence.js", "fatwa-sources.js", "ask-intents.js", "ask-baz.js", "locale-services.js", "ask.js")
SITE_LANGUAGES = {"ar": "العربية", "en": "English", "ur": "اردو", "zh": "简体中文", "fr": "Français"}
RTL_LANGUAGES = {"ar", "ur"}
LOCALE_TOKEN = re.compile(r"\{\{t:([a-z0-9_]+)\}\}")
with (ROOT / "locale-content" / "interface.tsv").open(encoding="utf-8", newline="") as source:
    interface_rows = list(csv.DictReader(source, delimiter="\t"))
INTERFACE = {lang: {row["key"]: row[lang] for row in interface_rows} for lang in SITE_LANGUAGES}


def render_template(name, locale, root="", **extra_labels):
    source = (ROOT / "page-templates" / f"{name}.html").read_text(encoding="utf-8").strip()
    labels = INTERFACE[locale] | extra_labels
    return LOCALE_TOKEN.sub(lambda match: escape(labels[match[1]]), source).replace("{{root}}", root)


def source_caption(locale, href, original):
    if locale == "ar":
        return original
    labels = INTERFACE[locale]
    url = urlsplit(href)
    domain = url.hostname.removeprefix("www.") if url.hostname else ""
    reference = url.path.strip("/")
    if domain == "quran.com":
        prefix, _, remaining = reference.partition("/")
        if prefix in SITE_LANGUAGES:
            reference = remaining
        return f'{labels["quran"]} {reference.replace("/", ":")}'.strip()
    if domain == "sunnah.com":
        collection, _, number = reference.partition(":")
        return f'{labels.get("hadith_" + collection, labels["hadith"])} {number}'.strip()
    return {
        "binbaz.org.sa": labels["source_binbaz"], "dorar.net": labels["source_dorar"],
        "quran.ksu.edu.sa": labels["source_saadi"], "islamqa.info": labels["source_islamqa"]
    }.get(domain, f'{labels["reference"]} · {domain}')


def link(href, label, attributes=""):
    return f'<a href="{escape(href)}"{attributes}>{escape(label)}</a>'


def item_list(items, ordered=False):
    tag = "ol" if ordered else "ul"
    return f"<{tag}>" + "".join(f"<li>{escape(item)}</li>" for item in items) + f"</{tag}>"


def render_language(code, data, *, opened=False):
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
    quran_base = "https://quran.com/" + (f"{code}/" if code in {"en", "fr", "es", "ur", "zh"} else "")
    def quran(reference):
        if code == "zh":
            return quran_base + ("al-fatihah" if reference == "1" else reference) + "?translations=56"
        return quran_base + reference

    practice_guide = INTERFACE[code]["tour_practice_action"] if opened and code != "ar" and code in SITE_LANGUAGES else next_steps["guide"]
    topics = {
        "about": about, "pillars": pillars, "shahada": shahada,
        "next": next_steps, "wudu": wudu, "prayer-basics": prayer, "daily-life": living, "faq": faq,
    }
    def references(entries):
        return f'<p class="discover-sources">{escape(data["sources"])} · ' + " · ".join(
            link(url, source_caption(code, url, label) if code in SITE_LANGUAGES else label) for url, label in entries
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
    active = " open" if opened else ""
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
{references([(quran("112"), "Qur’an 112"), (quran("2/136"), "Qur’an 2:136"), (quran("33/40"), "Qur’an 33:40"), (quran("26/192-195"), "Qur’an 26:192–195"), (quran("2/177"), "Qur’an 2:177")])}
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
{references([("https://sunnah.com/bukhari:8", "Sahih al-Bukhari 8"), (quran("2/256"), "Qur’an 2:256")])}
</section>
<section id="{prefix}-next">
<h4>{escape(next_steps["title"])}</h4>
{item_list(next_steps["items"], ordered=True)}
<h5>{escape(next_steps["bath"]["title"])}</h5>
<p>{escape(next_steps["bath"]["body"])}</p>
<p class="discover-bath-source">{link("https://islamqa.info/ar/answers/81949", next_steps["bath_source"])}</p>
<div class="actions">{link(f"#{prefix}-wudu", wudu["title"], ' class="button green"')}
{link(f"#{prefix}-prayer-basics", prayer["title"], ' class="button discover-outline"')}
{link(quran("1"), next_steps["quran"], ' class="button discover-outline"')}
{link("../worship/", practice_guide, ' class="button discover-outline"')}</div>
</section>
<section id="{prefix}-wudu">
<h4>{escape(wudu["title"])}</h4>
<p>{escape(wudu["intro"])}</p>
{item_list(wudu["items"], ordered=True)}
<p>{escape(wudu["note"])}</p>
{references([(quran("5/6"), "Qur’an 5:6"), ("https://sunnah.com/bukhari:159", "Sahih al-Bukhari 159")])}
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
{references([(quran("31/15"), "Qur’an 31:15"), (quran("5/3"), "Qur’an 5:3"), (quran("2/177"), "Qur’an 2:177")])}
</section>
<section id="{prefix}-faq">
<h4>{escape(faq["title"])}</h4>
<div class="faq-list">{faq_items}</div>
{references([(CONVERSION_GUIDE, "IslamReligion.com (English)"), (quran("2/256"), "Qur’an 2:256"), (quran("4/171"), "Qur’an 4:171"), (quran("19/30-36"), "Qur’an 19:30–36")])}
</section>
</div>
</div>
</details>
'''


def render_guide(languages, locale="ar"):
    guide = languages[locale]
    editions = languages if locale == "ar" else {locale: guide}
    switch = " ".join(
        link(f"#discover-{code}", locale["name"], f' lang="{code}" dir="{locale["direction"]}"')
        for code, locale in editions.items()
    )
    content = "".join(render_language(code, data, opened=code == locale) for code, data in editions.items())
    languages_nav = f'<nav class="discover-languages" aria-label="{escape(guide["language"])}">{switch}</nav>' if locale == "ar" else ""
    return f'''<details class="wrap discover discover-section" id="discover-islam" open>
<summary><span class="zad-icon" data-icon="discover-islam" aria-hidden="true"></span> {escape(guide["title"])}</summary>
<p>{escape(INTERFACE[locale]["guide_intro"])}</p>
{languages_nav}
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
    return f'<span class="zad-icon" data-icon="{escape(key)}" aria-hidden="true"></span>'


def render_home(locale, border_title, categories):
    root = "" if locale == "ar" else "../"
    return "\n".join((
        render_template("home-ask", locale),
        render_template("home-hero", locale, root, military_border_shortcut=border_title,
                        morning_shortcut=categories["morning"]["title"], evening_shortcut=categories["evening"]["title"]),
        render_template("home-tour", locale),
    ))


def load_adhkar():
    categories = {}
    for path in sorted((ROOT / "adhkar-content").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        shared = data.get("shared", {})
        for category in data["categories"]:
            slug = category["slug"]
            if not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", slug) or slug in categories:
                raise ValueError(f"Invalid or duplicate adhkar category: {slug}")
            items = [shared[item] if isinstance(item, str) else item for item in category["items"]]
            if not items or any(not item["links"] for item in items):
                raise ValueError(f"Adhkar category {slug} needs entries with sources")
            for item in items:
                for _, href in item["links"]:
                    source = urlsplit(href)
                    if source.scheme != "https" or not source.hostname or source.username or source.password:
                        raise ValueError(f"Invalid source URL in {slug}: {href}")
            categories[slug] = {**category, "items": items}
    if not categories:
        raise ValueError("Add categories in adhkar-content before building the site")
    return categories


def localize_adhkar(categories, translated):
    result = {}
    for slug, category in categories.items():
        language = translated[slug]
        items = []
        for original, localized in zip(category["items"], language["items"], strict=True):
            if localized["sourceTitle"] != original["title"]:
                raise ValueError(f"Adhkar translation order changed in {slug}: {original['title']}")
            items.append({**original, **localized})
        result[slug] = {**category, **language, "items": items}
    return result


def render_adhkar_index(categories, locale):
    labels = INTERFACE[locale]
    cards = "\n".join(
        f'<a class="adhkar-category-link" href="{slug}/">'
        f'<span class="section-icon">{icon(category["icon"])}</span>'
        f'<strong>{escape(category["title"])}</strong><small>{escape(category["intro"])}</small></a>'
        for slug, category in categories.items()
    )
    return f'''<section class="wrap adhkar-index" id="adhkar" aria-labelledby="adhkar-heading">
<h1 class="section-heading" id="adhkar-heading"><span class="section-icon">{icon("adhkar")}</span>{escape(labels["adhkar"])}</h1>
<p class="section-intro">{escape(labels["adhkar_intro"])}</p>
<div class="tiles adhkar-tiles">
{cards}
</div>
</section>'''


def render_adhkar_card(item, locale):
    repeat = f'<p class="adhkar-repeat">{escape(item["repeat"])}</p>' if item.get("repeat") else ""
    quote = escape(item.get("quote", "")).replace("\n", "<br>")
    quotation = f'<blockquote class="quote" lang="ar" dir="rtl">{quote}</blockquote>' if quote else ""
    meaning = f'<p class="quote-meaning"><strong>{escape(INTERFACE[locale]["meaning"])}</strong> {escape(item["meaning"])}</p>' if item.get("meaning") else ""
    note = f'<p>{escape(item["text"])}</p>' if item.get("text") else ""
    references = " ".join(link(href, source_caption(locale, href, label)) for label, href in item["links"])
    return f'''<article class="card adhkar-card">
<h2>{escape(item["title"])}</h2>
{repeat}{quotation}{meaning}{note}
<div class="references">{references}</div>
</article>'''


def render_adhkar_category(category, locale):
    cards = "\n".join(render_adhkar_card(item, locale) for item in category["items"])
    labels = INTERFACE[locale]
    chapter = ""
    if category.get("hisn_chapter"):
        source = link(f"https://risala.prh.gov.sa/{locale}/content/51", labels["hisn_full_chapter"])
        reviews = "".join(
            f'<li>{escape(labels[f"hisn_review_{number}"])} '
            + link(f"https://binwahaf.com/ar/audio-book-lesson/{number + 1040}/", labels["reference"])
            + "</li>" for number in (80, 81, 89)
        )
        chapter = (f'<p class="section-intro">{escape(labels["hisn_context"])} {source}</p>'
                   f'<details class="prayer-note hisn-review"><summary>{escape(labels["hisn_review_heading"])}</summary>'
                   f'<ul>{reviews}</ul></details>')
    return f'''<section class="wrap adhkar-detail" id="adhkar-category" aria-labelledby="adhkar-heading">
<a class="adhkar-back" href="../">{escape(labels["adhkar_all"])}</a>
<h1 class="section-heading" id="adhkar-heading"><span class="section-icon">{icon(category["icon"])}</span>{escape(category["title"])}</h1>
<p class="section-intro">{escape(category["intro"])}</p>
{chapter}
<div class="cards adhkar-cards">
{cards}
</div>
<a class="adhkar-back" href="../">{escape(labels["adhkar_back"])}</a>
</section>'''


def language_href(root, language, route):
    prefix = "" if language == "ar" else f"{language}/"
    return root + prefix + route or "./"


def render_military(locale, content, subsection=None):
    labels = INTERFACE[locale]
    groups = {slug: translations[locale] for slug, translations in content.items()}
    base = "../" if subsection else "./"
    overview_state = '' if subsection else ' aria-current="page"'
    tabs = [link(base, labels["military_overview"], ' class="military-tab"' + overview_state)]
    for slug, group in groups.items():
        active = ' aria-current="page"' if slug == subsection else ""
        tabs.append(link(base + slug + "/", group["title"], ' class="military-tab"' + active))

    if subsection:
        group = groups[subsection]
        title, intro = group["title"], group["intro"]
        cards = []
        for item in group["items"]:
            references = "".join(link(url, label) for label, url in item["links"])
            cards.append(f'<article class="military-card"><h2>{escape(item["title"])}</h2>'
                         f'<p>{escape(item["text"])}</p><div class="references">{references}</div></article>')
    else:
        title, intro = labels["military"], labels["military_intro"]
        cards = [f'<a class="military-card" href="{slug}/"><h2>{escape(group["title"])}</h2>'
                 f'<p>{escape(group["intro"])}</p></a>' for slug, group in groups.items()]

    return f'''<section class="wrap military-hub" id="military" aria-labelledby="military-heading">
<h1 id="military-heading" class="section-heading"><span class="section-icon" aria-hidden="true">{icon("daily")}</span>{escape(title)}</h1>
<p class="military-intro">{escape(intro)}</p>
<div class="military-tabs" role="navigation" aria-label="{escape(labels["military_nav"])}">{"".join(tabs)}</div>
<div class="military-cards">{"".join(cards)}</div>
</section>'''


def render_header(slug, base, root, route_path, locale, *, subsection=False):
    labels = INTERFACE[locale]
    brand_label = escape(labels["brand"])
    home_label = escape(labels["home"])
    menu_label = escape(labels["menu"])
    language_label = escape(labels["language"])
    if slug == "home":
        brand = (
            '<div class="launcher-brand"><span class="route-brand" aria-hidden="true"></span>'
            f'<span class="launcher-wordmark">{brand_label}</span></div>'
        )
    else:
        brand = f'''<a class="route-back" href="{base}" aria-label="{home_label}">{icon("home")}<span>{home_label}</span></a>
<a class="route-brand" href="{base}" aria-label="{brand_label} · {home_label}"></a>'''
    items = []
    for route in SECTIONS:
        shape = "" if slug == "home" else icon({"discover": "discover-islam", "military": "daily"}.get(route, route))
        selected = f' aria-current="{"location" if subsection else "page"}"' if route == slug else ""
        items.append(f'<a href="{base}{route}/" data-section-link="{route}"{selected}>{shape}<span>{escape(labels[route])}</span></a>')
    links = "\n".join(items)
    choices = []
    for code, name in SITE_LANGUAGES.items():
        direction = "rtl" if code in RTL_LANGUAGES else "ltr"
        current = ' aria-current="true"' if code == locale else ""
        choices.append(f'<a href="{language_href(root, code, route_path)}" lang="{code}" '
                       f'hreflang="{code}" dir="{direction}"{current}>{escape(name)}</a>')
    language_links = "\n".join(choices)
    return f'''{brand}
<div class="route-controls">
<details class="site-language">
<summary aria-label="{language_label} · {SITE_LANGUAGES[locale]}">{escape(SITE_LANGUAGES[locale])}</summary>
<div class="site-language-links" role="navigation" aria-label="{language_label}">{language_links}</div>
</details>
<button id="menu" class="menu" aria-expanded="false" aria-controls="nav" type="button">{icon("menu")}<span>{menu_label}</span></button>
</div>
<nav id="nav" aria-label="{escape(labels["nav_label"])}" aria-expanded="false">
{links}
</nav>'''


def render_page(slug, body, *, locale="ar", subsection_slug=None, subsection_title=None):
    is_home = slug == "home"
    route_path = "" if is_home else slug + "/" + (subsection_slug + "/" if subsection_slug else "")
    base = "../" * route_path.count("/")
    root = base + ("../" if locale != "ar" else "")
    labels = INTERFACE[locale]
    direction = "rtl" if locale in RTL_LANGUAGES else "ltr"
    assets = root + "assets/"
    title = f'{labels["brand"]} | {labels["platform"]}' if is_home else f'{subsection_title or labels[slug]} | {labels["brand"]}'
    alternates = "\n".join(f'<link rel="alternate" hreflang="{code}" href="{language_href(root, code, route_path)}">' for code in SITE_LANGUAGES)
    styles = "\n".join(f'<link rel="stylesheet" href="{assets}{name}?v={REVISION}">' for name in STYLES)
    scripts = []
    if slug == "contact" or (slug in SECTIONS and slug not in TEMPLATED_SECTIONS and slug not in {"discover", "adhkar", "military"}):
        scripts.extend(("content.js", "library-content.js"))
    if locale != "ar":
        scripts.append(f"locales/{locale}.js")
    scripts.append("site.js")
    if slug == "prayer":
        scripts.extend(("locale-services.js", "prayer.js"))
    if slug == "ask":
        scripts.extend(ASK_SCRIPTS)
    script_tags = []
    for name in scripts:
        attributes = f' id="ask-script" data-worker="{assets}ask-worker.js?v={REVISION}"' if name == "ask.js" else ""
        script_tags.append(f'<script{attributes} src="{assets}{name}?v={REVISION}" defer></script>')
    scripts_markup = "\n".join(script_tags)
    capabilities = {"prayer": "connect-src https://api.aladhan.com; ", "ask": "worker-src 'self'; "}.get(slug, "")
    ask_connections = "https://binbaz.org.sa"
    if slug == "ask" and ASK_AGENT_ENDPOINT:
        endpoint = urlsplit(ASK_AGENT_ENDPOINT)
        if (endpoint.scheme != "https" or endpoint.path != "/ask" or endpoint.query or endpoint.fragment
                or not re.fullmatch(r"[A-Za-z0-9.-]+", endpoint.netloc) or not endpoint.hostname):
            raise ValueError("ASK_AGENT_ENDPOINT must be an HTTPS URL ending in /ask.")
        ask_connections += f" https://{endpoint.netloc}"
    if slug == "ask":
        capabilities += f"connect-src {ask_connections}; "
        body = body.replace("{{ASK_AGENT_ENDPOINT}}", escape(ASK_AGENT_ENDPOINT, quote=True))
    header = render_header(slug, base, root, route_path, locale, subsection=bool(subsection_slug))
    if is_home:
        footer = render_template("home-footer", locale, root)
    else:
        footer = f'<footer class="section-footer"><p>{escape(labels["preview_identity"])}</p></footer>'
    shortcut = "" if slug == "ask" else f'<a class="ask-shortcut" href="{base}ask/" aria-label="{escape(labels["ask"])}">{icon("ask")}</a>'
    main_class = "launcher-shell" if is_home else "section-main"
    return f'''<!doctype html>
<html lang="{locale}" dir="{direction}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{escape(labels["description"])}">
<meta name="theme-color" content="#ffffff">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; {capabilities}base-uri 'none'; form-action 'none'; object-src 'none'">
<title>{escape(title)}</title>
{alternates}
{styles}
{scripts_markup}
</head>
<body data-page="{slug}">
<a class="skip" href="#main">{escape(labels["skip"])}</a>
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
    if any(language not in languages for language in SITE_LANGUAGES):
        parser.error("Add a Discover Islam guide for every Zad language")
    adhkar = load_adhkar()
    military = {slug: json.loads((ROOT / "military-content" / f"{slug}.json").read_text(encoding="utf-8"))
                for slug in MILITARY_ROUTES}
    docs = ROOT / "docs"
    outputs = {}
    for locale in SITE_LANGUAGES:
        labels = INTERFACE[locale]
        local_docs = docs if locale == "ar" else docs / locale
        categories = adhkar
        if locale != "ar":
            data = json.loads((ROOT / "locale-content" / f"{locale}.json").read_text(encoding="utf-8"))
            categories = localize_adhkar(adhkar, data["adhkar"])
            local_library = {"ui": labels, "sections": data["sections"]}
            outputs[docs / "assets" / "locales" / f"{locale}.js"] = (
                '"use strict";\nconst zadLocale = ' + json.dumps(local_library, ensure_ascii=False, separators=(",", ":")) + ";\n"
            )
        home = render_home(locale, military["southern-border"][locale]["title"], categories)
        outputs[local_docs / "index.html"] = render_page("home", home, locale=locale)
        for slug in SECTIONS:
            if slug == "discover":
                body = f'<h1 class="visually-hidden">{escape(labels[slug])}</h1>\n' + render_guide(languages, locale)
            elif slug == "adhkar":
                body = render_adhkar_index(categories, locale)
            elif slug == "military":
                body = render_military(locale, military)
            elif slug in TEMPLATED_SECTIONS:
                body = render_template(slug, locale)
            else:
                body = (f'<div class="wrap" id="sections" data-section="{slug}"></div>\n'
                        f'<noscript><p class="wrap">{escape(labels[slug])} · {escape(labels["library_nojs"])}</p></noscript>')
            outputs[local_docs / slug / "index.html"] = render_page(slug, body, locale=locale)
        for slug, category in categories.items():
            outputs[local_docs / "adhkar" / slug / "index.html"] = render_page(
                "adhkar", render_adhkar_category(category, locale), locale=locale,
                subsection_slug=slug, subsection_title=category["title"]
            )
        for slug, translations in military.items():
            outputs[local_docs / "military" / slug / "index.html"] = render_page(
                "military", render_military(locale, military, slug), locale=locale,
                subsection_slug=slug, subsection_title=translations[locale]["title"]
            )
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
