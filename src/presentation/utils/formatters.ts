/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": ["Presentation-only formatting — no business logic or normalization"],
 *   "agent_instructions": "Pure display formatters for the product table. Normalization (weight, purity, price parsing) belongs in domain/, not here. toDisplayPrice is the only place RON-to-EUR display conversion happens — it never mutates or persists anything, it's purely what gets rendered."
 * }
 */

export type DisplayCurrency = 'RON' | 'EUR';

/**
 * Converts a RON figure (as stored/computed everywhere else in the app) into whichever
 * currency the user has toggled to. Returns null if EUR was requested but no rate is
 * available yet, rather than silently showing a RON number under a EUR label.
 */
export const toDisplayPrice = (
  priceRon: number | null,
  currency: DisplayCurrency,
  eurToRonRate: number | null
): number | null => {
  if (priceRon === null) return null;
  if (currency === 'RON') return priceRon;
  if (eurToRonRate === null || eurToRonRate === 0) return null;
  return priceRon / eurToRonRate;
};

export const formatPrice = (price: number | null, currency: DisplayCurrency = 'RON'): string => {
  if (price === null) return '-';
  const fractionDigits = currency === 'EUR' ? 2 : 0;
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(currency === 'EUR' ? price : Math.round(price));
};
