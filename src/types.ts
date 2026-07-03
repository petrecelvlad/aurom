/**
 * @propolis
 * {
 *   "role": "MODEL",
 *   "constraints": ["Presentation-layer types only — core StandardizedProduct shape lives in domain/Product.ts"],
 *   "agent_instructions": "Re-exports StandardizedProduct and defines UI-only derived types (WeightTier, EnrichedProduct)."
 * }
 */

import { StandardizedProduct } from './domain/Product';

export type { StandardizedProduct };

export type WeightTier = 
  | 'all' 
  | 'under_2g' 
  | '2g_5g' 
  | '5g_10g' 
  | '10g_20g' 
  | '20g_50g' 
  | '50g_100g' 
  | 'over_100g';

export interface EnrichedProduct extends StandardizedProduct {
  markup_percentage: number | null;
}
