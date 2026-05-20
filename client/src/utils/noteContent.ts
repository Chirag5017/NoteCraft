/**
 * True when HTML has no meaningful text (empty doc, placeholder paragraph, etc.).
 * Used to block accidental empty broadcasts on editor mount / file open.
 */
export function isBlankHtml(html: string | undefined | null): boolean {
  if (!html) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return text.length === 0;
}
