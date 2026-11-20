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

const referencesForHelp = [
  ["الموقع الرسمي للشيخ ابن باز", "https://binbaz.org.sa/fatwas"],
  ["الموقع الرسمي للشيخ ابن عثيمين", "https://binothaimeen.net/"],
  ["الرئاسة العامة للبحوث العلمية والإفتاء", "https://alifta.gov.sa/ar/home"]
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
for (const [id, record] of Object.entries(askEvidence)) {
  topicTerms.set(id, record.terms.map(normalizeQuestion));
  for (const language of ["ar", "en", "fr", "es"]) {
    const [, ...questions] = record[language] || [];
    for (const question of questions) {
      questionIndex.set(normalizeQuestion(question), {id, language});
    }
  }
  for (const [topic, questions] of Object.entries(record.followUp || {})) {
    for (const question of questions) followUpIndex.set(topic + ":" + normalizeQuestion(question), id);
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
    status: record.clarification ? "يتغيّر الحكم بحسب تفاصيل المسألة." : "وجدت جوابًا مستندًا إلى المصادر.",
    title: record.clarification ? "أحتاج إلى توضيح" : record.correction ? "تصحيح موثّق" : "جواب موثّق"
  };
}

function reviewedAnswer(key) {
  const request = key.replace(questionIntro, "");
  const fatwa = exactFatwas.get(key) || exactFatwas.get(request);
  if (fatwa) {
    return {
      status: "مقتطف من فتوى " + fatwaScholars[fatwa.scholar],
      title: fatwa.title,
      sources: [[fatwa.title + " · اقرأ الفتوى كاملة", fatwa.url]],
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
  const separator = new RegExp("[؟?؛;]+|[،,]\\s*(?=و?\\s*" + start + ")|\\s+و\\s*(?=" + start + ")");
  const conjunction = new RegExp("^و\\s*(?=" + start + ")");
  return question.split(separator)
    .map(part => part.trim().replace(conjunction, ""))
    .filter(Boolean);
}

function sourceDescription(entry) {
  const format = entry.format === "audio" ? "تسجيل صوتي" : "فتوى مكتوبة";
  return fatwaScholars[entry.scholar] + " · " + format;
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
    source.href = entry.url;
    author.textContent = sourceDescription(entry);
    item.append(source, author);
    fatwaList.append(item);
  }
  fatwaCount.textContent = items.length
    ? new Intl.NumberFormat("ar-SA").format(items.length) + " نتيجة من المصادر الأصلية"
    : "لا توجد فتاوى في هذا الاختيار. يمكنك تغيير العالم أو الموضوع.";
}

fatwaScholar.add(new Option("جميع العلماء", ""));
for (const [id, name] of Object.entries(fatwaScholars)) fatwaScholar.add(new Option(name, id));
fatwaCategory.add(new Option("جميع الموضوعات", ""));
for (const category of new Set(fatwaSources.map(entry => entry.category))) {
  fatwaCategory.add(new Option(category, category));
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

function showResult(status, title, sources, answer = "", language = "ar") {
  askStatus.textContent = status;
  askQuestion.textContent = submittedQuestion;
  askTitle.textContent = title;
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
  showResult("وجدت أجوبة موثّقة لأجزاء السؤال.", "أجوبة موثّقة", sources);
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
    score: terms.reduce((best, term) => words.includes(" " + term + " ")
      ? Math.max(best, term.split(" ").length) : best, 0)
  })).filter(topic => topic.score > 0).sort((a, b) => b.score - a.score)
    .map(({id}) => ({id, title: askEvidence[id].title}));
}

function showRelated(topics, language = "ar") {
  const questions = topics.map(({id}) => askEvidence[id]).filter(record => record && !record.correction && !record.clarification)
    .map(record => record[language]?.[1]).filter(Boolean).slice(0, 3);
  for (const question of questions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    const label = question + (language === "ar" ? "؟" : "?");
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
  showResult(clarification ? "يتغيّر الجواب بحسب ما تقصده." : "هذه المسألة تحتاج إلى معرفة تفاصيلها.",
    "أحتاج إلى توضيح", links,
    intent.prompt, language);
  if (clarification) showRelated([...new Set([...ids, ...related.map(topic => topic.id)])].map(id => ({id})), language);
}

function showNoAnswer(topics, officialSearch) {
  const sources = officialSearch ? [officialSearch, ...referencesForHelp] : referencesForHelp;
  showResult("لم أجد جوابًا موثّقًا يطابق هذا السؤال.", "كيف تحدّد سؤالك؟", sources,
    "اذكر العبادة أو المسألة، وحدّد ما تريد معرفته عنها. يمكنك أيضًا اختيار أحد الأسئلة القريبة إن ظهر هنا.");
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
    modelStatus.textContent = "افتح الموقع عبر HTTPS أو خادم المعاينة المحلي لتشغيل النموذج.";
    return;
  }
  if (!navigator.gpu) {
    modelStatus.textContent = "اقتراح المراجع بالذكاء الاصطناعي يتطلب جهازًا ومتصفحًا يدعمان WebGPU.";
    return;
  }

  modelButton.disabled = true;
  modelStatus.textContent = "جارٍ التحقق من توافق جهازك…";
  const unavailable = "تعذّر تشغيل النموذج. يمكنك إعادة المحاولة، والبحث عن الأجوبة الموثّقة متاح الآن.";
  const timeout = Symbol("adapter timeout");
  let adapterTimer;
  try {
    const adapter = await Promise.race([
      navigator.gpu.requestAdapter(),
      new Promise(resolve => { adapterTimer = setTimeout(() => resolve(timeout), 10000); })
    ]);
    if (adapter === timeout) {
      resetModel("استغرق التحقق من توافق جهازك وقتًا طويلًا. يمكنك إعادة المحاولة.");
      return;
    }
    if (!adapter?.features.has("shader-f16")) {
      resetModel("يحتاج النموذج إلى جهاز يدعم WebGPU ودقة ١٦ بت. البحث عن الأجوبة الموثّقة متاح الآن.");
      return;
    }

    modelStatus.textContent = "جارٍ تحميل نموذج الذكاء الاصطناعي…";
    const worker = new Worker(document.querySelector("#ask-script").dataset.worker, { type: "module" });
    modelWorker = worker;
    worker.onerror = () => {
      if (modelWorker === worker) resetModel(unavailable);
    };
    worker.onmessage = ({ data }) => {
      if (modelWorker !== worker || !data || typeof data !== "object") return;
      if (data.type === "progress" && !modelReady) {
        const percent = Math.round(100 * Math.min(1, Math.max(0, Number(data.progress) || 0)));
        modelStatus.textContent = "جارٍ تحميل النموذج وإعداده… " + percent + "٪";
      } else if (data.type === "ready" && !modelReady) {
        clearTimeout(startupTimer);
        modelReady = true;
        modelStatus.textContent = "اقتراح المراجع بالذكاء الاصطناعي جاهز.";
      } else if (data.type === "topic" && pendingLookup && data.requestId === pendingLookup.id) {
        const {topics, officialSearch} = pendingLookup;
        const source = topics.some(topic => topic.id === data.id) ? askEvidence[data.id] : null;
        finishLookup();
        if (source) {
          showResult("لم أجد جوابًا موثّقًا يطابق السؤال. قد تساعدك هذه المراجع.",
            source.title, officialSearch ? [...source.sources, officialSearch] : source.sources);
          showRelated(topics);
        } else {
          showNoAnswer(topics, officialSearch);
        }
      } else if (data.type === "error" &&
          (data.requestId === undefined || data.requestId === pendingLookup?.id)) {
        resetModel(unavailable);
      }
    };
    startupTimer = setTimeout(() => resetModel("استغرق تحميل النموذج وقتًا طويلًا. يمكنك إعادة المحاولة."), 300000);
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
  if (followUp) return catalogAnswer(followUp, "ar");
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
  if ((!authors.length || namedBinBaz && subject !== key) && questionParts(question).length === 1) {
    const query = binBazLookupQuery(question, subject);
    if (query) {
      officialSearch = ["بحث هذا الموضوع في موقع الشيخ ابن باز", binBazSearchURL("/search", query.text).href];
      const controller = new AbortController();
      agentRequest = controller;
      askButton.disabled = true;
      askResult.hidden = true;
      askStatus.textContent = "جارٍ البحث في الموقع الرسمي للشيخ ابن باز…";
      const result = await searchBinBaz(query, controller);
      if (agentRequest !== controller) return;
      finishLookupAfterAgent();
      if (result?.direct) {
        const { title, url, answer } = result.direct;
        showResult("مقتطف من بداية جواب الشيخ عبد العزيز بن باز", title,
          [["اقرأ الفتوى كاملةً في موقع الشيخ", url]], answer);
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
    showResult("وجدت فتاوى مرتبطة بموضوع السؤال.", "نتائج من مواقع العلماء",
      sources,
      "راجع السؤال والجواب كاملين في المصدر. إذا كانت مسألتك لها ظروف خاصة، فاسأل مختصًا يمكنه معرفة تفاصيلها.");
    askSources.classList.add("fatwa-results");
    showRelated(topics);
    return;
  }
  if (relatedOnline?.length) {
    const sources = relatedOnline.map(({title, url}) => [title, url]);
    showResult("وجدت فتاوى مرتبطة في البحث الرسمي.", "نتائج موقع الشيخ ابن باز", [...sources, officialSearch],
      "افتح الفتوى الأقرب إلى سؤالك لقراءة الجواب كاملًا؛ المقتطفات المتاحة لا تكفي لإجابة هذا السؤال بدقة.");
    return;
  }
  if (authors.length) {
    showResult("لم أجد فتوى مطابقة من العالم المذكور في الفهرس.", "المواقع الرسمية",
      officialSearch ? [officialSearch, ...referencesForHelp] : referencesForHelp,
      "يمكنك تغيير صياغة السؤال أو مراجعة الجهات الرسمية.");
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
  askStatus.textContent = "جارٍ البحث عن مراجع قد تفيدك…";
  lookupTimer = setTimeout(() => resetModel("استغرق اقتراح المراجع وقتًا طويلًا. يمكنك إعادة المحاولة."), 90000);
  try {
    modelWorker.postMessage({ type: "ask", requestId, question, topics });
  } catch {
    resetModel("تعذّر اقتراح المراجع. يمكنك إعادة تشغيل النموذج.");
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
    askStatus.textContent = "اكتب سؤالًا للبحث عن إجابة.";
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
    askStatus.textContent = "يبحث وكيل زاد في مواقع الفتوى المعتمدة…";
    const result = await requestAgentAnswer(question, controller);
    if (agentRequest !== controller) return;
    finishLookupAfterAgent();
    if (result) {
      const known = reviewedAnswer(key);
      previousTopic = known?.id;
      showResult("خلاصة من وكيل OpenAI. يمكنك فتح الفتوى من المراجع أدناه.",
        "إجابة من المصادر", result.sources, result.answer, questionLanguage(key));
      return;
    }
  }
  await answerFromLibrary(question, key, topic);
});

askButton.disabled = false;

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
