// hooks/useBrandComparison.ts
import { useState, useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DesignDNA } from '../types/designDna';
import type { StyleGuide } from '../types/styleGuide';
import { loadStyleGuide } from '../services/design-analysis/styleGuidePersistence';

export interface BrandComparisonData {
  brandA: {
    id: string;
    sourceUrl: string;
    designDna?: DesignDNA;
    styleGuide?: StyleGuide;
    screenshotBase64?: string;
  };
  brandB: {
    id: string;
    sourceUrl: string;
    designDna?: DesignDNA;
    styleGuide?: StyleGuide;
    screenshotBase64?: string;
  };
  comparison: {
    colorDistance: number;        // 0-100, how different the color palettes are
    typographySimilarity: number; // 0-100, how similar the fonts/sizes are
    personalityDelta: {          // difference in personality dimensions
      formality: number;         // -4 to +4
      energy: number;
      warmth: number;
    };
    overallSimilarity: number;   // 0-100
  };
}

/**
 * Parse a hex color string into [r, g, b].
 * Handles 3-char and 6-char hex with or without leading '#'.
 */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

/**
 * Compute color distance between two palettes.
 * Uses Euclidean distance in RGB space averaged across primary, secondary, accent.
 * Returns 0-100 (0 = identical, 100 = completely different).
 */
export function computeColorDistance(dnaA: DesignDNA, dnaB: DesignDNA): number {
  const pairs: [string, string][] = [
    [dnaA.colors.primary.hex, dnaB.colors.primary.hex],
    [dnaA.colors.secondary.hex, dnaB.colors.secondary.hex],
    [dnaA.colors.accent.hex, dnaB.colors.accent.hex],
  ];

  let totalDist = 0;
  for (const [a, b] of pairs) {
    const [r1, g1, b1] = hexToRgb(a);
    const [r2, g2, b2] = hexToRgb(b);
    totalDist += Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  // Max possible distance per pair = sqrt(255^2 * 3) ~ 441.67
  const maxDistPerPair = Math.sqrt(255 * 255 * 3);
  const maxTotal = maxDistPerPair * pairs.length;
  return Math.round(Math.min(100, (totalDist / maxTotal) * 100));
}

/**
 * Compute typography similarity between two designs.
 * Returns 0-100 (100 = identical).
 */
export function computeTypographySimilarity(dnaA: DesignDNA, dnaB: DesignDNA): number {
  let score = 100;

  // Same heading font family = +0, different = -30
  if (dnaA.typography.headingFont.family.toLowerCase() !== dnaB.typography.headingFont.family.toLowerCase()) {
    score -= 30;
  }
  // Same body font family = +0, different = -30
  if (dnaA.typography.bodyFont.family.toLowerCase() !== dnaB.typography.bodyFont.family.toLowerCase()) {
    score -= 30;
  }
  // Same heading style = +0, different = -20
  if (dnaA.typography.headingFont.style !== dnaB.typography.headingFont.style) {
    score -= 20;
  }
  // Weight difference: up to -20 points
  const weightDiff = Math.abs(dnaA.typography.headingFont.weight - dnaB.typography.headingFont.weight);
  score -= Math.min(20, (weightDiff / 50) * 20);

  return Math.max(0, Math.round(score));
}

/**
 * Compute the overall similarity score from sub-metrics.
 * Returns 0-100.
 */
export function computeOverallSimilarity(
  colorDistance: number,
  typographySimilarity: number,
  personalityDelta: { formality: number; energy: number; warmth: number }
): number {
  const personalityScore = Math.max(
    0,
    100 - (Math.abs(personalityDelta.formality) + Math.abs(personalityDelta.energy) + Math.abs(personalityDelta.warmth)) * 10
  );
  return Math.round(
    (100 - colorDistance) * 0.4 +
    typographySimilarity * 0.4 +
    personalityScore * 0.2
  );
}

export function useBrandComparison() {
  const [data, setData] = useState<BrandComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (
    supabase: SupabaseClient,
    projectId: string,
    brandAId: string,
    brandBId: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      // Load both brands' design DNA from brand_design_dna table
      const [rowA, rowB] = await Promise.all([
        supabase.from('brand_design_dna').select('*').eq('id', brandAId).maybeSingle(),
        supabase.from('brand_design_dna').select('*').eq('id', brandBId).maybeSingle(),
      ]);

      if (!rowA.data || !rowB.data) {
        setError('Could not load one or both brand profiles');
        setLoading(false);
        return;
      }

      const dnaA = rowA.data.design_dna as DesignDNA;
      const dnaB = rowB.data.design_dna as DesignDNA;

      // Try to load style guides for each brand
      const safeUrl = (url: string) => url.startsWith('http') ? url : `https://${url}`;
      const hostnameA = new URL(safeUrl(rowA.data.source_url)).hostname;
      const hostnameB = new URL(safeUrl(rowB.data.source_url)).hostname;

      const userId = (await supabase.auth.getUser()).data.user?.id;
      let styleGuideA: StyleGuide | undefined;
      let styleGuideB: StyleGuide | undefined;

      if (userId) {
        const [sgA, sgB] = await Promise.all([
          loadStyleGuide(supabase, userId, hostnameA),
          loadStyleGuide(supabase, userId, hostnameB),
        ]);
        if (sgA) styleGuideA = sgA.style_guide;
        if (sgB) styleGuideB = sgB.style_guide;
      }

      // Compute comparisons
      const colorDistance = dnaA && dnaB ? computeColorDistance(dnaA, dnaB) : 50;
      const typographySimilarity = dnaA && dnaB ? computeTypographySimilarity(dnaA, dnaB) : 50;
      const personalityDelta = {
        formality: (dnaA?.personality?.formality || 3) - (dnaB?.personality?.formality || 3),
        energy: (dnaA?.personality?.energy || 3) - (dnaB?.personality?.energy || 3),
        warmth: (dnaA?.personality?.warmth || 3) - (dnaB?.personality?.warmth || 3),
      };
      const overallSimilarity = computeOverallSimilarity(colorDistance, typographySimilarity, personalityDelta);

      setData({
        brandA: {
          id: brandAId,
          sourceUrl: rowA.data.source_url,
          designDna: dnaA,
          styleGuide: styleGuideA,
          screenshotBase64: rowA.data.screenshot_base64,
        },
        brandB: {
          id: brandBId,
          sourceUrl: rowB.data.source_url,
          designDna: dnaB,
          styleGuide: styleGuideB,
          screenshotBase64: rowB.data.screenshot_base64,
        },
        comparison: {
          colorDistance,
          typographySimilarity,
          personalityDelta,
          overallSimilarity,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, loading, error, compare, reset };
}
