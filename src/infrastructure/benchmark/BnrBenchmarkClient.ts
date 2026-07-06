/**
 * @propolis
 * {
 *   "role": "ADAPTER",
 *   "constraints": [
 *     "Sources the live gold and EUR/RON rates from BNR's public FX XML feed — one fetch, both rates parsed from the same response",
 *     "BenchmarkRate's `metal` field is reused for the EUR entry (value 'EUR') rather than adding a new type, since the RON conversion pipeline this feeds is still being designed",
 *     "Gold and EUR rates use distinct `source` values ('BNR' and 'BNR_EUR') because the D1 benchmark table's primary key is `source` alone — sharing one would silently overwrite the other on upsert",
 *     "gbp/usd are parsed from the same feed but not persisted as benchmark rows — they only exist to convert StoneX Bullion prices (whichever currency its geo-IP-based storefront happens to show) to RON, not to be displayed as their own benchmark"
 *   ],
 *   "agent_instructions": "Called once per cron tick from the scheduled handler. Returns null per-rate (not a throw) on failure so a single BNR outage, or one rate missing from the feed, doesn't abort the product scrape in the same tick. fetchBnrGoldRate() is a thin wrapper over fetchBnrRates() kept for the existing caller — prefer fetchBnrRates() for any new caller that needs the EUR/GBP/USD rates too, to avoid a second fetch to the same URL."
 * }
 */

import { BenchmarkRate } from '../../domain/IBenchmarkRepository';
import { fetchWithTimeout } from '../scrapers/httpClient';

const BNR_URL = 'https://www.bnr.ro/nbrfxrates.xml';

export interface BnrRates {
  gold: BenchmarkRate | null;
  eur: BenchmarkRate | null;
  gbp: BenchmarkRate | null;
  usd: BenchmarkRate | null;
}

export async function fetchBnrRates(): Promise<BnrRates> {
  try {
    const response = await fetchWithTimeout(BNR_URL, { timeoutMs: 10000 });
    if (!response.ok) {
      console.error(`Error fetching BNR benchmark: HTTP ${response.status}`);
      return { gold: null, eur: null, gbp: null, usd: null };
    }

    const xml = await response.text();
    const dateMatch = xml.match(/<Cube date="([^"]+)">/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    const goldRateMatch = xml.match(/<Rate currency="XAU">([\d.]+)<\/Rate>/);
    const eurRateMatch = xml.match(/<Rate currency="EUR">([\d.]+)<\/Rate>/);
    const gbpRateMatch = xml.match(/<Rate currency="GBP">([\d.]+)<\/Rate>/);
    const usdRateMatch = xml.match(/<Rate currency="USD">([\d.]+)<\/Rate>/);

    if (!goldRateMatch) console.error('Gold rate not found in BNR XML');
    if (!eurRateMatch) console.error('EUR rate not found in BNR XML');
    if (!gbpRateMatch) console.error('GBP rate not found in BNR XML');
    if (!usdRateMatch) console.error('USD rate not found in BNR XML');

    return {
      gold: goldRateMatch
        ? { source: 'BNR', metal: 'Gold', date, price: parseFloat(goldRateMatch[1]), currency: 'RON' }
        : null,
      eur: eurRateMatch
        ? { source: 'BNR_EUR', metal: 'EUR', date, price: parseFloat(eurRateMatch[1]), currency: 'RON' }
        : null,
      gbp: gbpRateMatch
        ? { source: 'BNR_GBP', metal: 'GBP', date, price: parseFloat(gbpRateMatch[1]), currency: 'RON' }
        : null,
      usd: usdRateMatch
        ? { source: 'BNR_USD', metal: 'USD', date, price: parseFloat(usdRateMatch[1]), currency: 'RON' }
        : null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching BNR benchmark:', message);
    return { gold: null, eur: null, gbp: null, usd: null };
  }
}

export async function fetchBnrGoldRate(): Promise<BenchmarkRate | null> {
  return (await fetchBnrRates()).gold;
}
