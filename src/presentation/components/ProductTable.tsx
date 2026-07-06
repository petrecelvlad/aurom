/**
 * @propolis
 * {
 *   "role": "UI_COMPONENT",
 *   "constraints": ["React component", "Render-only table", "Strict styling guidelines"],
 *   "agent_instructions": "Renders a high-fidelity tabular bento block (Bar 3) displaying precious metal listings. Cumparare/g and Vanzare/g badges highlight only the best/worst extreme (getExtremeBadgeStyle) to avoid Rainbow Dashboard noise; Adaos is a deliberate exception, by explicit user request — it uses a continuous green-to-red spectrum across every row (getMarkupSpectrumStyle), not just the extremes. PROVIDERS_LINK_OUT_ONLY is currently empty by the user's informed choice, despite real ToS conflicts found for Avangard Gold and Neogold (see PROVIDER_SCRAPING_SPECS.md) — the mechanism is kept in place in case either provider objects and it needs to be reapplied."
 * }
 */

import React, { useMemo } from 'react';
import { EnrichedProduct } from '../../types';
import { formatPrice, toDisplayPrice, DisplayCurrency } from '../utils/formatters';

// Avangard Gold and Neogold's Terms of Service explicitly prohibit reproducing/publishing
// their prices. Left empty by informed user decision (2026-07) despite that conflict.
const PROVIDERS_LINK_OUT_ONLY: string[] = [];

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
  currency: DisplayCurrency;
  eurRate: number | null;
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

/**
 * Continuous green -> yellow -> red spectrum across every row, not just the two
 * extremes. Used only for the Adaos (markup) column, by explicit request.
 *
 * Deliberately rank-based, not min-max value-based: min-max stretches the scale
 * to the single highest outlier, which compresses every other (likely clustered)
 * value into a sliver near green — the "everything looks green except one red
 * thing" problem. Ranking by sorted position guarantees the full spectrum is
 * always used regardless of how the underlying values are distributed. Ties
 * (identical markup) get the same averaged rank, so identical values always
 * render identically.
 */
const getMarkupSpectrumStyle = (value: number | null, values: number[]): React.CSSProperties => {
  if (value === null || values.length < 2) return { color: '#D1D1D6' };

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const firstIdx = sorted.indexOf(value);
  let lastIdx = firstIdx;
  while (lastIdx + 1 < n && sorted[lastIdx + 1] === value) lastIdx++;
  const avgRank = (firstIdx + lastIdx) / 2;

  const t = avgRank / (n - 1); // 0 = lowest/best markup, 1 = highest/worst
  const hue = 120 * (1 - t); // 120 green -> 60 yellow -> 0 red

  return {
    color: `hsl(${hue}, 75%, 62%)`,
    backgroundColor: `hsla(${hue}, 75%, 62%, 0.12)`,
    borderColor: `hsla(${hue}, 75%, 62%, 0.35)`,
  };
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
  } else if (normalized.includes('teilor')) {
    return 'bg-[#155E75]/30 text-[#22D3EE] border border-[#155E75]/50';
  } else if (normalized.includes('goldbars')) {
    return 'bg-[#3F6212]/30 text-[#A3E635] border border-[#3F6212]/50';
  } else if (normalized.includes('stonex')) {
    return 'bg-[#831843]/30 text-[#F472B6] border border-[#831843]/50';
  } else if (normalized.includes('celticgold')) {
    return 'bg-[#134E4A]/30 text-[#2DD4BF] border border-[#134E4A]/50';
  }
  return 'bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]';
};

export const ProductTable: React.FC<ProductTableProps> = ({ products, hasSynced, isLoading, sortConfig, onSort, currency, eurRate }) => {
  const currencyLabel = currency === 'EUR' ? 'EUR' : 'Lei';
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
            <tr className="bg-[#2C2C2E] text-xs uppercase tracking-widest font-bold text-white select-none">
              <HeaderCell columnKey="name" label="Descriere Produs" className="w-full sm:w-auto min-w-[180px] text-white" />
              <HeaderCell columnKey="karats" label="Carate" className="text-center text-[#D4AF37]" />
              <HeaderCell columnKey="weight_g" label="Greutate (g)" className="text-center text-white" />
              <HeaderCell columnKey="buy_price_ron" label={`Cumpărare (${currencyLabel})`} className="text-center text-[#2DD4BF]" tooltipText={`Prețul brut oferit de dealer pentru răscumpărarea produsului (${currencyLabel}).`} />
              <HeaderCell columnKey="sell_price_ron" label={`Vânzare (${currencyLabel})`} className="text-center text-white" tooltipText={`Prețul brut la care dealerul vinde acest produs fizic (${currencyLabel}).`} />
              <HeaderCell columnKey="buy_price_per_g_ron" label={`Cumpărare/g (${currencyLabel})`} className="text-center text-[#2DD4BF]" tooltipText={`Prețul de achiziție al dealerului calculat per gram de metal fin pur (${currencyLabel}).`} />
              <HeaderCell columnKey="sell_price_per_g_ron" label={`Vânzare/g (${currencyLabel})`} className="text-center text-[#D4AF37]" tooltipText={`Prețul de vânzare al dealerului calculat per gram de metal fin pur (${currencyLabel}).`} />
              <HeaderCell columnKey="markup_percentage" label="Adaos" className="text-center text-[#D4AF37]" tooltipText="Procentul adăugat de dealer peste cursul BNR de referință. Valori mai mici reflectă o investiție mai profitabilă." />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2C2C2E]">
            {!hasSynced && !isLoading && (
              <tr>
                <td colSpan={8}>
                  <div className="p-6 text-center text-[#8E8E93] text-xs">
                    Nu s-au putut încărca datele. Încearcă din nou folosind butonul de mai sus.
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
              const markupSpectrumStyle = getMarkupSpectrumStyle(product.markup_percentage, markupValues); // full green-to-red spectrum, not just extremes
              const isInStock = product.stock_status.toLowerCase().includes('in stoc');
              const isLinkOutOnly = PROVIDERS_LINK_OUT_ONLY.includes(product.provider);

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
                  {isLinkOutOnly ? (
                    <td colSpan={5} className="px-2 py-1.5 text-center">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-[#8E8E93] hover:text-[#D4AF37] uppercase tracking-wider underline whitespace-nowrap"
                      >
                        Vezi preț pe site →
                      </a>
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1.5 text-center font-mono text-xs text-white whitespace-nowrap">
                        {formatPrice(toDisplayPrice(product.buy_price_ron, currency, eurRate), currency)}
                      </td>
                      <td className="px-2 py-1.5 text-center font-mono text-xs text-white whitespace-nowrap">
                        {formatPrice(toDisplayPrice(product.sell_price_ron, currency, eurRate), currency)}
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                        <span className={buyBadgeClass}>
                          {formatPrice(toDisplayPrice(product.buy_price_per_g_ron, currency, eurRate), currency)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                        <span className={sellBadgeClass}>
                          {formatPrice(toDisplayPrice(product.sell_price_per_g_ron, currency, eurRate), currency)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-center whitespace-nowrap">
                        <span
                          className="inline-block px-2 py-0.5 rounded-sm border font-bold text-[11px] select-all"
                          style={markupSpectrumStyle}
                        >
                          {product.markup_percentage !== null ? `${product.markup_percentage > 0 ? '+' : ''}${product.markup_percentage.toFixed(2)}%` : '-'}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      

    </div>
  );
};
