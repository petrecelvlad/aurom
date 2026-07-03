import { useState, useEffect } from 'react';
import axios from 'axios';

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
        const response = await axios.get('/api/benchmark/gold');
        setBenchmark(response.data);
      } catch (err: any) {
        console.error('Error fetching benchmark:', err);
        setError(err.message || 'Error fetching benchmark');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBenchmark();
  }, []);

  return { benchmark, isLoading, error };
}
