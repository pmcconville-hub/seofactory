import React, { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { listBrandProfiles, setActiveBrand } from '../../services/design-analysis/brandDesignSystemStorage';
import { useBrandComparison } from '../../hooks/useBrandComparison';
import { BrandComparisonView } from './BrandComparisonView';

interface BrandProfile {
  id: string;
  sourceUrl: string;
  screenshotBase64?: string;
  isActive: boolean;
  createdAt: string;
  confidenceScore?: number;
}

interface BrandProfileManagerProps {
  projectId: string;
  topicalMapId?: string;
  supabase?: SupabaseClient;
  onSelectBrand: (brandId: string) => void;
  onAddBrand: () => void;
  onCompare?: () => void;
}

/**
 * Format a date string as a relative time (e.g. "2 days ago")
 */
function formatRelativeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Extract hostname from a URL for display
 */
function extractHostname(url: string): string {
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.hostname;
  } catch {
    return url;
  }
}

export const BrandProfileManager: React.FC<BrandProfileManagerProps> = ({
  projectId,
  topicalMapId,
  supabase,
  onSelectBrand,
  onAddBrand,
  onCompare,
}) => {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Comparison mode state
  const [comparing, setComparing] = useState(false);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const { data: comparisonData, loading: comparisonLoading, error: comparisonError, compare, reset: resetComparison } = useBrandComparison();

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBrandProfiles(projectId, topicalMapId);
      setProfiles(data);
    } catch {
      // graceful degradation
    }
    setLoading(false);
  }, [projectId, topicalMapId]);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSetActive = useCallback(async (brandId: string) => {
    const success = await setActiveBrand(projectId, brandId, topicalMapId);
    if (success) {
      await loadProfiles();
      onSelectBrand(brandId);
    }
  }, [projectId, topicalMapId, loadProfiles, onSelectBrand]);

  // Toggle comparison selection for a profile
  const handleCompareToggle = useCallback((brandId: string) => {
    setCompareIds(prev => {
      if (!prev) {
        // First selection
        return [brandId, ''] as [string, string];
      }
      if (prev[0] === brandId) {
        // Deselect first
        return prev[1] ? [prev[1], ''] as [string, string] : null;
      }
      if (prev[1] === brandId) {
        // Deselect second
        return [prev[0], ''] as [string, string];
      }
      if (!prev[0]) {
        return [brandId, prev[1]] as [string, string];
      }
      if (!prev[1]) {
        return [prev[0], brandId] as [string, string];
      }
      // Already have 2 selected, replace the second
      return [prev[0], brandId] as [string, string];
    });
  }, []);

  // Run comparison when two brands are selected
  const handleRunComparison = useCallback(async () => {
    if (!compareIds || !compareIds[0] || !compareIds[1] || !supabase) return;
    await compare(supabase, projectId, compareIds[0], compareIds[1]);
  }, [compareIds, supabase, projectId, compare]);

  // Exit comparison mode
  const handleExitComparison = useCallback(() => {
    setComparing(false);
    setCompareIds(null);
    resetComparison();
  }, [resetComparison]);

  // Handle choosing a brand from comparison view
  const handleChooseBrand = useCallback(async (brandId: string) => {
    const success = await setActiveBrand(projectId, brandId, topicalMapId);
    if (success) {
      await loadProfiles();
      onSelectBrand(brandId);
    }
    handleExitComparison();
  }, [projectId, topicalMapId, loadProfiles, onSelectBrand, handleExitComparison]);

  if (loading) {
    return (
      <div className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-400">Loading brand profiles...</span>
        </div>
      </div>
    );
  }

  if (profiles.length === 0) {
    return null; // No profiles yet — the regular URL input will handle initial extraction
  }

  // If comparison data is available, show the comparison view
  if (comparisonData) {
    return (
      <div className="space-y-3">
        <BrandComparisonView
          data={comparisonData}
          onChooseBrand={handleChooseBrand}
          onClose={handleExitComparison}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-300 uppercase tracking-wide">
          {comparing ? 'Select 2 brands to compare' : 'Brand Profiles'}
        </h4>
        <div className="flex items-center gap-2">
          {comparing && (
            <button
              onClick={handleExitComparison}
              className="px-2.5 py-1 text-[11px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
          {!comparing && (
            <button
              onClick={onAddBrand}
              className="px-2.5 py-1 text-[11px] bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors"
            >
              + Add Brand
            </button>
          )}
        </div>
      </div>

      {/* Comparison error */}
      {comparisonError && (
        <div className="p-2 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-[11px] text-red-400">{comparisonError}</p>
        </div>
      )}

      {/* Profile List */}
      <div className="space-y-1.5">
        {profiles.map((profile) => {
          const isSelectedForCompare = compareIds?.includes(profile.id) ?? false;
          return (
            <div
              key={profile.id}
              className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                comparing && isSelectedForCompare
                  ? 'bg-blue-900/20 border-blue-500/30'
                  : profile.isActive
                    ? 'bg-purple-900/20 border-purple-500/30'
                    : 'bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600'
              }`}
            >
              {/* Comparison checkbox */}
              {comparing && (
                <input
                  type="checkbox"
                  checked={isSelectedForCompare}
                  onChange={() => handleCompareToggle(profile.id)}
                  className="accent-blue-500 flex-shrink-0"
                />
              )}

              {/* Thumbnail */}
              <div className="w-10 h-10 rounded bg-zinc-700 flex-shrink-0 overflow-hidden">
                {profile.screenshotBase64 ? (
                  <img
                    src={`data:image/png;base64,${profile.screenshotBase64}`}
                    alt={extractHostname(profile.sourceUrl)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                    {extractHostname(profile.sourceUrl).charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {profile.isActive && !comparing && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  )}
                  <span className="text-xs text-zinc-200 truncate font-medium">
                    {extractHostname(profile.sourceUrl)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-zinc-500">
                    {formatRelativeDate(profile.createdAt)}
                  </span>
                  {profile.confidenceScore != null && (
                    <span className={`text-[10px] font-medium ${
                      profile.confidenceScore >= 80 ? 'text-green-400' :
                      profile.confidenceScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {Math.round(profile.confidenceScore)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Action */}
              {!comparing && !profile.isActive && (
                <button
                  onClick={() => handleSetActive(profile.id)}
                  className="px-2 py-1 text-[10px] bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors flex-shrink-0"
                >
                  Set Active
                </button>
              )}
              {!comparing && profile.isActive && (
                <span className="text-[10px] text-green-400 font-medium flex-shrink-0 px-2">Active</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Compare button — enters comparison mode or runs comparison */}
      {comparing && compareIds && compareIds[0] && compareIds[1] ? (
        <button
          onClick={handleRunComparison}
          disabled={comparisonLoading}
          className="w-full px-3 py-1.5 text-[11px] bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
        >
          {comparisonLoading ? 'Comparing...' : 'Compare Selected Brands'}
        </button>
      ) : comparing ? (
        <p className="text-[10px] text-zinc-500 text-center">Select 2 brands to compare</p>
      ) : profiles.length >= 2 ? (
        <button
          onClick={() => {
            setComparing(true);
            setCompareIds(null);
            resetComparison();
            if (onCompare) onCompare();
          }}
          className="w-full px-3 py-1.5 text-[11px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 rounded-lg transition-colors"
        >
          Compare Brand Profiles
        </button>
      ) : null}
    </div>
  );
};

export default BrandProfileManager;
