import { z } from 'zod';

export const ProductSchema = z.object({
  provider: z.string(),
  sku: z.string(),
  name: z.string(),
  url: z.string(),
  weight_g: z.number().nullable(),
  stock_status: z.string(),
  buy_price_ron: z.number().nullable(),
  sell_price_ron: z.number().nullable(),
  sell_price_per_g_ron: z.number().nullable(),
  buy_price_per_g_ron: z.number().nullable(),
  metal: z.enum(['Gold', 'Silver', 'Platinum', 'Palladium']),
  purity: z.number().nullable().optional(),
  karats: z.number().nullable().optional(),
  fine_weight_g: z.number().nullable().optional(),
});

export type StandardizedProduct = z.infer<typeof ProductSchema>;

export function detectMetal(name: string, url: string = ''): 'Gold' | 'Silver' | 'Platinum' | 'Palladium' | null {
  const text = `${name} ${url}`.toLowerCase();

  // 1. Palladium (least common, check first to avoid partial matches)
  if (/\b(paladiu|palladium|pd)\b/i.test(text)) {
    return 'Palladium';
  }

  // 2. Platinum
  if (/\b(platina|platină|platinum|pt)\b/i.test(text)) {
    return 'Platinum';
  }

  // 3. Gold
  // Check for specific terms. We exclude things like "auriu" or "aurie" if they are just color/plated descriptors,
  // unless they are explicitly accompanied by "lingou" or "monedă" / "moneda" / "aur de 24k".
  // Let's check for whole-word 'aur' or 'gold' or 'au'.
  const hasGoldKeywords = /\b(aur|gold|au)\b/i.test(text) || 
                          text.includes('lingou de aur') || 
                          text.includes('monedă de aur') || 
                          text.includes('moneda de aur') || 
                          text.includes('lingouri de aur') || 
                          text.includes('monede de aur');

  // 4. Silver
  // Check for specific terms. Similar to gold, we want to match 'argint' or 'silver' or 'ag', excluding 'argintiu' / 'argintie'.
  const hasSilverKeywords = /\b(argint|silver|ag)\b/i.test(text) || 
                            text.includes('lingou de argint') || 
                            text.includes('monedă de argint') || 
                            text.includes('moneda de argint') || 
                            text.includes('lingouri de argint') || 
                            text.includes('monede de argint');

  if (hasGoldKeywords && hasSilverKeywords) {
    // If a product contains both, let's check for "suflat cu aur" or "aurit" which usually indicates a silver product
    if (text.includes('suflat cu aur') || text.includes('aurit') || text.includes('aurita')) {
      return 'Silver';
    }
    return 'Gold';
  }

  if (hasGoldKeywords) return 'Gold';
  if (hasSilverKeywords) return 'Silver';

  return null;
}
