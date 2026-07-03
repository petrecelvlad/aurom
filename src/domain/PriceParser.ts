/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": [
 *     "Centralizes Romanian price-string parsing; scrapers must not hand-roll comma/dot heuristics",
 *     "Assumes RON-formatted text (lei/ron markers, ambiguous dot/comma as decimal or thousands separator)",
 *     "Not for pre-structured numeric sources (JSON APIs) or non-Romanian formats (e.g. BCR's PDF thousands-comma-only figures)"
 *   ],
 *   "agent_instructions": "Parses raw scraped price text into a RON float, or null if unparseable. Use for any scraper reading price text out of HTML."
 * }
 */

export class PriceParser {
  static parseRonPrice(rawText: string): number | null {
    if (!rawText) return null;

    let cleaned = rawText
      .toLowerCase()
      .replace(/lei/g, '')
      .replace(/ron/g, '')
      .replace(/[^\d.,]/g, '')
      .trim();

    if (!cleaned) return null;

    if (cleaned.includes(',') && cleaned.includes('.')) {
      // '.' as thousands separator, ',' as decimal (e.g. "1.234,50")
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else if (cleaned.includes(',')) {
      // Decimal comma only (e.g. "550,50")
      cleaned = cleaned.replace(/,/g, '.');
    } else if (cleaned.includes('.')) {
      // Ambiguous dot: decimal if followed by exactly 2 digits, otherwise thousands separator
      const parts = cleaned.split('.');
      if (parts[parts.length - 1].length !== 2) {
        cleaned = cleaned.replace(/\./g, '');
      }
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parseFloat(parsed.toFixed(2));
  }
}
