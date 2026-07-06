/**
 * @propolis
 * {
 *   "role": "SERVICE",
 *   "constraints": ["React custom hook", "Client-side data fetching"],
 *   "agent_instructions": "Fetches the live BNR gold benchmark rate and EUR/RON rate on mount, then silently every 15 minutes, from /api/benchmark/gold and /api/benchmark/eur. eurRate is used purely for the RON/EUR display toggle — if it's unavailable (404, e.g. before the first successful scrape tick), eurRate stays null and callers should fall back to RON-only display rather than blocking on it."
 * }
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../infrastructure/api/config';

export interface BenchmarkData {
  date: string;
  price: number;
  currency: string;
  source: string;
}

export function useBenchmark() {
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [eurRate, setEurRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBenchmark(silent: boolean) {
      try {
        if (!silent) setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/benchmark/gold`);
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
        if (!silent) setIsLoading(false);
      }
    }

    async function fetchEurRate() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/benchmark/eur`);
        if (!response.ok) {
          setEurRate(null);
          return;
        }
        const data = (await response.json()) as BenchmarkData;
        setEurRate(data.price);
      } catch (err) {
        console.error('Error fetching EUR rate:', err);
        setEurRate(null);
      }
    }

    fetchBenchmark(false);
    fetchEurRate();
    // Data is refreshed automatically server-side once a day (GitHub Actions -> D1).
    const interval = setInterval(() => {
      fetchBenchmark(true);
      fetchEurRate();
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { benchmark, eurRate, isLoading, error };
}
