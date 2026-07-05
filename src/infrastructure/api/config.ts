/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": ["Every client-side fetch to the Worker's /api/* routes must be prefixed with this constant"],
 *   "agent_instructions": "Empty string (the default) preserves same-origin relative fetches for the Cloudflare deployment, where the Worker serves both the SPA and the API. Only the GitHub Pages build sets VITE_API_BASE_URL, since that static mirror has no backend of its own and must call the Worker cross-origin."
 * }
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
