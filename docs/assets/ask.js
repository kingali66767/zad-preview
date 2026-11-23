"use strict";

const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const askButton = document.querySelector("#ask-submit");
const askReset = document.querySelector("#ask-reset");
const askStatus = document.querySelector("#ask-status");
const askResult = document.querySelector("#ask-result");
const askQuestion = document.querySelector("#ask-question");
const askTitle = document.querySelector("#ask-answer-heading");
const askAnswer = document.querySelector("#ask-answer");
const askSources = document.querySelector("#ask-sources");
const askRelated = document.querySelector("#ask-related");
const askRelatedQuestions = document.querySelector("#ask-related-questions");
const askAgentEndpoint = askForm.dataset.agentEndpoint;
const askAgentNotice = document.querySelector("#ask-agent-notice");
const modelButton = document.querySelector("#ask-enable");
const modelStatus = document.querySelector("#ask-model-status");
const fatwaScholar = document.querySelector("#fatwa-scholar");
const fatwaCategory = document.querySelector("#fatwa-category");
const fatwaCount = document.querySelector("#fatwa-count");
const fatwaList = document.querySelector("#fatwa-list");
const askLocale = typeof zadServiceLocale === "string" ? zadServiceLocale : "ar";

function askMessage(key, fallback) {
  return typeof zadServiceText === "function" ? zadServiceText("ask", key, fallback) : fallback;
}

const referencesForHelp = [
  [askMessage("ibnBaz", "الموقع الرسمي للشيخ ابن باز"), "https://binbaz.org.sa/fatwas"],
  [askMessage("ibnUthaymeen", "الموقع الرسمي للشيخ ابن عثيمين"), "https://binothaimeen.net/"],
  [askMessage("fatwaAuthority", "الرئاسة العامة للبحوث العلمية والإفتاء"), "https://alifta.gov.sa/ar/home"]
];

function normalizeQuestion(value) {
  return value.toLowerCase().replace(/ـ/g, "").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const questionIndex = new Map();
const topicTerms = new Map();
const followUpIndex = new Map();
if (typeof applyZadReviewedTranslations === "function") applyZadReviewedTranslations(askEvidence);
for (const [id, record] of Object.entries(askEvidence)) {
  topicTerms.set(id, record.terms.map(normalizeQuestion));
  for (const language of ["ar", "en", "fr", "es", "ur", "zh"]) {
    const [, ...questions] = record[language] || [];
    for (const question of questions) {
      questionIndex.set(normalizeQuestion(question), {id, language});
    }
  }
  for (const [topic, questions] of Object.entries(record.followUp || {})) {
    for (const question of questions) followUpIndex.set(topic + ":" + normalizeQuestion(question), {id, language: "ar"});
  }
}
if (typeof zadReviewedTranslations === "object") {
  for (const [language, records] of Object.entries(zadReviewedTranslations)) {
    for (const [id, record] of Object.entries(records)) {
      for (const [topic, questions] of Object.entries(record.followUp || {})) {
        for (const question of questions) followUpIndex.set(topic + ":" + normalizeQuestion(question), {id, language});
      }
    }
  }
}

const fatwaIndex = fatwaSources.map(entry => ({
  entry,
  terms: entry.tags.map(normalizeQuestion),
  title: normalizeQuestion(entry.title)
}));
const exactFatwas = new Map(fatwaSources.flatMap(entry =>
  (entry.excerpt?.questions || []).map(question => [normalizeQuestion(question), entry])
));

const questionIntro = /^(?:(?:السلام عليكم(?: ورحمه الله(?: وبركاته)?)?|لو سمحت(?:م)?|من فضلك(?:م)?|ممكن اعرف|(?:ابغ[يا]|ابي|ودي)(?: اعرف)?|اريد(?: معرفه)?|انا) )+/;

function catalogAnswer(id, language) {
  const record = askEvidence[id];
  if (!record?.[language]?.[0]) return;
  return {
    id, language,
    answer: record[language][0],
    sources: record.localizedSources?.[language] || record.sources,
    needsDetails: Boolean(record.clarification),
    status: record.clarification ? askMessage("details", "يتغيّر الحكم بحسب تفاصيل المسألة.") :
      askMessage("trusted", "وجدت جوابًا مستندًا إلى المصادر."),
    title: record.clarification ? askMessage("clarify", "أحتاج إلى توضيح") :
      record.correction ? askMessage("correction", "تصحيح موثّق") : askMessage("answer", "جواب موثّق")
  };
}

function reviewedAnswer(key) {
  const request = key.replace(questionIntro, "");
  const fatwa = exactFatwas.get(key) || exactFatwas.get(request);
  if (fatwa) {
    return {
      status: askMessage("excerpt", "مقتطف من فتوى") + " " + scholarLabel(fatwa.scholar),
      title: fatwa.title,
      sources: [[fatwa.title + " · " + askMessage("fullFatwa", "اقرأ الفتوى كاملة"), fatwa.url]],
      answer: fatwa.excerpt.text,
      language: "ar"
    };
  }
  const match = questionIndex.get(key) || questionIndex.get(request);
  return match && catalogAnswer(match.id, match.language);
}

// Preserve dependent qualifiers with their question. A compound answer requires
// a reviewed result for every clause, including any clause after a question mark.
function questionParts(question) {
  const start = "(?:هل|ما|ماذا|كيف|متى|كم|ليش|لماذا|إذا|اذا)\\s";
  const separator = new RegExp("[؟?？؛;；]+|[،,]\\s*(?=و?\\s*" + start + ")|\\s+و\\s*(?=" + start + ")");
  const conjunction = new RegExp("^و\\s*(?=" + start + ")");
  return question.split(separator)
    .map(part => part.trim().replace(conjunction, ""))
    .filter(Boolean);
}

function scholarLabel(id) {
  const key = id === "ibn-baz" ? "scholarBaz" : "scholarUthaymeen";
  return askMessage(key, fatwaScholars[id]);
}

const categoryKeys = {
  "الطهارة": "purity", "الصلاة": "prayer", "الزكاة": "zakat", "الصيام": "fasting", "الحج والعمرة": "pilgrimage"
};

function sourceDescription(entry) {
  const format = entry.format === "audio" ? askMessage("audio", "تسجيل صوتي") : askMessage("written", "فتوى مكتوبة");
  return scholarLabel(entry.scholar) + " · " + format;
}

function browseFatwas() {
  const items = fatwaSources.filter(entry =>
    (!fatwaScholar.value || entry.scholar === fatwaScholar.value) &&
    (!fatwaCategory.value || entry.category === fatwaCategory.value));
  fatwaList.replaceChildren();
  for (const entry of items) {
    const item = document.createElement("li");
    const source = document.createElement("a");
    const author = document.createElement("small");
    source.textContent = entry.title;
    source.lang = "ar";
    source.dir = "auto";
    source.href = entry.url;
    author.textContent = sourceDescription(entry);
    item.append(source, author);
    fatwaList.append(item);
  }
  fatwaCount.textContent = items.length
    ? new Intl.NumberFormat(askLocale === "ar" ? "ar-SA" : askLocale).format(items.length) +
      " " + askMessage("resultCount", "نتيجة من المصادر الأصلية")
    : askMessage("empty", "لا توجد فتاوى في هذا الاختيار. يمكنك تغيير العالم أو الموضوع.");
}

fatwaScholar.add(new Option(askMessage("scholars", "جميع العلماء"), ""));
for (const id of Object.keys(fatwaScholars)) fatwaScholar.add(new Option(scholarLabel(id), id));
fatwaCategory.add(new Option(askMessage("topics", "جميع الموضوعات"), ""));
for (const category of new Set(fatwaSources.map(entry => entry.category))) {
  fatwaCategory.add(new Option(askMessage(categoryKeys[category], category), category));
}
fatwaScholar.addEventListener("change", browseFatwas);
fatwaCategory.addEventListener("change", browseFatwas);
browseFatwas();

const scholarNames = {
  "ibn-baz": ["ابن باز", "بن باز", "عبد العزيز باز", "عبدالعزيز باز", "ibn baz", "bin baz"],
  "ibn-uthaymeen": ["ابن عثيمين", "بن عثيمين", "العثيمين"],
  unlisted: ["الفوزان", "اللحيدان", "الحيدان"]
};

function includesPhrase(key, phrase) {
  return (" " + key + " ").includes(" " + normalizeQuestion(phrase) + " ");
}

function requestedScholars(key) {
  return Object.keys(scholarNames).filter(id => scholarNames[id].some(name => includesPhrase(key, name)));
}

function relevantFatwas(key, authors) {
  const phrase = " " + key + " ";
  const authorOnly = authors.some(id => scholarNames[id].some(name =>
    [name, "الشيخ " + name, "فتاوى " + name].some(alias => normalizeQuestion(alias) === key)));
  return fatwaIndex.filter(({entry}) => !authors.length || authors.includes(entry.scholar))
    .map(({entry, terms, title}) => ({
    entry,
    score: key === title ? 1000 : authorOnly ? 1 : terms.reduce((total, term) => (
      total + ((term === key || term.includes(" ") && phrase.includes(" " + term + " ")) ? term.split(" ").length ** 2 : 0)
    ), 0)
  })).filter(result => result.score > 0).sort((a, b) => b.score - a.score)
    .slice(0, 5).map(result => result.entry);
}

let submittedQuestion = "";
let previousTopic;

function showResult(status, title, sources, answer = "", language = askLocale) {
  askStatus.textContent = status;
  askQuestion.textContent = submittedQuestion;
  askTitle.textContent = title;
  askTitle.dir = "auto";
  askAnswer.textContent = answer;
  askAnswer.hidden = !answer;
  askAnswer.lang = language;
  askRelated.hidden = true;
  askRelatedQuestions.replaceChildren();
  askSources.classList.remove("fatwa-results");
  askSources.replaceChildren();
  for (const [label, url] of sources) {
    const link = document.createElement("a");
    link.textContent = label;
    link.dir = "auto";
    link.href = url;
    askSources.append(link);
  }
  askResult.hidden = false;
  askReset.hidden = false;
}

function showReviewed(match) {
  showResult(match.status, match.title, match.sources, match.answer, match.language);
  previousTopic = match.needsDetails ? undefined : match.id;
}

function showParts(parts) {
  const sources = [...new Map(parts.flatMap(({match}) => match.sources.map(([label, url]) => [url, label])))]
    .map(([url, label]) => [label, url]);
  showResult(askMessage("partsStatus", "وجدت أجوبة موثّقة لأجزاء السؤال."), askMessage("partsTitle", "أجوبة موثّقة"), sources);
  askAnswer.hidden = false;
  for (const {question, match} of parts) {
    const part = document.createElement("section");
    const heading = document.createElement("h4");
    const body = document.createElement("p");
    const citation = document.createElement("small");
    part.className = "ask-part";
    part.lang = match.language;
    part.dir = "auto";
    heading.textContent = question;
    body.textContent = match.answer;
    citation.textContent = match.sources.map(([label]) => label).join(" · ");
    part.append(heading, body, citation);
    askAnswer.append(part);
  }
  previousTopic = parts.at(-1).match.id;
}

function relatedTopics(key) {
  const words = " " + key + " ";
  return [...topicTerms].map(([id, terms]) => ({
    id,
    score: terms.reduce((best, term) => (/\p{Script=Han}/u.test(term) ? key.includes(term) : words.includes(" " + term + " "))
      ? Math.max(best, term.split(" ").length) : best, 0)
  })).filter(topic => topic.score > 0).sort((a, b) => b.score - a.score)
    .map(({id}) => ({id, title: askEvidence[id].title}));
}

function showRelated(topics, language = askLocale) {
  const questions = topics.map(({id}) => askEvidence[id]).filter(record => record && !record.correction && !record.clarification)
    .map(record => record[language]?.[1]).filter(Boolean).slice(0, 3);
  for (const question of questions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    const questionMark = language === "ar" || language === "ur" ? "؟" : language === "zh" ? "？" : "?";
    const label = question + questionMark;
    button.textContent = label;
    button.lang = language;
    button.dir = "auto";
    button.addEventListener("click", () => {
      askInput.value = label;
      askForm.requestSubmit();
      if (!askResult.hidden) askTitle.focus();
    });
    askRelatedQuestions.append(button);
  }
  askRelated.hidden = !questions.length;
}

function showIntent(intent, related = [], officialSearch) {
  const language = intent.language || "ar";
  const ids = intent.ids || [];
  const sources = [...new Map(ids.flatMap(id => {
    const record = askEvidence[id];
    return (record?.localizedSources?.[language] || record?.sources || []).map(([label, url]) => [url, label]);
  }))].map(([url, label]) => [label, url]);
  const clarification = intent.kind === "clarify";
  const links = sources.length ? sources.slice(0, 5) : [...referencesForHelp];
  if (officialSearch) links.push(officialSearch);
  showResult(clarification ? askMessage("clarifyIntent", "يتغيّر الجواب بحسب ما تقصده.") :
    askMessage("clarifyDetails", "هذه المسألة تحتاج إلى معرفة تفاصيلها."),
    askMessage("clarify", "أحتاج إلى توضيح"), links,
    intent.prompt, language);
  if (clarification) showRelated([...new Set([...ids, ...related.map(topic => topic.id)])].map(id => ({id})), language);
}

function showNoAnswer(topics, officialSearch) {
  const sources = officialSearch ? [officialSearch, ...referencesForHelp] : referencesForHelp;
  showResult(askMessage("noAnswer", "لم أجد جوابًا موثّقًا يطابق هذا السؤال."), askMessage("refine", "كيف تحدّد سؤالك؟"), sources,
    askMessage("refineHint", "اذكر العبادة أو المسألة، وحدّد ما تريد معرفته عنها. يمكنك أيضًا اختيار أحد الأسئلة القريبة إن ظهر هنا."));
  showRelated(topics);
}

let modelWorker;
let modelReady = false;
let pendingLookup;
let nextLookupId = 0;
let startupTimer;
let lookupTimer;
let agentRequest;

if (askAgentEndpoint) askAgentNotice.hidden = false;

function finishLookup() {
  clearTimeout(lookupTimer);
  pendingLookup = undefined;
  askButton.disabled = Boolean(agentRequest);
}

function resetModel(message) {
  if (pendingLookup) showNoAnswer(pendingLookup.topics, pendingLookup.officialSearch);
  finishLookup();
  clearTimeout(startupTimer);
  modelWorker?.terminate();
  modelWorker = undefined;
  modelReady = false;
  modelButton.disabled = false;
  modelStatus.textContent = message;
}

modelButton.addEventListener("click", async () => {
  if (location.protocol === "file:") {
    modelStatus.textContent = askMessage("https", "افتح الموقع عبر HTTPS أو خادم المعاينة المحلي لتشغيل النموذج.");
    return;
  }
  if (!navigator.gpu) {
    modelStatus.textContent = askMessage("noGPU", "اقتراح المراجع بالذكاء الاصطناعي يتطلب جهازًا ومتصفحًا يدعمان WebGPU.");
    return;
  }

  modelButton.disabled = true;
  modelStatus.textContent = askMessage("check", "جارٍ التحقق من توافق جهازك…");
  const unavailable = askMessage("unavailable", "تعذّر تشغيل النموذج. يمكنك إعادة المحاولة، والبحث عن الأجوبة الموثّقة متاح الآن.");
  const timeout = Symbol("adapter timeout");
  let adapterTimer;
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise(resolve => { adapterTimer = setTimeout(() => resolve(timeout), 10000); })
    ]);
    if (adapter === timeout) {
      resetModel(askMessage("adapterTimeout", "استغرق التحقق من توافق جهازك وقتًا طويلًا. يمكنك إعادة المحاولة."));
      return;
    }
    if (!adapter?.features.has("shader-f16")) {
      resetModel(askMessage("gpu16", "يحتاج النموذج إلى جهاز يدعم WebGPU ودقة ١٦ بت. البحث عن الأجوبة الموثّقة متاح الآن."));
      return;
    }

    modelStatus.textContent = askMessage("loadModel", "جارٍ تحميل نموذج الذكاء الاصطناعي…");
    const worker = new Worker(document.querySelector("#ask-script").dataset.worker, { type: "module" });
    modelWorker = worker;
    worker.onerror = () => {
      if (modelWorker === worker) resetModel(unavailable);
    };
    worker.onmessage = ({ data }) => {
      if (modelWorker !== worker || !data || typeof data !== "object") return;
      if (data.type === "progress" && !modelReady) {
        const percent = Math.round(100 * Math.min(1, Math.max(0, Number(data.progress) || 0)));
        const progress = askLocale === "ar" ? percent + "٪" :
          new Intl.NumberFormat(askLocale, {style: "percent"}).format(percent / 100);
        modelStatus.textContent = askMessage("modelProgress", "جارٍ تحميل النموذج وإعداده…") + " " + progress;
      } else if (data.type === "ready" && !modelReady) {
        clearTimeout(startupTimer);
        modelReady = true;
        modelStatus.textContent = askMessage("modelReady", "اقتراح المراجع بالذكاء الاصطناعي جاهز.");
      } else if (data.type === "topic" && pendingLookup && data.requestId === pendingLookup.id) {
        const {topics, officialSearch} = pendingLookup;
        const source = topics.some(topic => topic.id === data.id) ? askEvidence[data.id] : null;
        finishLookup();
        if (source) {
          const sources = source.localizedSources?.[askLocale] || source.sources;
          showResult(askMessage("candidate", "لم أجد جوابًا موثّقًا يطابق السؤال. قد تساعدك هذه المراجع."),
            askMessage("sources", source.title), officialSearch ? [...sources, officialSearch] : sources);
          showRelated(topics);
        } else {
          showNoAnswer(topics, officialSearch);
        }
      } else if (data.type === "error" &&
          (data.requestId === undefined || data.requestId === pendingLookup?.id)) {
        resetModel(unavailable);
      }
    };
    startupTimer = setTimeout(() => resetModel(askMessage("startupTimeout", "استغرق تحميل النموذج وقتًا طويلًا. يمكنك إعادة المحاولة.")), 300000);
    worker.postMessage({ type: "init" });
  } catch {
    resetModel(unavailable);
  } finally {
    clearTimeout(adapterTimer);
  }
});

function exactOrFollowUp(key, topic) {
  const match = reviewedAnswer(key);
  if (match) return match;
  const followUp = followUpIndex.get(topic + ":" + key.replace(questionIntro, ""));
  if (followUp) return catalogAnswer(followUp.id, followUp.language);
}

function scholarAnswer(subject, intent) {
  const match = reviewedAnswer(subject) ||
    (intent?.kind === "answer" && catalogAnswer(intent.id, intent.language));
  if (match?.sources?.length && match.sources.every(([, url]) =>
    /^https:\/\/binbaz\.org\.sa\/fatwas\/\d+\//.test(url))) {
    return match;
  }
}

function reviewedParts(questions, topic) {
  if (questions.length < 2 || questions.length > 3) return;
  const parts = [];
  for (const question of questions) {
    const key = normalizeQuestion(question);
    if (requestedScholars(key).length) return;
    const exact = exactOrFollowUp(key, topic);
    const intent = exact ? undefined : resolveQuestionIntent(question, topic);
    const match = exact || (intent?.kind === "answer" && catalogAnswer(intent.id, intent.language));
    if (!match || match.needsDetails) return;
    parts.push({question, match});
    topic = match.id;
  }
  return parts;
}

function cancelAgent() {
  agentRequest?.abort();
  agentRequest = undefined;
}

function mayUseAgent(question, key, topic) {
  if (!askAgentEndpoint || reviewedAnswer(key)?.needsDetails ||
      followUpIndex.has(topic + ":" + key.replace(questionIntro, ""))) return false;
  if (["ur", "zh"].includes(questionLanguage(key))) return false;
  const intent = resolveQuestionIntent(question, topic);
  return intent?.kind !== "refer" && !askEvidence[intent?.id]?.clarification;
}

async function requestAgentAnswer(question, controller) {
  const timer = setTimeout(() => controller.abort(), 22000);
  try {
    const response = await fetch(askAgentEndpoint, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
      body: JSON.stringify({question})
    });
    if (!response.ok) return;
    const data = await response.json();
    if (data?.kind !== "answer" || typeof data.answer !== "string" ||
        !data.answer.trim() || data.answer.length > 2500 ||
        !Array.isArray(data.sources) || !data.sources.length || data.sources.length > 12) return;
    const sources = [];
    for (const source of data.sources) {
      if (typeof source?.label !== "string" || !source.label.trim() || source.label.length > 250 ||
          typeof source.url !== "string" || source.url.length > 1800) return;
      const url = new URL(source.url);
      if (url.protocol !== "https:" || url.username || url.password || url.port) return;
      sources.push([source.label.trim(), url.href]);
    }
    return {answer: data.answer.trim(), sources};
  } catch {
    // Fall back to the independently reviewed content if the agent is unavailable.
  } finally {
    clearTimeout(timer);
  }
}

askInput.addEventListener("input", () => {
  if (!pendingLookup && !agentRequest) return;
  cancelAgent();
  finishLookup();
  askStatus.textContent = "";
});

askReset.addEventListener("click", () => {
  cancelAgent();
  finishLookup();
  previousTopic = undefined;
  submittedQuestion = "";
  askInput.value = "";
  askStatus.textContent = "";
  askResult.hidden = true;
  askReset.hidden = true;
  askInput.focus();
});

async function answerFromLibrary(question, key, topic) {
  const authors = requestedScholars(key);
  const namedBinBaz = authors.length === 1 && authors[0] === "ibn-baz";
  const subject = namedBinBaz ? binBazSubject(key) : key;
  let intent;
  if (authors.length) {
    if (namedBinBaz && subject !== key) {
      intent = resolveQuestionIntent(subject, topic);
      const match = scholarAnswer(subject, intent);
      if (match) {
        showReviewed(match);
        return;
      }
    }
  } else {
    const match = exactOrFollowUp(key, topic);
    if (match) {
      showReviewed(match);
      return;
    }
    const questions = questionParts(question);
    const parts = reviewedParts(questions, topic);
    if (parts) {
      showParts(parts);
      return;
    }
    intent = resolveQuestionIntent(question, topic);
    if (intent?.kind === "answer") {
      const answer = catalogAnswer(intent.id, intent.language);
      if (answer && (questions.length === 1 || answer.needsDetails)) {
        showReviewed(answer);
        return;
      }
    } else if (intent?.kind === "refer") {
      showIntent(intent);
      return;
    }
  }

  if (intent?.kind === "refer") {
    showIntent(intent);
    return;
  }

  let officialSearch, relatedOnline;
  if (questionLanguage(key) === "ar" && (!authors.length || namedBinBaz && subject !== key) &&
      questionParts(question).length === 1) {
    const query = binBazLookupQuery(question, subject);
    if (query) {
      officialSearch = [askMessage("webSearch", "بحث هذا الموضوع في موقع الشيخ ابن باز"), binBazSearchURL("/search", query.text).href];
      const controller = new AbortController();
      agentRequest = controller;
      askButton.disabled = true;
      askResult.hidden = true;
      askStatus.textContent = askMessage("officialLoading", "جارٍ البحث في الموقع الرسمي للشيخ ابن باز…");
      const result = await searchBinBaz(query, controller);
      if (agentRequest !== controller) return;
      finishLookupAfterAgent();
      if (result?.direct) {
        const { title, url, answer } = result.direct;
        showResult(askMessage("officialExcerpt", "مقتطف من بداية جواب الشيخ عبد العزيز بن باز"), title,
          [[askMessage("officialRead", "اقرأ الفتوى كاملةً في موقع الشيخ"), url]], answer, "ar");
        return;
      }
      relatedOnline = result?.related;
    }
  }

  const topics = authors.length ? [] : relatedTopics(key);
  const references = relevantFatwas(key, authors);
  if (intent?.kind === "clarify") {
    const ordinarySources = new Set((intent.ids || []).flatMap(id => (askEvidence[id]?.sources || []).map(([, url]) => url)));
    if (!references.some(entry => !ordinarySources.has(entry.url))) {
      showIntent(intent, topics, officialSearch);
      return;
    }
  }
  if (references.length) {
    const sources = references.map(entry => [entry.title + " · " + sourceDescription(entry), entry.url]);
    if (officialSearch) sources.push(officialSearch);
    showResult(askMessage("relatedFatwas", "وجدت فتاوى مرتبطة بموضوع السؤال."), askMessage("scholarResults", "نتائج من مواقع العلماء"),
      sources,
      askMessage("readContext", "راجع السؤال والجواب كاملين في المصدر. إذا كانت مسألتك لها ظروف خاصة، فاسأل مختصًا يمكنه معرفة تفاصيلها."));
    askSources.classList.add("fatwa-results");
    showRelated(topics);
    return;
  }
  if (relatedOnline?.length) {
    const sources = relatedOnline.map(({title, url}) => [title, url]);
    showResult(askMessage("relatedOnline", "وجدت فتاوى مرتبطة في البحث الرسمي."), askMessage("bazResults", "نتائج موقع الشيخ ابن باز"), [...sources, officialSearch],
      askMessage("notEnough", "افتح الفتوى الأقرب إلى سؤالك لقراءة الجواب كاملًا؛ المقتطفات المتاحة لا تكفي لإجابة هذا السؤال بدقة."));
    return;
  }
  if (authors.length) {
    showResult(askMessage("noScholar", "لم أجد فتوى مطابقة من العالم المذكور في الفهرس."), askMessage("officialSites", "المواقع الرسمية"),
      officialSearch ? [officialSearch, ...referencesForHelp] : referencesForHelp,
      askMessage("rephrase", "يمكنك تغيير صياغة السؤال أو مراجعة الجهات الرسمية."));
    return;
  }

  if (!modelReady || !topics.length) {
    showNoAnswer(topics, officialSearch);
    return;
  }

  const requestId = ++nextLookupId;
  pendingLookup = {id: requestId, topics, officialSearch};
  askButton.disabled = true;
  askResult.hidden = true;
  askStatus.textContent = askMessage("looking", "جارٍ البحث عن مراجع قد تفيدك…");
  lookupTimer = setTimeout(() => resetModel(askMessage("lookupTimeout", "استغرق اقتراح المراجع وقتًا طويلًا. يمكنك إعادة المحاولة.")), 90000);
  try {
    modelWorker.postMessage({ type: "ask", requestId, question, topics });
  } catch {
    resetModel(askMessage("lookupFailed", "تعذّر اقتراح المراجع. يمكنك إعادة تشغيل النموذج."));
  }
}

function finishLookupAfterAgent() {
  agentRequest = undefined;
  askButton.disabled = false;
}

askForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (pendingLookup || agentRequest) return;
  const question = askInput.value.trim();
  const key = normalizeQuestion(question);
  if (!key) {
    askResult.hidden = true;
    askStatus.textContent = askMessage("enterQuestion", "اكتب سؤالًا للبحث عن إجابة.");
    askInput.focus();
    return;
  }
  submittedQuestion = question;
  askReset.hidden = false;
  const topic = previousTopic;
  previousTopic = undefined;

  if (mayUseAgent(question, key, topic)) {
    const controller = new AbortController();
    agentRequest = controller;
    askButton.disabled = true;
    askResult.hidden = true;
    askStatus.textContent = askMessage("agentLooking", "يبحث وكيل زاد في مواقع الفتوى المعتمدة…");
    const result = await requestAgentAnswer(question, controller);
    if (agentRequest !== controller) return;
    finishLookupAfterAgent();
    if (result) {
      const known = reviewedAnswer(key);
      previousTopic = known?.id;
      showResult(askMessage("agentStatus", "خلاصة من وكيل OpenAI. يمكنك فتح الفتوى من المراجع أدناه."),
        askMessage("agentTitle", "إجابة من المصادر"), result.sources, result.answer, questionLanguage(key));
      return;
    }
  }
  await answerFromLibrary(question, key, topic);
});

askButton.disabled = false;

const askDraftKey = "zad-ask-draft-v1";
try {
  const rawDraft = sessionStorage.getItem(askDraftKey);
  sessionStorage.removeItem(askDraftKey);
  if (rawDraft) {
    const draft = JSON.parse(rawDraft);
    if (typeof draft?.question === "string" && draft.question.trim() &&
        draft.question.length <= askInput.maxLength && Number.isFinite(draft.expiresAt) && draft.expiresAt > Date.now()) {
      askInput.value = draft.question;
      askForm.requestSubmit();
    }
  }
} catch {
  // The form works directly on this page if browser storage cannot be used.
}
