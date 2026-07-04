/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": ["Workers-native fetch wrapper — no axios dependency"],
 *   "agent_instructions": "Every scraper uses fetchWithTimeout instead of calling fetch() directly, to get a consistent request timeout. Does not throw on non-2xx responses — check response.ok/status like native fetch. Scrapers making multiple sequential requests to the same domain (pagination, category loops) must call politeDelay() between them, skipping only the first request — this paces requests instead of firing them back-to-back."
 * }
 */

export async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 15000, ...rest } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/** Waits a random 1-3s. Call between sequential requests to the same site — never before the first one. */
export async function politeDelay(): Promise<void> {
  const ms = 1000 + Math.random() * 2000;
  await new Promise(resolve => setTimeout(resolve, ms));
}
