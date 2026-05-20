'use strict';

/** @param {string|null|undefined} html */
function isBlankHtml(html) {
  if (!html) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();
  return text.length === 0;
}

module.exports = { isBlankHtml };
