/**
 * EAVDisplay Component
 *
 * Displays Entity-Attribute-Value triples with visual styling.
 */

import React from 'react';
import type { PostEAVTriple } from '../../../types/social';

interface EAVDisplayProps {
  eav: PostEAVTriple;
  variant?: 'full' | 'compact' | 'inline';
  showCategory?: boolean;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  UNIQUE: { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Unique' },
  RARE: { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Rare' },
  ROOT: { bg: 'bg-green-500/20', text: 'text-green-300', label: 'Root' },
  COMMON: { bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'Common' }
};

export const EAVDisplay: React.FC<EAVDisplayProps> = ({
  eav,
  variant = 'full',
  showCategory = true
}) => {
  const categoryStyle = eav.category ? CATEGORY_STYLES[eav.category] : null;

  if (variant === 'inline') {
    return (
      <span className="text-sm">
        <span className="text-purple-300">{eav.entity}</span>
        <span className="text-gray-500"> → </span>
        <span className="text-blue-300">{eav.attribute}</span>
        <span className="text-gray-500"> → </span>
        <span className="text-green-300">{eav.value}</span>
        {showCategory && categoryStyle && (
          <span className={`ml-2 text-xs ${categoryStyle.bg} ${categoryStyle.text} px-1.5 py-0.5 rounded`}>
            {categoryStyle.label}
          </span>
        )}
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1 text-xs flex-wrap">
        <span className="bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded truncate max-w-[120px]">
          {eav.entity}
        </span>
        <span className="text-gray-500">→</span>
        <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded truncate max-w-[120px]">
          {eav.attribute}
        </span>
        <span className="text-gray-500">→</span>
        <span className="bg-green-500/20 text-green-300 px-1.5 py-0.5 rounded truncate max-w-[120px]">
          {eav.value}
        </span>
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-300">Entity-Attribute-Value Triple</h4>
        {showCategory && categoryStyle && (
          <span className={`text-xs ${categoryStyle.bg} ${categoryStyle.text} px-2 py-0.5 rounded`}>
            {categoryStyle.label}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Entity */}
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Entity</div>
          <div className="bg-purple-500/20 text-purple-300 rounded-lg px-3 py-2 text-sm font-medium">
            {eav.entity}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-500">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {/* Attribute */}
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Attribute</div>
          <div className="bg-blue-500/20 text-blue-300 rounded-lg px-3 py-2 text-sm font-medium">
            {eav.attribute}
          </div>
        </div>

        {/* Arrow */}
        <div className="text-gray-500">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>

        {/* Value */}
        <div className="flex-1 text-center">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Value</div>
          <div className="bg-green-500/20 text-green-300 rounded-lg px-3 py-2 text-sm font-medium">
            {eav.value}
          </div>
        </div>
      </div>

      {/* Description */}
      {eav.category && (
        <p className="text-xs text-gray-500 mt-3">
          {eav.category === 'UNIQUE' && 'This is a unique fact that differentiates your content.'}
          {eav.category === 'RARE' && 'This is a rare fact known to few competitors.'}
          {eav.category === 'ROOT' && 'This is a foundational fact for the topic.'}
          {eav.category === 'COMMON' && 'This is a common fact that establishes baseline expertise.'}
        </p>
      )}
    </div>
  );
};

/**
 * EAV List Display
 */
interface EAVListProps {
  eavs: PostEAVTriple[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  maxDisplay?: number;
}

export const EAVList: React.FC<EAVListProps> = ({
  eavs,
  selectedIndex,
  onSelect,
  maxDisplay = 5
}) => {
  const displayEavs = eavs.slice(0, maxDisplay);
  const remaining = eavs.length - maxDisplay;

  // Sort by category priority
  const sortedEavs = [...displayEavs].sort((a, b) => {
    const priority = { UNIQUE: 0, RARE: 1, ROOT: 2, COMMON: 3 };
    return (priority[a.category || 'COMMON'] || 3) - (priority[b.category || 'COMMON'] || 3);
  });

  return (
    <div className="space-y-2">
      {sortedEavs.map((eav, index) => {
        const isSelected = selectedIndex === index;
        const categoryStyle = eav.category ? CATEGORY_STYLES[eav.category] : null;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onSelect?.(index)}
            disabled={!onSelect}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
            } ${!onSelect ? 'cursor-default' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <EAVDisplay eav={eav} variant="compact" showCategory={false} />
              </div>
              {categoryStyle && (
                <span className={`text-[10px] ${categoryStyle.bg} ${categoryStyle.text} px-1.5 py-0.5 rounded whitespace-nowrap`}>
                  {categoryStyle.label}
                </span>
              )}
            </div>
          </button>
        );
      })}

      {remaining > 0 && (
        <p className="text-xs text-gray-500 text-center py-1">
          +{remaining} more EAV{remaining !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
};

export default EAVDisplay;
