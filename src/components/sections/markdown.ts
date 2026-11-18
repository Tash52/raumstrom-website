// Minimal Markdown for short texts from the content collections (pages.abschnitte[].text, faq.antwort).
// Supports paragraphs, "- " lists, "1. " lists, **bold**, *italic*, [text](https://…) and /internal links.
// Everything else is escaped as text. No raw HTML, so content can never inject markup.
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function inline(text: string): string {
  return esc(text)
    .replace(/\[([^\]]+)\]\(((?:https:\/\/|\/)[^\s)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(„])\*([^*\s][^*]*)\*(?=[\s).,;:!?“]|$)/g, '$1<em>$2</em>');
}

export function markdownZuHtml(md: string): string {
  const out: string[] = [];
  for (const block of md.trim().split(/\n{2,}/)) {
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`);
    } else if (lines.every((l) => /^\s*\d+\. /.test(l))) {
      out.push(`<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+\. /, ''))}</li>`).join('')}</ol>`);
    } else {
      out.push(`<p>${inline(lines.join(' '))}</p>`);
    }
  }
  return out.join('');
}

/** Rendered HTML of a collection entry without HTML comments (internal source/check notes stay out of the page). */
export const ohneKommentare = (html: string) => html.replace(/<!--[\s\S]*?-->/g, '');
