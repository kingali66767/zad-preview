// The language model runs on the device. Only its runtime and weights are downloaded.
const runtime = "https://esm.run/@mlc-ai/web-llm@0.2.79";
const model = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
const instructions = [
  "You are Zad's educational assistant about Islam. Answer in the language of the question, using clear, concise plain text.",
  "Explain mainstream introductory Islamic teachings respectfully. Acknowledge recognized differences and uncertainty when relevant.",
  "Do not issue a personal fatwa. For case-specific religious rulings, advise consulting a qualified scholar.",
  "Do not invent scriptural quotes, hadith, source numbers, or URLs. Prefer paraphrasing. State when you cannot verify a claim.",
  "For unrelated questions, briefly explain that this assistant covers Islam."
].join(" ");

let engine;
self.onmessage = async ({ data }) => {
  try {
    if (data.type === "init") {
      const { CreateMLCEngine } = await import(runtime);
      engine = await CreateMLCEngine(model, {
        initProgressCallback: ({ progress }) => self.postMessage({ type: "progress", progress })
      }, { context_window_size: 2048 });
      self.postMessage({ type: "ready" });
      return;
    }

    const response = await engine.chat.completions.create({
      messages: [{ role: "system", content: instructions }, { role: "user", content: data.question }],
      max_tokens: 400,
      temperature: 0.3
    });
    const answer = response.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("Empty response");
    self.postMessage({ type: "answer", answer, truncated: response.choices[0].finish_reason === "length" });
  } catch (error) {
    self.postMessage({ type: "error", stage: data.type });
    console.error("Zad language model:", error);
  }
};
