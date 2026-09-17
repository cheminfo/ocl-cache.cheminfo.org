/**
 * Insert the audience-measurement snippet at the end of the page's `<head>`.
 *
 * The snippet is operator input and is taken verbatim; an unset or blank value
 * leaves the page untouched, so a deployment that measures nothing serves
 * exactly the page that was built.
 * @param html - The page to inject into.
 * @param snippet - The analytics snippet, from TRACKING_SCRIPT.
 * @returns The page, with the snippet inserted at most once.
 */
export function injectTrackingScript(html: string, snippet?: string): string {
  const script = snippet?.trim();
  if (!script || html.includes(script)) return html;
  const head = html.lastIndexOf('</head>');
  if (head === -1) return `${html}\n${script}\n`;
  return `${html.slice(0, head)}${script}\n${html.slice(head)}`;
}
