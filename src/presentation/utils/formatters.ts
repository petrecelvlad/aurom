/**
 * @propolis
 * {
 *   "role": "UTIL",
 *   "constraints": ["Presentation-only formatting — no business logic or normalization"],
 *   "agent_instructions": "Pure display formatters for the product table. Normalization (weight, purity, price parsing) belongs in domain/, not here."
 * }
 */

export const formatPrice = (price: number | null): string => {
  return price !== null
    ? new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(price)) 
    : '-';
};
