/**
 * @propolis
 * {
 *   "role": "SERVICE",
 *   "constraints": ["React custom hook", "Client-side data fetching"],
 *   "agent_instructions": "Fetches the live BNR gold benchmark rate once on mount from /api/benchmark/gold."
 * }
 */

import { useState, useEffect } from 'react';

export interface BenchmarkData {
  date: string;
  price: number;
  currency: string;
  source: string;
}

export function useBenchmark() {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmark() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/benchmark/gold');
        if (!response.ok) {
          throw new Error(`Failed to fetch benchmark: HTTP ${response.status}`);
        }
        const data = (await response.json()) as BenchmarkData;
        setBenchmark(data);
      } catch (err) {
        console.error('Error fetching benchmark:', err);
        const message = err instanceof Error ? err.message : 'Error fetching benchmark';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBenchmark();
  }, []);

  return { benchmark, isLoading, error };
}
