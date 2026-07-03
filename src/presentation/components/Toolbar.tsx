/**
 * @propolis
 * {
 *   "role": "UI_COMPONENT",
 *   "constraints": ["Controlled presentation component"],
 *   "agent_instructions": "Displays responsive filter options (Stock, Provider, Weight, Karat) in a single toolbar bar (Bar 2)."
 * }
 */

import React from 'react';
import { WeightTier } from '../../types';

export type FilterOption = 'all' | 'in_stock';

interface ToolbarProps {
  filterOption: FilterOption;
  onFilterChange: (option: FilterOption) => void;
  providerFilter: string;
  onProviderFilterChange: (provider: string) => void;
  weightFilter: WeightTier;
  onWeightFilterChange: (weight: WeightTier) => void;
  karatFilter: string;
  onKaratFilterChange: (karat: string) => void;
  availableKarats: number[];
  showKaratFilter: boolean;
  disabled: boolean;
  providers: string[];
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  filterOption, 
  onFilterChange,
  providerFilter,
  onProviderFilterChange,
  weightFilter,
  onWeightFilterChange,
  karatFilter,
  onKaratFilterChange,
  availableKarats,
  showKaratFilter,
  disabled,
  providers
}) => {
  return (
    <div className="flex flex-row flex-wrap items-center justify-between gap-3 bg-[#1C1C1E] py-1.5 px-2.5 rounded-sm border border-[#2C2C2E] select-none mb-2">
      <div className="flex flex-wrap items-center gap-4">
        {/* Availability Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="filter" className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">Afișează:</label>
          <select 
            id="filter"
            value={filterOption}
            onChange={(e) => onFilterChange(e.target.value as FilterOption)}
            disabled={disabled}
            className="bg-[#2C2C2E] border border-[#48484A] text-white text-xs rounded-sm px-2 py-1 focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
          >
            <option value="all">Toate produsele</option>
            <option value="in_stock">Doar în stoc</option>
          </select>
        </div>

        {/* Provider Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="provider-filter" className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">Furnizor:</label>
          <select 
            id="provider-filter"
            value={providerFilter}
            onChange={(e) => onProviderFilterChange(e.target.value)}
            disabled={disabled}
            className="bg-[#2C2C2E] border border-[#48484A] text-white text-xs rounded-sm px-2 py-1 focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
          >
            <option value="all">Toți furnizorii</option>
            {providers.map(provider => (
              <option key={provider} value={provider}>{provider}</option>
            ))}
          </select>
        </div>

        {/* Weight Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="weight-filter" className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase">Greutate:</label>
          <select 
            id="weight-filter"
            value={weightFilter}
            onChange={(e) => onWeightFilterChange(e.target.value as WeightTier)}
            disabled={disabled}
            className="bg-[#2C2C2E] border border-[#48484A] text-white text-xs rounded-sm px-2 py-1 focus:outline-none focus:border-[#D4AF37] transition-colors disabled:opacity-50"
          >
            <option value="all">Toate greutățile</option>
            <option value="under_2g">Sub 2g</option>
            <option value="2g_5g">2g - 5g</option>
            <option value="5g_10g">5g - 10g</option>
            <option value="10g_20g">10g - 20g</option>
            <option value="20g_50g">20g - 50g</option>
            <option value="50g_100g">50g - 100g</option>
            <option value="over_100g">Peste 100g</option>
          </select>
        </div>
      </div>

      {/* Karat Filter - Aligned to the right */}
      {showKaratFilter ? (
        <div className="flex items-center gap-2">
          <label htmlFor="karat-filter" className="text-[10px] font-bold tracking-widest text-[#8E8E93] uppercase whitespace-nowrap">Carate:</label>
          <select 
            id="karat-filter"
            value={karatFilter}
            onChange={(e) => onKaratFilterChange(e.target.value)}
            disabled={disabled}
            className="bg-[#2C2C2E] border border-[#48484A] text-white text-xs rounded-sm px-2 py-1 focus:outline-none focus:border-[#D4AF37] transition-colors w-28 md:w-32 disabled:opacity-50"
          >
            <option value="all">Toate caratele</option>
            {availableKarats.map(karat => (
              <option key={karat} value={String(karat)}>{karat}K</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="text-[10px] text-[#8E8E93] italic font-semibold uppercase tracking-wider select-none">
          Puritate maximă (.999+)
        </div>
      )}
    </div>
  );
};
