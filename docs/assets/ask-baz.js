"use strict";

const binBazOrigin = "https://binbaz.org.sa";
const binBazName = "(?:الشيخ )?(?:(?:عبد ?العزيز )?(?:بن|ابن) باز|عبد ?العزيز باز)";
const binBazAttributionStart = new RegExp(
  "^(?:(?:وش|ما|ماذا) (?:يقول|قال|راي) |(?:بحسب|عند|حسب) (?:فتوي )?|فتوي )" +
  binBazName + "(?: رحمه الله)? (?:عن |في )?"
);
const binBazAttributionEnd = new RegExp(
  " (?:عند|بحسب|حسب|من)(?: فتوي)? " + binBazName + "(?: رحمه الله)?$"
);
const binBazRulingIntro = /^(?:ما (?:هو )?حكم|حكم|هل يجوز|هل يشرع) /;
const binBazStopWords = new Set(["علي", "الي", "بعد", "قبل", "اذا", "كان", "متي", "كيف"]);
const binBazSearchSpellings = new Map([
  ["الصايم", "الصائم"], ["للصايم", "للصائم"], ["صايم", "صائم"],
  ["زكاه", "زكاة"], ["الصلاه", "الصلاة"], ["التوبه", "التوبة"]
]);
let binBazPrivateTerms;

function binBazLookupQuery(raw, subject) {
  if (!/\p{Script=Arabic}/u.test(subject) || raw.length > 220 || /[@<>]|https?:|www\./i.test(raw) ||
      /[0-9٠-٩۰-۹][\s().+-]*(?:[0-9٠-٩۰-۹][\s().+-]*){4}/.test(raw) ||
      /\b(?:email|phone|passport)\b/i.test(raw)) return "";
  binBazPrivateTerms ??= Object.values(guardedIntents).join("|").split("|").concat([
    "اسمي", "رقم هويتي", "رقم جوالي", "عنواني", "طلقت", "طلقني", "زوجي", "زوجتي", "طلب اختلاق"
  ]).map(normalizeQuestion);
  if (isIntentPhrasePresent(" " + subject + " ", binBazPrivateTerms)) return "";
  const key = searchTerms(subject);
  if (key.length > 160 || !binBazContentWords(key).length) return;

  // Preserve Arabic spelling in the request. The local matcher folds hamza and taa marbuta.
  const words = (raw.match(/[\p{L}\p{M}\p{N}ـ]+/gu) || [])
    .map(text => ({ key: normalizeQuestion(text), text: text.replace(/[ـ\p{M}]/gu, "") }))
    .filter(word => word.key);
  const terms = key.split(" ");
  const start = words.findIndex((_, index) => terms.every((term, step) => words[index + step]?.key === term));
  if (start < 0) return;
  const text = words.slice(start, start + terms.length).map(word => binBazSearchSpellings.get(word.key) || word.text).join(" ");
  return { key, text };
}

function binBazSubject(key) {
  const subject = key.replace(questionIntro, "");
  const arabic = subject.replace(binBazAttributionStart, "").replace(binBazAttributionEnd, "");
  if (arabic !== subject) return arabic;
  return subject.replace(/^according to (?:shaykh )?(?:ibn|bin) baz /, "")
    .replace(/ according to (?:shaykh )?(?:ibn|bin) baz$/, "");
}

function binBazSearchURL(path, query) {
  const url = new URL(path, binBazOrigin);
  url.search = new URLSearchParams({ type: "fatwa", q: query });
  return url;
}

function searchTerms(key) {
  return key.replace(questionIntro, "").replace(binBazRulingIntro, "").trim();
}

function binBazContentWords(query) {
  return query.split(" ").filter(word => word.length > 2 && !binBazStopWords.has(word));
}

function plainSearchText(value) {
  if (typeof value !== "string" || value.length > 2000) return "";
  const text = value.replace(/<\/?em>/gi, "").replace(/\s+/g, " ").trim();
  return /[<>]/.test(text) ? "" : text;
}

function openingExcerpt(fragments, terms) {
  const first = plainSearchText(Array.isArray(fragments) ? fragments[0] : undefined);
  const start = first.match(/^(?:الجواب|ج)\s*[:：]\s*(.+)$/)?.[1];
  if (!start || /^(?:(?:نعم|هذا|هذه|هكذا|ذلك|وكذلك)[\s،.]|لا[.،])/.test(start)) return "";
  // Search highlights can omit text between fragments. Use complete opening sentences only.
  const sentences = start.match(/^.{18,420}?[.!](?!\.)/)?.[0];
  if (!sentences || /\.{2}|…/.test(sentences)) return "";
  const words = new Set(normalizeQuestion(sentences).split(" "));
  return terms.some(term => words.has(term)) ? sentences : "";
}

function presentedBinBazResults(payload, query) {
  const rows = payload?.Search?.results;
  if (!Array.isArray(rows)) return;
  const terms = binBazContentWords(query);
  if (!terms.length) return;
  const references = new Map();
  const matches = [];
  for (const row of rows.slice(0, 15)) {
    const reference = row?.reference;
    const title = plainSearchText(row?.title);
    if (!Number.isSafeInteger(reference) || reference <= 0 || !title || title.length > 240) continue;
    const titleKey = searchTerms(normalizeQuestion(title));
    const questionKey = searchTerms(normalizeQuestion(plainSearchText(row.question)));
    const url = new URL("/byreference/fatwas/" + reference, binBazOrigin).href;
    const result = { title, url };
    const exact = query === titleKey || query === questionKey;
    const titleWords = new Set(titleKey.split(" "));
    if (exact || terms.filter(term => titleWords.has(term)).length >= Math.min(terms.length, 2)) {
      references.set(reference, result);
    }
    if (exact && !matches.some(match => match.url === url)) {
      matches.push({ ...result, answer: openingExcerpt(row.searchHighlights?.description, terms) });
    }
  }
  const direct = matches.length === 1 && matches[0].answer ? matches[0] : undefined;
  return { direct, related: [...references.values()].slice(0, 4) };
}

async function searchBinBaz(query, controller) {
  const url = binBazSearchURL("/api/search", query.text);
  url.searchParams.set("operator", "AND_ONLY");
  url.searchParams.set("page", "1");
  const timer = setTimeout(() => controller.abort(), 5500);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      signal: controller.signal
    });
    if (response.ok && response.headers.get("Content-Type")?.includes("application/json")) {
      return presentedBinBazResults(await response.json(), query.key);
    }
  } catch {
    // The question can still be answered from the reviewed library or taken to the original search.
  } finally {
    clearTimeout(timer);
  }
}
