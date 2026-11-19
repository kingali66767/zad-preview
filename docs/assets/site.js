"use strict";

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
  const number = new Intl.NumberFormat("ar-SA");
  const checkboxes = plan.map(([name, url], index) => {
    const row = element("li");
    const link = element("a", "سورة " + name);
    link.href = url;
    const label = element("label");
    const checkbox = element("input");
    checkbox.type = "checkbox";
    checkbox.checked = completed.includes(index);
    checkbox.setAttribute("aria-label", "تمت قراءة سورة " + name);
    label.append(checkbox, element("span", "تمت القراءة"));
    row.append(link, label);
    list.append(row);
    return checkbox;
  });

  function updateProgress(save) {
    const checked = checkboxes.flatMap((checkbox, index) => checkbox.checked ? [index] : []);
    if (save) {
      try {
        localStorage.setItem(key, JSON.stringify(checked));
      } catch {
        progress.textContent = "تمت قراءة " + number.format(checked.length) + " من " +
          number.format(plan.length) + " · تعذّر حفظ التقدّم في هذا المتصفح.";
        return;
      }
    }
    progress.textContent = "تمت قراءة " + number.format(checked.length) + " من " + number.format(plan.length);
  }

  const reset = element("button", "ابدأ أسبوعًا جديدًا", "button green");
  reset.type = "button";
  reset.addEventListener("click", () => {
    for (const checkbox of checkboxes) checkbox.checked = false;
    updateProgress(true);
  });
  list.addEventListener("change", () => updateProgress(true));
  updateProgress(false);
  panel.append(progress, list, reset, element("p", "يُحفظ التقدم في هذا المتصفح عند إتاحة التخزين.", "time-source"));
  return panel;
}

for (const section of zadContent.sections) {
  const feature = element("section", null, "feature");
  feature.id = section.id;
  feature.setAttribute("aria-labelledby", section.id + "-heading");
  const heading = element("h2", section.title);
  heading.id = section.id + "-heading";
  const isFaq = section.id === "faq";
  const items = element("div", null, isFaq ? "faq-list" : "cards");
  for (const item of section.items) {
    const card = element(isFaq ? "details" : "article", null, isFaq ? "" : "card");
    card.append(element(isFaq ? "summary" : "h3", item.title));
    if (item.quote) card.append(element("blockquote", item.quote, "quote"));
    if (item.steps) {
      const steps = element("ol", null, "practice-steps");
      for (const step of item.steps) steps.append(element("li", step));
      card.append(steps);
    }
    card.append(element("p", item.text));
    const references = element("div", null, "references");
    for (const [label, url] of item.links) {
      const link = element("a", label);
      link.href = url;
      references.append(link);
    }
    card.append(references);
    items.append(card);
  }
  feature.append(heading, element("p", section.intro, "section-intro"));
  const topics = [...new Set(section.items.map(item => item.topic).filter(Boolean))];
  if (topics.length) {
    const label = element("label", "اختر الموضوع", "topic-filter");
    const select = element("select");
    const all = element("option", "جميع الموضوعات");
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
  document.querySelector("#sections").append(feature);
}

const menu = document.querySelector("#menu");
const nav = document.querySelector("#nav");
function setMenu(open) {
  menu.setAttribute("aria-expanded", open);
  nav.setAttribute("aria-expanded", open);
}
menu.addEventListener("click", () => setMenu(menu.getAttribute("aria-expanded") === "false"));
nav.addEventListener("click", (event) => {
  if (event.target.closest("a")) setMenu(false);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") {
    setMenu(false);
    menu.focus();
  }
});

if (zadContent.contactEmail) {
  const link = document.querySelector("#contact-link");
  link.href = "mailto:" + zadContent.contactEmail;
  link.hidden = false;
  document.querySelector("#contact-note").textContent = "أرسل اقتراحًا لمادة جديدة أو نبّهنا إلى تصحيح في المحتوى.";
}

const cities = {
  riyadh: { lat: 24.7136, lon: 46.6753, zone: "Asia/Riyadh", method: 4, label: "تقويم أم القرى" },
  mecca: { lat: 21.3891, lon: 39.8579, zone: "Asia/Riyadh", method: 4, label: "تقويم أم القرى" },
  cairo: { lat: 30.0444, lon: 31.2357, zone: "Africa/Cairo", method: 5, label: "الهيئة المصرية العامة للمساحة" },
  amman: { lat: 31.9539, lon: 35.9106, zone: "Asia/Amman", method: 23, label: "وزارة الأوقاف الأردنية" },
  dubai: { lat: 25.2048, lon: 55.2708, zone: "Asia/Dubai", method: 16, label: "دبي (AlAdhan)" }
};
const prayers = [["Fajr", "الفجر"], ["Dhuhr", "الظهر"], ["Asr", "العصر"], ["Maghrib", "المغرب"], ["Isha", "العشاء"]];
const form = document.querySelector("#prayer-form");
const citySelect = document.querySelector("#city");
const times = document.querySelector("#times");
const status = document.querySelector("#prayer-status");
let currentRequest;

async function loadTimes() {
  currentRequest?.abort();
  const request = new AbortController();
  currentRequest = request;
  const city = cities[citySelect.value];
  const cityName = citySelect.selectedOptions[0].textContent;
  const params = new URLSearchParams({
    latitude: city.lat, longitude: city.lon, method: city.method, school: 0, timezonestring: city.zone
  });
  const today = new Date();
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: city.zone, day: "2-digit", month: "2-digit", year: "numeric"
  }).formatToParts(today).map(({ type, value }) => [type, value]));
  const date = [parts.day, parts.month, parts.year].join("-");
  const localDate = new Intl.DateTimeFormat("ar-u-ca-gregory", { timeZone: city.zone, dateStyle: "full" }).format(today);
  const caption = cityName + " · " + localDate + " · " + city.label + " · العصر وفق حساب الجمهور";
  times.replaceChildren();
  status.textContent = "جارٍ تحميل المواقيت · " + caption;
  const timeout = setTimeout(() => request.abort(), 9000);
  try {
    const response = await fetch("https://api.aladhan.com/v1/timings/" + date + "?" + params, { signal: request.signal });
    if (!response.ok) throw new Error("Prayer API request failed");
    const { data } = await response.json();
    const rows = prayers.map(([key, label]) => {
      const rawTime = data?.timings?.[key];
      const value = typeof rawTime === "string" &&
        rawTime.trim().match(/^((?:[01]\d|2[0-3]):[0-5]\d)(?: \([A-Za-z0-9+:-]{1,12}\))?$/)?.[1];
      if (!value) throw new Error("Missing or invalid prayer time");
      const row = element("div");
      const time = element("strong", value);
      time.dir = "ltr";
      row.append(element("span", label), time);
      return row;
    });
    if (currentRequest === request) {
      times.replaceChildren(...rows);
      status.textContent = caption + " · بنظام ٢٤ ساعة";
    }
  } catch {
    if (currentRequest === request) status.textContent = "تعذر تحميل المواقيت. حاول مجددًا. · " + caption;
  } finally {
    clearTimeout(timeout);
  }
}
form.addEventListener("submit", (event) => {
  event.preventDefault();
  loadTimes();
});
citySelect.addEventListener("change", loadTimes);

function revealGuideTarget() {
  const target = document.getElementById(location.hash.slice(1));
  if (!target) return;
  const guide = target.closest("#discover-islam");
  if (guide) {
    guide.open = true;
    const language = target.closest(".discover-locale");
    if (language) language.open = true;
  }
  return target;
}

window.addEventListener("hashchange", () => {
  const target = revealGuideTarget();
  if (target?.closest("#discover-islam")) target.scrollIntoView();
});
if (location.hash) revealGuideTarget()?.scrollIntoView();
