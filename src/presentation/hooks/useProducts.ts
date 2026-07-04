/**
 * @propolis
 * {
 *   "role": "SERVICE",
 *   "constraints": ["React custom hook", "Client-side data fetching"],
 *   "agent_instructions": "Provides state management for fetching standardized product lists and tracking sync timestamps."
 * }
 */

import { useState } from 'react';
import { StandardizedProduct } from '../../types';
import { ProductClient } from '../../infrastructure/api/ProductClient';

export function useProducts() {
  const [products, setProducts] = useState<StandardizedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const fetchProducts = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const client = new ProductClient();
      const data = await client.fetchAllProducts();
      setProducts(data);
      setHasSynced(true);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error('Error fetching data:', err);
      const message = err instanceof Error ? err.message : 'A apărut o eroare necunoscută la preluarea datelor.';
      setError(message);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  return {
    products,
    isLoading,
    error,
    hasSynced,
    lastSyncedAt,
    fetchProducts
  };
}

