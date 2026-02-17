import { useState, useCallback } from 'react';
import { OverlayService, OverlayNode, OverlayStatusColor } from '../services/migration/overlayService';
import type { SiteInventoryItem, EnrichedTopic } from '../types';

export interface OverlaySummary {
  green: number;
  yellow: number;
  red: number;
  orange: number;
  gray: number;
  total: number;
}

export interface UseOverlayReturn {
  nodes: OverlayNode[];
  summary: OverlaySummary | null;
  isComputing: boolean;
  compute: (topics: EnrichedTopic[], inventory: SiteInventoryItem[]) => void;
}

/**
 * React hook wrapping OverlayService.computeOverlay().
 * Accepts topics and inventory, returns OverlayNode[] for OverlayView.
 */
export function useOverlay(): UseOverlayReturn {
  const [nodes, setNodes] = useState<OverlayNode[]>([]);
  const [summary, setSummary] = useState<OverlaySummary | null>(null);
  const [isComputing, setIsComputing] = useState(false);

  const compute = useCallback((topics: EnrichedTopic[], inventory: SiteInventoryItem[]) => {
    setIsComputing(true);

    try {
      const service = new OverlayService();
      const result = service.computeOverlay({
        topics: topics.map(t => ({
          id: t.id,
          title: t.title,
          type: t.type || 'outer',
        })),
        inventory: inventory.map(item => ({
          id: item.id,
          url: item.url,
          mapped_topic_id: item.mapped_topic_id ?? null,
          ce_alignment: item.ce_alignment ?? undefined,
          sc_alignment: item.sc_alignment ?? undefined,
          csi_alignment: item.csi_alignment ?? undefined,
          gsc_clicks: item.gsc_clicks ?? undefined,
          audit_score: item.audit_score ?? undefined,
        })),
      });

      setNodes(result);

      // Compute summary counts
      const counts: Record<OverlayStatusColor, number> = {
        green: 0, yellow: 0, red: 0, orange: 0, gray: 0,
      };
      for (const node of result) {
        counts[node.statusColor]++;
      }
      setSummary({ ...counts, total: result.length });
    } finally {
      setIsComputing(false);
    }
  }, []);

  return { nodes, summary, isComputing, compute };
}
