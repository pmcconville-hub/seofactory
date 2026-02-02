/**
 * Brand URL Discovery Component
 *
 * Allows users to discover and select URLs from a domain
 * for brand extraction analysis.
 *
 * @module components/publishing/brand/BrandUrlDiscovery
 */

import React, { useState } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

// ============================================================================
// Types
// ============================================================================

export interface UrlSuggestion {
  url: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  discoveredFrom: string;
  prominenceScore: number;
  visualContext: string;
}

interface BrandUrlDiscoveryProps {
  suggestions: UrlSuggestion[];
  selectedUrls: string[];
  onToggleUrl: (url: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDiscover: (domain: string) => Promise<void>;
  onStartExtraction: () => void;
  isDiscovering: boolean;
}

// ============================================================================
// Page Type Badge Component
// ============================================================================

const pageTypeBadgeStyles: Record<UrlSuggestion['pageType'], string> = {
  homepage: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  service: 'bg-green-500/20 text-green-300 border-green-500/30',
  article: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  contact: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  other: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

const PageTypeBadge: React.FC<{ pageType: UrlSuggestion['pageType'] }> = ({ pageType }) => (
  <span
    className={`
      px-2 py-0.5 text-xs font-medium rounded-full border capitalize
      ${pageTypeBadgeStyles[pageType]}
    `}
  >
    {pageType}
  </span>
);

// ============================================================================
// URL Suggestion Item Component
// ============================================================================

interface UrlSuggestionItemProps {
  suggestion: UrlSuggestion;
  isSelected: boolean;
  onToggle: () => void;
}

const UrlSuggestionItem: React.FC<UrlSuggestionItemProps> = ({
  suggestion,
  isSelected,
  onToggle,
}) => {
  // prominenceScore is 0-100 from the edge function, display directly
  const prominencePercent = Math.round(
    suggestion.prominenceScore > 1 ? suggestion.prominenceScore : suggestion.prominenceScore * 100
  );

  return (
    <label
      className={`
        flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? 'bg-blue-900/20 border-blue-500/50 ring-1 ring-blue-500/30'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
        }
      `}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggle}
        className="
          mt-1 w-4 h-4 rounded border-gray-600 bg-gray-700
          text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900
          cursor-pointer
        "
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* URL and Badge Row */}
        <div className="flex items-center gap-2 mb-1">
          <PageTypeBadge pageType={suggestion.pageType} />
          <span className="text-xs text-gray-500">
            {prominencePercent}% prominence
          </span>
        </div>

        {/* URL */}
        <p className="text-sm text-white font-medium truncate" title={suggestion.url}>
          {suggestion.url}
        </p>

        {/* Visual Context */}
        {suggestion.visualContext && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
            {suggestion.visualContext}
          </p>
        )}

        {/* Discovered From */}
        <p className="text-xs text-gray-500 mt-1">
          Discovered from: {suggestion.discoveredFrom}
        </p>
      </div>
    </label>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const BrandUrlDiscovery: React.FC<BrandUrlDiscoveryProps> = ({
  suggestions,
  selectedUrls,
  onToggleUrl,
  onSelectAll,
  onClearSelection,
  onDiscover,
  onStartExtraction,
  isDiscovering,
}) => {
  const [domain, setDomain] = useState('');

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (domain.trim()) {
      await onDiscover(domain.trim());
    }
  };

  // Filter out email addresses and invalid URLs on the frontend
  const validSuggestions = suggestions.filter(s => !s.url.includes('@'));

  const selectedCount = selectedUrls.length;
  const hasSelections = selectedCount > 0;
  const hasSuggestions = validSuggestions.length > 0;

  return (
    <div className="space-y-6">
      {/* Domain Input Form */}
      <form onSubmit={handleDiscover} className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Enter domain (e.g., example.com)"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="h-11"
              disabled={isDiscovering}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={!domain.trim() || isDiscovering}
            className="min-w-[140px]"
          >
            {isDiscovering ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Discovering...
              </span>
            ) : (
              'Discover URLs'
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          We'll crawl the domain to find key pages for brand extraction.
        </p>
      </form>

      {/* URL Suggestions List */}
      {hasSuggestions && (
        <div className="space-y-4">
          {/* Header with Select All / Clear */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-300">
              Discovered URLs ({validSuggestions.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Select All
              </button>
              <span className="text-gray-600">|</span>
              <button
                type="button"
                onClick={onClearSelection}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* URL List */}
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
            {validSuggestions.map((suggestion) => (
              <UrlSuggestionItem
                key={suggestion.url}
                suggestion={suggestion}
                isSelected={selectedUrls.includes(suggestion.url)}
                onToggle={() => onToggleUrl(suggestion.url)}
              />
            ))}
          </div>

          {/* Extract Button — always visible below the list */}
          <div className="pt-4 border-t border-gray-700 sticky bottom-0 bg-gray-900/95 backdrop-blur-sm pb-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={onStartExtraction}
              disabled={!hasSelections}
              className="h-12"
            >
              {hasSelections
                ? `Extract Brand from ${selectedCount} Page${selectedCount > 1 ? 's' : ''}`
                : 'Select pages to extract'
              }
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasSuggestions && !isDiscovering && (
        <div className="text-center py-12 px-6 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="text-4xl mb-3">
            <span role="img" aria-label="search">
              {'\uD83D\uDD0D'}
            </span>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-1">
            No URLs discovered yet
          </h3>
          <p className="text-sm text-gray-500">
            Enter a domain above to discover pages for brand extraction.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isDiscovering && (
        <div className="text-center py-12 px-6 bg-gray-800/30 rounded-lg border border-gray-700/50">
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-8 w-8 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-1">
            Discovering URLs...
          </h3>
          <p className="text-sm text-gray-500">
            Crawling the domain to find key pages. This may take a moment.
          </p>
        </div>
      )}
    </div>
  );
};

export default BrandUrlDiscovery;
