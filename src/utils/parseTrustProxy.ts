/**
 * Resolve the `TRUST_PROXY` environment variable into Fastify's `trustProxy`.
 * @param value - the raw environment value
 * @returns an address, CIDR, list, hop count, or a boolean; false when unset
 */
export function parseTrustProxy(
  value: string | undefined,
): boolean | number | string {
  const text = value?.trim();
  if (!text || text === 'false') return false;
  if (text === 'true') return true;
  if (/^\d+$/.test(text)) return Number(text);
  return text;
}
