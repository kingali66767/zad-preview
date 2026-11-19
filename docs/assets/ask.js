"use strict";

const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const askButton = document.querySelector("#ask-submit");
const askStatus = document.querySelector("#ask-status");
const askResult = document.querySelector("#ask-result");
const askTitle = document.querySelector("#ask-answer-heading");
const askAnswer = document.querySelector("#ask-answer");
const askSources = document.querySelector("#ask-sources");
const askRelated = document.querySelector("#ask-related");
const askRelatedQuestions = document.querySelector("#ask-related-questions");
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
    .normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const questionIndex = new Map();
const topicTerms = new Map();
for (const [id, record] of Object.entries(askEvidence)) {
  topicTerms.set(id, record.terms.map(normalizeQuestion));
  for (const language of ["ar", "en", "fr", "es"]) {
    const [answer, ...questions] = record[language];
    for (const question of questions) {
      questionIndex.set(normalizeQuestion(question), {
        answer, language, sources: record.sources, correction: record.correction
      });
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
  "ibn-baz": ["ابن باز", "بن باز"],
  "ibn-uthaymeen": ["ابن عثيمين", "بن عثيمين", "العثيمين"],
  unlisted: ["الفوزان", "اللحيدان", "الحيدان"]
};

function includesPhrase(key, phrase) {
  return (" " + key + " ").includes(" " + normalizeQuestion(phrase) + " ");
}

function relevantFatwas(key, authors) {
  const phrase = " " + key + " ";
  const authorOnly = authors.some(id => scholarNames[id].some(name =>
    [name, "الشيخ " + name, "فتاوى " + name].some(alias => normalizeQuestion(alias) === key)));
  return fatwaIndex.filter(({entry}) => !authors.length || authors.includes(entry.scholar))
    .map(({entry, terms, title}) => ({
    entry,
    score: key === title ? 1000 : authorOnly ? 1 : terms.reduce((total, term) => (
      total + (phrase.includes(" " + term + " ") ? term.split(" ").length ** 2 : 0)
    ), 0)
  })).filter(result => result.score > 0).sort((a, b) => b.score - a.score)
    .slice(0, 5).map(result => result.entry);
}

function showResult(status, title, sources, answer = "", language = "ar") {
  askStatus.textContent = status;
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

function showRelated(topics) {
  const questions = topics.map(({id}) => askEvidence[id]).filter(record => !record.correction)
    .slice(0, 3).map(record => record.ar[1]);
  for (const question of questions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button";
    button.textContent = question + "؟";
    button.addEventListener("click", () => {
      askInput.value = question + "؟";
      askForm.requestSubmit();
      askTitle.focus();
    });
    askRelatedQuestions.append(button);
  }
  askRelated.hidden = !questions.length;
}

function showNoAnswer(topics) {
  showResult("لم أجد جوابًا موثّقًا يطابق هذا السؤال.", "كيف تحدّد سؤالك؟", referencesForHelp,
    "حدّد المسألة التي تريد معرفة حكمها، مثل وقت العبادة أو طريقتها أو ما يؤثر في صحتها. وإذا كانت المسألة مرتبطة بظروفك الخاصة، فراجع جهة إفتاء للاطلاع على تفاصيلها.");
  showRelated(topics);
}

let modelWorker;
let modelReady = false;
let pendingTopics;
let timer;

function finishLookup() {
  clearTimeout(timer);
  pendingTopics = undefined;
  askButton.disabled = false;
}

function resetModel(message) {
  if (pendingTopics) showNoAnswer(pendingTopics);
  finishLookup();
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
        clearTimeout(timer);
        modelReady = true;
        modelStatus.textContent = "اقتراح المراجع بالذكاء الاصطناعي جاهز.";
      } else if (data.type === "topic" && pendingTopics) {
        const topics = pendingTopics;
        const source = topics.some(topic => topic.id === data.id) ? askEvidence[data.id] : null;
        finishLookup();
        if (source) {
          showResult("لم أجد جوابًا موثّقًا يطابق السؤال. قد تساعدك هذه المراجع.",
            source.title, source.sources);
          showRelated(topics);
        } else {
          showNoAnswer(topics);
        }
      } else if (data.type === "error") {
        resetModel(unavailable);
      }
    };
    timer = setTimeout(() => resetModel("استغرق تحميل النموذج وقتًا طويلًا. يمكنك إعادة المحاولة."), 300000);
    worker.postMessage({ type: "init" });
  } catch {
    resetModel(unavailable);
  } finally {
    clearTimeout(adapterTimer);
  }
});

askForm.addEventListener("submit", event => {
  event.preventDefault();
  if (pendingTopics) return;
  const question = askInput.value.trim();
  const key = normalizeQuestion(question);
  if (!key) {
    askResult.hidden = true;
    askStatus.textContent = "اكتب سؤالًا للبحث عن إجابة.";
    askInput.focus();
    return;
  }
  const exactFatwa = exactFatwas.get(key);
  if (exactFatwa) {
    showResult("مقتطف من فتوى " + fatwaScholars[exactFatwa.scholar], exactFatwa.title,
      [[exactFatwa.title + " · اقرأ الفتوى كاملة", exactFatwa.url]], exactFatwa.excerpt.text);
    return;
  }
  const match = questionIndex.get(key);
  if (match) {
    showResult("وجدت جوابًا موثّقًا يطابق السؤال.", match.correction ? "تصحيح موثّق" : "جواب موثّق",
      match.sources, match.answer, match.language);
    return;
  }

  const authors = Object.keys(scholarNames).filter(id => scholarNames[id].some(name => includesPhrase(key, name)));
  const topics = authors.length ? [] : relatedTopics(key);
  const references = relevantFatwas(key, authors);
  if (references.length) {
    showResult("وجدت فتاوى مرتبطة بموضوع السؤال.", "نتائج من مواقع العلماء",
      references.map(entry => [entry.title + " · " + sourceDescription(entry), entry.url]),
      "راجع السؤال والجواب كاملين في المصدر. إذا كانت مسألتك لها ظروف خاصة، فاسأل مختصًا يمكنه معرفة تفاصيلها.");
    askSources.classList.add("fatwa-results");
    showRelated(topics);
    return;
  }
  if (authors.length) {
    showResult("لم أجد فتوى مطابقة من العالم المذكور في الفهرس.", "المواقع الرسمية",
      referencesForHelp, "يمكنك تغيير صياغة السؤال أو مراجعة الجهات الرسمية.");
    return;
  }

  if (!modelReady || !topics.length) {
    showNoAnswer(topics);
    return;
  }

  pendingTopics = topics;
  askButton.disabled = true;
  askResult.hidden = true;
  askStatus.textContent = "جارٍ البحث عن مراجع قد تفيدك…";
  timer = setTimeout(() => resetModel("استغرق اقتراح المراجع وقتًا طويلًا. يمكنك إعادة المحاولة."), 90000);
  try {
    modelWorker.postMessage({ type: "ask", question, topics });
  } catch {
    resetModel("تعذّر اقتراح المراجع. يمكنك إعادة تشغيل النموذج.");
  }
});

askButton.disabled = false;
