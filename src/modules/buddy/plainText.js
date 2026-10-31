// The advisor may answer with Markdown (headings, bold, lists, tables). Farm Buddy shows and reads
// plain sentences, so the marks are taken out and list items kept as their own lines.
export function plainText(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(^|\s)[*_]([^*_\n]+)[*_](?=\s|[.,;:!?]|$)/g, '$1$2')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Short pieces for the phone's voice: some phones stop reading a long text after about 15 seconds. */
export function speechChunks(text, max = 180) {
  const sentences = plainText(text).replace(/•\s*/g, '').split(/(?<=[.!?。])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const out = [];
  sentences.forEach((s) => {
    if (s.length <= max) { out.push(s); return; }
    let rest = s;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(' ', max);
      const at = cut > 40 ? cut : max;
      out.push(rest.slice(0, at));
      rest = rest.slice(at).trim();
    }
    if (rest) out.push(rest);
  });
  return out;
}
