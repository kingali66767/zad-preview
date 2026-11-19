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
  container.append(feature);
}

const sectionContainer = document.querySelector("#sections[data-section]");
if (sectionContainer && typeof zadContent !== "undefined") {
  const section = zadContent.sections.find(({ id }) => id === sectionContainer.dataset.section);
  if (section) renderSection(section, sectionContainer);
}

function initializeMenu(menu, nav) {
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
}

const menu = document.querySelector("#menu");
const nav = document.querySelector("#nav");
if (menu && nav) initializeMenu(menu, nav);

const contactLink = document.querySelector("#contact-link");
if (contactLink && typeof zadContent !== "undefined" && zadContent.contactEmail) {
  contactLink.href = "mailto:" + zadContent.contactEmail;
  contactLink.hidden = false;
  const contactNote = document.querySelector("#contact-note");
  if (contactNote) contactNote.textContent = "أرسل اقتراحًا لمادة جديدة أو نبّهنا إلى تصحيح في المحتوى.";
}

function redirectLegacySection() {
  if (document.body.dataset.page !== "home") return false;
  const fragment = location.hash.slice(1);
  if (fragment === "section-launcher") {
    location.replace("#site-tour");
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
