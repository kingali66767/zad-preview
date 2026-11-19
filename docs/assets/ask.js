"use strict";

const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const askButton = document.querySelector("#ask-submit");
const askStatus = document.querySelector("#ask-status");
const askResult = document.querySelector("#ask-result");
const askTitle = document.querySelector("#ask-answer-heading");
const askAnswer = document.querySelector("#ask-answer");
const askSources = document.querySelector("#ask-sources");
const modelButton = document.querySelector("#ask-enable");
const modelStatus = document.querySelector("#ask-model-status");

const referencesForHelp = [
  ["فتاوى الشيخ ابن باز", "https://binbaz.org.sa/fatwas"],
  ["الإسلام سؤال وجواب", "https://islamqa.info/ar"],
  ["الموسوعة الحديثية", "https://dorar.net/hadith"]
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
      questionIndex.set(normalizeQuestion(question), {answer, language, sources: record.sources});
    }
  }
}

function showResult(status, title, sources, answer = "", language = "ar") {
  askStatus.textContent = status;
  askTitle.textContent = title;
  askAnswer.textContent = answer;
  askAnswer.hidden = !answer;
  askAnswer.lang = language;
  askSources.replaceChildren();
  for (const [label, url] of sources) {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = url;
    askSources.append(link);
  }
  askResult.hidden = false;
}

function showNoAnswer() {
  showResult("لم أجد جوابًا موثّقًا يطابق هذا السؤال.", "مراجع للرجوع إليها", referencesForHelp,
    "يمكنك إعادة صياغة السؤال. إذا كانت المسألة مرتبطة بظروفك الخاصة، فاسأل مختصًا يمكنه الاطلاع على التفاصيل.");
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
  if (pendingTopics) showNoAnswer();
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
        const source = pendingTopics.has(data.id) ? askEvidence[data.id] : null;
        finishLookup();
        if (source) {
          showResult("لم أجد جوابًا موثّقًا يطابق السؤال. قد تساعدك هذه المراجع.",
            source.title, source.sources);
        } else {
          showNoAnswer();
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
  const match = questionIndex.get(key);
  if (match) {
    showResult("وجدت جوابًا موثّقًا يطابق السؤال.", "جواب موثّق", match.sources, match.answer, match.language);
    return;
  }

  const words = " " + key + " ";
  const topics = [...topicTerms].filter(([, terms]) => terms.some(term => words.includes(" " + term + " ")))
    .map(([id]) => ({id, title: askEvidence[id].title}));
  if (!modelReady || !topics.length) {
    showNoAnswer();
    return;
  }

  pendingTopics = new Set(topics.map(topic => topic.id));
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
