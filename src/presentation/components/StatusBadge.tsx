/**
 * @propolis
 * {
 *   "role": "UI_COMPONENT",
 *   "constraints": ["React component", "Pure presentation — no data fetching"],
 *   "agent_instructions": "Renders a normalized stock-status pill from raw provider stock text (Romanian or English)."
 * }
 */

import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const lowerStatus = status.toLowerCase();
  
  // Normalize the displayed status for the UI
  let displayStatus = status;
  if (lowerStatus.includes('stoc epuizat') || lowerStatus.includes('out of stock')) {
    displayStatus = 'Stoc Epuizat';
  } else if (lowerStatus.includes('în stoc') || lowerStatus.includes('in stoc')) {
    displayStatus = 'În Stoc';
  } else if (lowerStatus.includes('precomandă') || lowerStatus.includes('precomanda')) {
    displayStatus = 'Precomandă';
  }
  
  if (lowerStatus.includes('stoc epuizat') || lowerStatus.includes('out of stock')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#FF453A22] text-[#FF453A] border border-[#FF453A44] uppercase tracking-wider whitespace-nowrap">
        {displayStatus}
      </span>
    );
  }
  if (lowerStatus.includes('în stoc') || lowerStatus.includes('in stoc')) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#34C75922] text-[#34C759] border border-[#34C75944] uppercase tracking-wider whitespace-nowrap">
        {displayStatus}
      </span>
    );
  }
  
  return (
    <span className="px-2 py-0.5 rounded-full text-[9px] bg-[#2C2C2E] text-[#8E8E93] border border-[#48484A] uppercase tracking-wider whitespace-nowrap">
      {displayStatus}
    </span>
  );
};
