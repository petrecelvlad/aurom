/**
 * @propolis
 * {
 *   "role": "ENTRY_POINT",
 *   "constraints": ["Main layout controller", "Strict height bounds to avoid window scrollbars", "Full-bleed dashboard"],
 *   "agent_instructions": "Coordinates the main Three-Bar dashboard view. Integrates state management hooks and maps raw scraped products into pure domain markup metrics relative to the BNR spot price."
 * }
 */

import React, { useState, useMemo } from 'react';
import { useProducts } from './presentation/hooks/useProducts';
import { useBenchmark } from './presentation/hooks/useBenchmark';
import { ProductTable, SortConfig } from './presentation/components/ProductTable';
import { Toolbar, FilterOption } from './presentation/components/Toolbar';
import { StandardizedProduct, EnrichedProduct, WeightTier } from './types';

type MetalType = 'Gold' | 'Silver' | 'Platinum' | 'Palladium';

const matchWeightTier = (weight: number | null, tier: WeightTier): boolean => {
  if (tier === 'all') return true;
  if (weight === null) return false;
  switch (tier) {
    case 'under_2g': return weight < 2;
    case '2g_5g': return weight >= 2 && weight < 5;
    case '5g_10g': return weight >= 5 && weight < 10;
    case '10g_20g': return weight >= 10 && weight < 20;
    case '20g_50g': return weight >= 20 && weight < 50;
    case '50g_100g': return weight >= 50 && weight <= 100;
    case 'over_100g': return weight > 100;
    default: return true;
  }
};

export default function App() {
  const { products: rawProducts, isLoading, error, hasSynced, lastSyncedAt, fetchProducts } = useProducts();
  const { benchmark, isLoading: isBenchmarkLoading } = useBenchmark();
  
  // Enrich raw products with computed Markup percentage
  const products = useMemo<EnrichedProduct[]>(() => {
    return rawProducts
      .filter(p => p.metal !== 'Unknown')
      .map(p => {
        let markup_percentage: number | null = null;
        if (p.metal === 'Gold' && p.sell_price_per_g_ron !== null && benchmark && benchmark.price > 0) {
          markup_percentage = parseFloat((((p.sell_price_per_g_ron - benchmark.price) / benchmark.price) * 100).toFixed(2));
        }
        return {
          ...p,
          markup_percentage
        };
      });
  }, [rawProducts, benchmark]);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'weight_g', direction: 'asc' });
  const [filterOption, setFilterOption] = useState<FilterOption>('in_stock');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [weightFilter, setWeightFilter] = useState<WeightTier>('all');
  const [karatFilter, setKaratFilter] = useState<string>('all');
  const [selectedMetal, setSelectedMetal] = useState<MetalType>('Gold');

  React.useEffect(() => {
    fetchProducts();
    // Data is refreshed automatically server-side once a day (GitHub Actions -> D1);
    // this just picks up the latest snapshot without a manual sync action. Polling
    // interval is intentionally much shorter than the refresh cadence, not equal to
    // it, so a user with the tab open still sees the daily update land promptly.
    const interval = setInterval(() => fetchProducts({ silent: true }), 15 * 60 * 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSort = (key: keyof EnrichedProduct) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Dynamically calculate the total count of each metal under the active filters (excluding metal tab selection)
  const metalCounts = useMemo(() => {
    const counts: Record<MetalType, number> = { Gold: 0, Silver: 0, Platinum: 0, Palladium: 0 };
    
    products.forEach(p => {
      // 1. Filtering by Stock Status
      if (filterOption === 'in_stock') {
        if (!p.stock_status.toLowerCase().includes('in stoc')) return;
      }

      // 2. Filtering by Provider
      if (providerFilter !== 'all') {
        if (p.provider !== providerFilter) return;
      }

      // 3. Filtering by Weight Tier
      if (!matchWeightTier(p.weight_g, weightFilter)) return;

      // 4. Filtering by Karat (Gold only, so that other tabs do not get wiped out to zero counts)
      if (p.metal === 'Gold' && karatFilter !== 'all') {
        if (p.karats === null || p.karats === undefined || String(p.karats) !== karatFilter) return;
      }

      if (p.metal in counts) {
        counts[p.metal as MetalType]++;
      }
    });
    return counts;
  }, [products, filterOption, providerFilter, weightFilter, karatFilter]);

  // Dynamically extract unique providers present in the raw data
  const providersList = useMemo(() => {
    const unique = new Set<string>();
    products.forEach(p => {
      if (p.provider) unique.add(p.provider);
    });
    return Array.from(unique).sort();
  }, [products]);

  // Dynamically extract unique available karats for Gold products
  const availableKarats = useMemo(() => {
    const unique = new Set<number>();
    products.forEach(p => {
      if (p.metal === 'Gold' && p.karats !== undefined && p.karats !== null) {
        unique.add(p.karats);
      }
    });
    return Array.from(unique).sort((a, b) => b - a);
  }, [products]);

  const processedProducts = useMemo(() => {
    // 0. Filter by Selected Metal Tab
    let filtered = products.filter(p => p.metal === selectedMetal);

    // 1. Filtering by Stock Status
    if (filterOption === 'in_stock') {
      filtered = filtered.filter(p => p.stock_status.toLowerCase().includes('in stoc'));
    }

    // 2. Filtering by Provider
    if (providerFilter !== 'all') {
      filtered = filtered.filter(p => p.provider === providerFilter);
    }

    // 3. Filtering by Weight Tier
    if (weightFilter !== 'all') {
      filtered = filtered.filter(p => matchWeightTier(p.weight_g, weightFilter));
    }

    // 4. Filtering by Karats (Gold only)
    if (selectedMetal === 'Gold' && karatFilter !== 'all') {
      filtered = filtered.filter(p => p.karats !== null && p.karats !== undefined && String(p.karats) === karatFilter);
    }

    // 5. Sorting
    return [...filtered].sort((a, b) => {
      if (!sortConfig) return 0;
      
      const { key, direction } = sortConfig;
      const valA = a[key];
      const valB = b[key];

      // Always push nulls to the bottom regardless of direction
      if (valA === null && valB !== null) return 1;
      if (valA !== null && valB === null) return -1;
      if (valA === null && valB === null) return 0;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return direction === 'asc' ? valA - valB : valB - valA;
      }

      return 0;
    });
  }, [products, selectedMetal, sortConfig, filterOption, providerFilter, weightFilter, karatFilter]);

  const metalsList: MetalType[] = ['Gold', 'Silver', 'Platinum', 'Palladium'];

  return (
    <div className="w-full h-screen max-h-screen overflow-hidden p-2 flex flex-col bg-[#0F0F10] text-[#D1D1D6] font-sans">
      {/* BAR 1: Top Navigation Bar (Logo, Metal Selector Tabs, Benchmark) */}
      <header className="flex-none bg-[#0F0F10] border-b border-[#2C2C2E] py-1 px-2 flex flex-row flex-wrap items-center justify-between gap-4 select-none mb-2">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent m-0 select-none">
            AUROM
          </h1>
          
          {/* Metal Tabs integrated directly inline inside Bar 1 */}
          <div className="flex items-center gap-1">
            {metalsList.map(metal => {
              const isActive = selectedMetal === metal;
              const count = metalCounts[metal];
              
              let activeColorClass = "";
              let textAccent = "";
              if (metal === 'Gold') {
                activeColorClass = "border-[#D4AF37] text-[#D4AF37]";
                textAccent = "text-[#D4AF37]";
              } else if (metal === 'Silver') {
                activeColorClass = "border-[#E5E4E2] text-white";
                textAccent = "text-[#E5E4E2]";
              } else if (metal === 'Platinum') {
                activeColorClass = "border-[#B0C4DE] text-white";
                textAccent = "text-[#B0C4DE]";
              } else if (metal === 'Palladium') {
                activeColorClass = "border-[#708090] text-white";
                textAccent = "text-[#708090]";
              }

              const labelEmoji = metal === 'Gold' ? 'Aur' : metal === 'Silver' ? 'Argint' : metal === 'Platinum' ? 'Platină' : 'Paladiu';

              return (
                <button
                  key={metal}
                  onClick={() => setSelectedMetal(metal)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border-b-2 text-[11px] uppercase tracking-wider font-bold transition-all duration-200 cursor-pointer whitespace-nowrap outline-none ${
                    isActive 
                      ? `${activeColorClass} bg-[#1C1C1E] opacity-100` 
                      : "border-transparent text-[#8E8E93] hover:text-white hover:border-[#3A3A3C] opacity-70"
                  }`}
                >
                  <span>{labelEmoji}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 bg-[#2C2C2E] rounded-full font-mono ${isActive ? textAccent : 'text-[#8E8E93]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live BNR benchmark rate */}
        <div className="flex items-center gap-3 text-right">
          {isBenchmarkLoading ? (
            <div className="h-[12px] w-20 bg-[#2C2C2E] animate-pulse rounded"></div>
          ) : benchmark ? (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[#8E8E93]">Ref BNR:</span>
              <span className="font-mono text-[#D4AF37] font-bold">{benchmark.price.toFixed(2)} RON / g</span>
            </div>
          ) : null}
        </div>
      </header>

      {error && (
        <div role="alert" aria-live="assertive" className="flex-none bg-[#FF453A15] text-[#FF453A] border border-[#FF453A30] py-1.5 px-3 rounded-sm mb-2 text-xs flex justify-between items-center gap-4 select-none">
          <div className="flex items-center gap-2 text-left">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchProducts} 
            className="px-2.5 py-1 bg-[#FF453A20] hover:bg-[#FF453A30] text-[#FF453A] font-bold text-[10px] uppercase tracking-widest rounded-sm cursor-pointer transition-colors"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {/* Main workspace layout */}
      <main className="flex-grow min-h-0 flex flex-col overflow-hidden mb-1">
        <div className="flex-grow min-h-0 flex flex-col overflow-hidden">
          {/* BAR 2: Secondary Navigation Bar (Filters) */}
          <div className="flex-none select-none">
            <Toolbar 
              filterOption={filterOption}
              onFilterChange={setFilterOption}
              providerFilter={providerFilter}
              onProviderFilterChange={setProviderFilter}
              weightFilter={weightFilter}
              onWeightFilterChange={setWeightFilter}
              karatFilter={karatFilter}
              onKaratFilterChange={setKaratFilter}
              availableKarats={availableKarats}
              showKaratFilter={selectedMetal === 'Gold'}
              disabled={isLoading}
              providers={providersList}
            />
          </div>

          {/* BAR 3 & Table content */}
          <div className="flex-grow min-h-0">
            <ProductTable 
              products={processedProducts} 
              hasSynced={hasSynced} 
              isLoading={isLoading} 
              sortConfig={sortConfig}
              onSort={handleSort}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
