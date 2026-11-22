"use strict";

const siteLocale = document.documentElement.lang || "ar";
const siteTranslation = typeof zadLocale === "object" ? zadLocale : null;

function siteText(key, arabic, values = {}) {
  return (siteTranslation?.ui[key] || arabic).replace(/\{([a-z]+)\}/g, (marker, field) => values[field] ?? marker);
}

function referenceLabel(label, href) {
  if (!siteTranslation) return label;
  const url = new URL(href);
  const domain = url.hostname.replace(/^www\./, "");
  const path = url.pathname.replace(/^\/+|\/+$/g, "");
  if (domain === "quran.com") return `${siteText("quran", label)} ${path.replaceAll("/", ":")}`.trim();
  if (domain === "sunnah.com") {
    const [collection, number = ""] = path.split(":");
    return `${siteText("hadith_" + collection, siteText("hadith", label))} ${number}`.trim();
  }
  const group = {
    "binbaz.org.sa": "source_binbaz", "dorar.net": "source_dorar",
    "quran.ksu.edu.sa": "source_saadi", "islamqa.info": "source_islamqa"
  }[domain];
  return group ? siteText(group, label) : `${siteText("reference", label)} · ${domain}`;
}

function translatedSection(section) {
  const translation = siteTranslation?.sections[section.id];
  if (!translation) return section;
  const translations = new Map(translation.items.map(item => [item.sourceTitle, item]));
  const items = section.items.map(item => ({...item, ...translations.get(item.title)}));
  return {...section, title: translation.title, intro: translation.intro, items};
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function readingTracker() {
  const key = "zad-reading-v1";
  const plan = zadContent.readingPlan;
  let completed = [];
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (Array.isArray(saved)) completed = saved.filter(Number.isInteger);
  } catch {
    // The plan remains usable when browser storage is unavailable.
  }

  const panel = element("div", null, "reading-panel");
  const progress = element("p", null, "reading-progress");
  progress.setAttribute("role", "status");
  const list = element("ol", null, "reading-list");
  const number = new Intl.NumberFormat(siteLocale === "ar" ? "ar-SA" : siteLocale);
  const checkboxes = plan.map(([name, url], index) => {
    const row = element("li");
    const surah = siteText("surah_" + url.split("/").at(-1), name);
    const link = element("a", siteText("surah_prefix", "سورة {name}", {name: surah}));
    link.href = url;
    const label = element("label");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed.includes(index);
    checkbox.setAttribute("aria-label", siteText("reading_done_name", "تمت قراءة سورة {name}", {name: surah}));
    label.append(checkbox, element("span", siteText("reading_done", "تمت القراءة")));
    row.append(link, label);
    list.append(row);
    return checkbox;
  });

  function updateProgress(save) {
    const checked = checkboxes.flatMap((checkbox, index) => checkbox.checked ? [index] : []);
    const message = siteText("reading_result", "تمت قراءة {done} من {total}", {
      done: number.format(checked.length), total: number.format(plan.length)
    });
    if (save) {
      try {
        localStorage.setItem(key, JSON.stringify(checked));
      } catch {
        progress.textContent = message + " · " + siteText("reading_storage", "تعذّر حفظ التقدّم في هذا المتصفح.");
        return;
      }
    }
    progress.textContent = message;
  }

  const reset = element("button", siteText("reading_reset", "ابدأ أسبوعًا جديدًا"), "button green");
  reset.type = "button";
  reset.addEventListener("click", () => {
    for (const checkbox of checkboxes) checkbox.checked = false;
    updateProgress(true);
  });
  list.addEventListener("change", () => updateProgress(true));
  updateProgress(false);
  panel.append(progress, list, reset, element("p", siteText("reading_note", "يُحفظ التقدم في هذا المتصفح عند إتاحة التخزين."), "time-source"));
  return panel;
}

function renderSection(section, container) {
  const feature = element("section", null, "feature");
  feature.id = section.id;
  feature.setAttribute("aria-labelledby", section.id + "-heading");
  const heading = element("h1", null, "section-heading");
  heading.id = section.id + "-heading";
  const badge = element("span", null, "section-icon");
  badge.setAttribute("aria-hidden", "true");
  const icon = element("span", null, "zad-icon");
  icon.dataset.icon = section.id;
  badge.append(icon);
  heading.append(badge, document.createTextNode(section.title));
  const isFaq = section.id === "faq";
  const items = element("div", null, isFaq ? "faq-list" : "cards");
  for (const item of section.items) {
    const card = element(isFaq ? "details" : "article", null, isFaq ? "" : "card");
    if (siteTranslation && !item.sourceTitle) {
      card.lang = "ar";
      card.dir = "rtl";
    }
    card.append(element(isFaq ? "summary" : "h3", item.title));
    if (item.quote) {
      const quote = element("blockquote", item.quote, "quote");
      quote.lang = "ar";
      quote.dir = "rtl";
      card.append(quote);
    }
    if (item.meaning) {
      const meaning = element("p", null, "quote-meaning");
      meaning.append(element("strong", siteText("meaning", "المعنى")), document.createTextNode(" " + item.meaning));
      card.append(meaning);
    }
    if (item.steps) {
      const steps = element("ol", null, "practice-steps");
      for (const step of item.steps) steps.append(element("li", step));
      card.append(steps);
    }
    card.append(element("p", item.text));
    const references = element("div", null, "references");
    for (const [label, url] of item.links) {
      const link = element("a", referenceLabel(label, url));
      link.href = url;
      references.append(link);
    }
    card.append(references);
    items.append(card);
  }
  feature.append(heading, element("p", section.intro, "section-intro"));
  const topics = [...new Set(section.items.map(item => item.topic).filter(Boolean))];
  if (topics.length) {
    const label = element("label", siteText("filter_topic", "اختر الموضوع"), "topic-filter");
    const select = element("select");
    const all = element("option", siteText("filter_all", "جميع الموضوعات"));
    all.value = "";
    select.append(all, ...topics.map(topic => element("option", topic)));
    select.addEventListener("change", () => {
      section.items.forEach((item, index) => {
        items.children[index].hidden = Boolean(select.value) && item.topic !== select.value;
      });
    });
    label.append(select);
    feature.append(label);
  }
  feature.append(section.id === "reading" ? readingTracker() : items);
  container.append(feature);
}

const sectionContainer = document.querySelector("#sections[data-section]");
if (sectionContainer && typeof zadContent !== "undefined") {
  const section = zadContent.sections.find(({ id }) => id === sectionContainer.dataset.section);
  if (section) renderSection(translatedSection(section), sectionContainer);
}

function initializeMenu(menu, nav) {
  const language = document.querySelector(".site-language");
  function setMenu(open) {
    if (open && language) language.open = false;
    menu.setAttribute("aria-expanded", open);
    nav.setAttribute("aria-expanded", open);
  }

  menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
  language?.addEventListener("toggle", () => {
    if (language.open) setMenu(false);
  });
  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      menu.focus();
    }
  });
}

const menu = document.querySelector("#menu");
const nav = document.querySelector("#nav");
if (menu && nav) initializeMenu(menu, nav);

const contactLink = document.querySelector("#contact-link");
if (contactLink && typeof zadContent !== "undefined" && zadContent.contactEmail) {
  contactLink.href = "mailto:" + zadContent.contactEmail;
  contactLink.hidden = false;
  const contactNote = document.querySelector("#contact-note");
  if (contactNote) contactNote.textContent = siteText("contact_live", "أرسل اقتراحًا لمادة جديدة أو نبّهنا إلى تصحيح في المحتوى.");
}

const siteTour = document.querySelector("#site-tour");
siteTour?.addEventListener("toggle", () => {
  if (siteTour.open && !location.hash) {
    history.replaceState(history.state, "", "#site-tour");
  } else if (!siteTour.open && location.hash === "#site-tour") {
    history.replaceState(history.state, "", location.pathname + location.search);
  }
});

function redirectLegacySection() {
  if (document.body.dataset.page !== "home") return false;
  const fragment = location.hash.slice(1);
  if (fragment === "section-launcher") {
    location.replace("#site-tour");
    return true;
  }
  if (fragment === "site-tour" && siteTour) {
    siteTour.open = true;
    siteTour.scrollIntoView();
    return true;
  }
  const route = fragment.startsWith("discover-") ? "discover" : fragment;
  const link = [...document.querySelectorAll("#nav a[data-section-link]")]
    .find((anchor) => anchor.dataset.sectionLink === route);
  if (!link) return false;

  const destination = new URL(link.href);
  if (route === "discover" && fragment.startsWith("discover-") && fragment !== "discover-islam") {
    destination.hash = fragment;
  }
  location.replace(destination);
  return true;
}

function revealGuideTarget() {
  const target = document.getElementById(location.hash.slice(1));
  const guide = target?.closest("#discover-islam");
  if (!guide) return;
  if (guide.matches("details")) guide.open = true;
  const language = target.closest(".discover-locale");
  if (language) language.open = true;
  target.scrollIntoView();
}

function handleFragment() {
  if (location.hash && !redirectLegacySection()) revealGuideTarget();
}

window.addEventListener("hashchange", handleFragment);
handleFragment();

function initializeDailyCalendar(calendar) {
  const dates = calendar.querySelector("[data-calendar-dates]");
  const status = calendar.querySelector("[data-calendar-status]");
  const weekday = calendar.querySelector("[data-calendar-weekday]");
  const gregorian = calendar.querySelector("[data-calendar-gregorian]");
  const hijri = calendar.querySelector("[data-calendar-hijri]");
  const hijriFallback = calendar.querySelector("[data-calendar-hijri-fallback]");
  const locale = siteLocale === "ar" ? "ar-SA" : siteLocale;
  const timeZone = "Asia/Riyadh";
  const dateOptions = {timeZone, day: "numeric", month: "long", year: "numeric"};
  const hijriCalendar = "islamic-umalqura";

  let hijriFormat;
  try {
    const candidate = new Intl.DateTimeFormat(locale, {...dateOptions, calendar: hijriCalendar});
    if (candidate.resolvedOptions().calendar === hijriCalendar) hijriFormat = candidate;
  } catch {
    // Keep the Gregorian date available when the browser cannot format Umm al-Qura.
  }

  try {
    const weekdayFormat = new Intl.DateTimeFormat(locale, {timeZone, weekday: "long", calendar: "gregory"});
    const gregorianFormat = new Intl.DateTimeFormat(locale, {...dateOptions, calendar: "gregory"});
    const gregorianOptions = gregorianFormat.resolvedOptions();
    if (gregorianOptions.calendar !== "gregory" || gregorianOptions.timeZone !== timeZone) {
      throw new Error("The Gregorian calendar or Saudi time zone is unavailable");
    }
    const isoFormat = new Intl.DateTimeFormat("en", {
      timeZone, calendar: "gregory", numberingSystem: "latn", day: "2-digit", month: "2-digit", year: "numeric"
    });

    function renderToday() {
      const now = new Date();
      const parts = Object.fromEntries(isoFormat.formatToParts(now).map(({type, value}) => [type, value]));
      const date = `${parts.year.padStart(4, "0")}-${parts.month}-${parts.day}`;
      if (gregorian.dateTime === date) return;

      weekday.textContent = weekdayFormat.format(now);
      gregorian.textContent = gregorianFormat.format(now);
      gregorian.dateTime = date;
      if (hijriFormat) {
        hijri.textContent = hijriFormat.format(now);
        hijri.dateTime = date;
      }
      hijri.hidden = !hijriFormat;
      hijriFallback.hidden = !!hijriFormat;
      dates.hidden = false;
      status.hidden = true;
    }

    renderToday();
    window.setInterval(renderToday, 60_000);
    window.addEventListener("pageshow", renderToday);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) renderToday();
    });
  } catch {
    dates.hidden = true;
    status.textContent = calendar.dataset.calendarUnavailable;
    status.hidden = false;
  }
}

const dailyCalendar = document.querySelector("[data-daily-calendar]");
if (dailyCalendar) initializeDailyCalendar(dailyCalendar);

const askDraftKey = "zad-ask-draft-v1";
const homeAskForm = document.querySelector("#home-ask-form");
if (homeAskForm) {
  const input = document.querySelector("#home-ask-input");
  const status = document.querySelector("#home-ask-status");
  const submit = document.querySelector("#home-ask-submit");
  const destination = new URL(homeAskForm.action);
  if (destination.origin === location.origin && /^https?:$/.test(location.protocol)) {
    submit.disabled = false;
  } else {
    status.textContent = siteText("draft_open", "افتح «اسأل زاد» من القائمة أو من الأيقونة أسفل الصفحة.");
  }
  homeAskForm.addEventListener("submit", event => {
    event.preventDefault();
    if (submit.disabled) return;
    const question = input.value.trim();
    if (!question || question.length > input.maxLength) {
      status.textContent = siteText("draft_empty", "اكتب سؤالك أولًا في حدود ٥٠٠ حرف.");
      input.focus();
      return;
    }
    try {
      sessionStorage.setItem(askDraftKey, JSON.stringify({question, expiresAt: Date.now() + 120000}));
    } catch {
      status.textContent = siteText("draft_failed", "تعذّر نقل السؤال عبر هذا المتصفح. افتح «اسأل زاد» من الأيقونة أسفل الصفحة.");
      return;
    }
    input.value = "";
    location.assign(destination);
  });
}
