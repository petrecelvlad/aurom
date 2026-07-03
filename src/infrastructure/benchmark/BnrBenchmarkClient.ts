/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": ["Sources the live gold rate from BNR's public FX XML feed"],
 *   "agent_instructions": "Called once per cron tick from the scheduled handler. Returns null (not a throw) on failure so a single BNR outage doesn't abort the product scrape in the same tick."
 * }
 */

import { BenchmarkRate } from '../../domain/IBenchmarkRepository';
import { fetchWithTimeout } from '../scrapers/httpClient';

const BNR_URL = 'https://www.bnr.ro/nbrfxrates.xml';

export async function fetchBnrGoldRate(): Promise<BenchmarkRate | null> {
  try {
    const response = await fetchWithTimeout(BNR_URL, { timeoutMs: 10000 });
    if (!response.ok) {
      console.error(`Error fetching BNR benchmark: HTTP ${response.status}`);
      return null;
    }

    const xml = await response.text();
    const dateMatch = xml.match(/<Cube date="([^"]+)">/);
    const rateMatch = xml.match(/<Rate currency="XAU">([\d.]+)<\/Rate>/);

    if (!rateMatch) {
      console.error('Gold rate not found in BNR XML');
      return null;
    }

    return {
      source: 'BNR',
      metal: 'Gold',
      date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      price: parseFloat(rateMatch[1]),
      currency: 'RON',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching BNR benchmark:', message);
    return null;
  }
}
