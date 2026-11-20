import assert from "node:assert/strict";
import {test} from "node:test";
import worker, {AskBudget} from "./worker.mjs";
import {parseGroundedResponse, sourceHostsForQuestion} from "./evidence.mjs";

const origin = "https://kingali66767.github.io";
const baz = "https://binbaz.org.sa/fatwas/12763/";
const uthaymeen = "https://old.binothaimeen.net/content/8285";

function fixture({url = baz, text = "تبدأ مدة المسح من أول مسح بعد الحدث.", annotations} = {}) {
  return {
    status: "completed",
    output: [
      {type: "web_search_call", status: "completed", action: {sources: [{url}]}},
      {type: "message", role: "assistant", status: "completed", content: [{
        type: "output_text", text,
        annotations: annotations ?? [{type: "url_citation", url, title: "أصل الفتوى", start_index: 0, end_index: text.length}],
      }]},
    ],
  };
}

function ask(question, from = origin) {
  return new Request("https://some-worker.invalid/ask", {
    method: "POST", headers: {"Origin": from, "Content-Type": "application/json"},
    body: JSON.stringify({question}),
  });
}

function enabledEnv(reservationStatus = 204) {
  return {
    ALLOWED_ORIGINS: origin, OPENAI_ENABLED: "true", DAILY_REQUEST_LIMIT: "3",
    OPENAI_API_KEY: "test-only",
    ASK_BUDGET: {
      idFromName: name => name,
      get: () => ({fetch: async () => new Response(null, {status: reservationStatus})}),
    },
  };
}

test("accepts annotations from searched official fatwa pages only", () => {
  const answer = parseGroundedResponse(fixture());
  assert.equal(answer.kind, "answer");
  assert.equal(answer.sources[0].url, baz);
  assert.equal(parseGroundedResponse(fixture({url: uthaymeen})).kind, "answer");
  for (const url of ["https://example.com/fatwas/7", "http://binbaz.org.sa/fatwas/7",
      "https://binbaz.org.sa/fatwas/kind/1", "https://binbaz.org.sa/fatwas/7?next=https://test.invalid"]) {
    assert.equal(parseGroundedResponse(fixture({url})).kind, "unavailable");
  }
  assert.equal(parseGroundedResponse(fixture(), ["old.binothaimeen.net"]).kind, "unavailable");
  assert.equal(parseGroundedResponse(fixture({annotations: []})).kind, "unavailable");
  const line = "مدة المسح للمقيم يوم وليلة.";
  const uncited = fixture({text: line + "\nعمّم الحكم على وضعٍ خاص.", annotations: [
    {type:"url_citation", url:baz, start_index:0, end_index:line.length},
  ]});
  assert.equal(parseGroundedResponse(uncited).kind, "unavailable");
  assert.deepEqual(sourceHostsForQuestion("ما رأي ابن عثيمين في التيمم"), ["old.binothaimeen.net"]);
  assert.deepEqual(sourceHostsForQuestion("ما رأي صالح اللحيدان في المسح"), []);
});

test("removes inline links that match real citation annotations", () => {
  const phrase = "مدة المسح للمقيم يوم وليلة.";
  const inline = ` [فتوى ابن باز](${baz}?utm_source=chatgpt.com)`;
  const annotation = {type: "url_citation", url: baz, start_index: phrase.length, end_index: phrase.length + inline.length};
  const answer = parseGroundedResponse(fixture({text: phrase + inline, annotations: [annotation]}));
  assert.equal(answer.answer, phrase);
  const unverifiedLink = ` [موقع آخر](${uthaymeen})`;
  assert.equal(parseGroundedResponse(fixture({text: phrase + inline + unverifiedLink, annotations: [annotation]})).kind, "unavailable");
  assert.equal(parseGroundedResponse(fixture({text: phrase + inline, annotations: [
    {...annotation, start_index: 0, end_index: phrase.length},
  ]})).kind, "unavailable");
});

test("requires explicit activation and a successful quota reservation before any billable request", async t => {
  const provider = t.mock.method(globalThis, "fetch", async () => { throw new Error("unexpected provider request"); });
  const env = enabledEnv();
  const question = "كم مدة المسح؟";
  assert.equal((await worker.fetch(ask(question), {...env, OPENAI_ENABLED: "false"})).status, 503);
  assert.equal((await worker.fetch(ask(question), {...env, DAILY_REQUEST_LIMIT: "0"})).status, 503);
  assert.equal((await worker.fetch(ask(question), {...env, ASK_BUDGET: undefined})).status, 503);
  assert.equal((await worker.fetch(ask(question, "https://unlisted.invalid"), env)).status, 403);
  assert.equal((await worker.fetch(ask("س".repeat(600)), env)).status, 400);
  assert.equal((await worker.fetch(ask(question), enabledEnv(429))).status, 429);
  const unsourced = await worker.fetch(ask("ما فتوى صالح الفوزان في المسح؟"), env);
  assert.equal((await unsourced.json()).reason, "source_unavailable");
  assert.equal(provider.mock.callCount(), 0);
});

test("queries Responses with approved domains and sends bounded, private results", async t => {
  const provider = t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(init.headers.Authorization, "Bearer test-only");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.max_tool_calls, 2);
    assert.equal(body.input, "ما صفة التيمم عند ابن عثيمين؟");
    assert.deepEqual(body.tools[0].filters.allowed_domains, ["old.binothaimeen.net"]);
    return Response.json(fixture({url: uthaymeen}));
  });
  const response = await worker.fetch(ask("ما صفة التيمم عند ابن عثيمين؟"), enabledEnv());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal((await response.json()).sources[0].url, uthaymeen);
  assert.equal(provider.mock.callCount(), 1);
});

test("global budget denies requests beyond the configured quota", async () => {
  const values = new Map();
  const budget = new AskBudget({storage: {
    transaction: task => task({get: key => values.get(key), put: (key,value) => values.set(key,value)}),
  }});
  function reserve() {
    return budget.fetch(new Request("https://budget.invalid/reserve", {method: "POST", body: '{"limit":2}'}));
  }
  assert.equal((await reserve()).status, 204);
  assert.equal((await reserve()).status, 204);
  assert.equal((await reserve()).status, 429);
});
