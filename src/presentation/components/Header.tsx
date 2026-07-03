/**
 * @propolis
 * {
 *   "role": "PRESENTATION",
 *   "constraints": ["React component", "Pristine visual typography", "Responsive design"],
 *   "agent_instructions": "Represents the primary application header including the global precious metal benchmark rates and branding."
 * }
 */
import React from 'react';
import { BenchmarkData } from '../hooks/useBenchmark';

interface HeaderProps {
  productsCount: number;
  hasSynced: boolean;
  isLoading: boolean;
  onSync: () => void;
  benchmark: BenchmarkData | null;
  isBenchmarkLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ productsCount, hasSynced, isLoading, onSync, benchmark, isBenchmarkLoading }) => {
  return (
    <header className="flex flex-col md:flex-row justify-between md:items-end border-b border-[#2C2C2E] pb-6 mb-6 gap-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-wider bg-gradient-to-r from-[#BF953F] via-[#FCF6BA] to-[#B38728] bg-clip-text text-transparent m-0 select-none">
          AUROM
        </h1>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="flex flex-col gap-1 items-start sm:items-end">
          {isBenchmarkLoading ? (
             <div className="h-[14px] w-32 bg-[#2C2C2E] animate-pulse rounded"></div>
          ) : benchmark ? (
            <div className="flex items-center gap-2 text-xs">
               <span className="text-[#8E8E93]">Referință BNR:</span>
               <span className="font-mono text-[#D4AF37] font-bold">{benchmark.price.toFixed(2)} RON / g</span>
            </div>
          ) : null}
          <p className="text-[10px] text-[#8E8E93] font-mono whitespace-nowrap" aria-live="polite">
            {hasSynced ? `${productsCount} PRODUSE SINCRONIZATE` : '0 PRODUSE SINCRONIZATE'}
          </p>
        </div>
        <button 
          onClick={onSync}
          disabled={isLoading}
          className="px-6 py-3 bg-[#D4AF37] hover:bg-[#C5A028] text-[#0F0F10] font-bold text-xs uppercase tracking-widest transition-colors rounded-sm flex justify-center items-center gap-2 disabled:bg-[#48484A] disabled:text-[#8E8E93] disabled:cursor-not-allowed whitespace-nowrap"
          aria-label={isLoading ? "Se sincronizează..." : "Sincronizează Prețurile"}
        >
          {isLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>}
          <span>{isLoading ? 'Se sincronizează...' : 'Sincronizează'}</span>
        </button>
      </div>
    </header>
  );
};

