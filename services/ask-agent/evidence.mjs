const authorities = {
  "binbaz.org.sa": {
    label: "الموقع الرسمي للشيخ ابن باز",
    path: /^\/fatwas\/\d+(?:\/[^/]+)?\/?$/,
  },
  "old.binothaimeen.net": {
    label: "الأرشيف الرسمي للشيخ ابن عثيمين",
    path: /^\/content\/\d+\/?$/,
  },
};
export const officialSourceHosts = Object.keys(authorities);

const scholars = [
  {names: ["ابن باز", "بن باز", "ibn baz", "bin baz"], hosts: ["binbaz.org.sa"]},
  {names: ["ابن عثيمين", "بن عثيمين", "العثيمين", "ibn uthaymeen", "ibn uthaymin"], hosts: ["old.binothaimeen.net"]},
  {names: ["الفوزان", "al fawzan", "alfawzan"], hosts: []},
  {names: ["اللحيدان", "الحيدان", "al luhaydan", "al lohaidan"], hosts: []},
  {names: ["اللجنه الدائمه", "الرئاسه العامه للبحوث العلميه والافتاء"], hosts: []},
];

export function sourceHostsForQuestion(question) {
  const normalized = " " + question.toLowerCase().replace(/ـ/g, "").replace(/ة/g, "ه")
    .normalize("NFKD").replace(/\p{M}/gu, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim() + " ";
  const named = scholars.filter(scholar => scholar.names.some(name => normalized.includes(" " + name + " ")));
  if (!named.length) return officialSourceHosts;
  // Keep attribution unambiguous if a particular scholar was requested.
  return named.length === 1 ? named[0].hosts : [];
}

function sourceFrom(urlValue, domains) {
  if (typeof urlValue !== "string" || urlValue.length > 1800) return;
  try {
    const url = new URL(urlValue);
    const authority = authorities[url.hostname];
    if (!authority || !domains.includes(url.hostname) || url.protocol !== "https:" ||
        url.username || url.password || url.port || !authority.path.test(url.pathname)) return;

    if ([...url.searchParams.keys()].some(key => !key.startsWith("utm_"))) return;

    url.search = "";
    url.hash = "";
    return {label: authority.label, url: url.href};
  } catch {
    return;
  }
}

function notGrounded() {
  return {kind: "unavailable", reason: "no_approved_source"};
}

export function parseGroundedResponse(response, domains = officialSourceHosts) {
  if (response?.status !== "completed" || !Array.isArray(response.output)) return notGrounded();
  const searches = response.output.filter(part => part.type === "web_search_call" && part.status === "completed");
  const message = response.output.filter(part => part.type === "message" && part.role === "assistant" && part.status === "completed");
  if (!searches.length || message.length !== 1 || message[0].content?.length !== 1) return notGrounded();
  const content = message[0].content[0];
  const text = content?.text;
  if (content?.type !== "output_text" || typeof text !== "string" || !text.trim() ||
      text.length > 2500 || /[<>]|\bUNSUPPORTED\b/.test(text) ||
      !Array.isArray(content.annotations)) return notGrounded();

  const toolSources = searches.flatMap(search => Array.isArray(search.action?.sources) ? search.action.sources : []);
  const checkedUrls = new Set(toolSources.map(source => sourceFrom(source?.url, domains)?.url).filter(Boolean));
  const citations = content.annotations.filter(c => c?.type === "url_citation").map(annotation => {
    const source = sourceFrom(annotation.url, domains);
    const start = annotation.start_index;
    const end = annotation.end_index;
    if (!source || !Number.isInteger(start) || !Number.isInteger(end) ||
        start < 0 || end <= start || end > text.length ||
        (toolSources.length && !checkedUrls.has(source.url))) return null;
    const title = typeof annotation.title === "string" ? annotation.title.trim().replace(/\s+/g, " ").slice(0, 150) : "";
    return {
      start, end,
      source: {...source, label: title ? source.label + " · " + title : source.label},
    };
  });
  if (!citations.length || citations.some(citation => citation === null)) return notGrounded();

  const lines = [...text.matchAll(/[^\r\n]+/g)].filter(line => line[0].trim());
  if (!lines.length || lines.length > 4) return notGrounded();
  const sources = new Map();
  const answer = [];
  for (const line of lines) {
    const start = line.index;
    const end = start + line[0].length;
    const relevant = citations.filter(citation => citation.start >= start && citation.end <= end);
    if (!relevant.length) return notGrounded();

    // Inline links may duplicate citation annotations. Render their validated URLs separately.
    const cleanLine = line[0].replace(/\[[^\]\r\n]{1,200}\]\((https:\/\/[^\s)]+)\)/g, (link, url, offset) => {
      const source = sourceFrom(url, domains);
      const linkStart = start + offset;
      const linkEnd = linkStart + link.length;
      return relevant.some(citation => citation.source.url === source?.url &&
        citation.start < linkEnd && citation.end > linkStart) ? "" : link;
    }).trim();
    if (!cleanLine || /https?:\/\/|www\.|\]\(/i.test(cleanLine)) return notGrounded();

    answer.push(cleanLine);
    for (const citation of relevant) sources.set(citation.source.url, citation.source);
  }
  if (!sources.size || sources.size > 12) return notGrounded();
  return {kind: "answer", answer: answer.join("\n"), sources: [...sources.values()]};
}
