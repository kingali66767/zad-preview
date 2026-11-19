"use strict";

const askForm = document.querySelector("#ask-form");
const askInput = document.querySelector("#ask-input");
const askButton = document.querySelector("#ask-submit");
const askStatus = document.querySelector("#ask-status");
const askResult = document.querySelector("#ask-result");
const askAnswer = document.querySelector("#ask-answer");
const modelButton = document.querySelector("#ask-enable");
let modelWorker;
let timer;

function resetModel(message) {
  clearTimeout(timer);
  modelWorker?.terminate();
  modelWorker = undefined;
  modelButton.disabled = false;
  askButton.disabled = true;
  askStatus.textContent = message;
}

modelButton.addEventListener("click", async () => {
  if (location.protocol === "file:") {
    askStatus.textContent = "افتح الموقع عبر HTTPS أو خادم المعاينة المحلي لتشغيل النموذج.";
    return;
  }
  if (!navigator.gpu) {
    askStatus.textContent = "توليد الإجابات يتطلب متصفحًا وجهازًا يدعمان WebGPU. جرّب متصفحًا حديثًا على جهاز متوافق.";
    return;
  }

  modelButton.disabled = true;
  askStatus.textContent = "جارٍ التحقق من توافق جهازك…";
  const unavailable = "تعذّر تشغيل النموذج. تحقّق من الاتصال ودعم WebGPU، ثم حاول مرة أخرى.";
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
      resetModel("يحتاج هذا النموذج إلى جهاز يدعم WebGPU ودقة ١٦ بت. جرّب متصفحًا أو جهازًا متوافقًا.");
      return;
    }
    askStatus.textContent = "جارٍ تحميل نموذج الذكاء الاصطناعي…";
    const worker = new Worker(document.querySelector("#ask-script").dataset.worker, { type: "module" });
    modelWorker = worker;
    worker.onerror = () => {
      if (modelWorker === worker) resetModel(unavailable);
    };
    worker.onmessage = ({ data }) => {
      if (modelWorker !== worker) return;
      if (data.type === "progress") {
        const percent = Math.round(100 * Math.min(1, Math.max(0, data.progress || 0)));
        askStatus.textContent = "جارٍ تحميل النموذج وإعداده… " + percent + "٪";
        return;
      }
      clearTimeout(timer);
      if (data.type === "ready") {
        askButton.disabled = false;
        askStatus.textContent = "النموذج جاهز. اكتب سؤالك للحصول على إجابة.";
      } else if (data.type === "answer") {
        askAnswer.textContent = data.answer;
        askResult.hidden = false;
        askButton.disabled = false;
        askStatus.textContent = data.truncated ? "بلغت الإجابة الحد الأقصى للطول. اسأل عن نقطة محددة لمزيد من التفصيل." : "تم توليد الإجابة.";
      } else if (data.type === "error") {
        const message = data.stage === "init" ? unavailable : "تعذّر توليد الإجابة. شغّل النموذج مجددًا وحاول طرح سؤال أقصر.";
        resetModel(message);
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
  const question = askInput.value.trim();
  if (!modelWorker || askButton.disabled) return;
  if (!question) {
    askStatus.textContent = "اكتب سؤالًا للحصول على إجابة.";
    askInput.focus();
    return;
  }
  askButton.disabled = true;
  askResult.hidden = true;
  askAnswer.textContent = "";
  askStatus.textContent = "جارٍ توليد الإجابة على جهازك…";
  timer = setTimeout(() => resetModel("استغرق توليد الإجابة وقتًا طويلًا. شغّل النموذج مجددًا وحاول طرح سؤال أقصر."), 90000);
  modelWorker.postMessage({ type: "ask", question });
});
