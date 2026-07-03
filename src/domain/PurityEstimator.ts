/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": [
 *     "Purity calculations are centralized here and must not be overridden in scrapers",
 *     "Maintains exact fine gold weight constants for historical/bullion coins (Sovereign, Krugerrand, Eagle, Vreneli, etc.) to prevent dealer rounding differences"
 *   ],
 *   "agent_instructions": "This class provides purity estimation and fine weight extraction for physical bullion coins and bars. Do not bypass or override its output."
 * }
 */

export interface PurityInfo {
  purity: number;        // scale of 0 to 1, e.g. 0.9167 for 22k
  karats: number | null; // e.g. 22
  fineWeightG: number | null;
}

export class PurityEstimator {
  private static readonly OZ_TO_G = 31.1034768;

  public static estimate(
    name: string,
    weightG: number | null,
    metal: 'Gold' | 'Silver' | 'Platinum' | 'Palladium'
  ): PurityInfo {
    const nameLower = name.toLowerCase();

    // Default values
    let purity = 1.0;
    let karats: number | null = null;
    let fineWeightG: number | null = weightG;

    if (metal !== 'Gold') {
      // Silver, Platinum, Palladium are usually 99.9% or higher purity
      if (metal === 'Silver') {
        purity = 0.999;
      } else {
        purity = 0.9995;
      }
      return { purity, karats, fineWeightG };
    }

    // --- GOLD PURITY & FINE WEIGHT ESTIMATION ---
    
    // 1. Detect explicit karats/purity in name
    if (nameLower.includes('24k') || nameLower.includes('24kt') || nameLower.includes('24ct') || nameLower.includes('999') || nameLower.includes('99.9') || nameLower.includes('99,9')) {
      purity = 0.9999;
      karats = 24;
    } else if (nameLower.includes('22k') || nameLower.includes('22kt') || nameLower.includes('22ct') || nameLower.includes('916') || nameLower.includes('91.6') || nameLower.includes('91,6')) {
      purity = 0.9167;
      karats = 22;
    } else if (nameLower.includes('18k') || nameLower.includes('18kt') || nameLower.includes('18ct') || nameLower.includes('750') || nameLower.includes('75%')) {
      purity = 0.750;
      karats = 18;
    } else if (nameLower.includes('14k') || nameLower.includes('14kt') || nameLower.includes('14ct') || nameLower.includes('585') || nameLower.includes('58.5') || nameLower.includes('58,5')) {
      purity = 0.585;
      karats = 14;
    } else if (nameLower.includes('9k') || nameLower.includes('9kt') || nameLower.includes('9ct') || nameLower.includes('375')) {
      purity = 0.375;
      karats = 9;
    }

    // 2. Standard coins detection (override or refine purity and fine weight)
    const isKrugerrand = nameLower.includes('krugerrand');
    const isEagle = nameLower.includes('eagle') || nameLower.includes('vultur american') || nameLower.includes('vulturul american');
    const isSovereign = nameLower.includes('sovereign') || nameLower.includes('suveran');
    const isDucat = nameLower.includes('ducat');
    const isVreneli = nameLower.includes('vreneli') || nameLower.includes('helvetia');
    const isChervonetz = nameLower.includes('chervonetz') || nameLower.includes('cervonet');
    const isCorona = nameLower.includes('corona') || nameLower.includes('coroana') || nameLower.includes('coroane');

    if (isKrugerrand || isEagle) {
      purity = 0.9167;
      karats = 22;
      if (weightG !== null) {
        if (weightG >= 32.5 && weightG <= 34.5) {
          fineWeightG = 31.103; // 1 oz fine gold
        } else if (weightG >= 16.0 && weightG <= 17.5) {
          fineWeightG = 15.552; // 1/2 oz fine gold
        } else if (weightG >= 8.0 && weightG <= 9.0) {
          fineWeightG = 7.776;  // 1/4 oz fine gold
        } else if (weightG >= 3.2 && weightG <= 3.6) {
          fineWeightG = 3.110;  // 1/10 oz fine gold
        } else {
          // If the weight is already set to fine weight, keep it, otherwise adjust
          const devFrom1oz = Math.abs(weightG - 31.103);
          const devFromHalfoz = Math.abs(weightG - 15.552);
          const devFromQuarteroz = Math.abs(weightG - 7.776);
          const devFromTenthoz = Math.abs(weightG - 3.110);
          
          if (devFrom1oz < 0.2 || devFromHalfoz < 0.1 || devFromQuarteroz < 0.1 || devFromTenthoz < 0.05) {
            fineWeightG = weightG;
          } else {
            fineWeightG = parseFloat((weightG * 0.9167).toFixed(3));
          }
        }
      }
    } else if (isSovereign) {
      purity = 0.9167;
      karats = 22;
      if (weightG !== null) {
        if (weightG >= 7.8 && weightG <= 8.1) {
          fineWeightG = 7.322; // Sovereign fine gold content
        } else if (weightG >= 3.8 && weightG <= 4.1) {
          fineWeightG = 3.661; // Half Sovereign fine gold content
        } else if (Math.abs(weightG - 7.322) < 0.1 || Math.abs(weightG - 3.661) < 0.05) {
          fineWeightG = weightG;
        } else {
          fineWeightG = parseFloat((weightG * 0.9167).toFixed(3));
        }
      }
    } else if (isDucat) {
      purity = 0.986;
      karats = 23.68; // 23.68k
      if (weightG !== null) {
        if (weightG >= 3.4 && weightG <= 3.6) {
          fineWeightG = 3.442; // 1 Ducat fine gold
        } else if (weightG >= 13.7 && weightG <= 14.2) {
          fineWeightG = 13.77; // 4 Ducats fine gold
        } else if (Math.abs(weightG - 3.442) < 0.05 || Math.abs(weightG - 13.77) < 0.1) {
          fineWeightG = weightG;
        } else {
          fineWeightG = parseFloat((weightG * 0.986).toFixed(3));
        }
      }
    } else if (isVreneli) {
      purity = 0.900;
      karats = 21.6;
      if (weightG !== null) {
        if (weightG >= 6.3 && weightG <= 6.6) {
          fineWeightG = 5.805; // 20 Francs fine gold
        } else if (Math.abs(weightG - 5.805) < 0.05) {
          fineWeightG = weightG;
        } else {
          fineWeightG = parseFloat((weightG * 0.900).toFixed(3));
        }
      }
    } else if (isChervonetz) {
      purity = 0.900;
      karats = 21.6;
      if (weightG !== null) {
        if (weightG >= 8.5 && weightG <= 8.7) {
          fineWeightG = 7.742; // 10 Roubles fine gold
        } else if (Math.abs(weightG - 7.742) < 0.05) {
          fineWeightG = weightG;
        } else {
          fineWeightG = parseFloat((weightG * 0.900).toFixed(3));
        }
      }
    } else if (isCorona) {
      purity = 0.900;
      karats = 21.6;
      if (weightG !== null) {
        if (weightG >= 33.5 && weightG <= 34.1) {
          fineWeightG = 30.48; // 100 Coroane fine gold
        } else if (weightG >= 6.7 && weightG <= 6.8) {
          fineWeightG = 6.097; // 20 Coroane fine gold
        } else if (weightG >= 3.3 && weightG <= 3.4) {
          fineWeightG = 3.048; // 10 Coroane fine gold
        } else if (Math.abs(weightG - 30.48) < 0.1 || Math.abs(weightG - 6.097) < 0.05 || Math.abs(weightG - 3.048) < 0.05) {
          fineWeightG = weightG;
        } else {
          fineWeightG = parseFloat((weightG * 0.900).toFixed(3));
        }
      }
    } else {
      // If we detected a karat/purity explicitly above, but it's not a named coin
      if (weightG !== null && purity !== 1.0) {
        fineWeightG = parseFloat((weightG * purity).toFixed(3));
      }
    }

    if (metal === 'Gold' && karats === null) {
      if (purity >= 0.99) {
        karats = 24;
      }
    }

    return {
      purity,
      karats,
      fineWeightG
    };
  }
}
