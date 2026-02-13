// =============================================================================
// StyleGuideVersionPanel — Browse and compare style guide versions
// =============================================================================

import React, { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SavedStyleGuide } from '../../types/styleGuide';
import { loadStyleGuideHistory, loadStyleGuideById } from '../../services/design-analysis/styleGuidePersistence';

// =============================================================================
// Types
// =============================================================================

interface VersionEntry {
  id: string;
  version: number;
  source_url: string;
  created_at: string;
}

interface StyleGuideVersionPanelProps {
  supabase: SupabaseClient;
  userId: string;
  hostname: string;
  currentVersion: number;
  onSelectVersion: (guide: SavedStyleGuide) => void;
  onCompareVersions: (oldGuide: SavedStyleGuide, newGuide: SavedStyleGuide) => void;
}

// =============================================================================
// Helpers
// =============================================================================

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// Component
// =============================================================================

export const StyleGuideVersionPanel: React.FC<StyleGuideVersionPanelProps> = ({
  supabase,
  userId,
  hostname,
  currentVersion,
  onSelectVersion,
  onCompareVersions,
}) => {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [loadingVersion, setLoadingVersion] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [hostname]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistory = async () => {
    setLoading(true);
    const history = await loadStyleGuideHistory(supabase, userId, hostname);
    setVersions(history as VersionEntry[]);
    setLoading(false);
  };

  const handleView = async (id: string) => {
    setLoadingVersion(id);
    try {
      const guide = await loadStyleGuideById(supabase, id);
      if (guide) onSelectVersion(guide);
    } finally {
      setLoadingVersion(null);
    }
  };

  const handleCompare = async () => {
    if (!compareA || !compareB) return;
    setComparing(true);
    try {
      const [a, b] = await Promise.all([
        loadStyleGuideById(supabase, compareA),
        loadStyleGuideById(supabase, compareB),
      ]);
      if (a && b) {
        // Ensure older version is first
        const [older, newer] = a.version < b.version ? [a, b] : [b, a];
        onCompareVersions(older, newer);
      }
    } finally {
      setComparing(false);
    }
  };

  const toggleCompare = (id: string) => {
    if (compareA === id) {
      setCompareA(null);
    } else if (compareB === id) {
      setCompareB(null);
    } else if (!compareA) {
      setCompareA(id);
    } else if (!compareB) {
      setCompareB(id);
    } else {
      // Both slots full — replace B
      setCompareB(id);
    }
  };

  const isSelected = (id: string) => compareA === id || compareB === id;
  const canCompare = compareA && compareB && compareA !== compareB;

  if (loading) {
    return (
      <div className="px-3 py-2 text-[11px] text-zinc-500 animate-pulse">
        Loading version history...
      </div>
    );
  }

  if (versions.length <= 1) {
    return (
      <div className="px-3 py-2 text-[11px] text-zinc-500">
        Only one version exists. Re-extract to create a new version.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
          Version History
        </h4>
        {canCompare && (
          <button
            onClick={handleCompare}
            disabled={comparing}
            className="px-2 py-0.5 text-[10px] font-medium bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded transition-colors disabled:opacity-50"
          >
            {comparing ? 'Loading...' : 'Compare Selected'}
          </button>
        )}
      </div>

      <p className="text-[10px] text-zinc-500">
        Select two versions to compare, or click View to load a specific version.
      </p>

      <div className="space-y-1 max-h-48 overflow-y-auto">
        {versions.map(v => {
          const isCurrent = v.version === currentVersion;
          const selected = isSelected(v.id);
          return (
            <div
              key={v.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-[11px] transition-colors ${
                isCurrent
                  ? 'bg-purple-900/20 border border-purple-500/20'
                  : selected
                    ? 'bg-zinc-700/50 border border-zinc-600'
                    : 'bg-zinc-900/30 border border-transparent hover:bg-zinc-800/50'
              }`}
            >
              {/* Compare checkbox */}
              <button
                onClick={() => toggleCompare(v.id)}
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  selected
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'border-zinc-600 hover:border-zinc-500 text-transparent'
                }`}
                title="Select for comparison"
              >
                {selected && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>

              {/* Version label */}
              <span className={`font-medium shrink-0 w-8 ${isCurrent ? 'text-purple-400' : 'text-zinc-300'}`}>
                v{v.version}
              </span>

              {/* Date */}
              <span className="text-zinc-500 flex-1 truncate">
                {formatDate(v.created_at)}
              </span>

              {/* Current badge */}
              {isCurrent && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400 shrink-0">
                  current
                </span>
              )}

              {/* View button */}
              {!isCurrent && (
                <button
                  onClick={() => handleView(v.id)}
                  disabled={loadingVersion === v.id}
                  className="px-1.5 py-0.5 text-[10px] bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 rounded transition-colors disabled:opacity-50 shrink-0"
                >
                  {loadingVersion === v.id ? '...' : 'View'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StyleGuideVersionPanel;
