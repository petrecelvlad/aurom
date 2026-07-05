/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": [
 *     "Supports multi-pack count parsing (e.g. 5 x 1g, 10x 1 oz)",
 *     "OZ_TO_G constant must be strictly 31.1034768 to maintain Troy ounce precision"
 *   ],
 *   "agent_instructions": "This class provides parsing and conversion utilities to extract physical weight in grams from product names. Avoid modifying standard regex patterns unless new dealer website titles contain unsupported naming combinations."
 * }
 */

export class WeightConverter {
  private static readonly OZ_TO_G = 31.1034768;
  private static readonly KG_TO_G = 1000.0;

  static extractWeightInGrams(productName: string): number | null {
    const nameLower = productName.toLowerCase();
    
    // Check for multiplier e.g. "5 x 1g" or "10x 1 oz"
    const multiMatchG = nameLower.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|grame)\b/);
    if (multiMatchG) {
      const count = parseInt(multiMatchG[1]);
      const weight = parseFloat(multiMatchG[2].replace(',', '.'));
      return parseFloat((count * weight).toFixed(3));
    }
    
    const multiMatchOz = nameLower.match(/(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(?:oz|uncie|uncii|ounce|ounces)\b/);
    if (multiMatchOz) {
      const count = parseInt(multiMatchOz[1]);
      const weight = parseFloat(multiMatchOz[2].replace(',', '.'));
      return parseFloat((count * weight * this.OZ_TO_G).toFixed(3));
    }
    
    const multiMatchOzFraction = nameLower.match(/(\d+)\s*x\s*(1\/\d+)\s*(?:oz|uncie|uncii|ounce|ounces)\b/);
    if (multiMatchOzFraction) {
      const count = parseInt(multiMatchOzFraction[1]);
      const parts = multiMatchOzFraction[2].split('/');
      const fraction = parseFloat(parts[0]) / parseFloat(parts[1]);
      return parseFloat((count * fraction * this.OZ_TO_G).toFixed(3));
    }

    // Check for grams first
    const gMatch = nameLower.match(/(?:^|\s|-)(\d+(?:[.,]\d+)?)\s*(?:g|gr|gram|grame)\b/);
    if (gMatch) {
      return parseFloat(parseFloat(gMatch[1].replace(',', '.')).toFixed(3));
    }
    
    // Check for fractions of oz
    const ozFractionMatch = nameLower.match(/(1\/\d+)\s*(?:oz|uncie|uncii|ounce|ounces)\b/);
    if (ozFractionMatch) {
      const parts = ozFractionMatch[1].split('/');
      const fraction = parseFloat(parts[0]) / parseFloat(parts[1]);
      return parseFloat((fraction * this.OZ_TO_G).toFixed(3));
    }

    // Check for Troy Ounces (oz)
    const ozMatch = nameLower.match(/(?<!\/)(\d+(?:[.,]\d+)?)\s*(?:oz|uncie|uncii|ounce|ounces)\b/);
    if (ozMatch) {
      return parseFloat((parseFloat(ozMatch[1].replace(',', '.')) * this.OZ_TO_G).toFixed(3));
    }
    
    // Check for Kilograms (kg, or "Kilo" as used by Münze Österreich bar names)
    const kgMatch = nameLower.match(/(?<!\/)(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogram)\b/);
    if (kgMatch) {
      return parseFloat((parseFloat(kgMatch[1].replace(',', '.')) * this.KG_TO_G).toFixed(3));
    }
    
    return null;
  }

  static convertOzToG(oz: number): number {
    return parseFloat((oz * this.OZ_TO_G).toFixed(3));
  }

  static convertKgToG(kg: number): number {
    return parseFloat((kg * this.KG_TO_G).toFixed(3));
  }
}
