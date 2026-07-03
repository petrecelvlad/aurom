/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": ["Workers-native fetch wrapper — no axios dependency"],
 *   "agent_instructions": "Every scraper uses this instead of calling fetch() directly, to get a consistent request timeout. Does not throw on non-2xx responses — check response.ok/status like native fetch."
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
