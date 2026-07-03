/**
 * @propolis
 * {
 *   "role": "UI_COMPONENT",
 *   "constraints": ["React component", "Render-only table", "Strict styling guidelines"],
 *   "agent_instructions": "Renders a high-fidelity tabular bento block (Bar 3) displaying precious metal listings, employing scarce semantic color highlights for extreme valuations to avoid Rainbow Dashboard noise."
 * }
 */

import React, { useMemo } from 'react';
import { EnrichedProduct } from '../../types';
import { formatPrice } from '../utils/formatters';

export type SortConfig = {
  key: keyof EnrichedProduct;
  direction: 'asc' | 'desc';
} | null;

interface ProductTableProps {
  products: EnrichedProduct[];
  hasSynced: boolean;
  isLoading: boolean;
  sortConfig: SortConfig;
  onSort: (key: keyof EnrichedProduct) => void;
}

/**
 * Highly disciplined semantic style selector.
 * Returns subtle classes and borders ONLY for the absolute best or worst deals,
 * completely avoiding the "Rainbow Dashboard" anti-pattern.
 */
const getExtremeBadgeStyle = (
  value: number | null,
  values: number[],
  higherIsBetter: boolean
): string => {
  if (value === null || values.length === 0) return 'text-[#D1D1D6] font-mono text-xs';

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return 'text-[#D1D1D6] font-mono text-xs';

  const isBest = higherIsBetter ? value === max : value === min;
  const isWorst = higherIsBetter ? value === min : value === max;

  if (isBest) {
    return 'inline-block bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-sm font-bold text-[11px] select-all';
  }

  if (isWorst) {
    return 'inline-block bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-sm font-bold text-[11px] select-all';
  }

  return 'text-[#8E8E93] font-mono text-xs';
};

const getProviderPill = (providerName: string) => {
  const normalized = providerName.toLowerCase();
  if (normalized.includes('bcr')) {
    return 'bg-[#1E3A8A]/30 text-[#60A5FA] border border-[#1E3A8A]/50';
  } else if (normalized.includes('tavex')) {
    return 'bg-[#064E3B]/30 text-[#34D399] border border-[#064E3B]/50';
  } else if (normalized.includes('aurom')) {
    return 'bg-[#78350F]/30 text-[#F59E0B] border border-[#78350F]/50';
  } else if (normalized.includes('avangard')) {
    return 'bg-[#581C87]/30 text-[#C084FC] border border-[#581C87]/50';
  } else if (normalized.includes('neogold')) {
    return 'bg-[#7C2D12]/30 text-[#FB923C] border border-[#7C2D12]/50';
  }
  return 'bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]';
};

export const ProductTable: React.FC<ProductTableProps> = ({ products, hasSynced, isLoading, sortConfig, onSort }) => {
  const SortIcon = ({ columnKey }: { columnKey: keyof EnrichedProduct }) => {
    if (sortConfig?.key !== columnKey) return <span className="ml-1 opacity-20 inline-block w-3 select-none">↕</span>;
    return <span className="ml-1 text-[#D4AF37] inline-block w-3 select-none">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const HeaderCell = ({ 
    columnKey, 
    label, 
    tooltipText,
    className = "" 
  }: { 
    columnKey: keyof EnrichedProduct, 
    label: string, 
    tooltipText?: string,
    className?: string 
  }) => (
    <th scope="col" className={`px-2 py-1.5 font-bold whitespace-nowrap cursor-pointer hover:text-white transition-colors group relative ${className}`} onClick={() => onSort(columnKey)}>
      <div className={`flex items-center gap-1 ${className.includes('text-right') ? 'justify-end' : className.includes('text-center') ? 'justify-center' : 'justify-start'}`}>
        <span>{label}</span>
        {tooltipText && (
          <span className="text-[#8E8E93] text-[9px] hover:text-[#D4AF37] transition-colors font-normal select-none">ⓘ</span>
        )}
        <SortIcon columnKey={columnKey} />
        {tooltipText && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#151517] text-[#D1D1D6] text-[10px] font-normal leading-relaxed p-2.5 rounded border border-[#2C2C2E] shadow-2xl w-52 z-50 whitespace-normal normal-case select-none">
            {tooltipText}
          </div>
        )}
      </div>
    </th>
  );

  // Extract non-null numeric values to compute dynamic mins and maxes per category context
  const buyPerGValues = useMemo(() => products.map(p => p.buy_price_per_g_ron).filter((v): v is number => v !== null), [products]);
  const sellPerGValues = useMemo(() => products.map(p => p.sell_price_per_g_ron).filter((v): v is number => v !== null), [products]);
  const markupValues = useMemo(() => products.map(p => p.markup_percentage).filter((v): v is number => v !== null), [products]);

  return (
    <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-sm overflow-hidden flex flex-col h-full w-full relative">
      <div className="flex-grow overflow-auto scrollbar-thin">
        <table className={`w-full text-left border-collapse transition-opacity duration-200 ${isLoading && hasSynced ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
          <thead className="sticky top-0 z-30 bg-[#2C2C2E] shadow-sm select-none">
            <tr className="bg-[#2C2C2E] text-[10px] uppercase tracking-widest font-bold text-[#8E8E93] select-none">
              <HeaderCell columnKey="name" label="Descriere Produs" className="w-full sm:w-auto min-w-[180px]" />
              <HeaderCell columnKey="karats" label="Carate" className="text-center" />
              <HeaderCell columnKey="weight_g" label="Greutate (g)" className="text-center" />
              <HeaderCell columnKey="buy_price_ron" label="Cumpărare" className="text-center" tooltipText="Prețul brut oferit de dealer pentru răscumpărarea produsului (RON)." />
              <HeaderCell columnKey="sell_price_ron" label="Vânzare" className="text-center" tooltipText="Prețul brut la care dealerul vinde acest produs fizic (RON)." />
              <HeaderCell columnKey="buy_price_per_g_ron" label="Cump./g" className="text-center" tooltipText="Prețul de achiziție al dealerului calculat per gram de metal fin pur (RON)." />
              <HeaderCell columnKey="sell_price_per_g_ron" label="Vânz./g" className="text-center text-[#D4AF37]" tooltipText="Prețul de vânzare al dealerului calculat per gram de metal fin pur (RON)." />
              <HeaderCell columnKey="markup_percentage" label="Adaos" className="text-center text-[#D4AF37]" tooltipText="Procentul adăugat de dealer peste cursul BNR de referință. Valori mai mici reflectă o investiție mai profitabilă." />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C2C2E]">
            {!hasSynced && !isLoading && (
              <tr>
                <td colSpan={8}>
                  <div className="p-6 text-center text-[#8E8E93] text-xs">
                    Apasă pe "Sincronizare" pentru a prelua cele mai recente date.
                  </div>
                </td>
              </tr>
            )}
            
            {isLoading && !hasSynced && (
              <tr>
                <td colSpan={8}>
                  <div className="p-8 flex flex-col items-center justify-center space-y-3">
                    <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-[#8E8E93] text-[11px] tracking-wider uppercase animate-pulse">Se contactează bursa furnizorilor...</span>
                  </div>
                </td>
              </tr>
            )}

            {hasSynced && !isLoading && products.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="p-6 text-center text-[#8E8E93] text-xs">Nu s-au găsit produse care să corespundă filtrelor aplicate.</div>
                </td>
              </tr>
            )}

            {hasSynced && products.map((product, index) => {
              const sellBadgeClass = getExtremeBadgeStyle(product.sell_price_per_g_ron, sellPerGValues, false); // lower is better
              const buyBadgeClass = getExtremeBadgeStyle(product.buy_price_per_g_ron, buyPerGValues, true); // higher is better
              const markupBadgeClass = getExtremeBadgeStyle(product.markup_percentage, markupValues, false); // lower is better
              const isInStock = product.stock_status.toLowerCase().includes('in stoc');

              return (
                <tr 
                  key={`${product.sku}-${index}`} 
                  className={`hover:bg-[#252529] transition-all duration-150 ${!isInStock ? 'opacity-40 saturate-50 hover:opacity-75' : ''}`}
                >
                  <td className="px-2 py-1.5 text-xs font-medium text-white break-words text-left">
                    <div className="flex flex-col gap-0.5">
                      <a 
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="leading-tight text-white hover:text-[#D4AF37] hover:underline cursor-pointer transition-colors"
                      >
                        {product.name}
                      </a>
                      <div className="flex items-center mt-0.5 select-none">
                        <span className={`text-[8px] px-1.5 py-0.1 rounded-sm font-bold uppercase tracking-wider ${getProviderPill(product.provider)}`}>
                          {product.provider}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-xs text-[#D4AF37] font-bold whitespace-nowrap">
                    {product.karats ? `${product.karats}K` : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-xs text-[#8E8E93] whitespace-nowrap">
                    {product.weight_g !== null ? parseFloat(product.weight_g.toFixed(2)) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-xs text-white whitespace-nowrap">
                    {formatPrice(product.buy_price_ron)}
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-xs text-white whitespace-nowrap">
                    {formatPrice(product.sell_price_ron)}
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <span className={buyBadgeClass}>
                      {formatPrice(product.buy_price_per_g_ron)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <span className={sellBadgeClass}>
                      {formatPrice(product.sell_price_per_g_ron)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center whitespace-nowrap">
                    <span className={markupBadgeClass}>
                      {product.markup_percentage !== null ? `${product.markup_percentage > 0 ? '+' : ''}${product.markup_percentage.toFixed(2)}%` : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      

    </div>
  );
};
