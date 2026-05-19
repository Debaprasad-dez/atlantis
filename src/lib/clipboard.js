/**
 * Clipboard helpers. Wraps the async Clipboard API with a textarea fallback for
 * older browsers and jsdom (where navigator.clipboard is absent).
 */

/**
 * Write a plain-text string to the clipboard. Returns true on success.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  if (typeof document === 'undefined') return false;
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  ta.remove();
  return ok;
}
