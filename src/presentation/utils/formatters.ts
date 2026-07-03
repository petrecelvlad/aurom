export const formatPrice = (price: number | null): string => {
  return price !== null
    ? new Intl.NumberFormat('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(price)) 
    : '-';
};
