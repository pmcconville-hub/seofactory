// hooks/useStyleguideGenerator.ts
// React hook for managing styleguide generation lifecycle.

import { useState, useCallback, useMemo } from 'react';
import type { StyleguideProgress, BrandStyleguideData } from '../services/styleguide-generator/types';
import type { StyleguideResult } from '../services/styleguide-generator/StyleguideOrchestrator';
import { generateStyleguide, buildStorageData } from '../services/styleguide-generator/StyleguideOrchestrator';
import {
  initStyleguideStorage,
  uploadStyleguideHtml,
  getStyleguideUrl,
  saveStyleguideData,
} from '../services/styleguide-generator/storage/StyleguideStorage';
import type { BusinessInfo } from '../types';

export interface UseStyleguideGeneratorOptions {
  projectId: string;
  mapId: string;
  domain: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<unknown>;
  supabaseUrl: string;
  supabaseKey: string;
  existingData: BrandStyleguideData | null;
  onComplete?: (data: BrandStyleguideData) => void;
}

export interface UseStyleguideGeneratorReturn {
  /** Whether generation is currently in progress */
  isGenerating: boolean;
  /** Current progress during generation */
  progress: StyleguideProgress | null;
  /** Error message, if any */
  error: string | null;
  /** Last generation result */
  result: StyleguideResult | null;
  /** Trigger styleguide generation */
  generate: () => Promise<StyleguideResult>;
  /** Open the styleguide in a new tab */
  preview: () => void;
  /** Download the styleguide HTML */
  download: () => void;
}

export function useStyleguideGenerator(options: UseStyleguideGeneratorOptions): UseStyleguideGeneratorReturn {
  const {
    projectId,
    mapId,
    domain,
    businessInfo,
    dispatch,
    supabaseUrl,
    supabaseKey,
    existingData,
    onComplete,
  } = options;

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<StyleguideProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StyleguideResult | null>(null);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);

    try {
      // Initialize storage
      initStyleguideStorage(supabaseUrl, supabaseKey);

      // Run the generation pipeline
      const generationResult = await generateStyleguide({
        domain,
        businessInfo,
        dispatch,
        onProgress: setProgress,
      });

      setResult(generationResult);

      // Upload HTML to Supabase Storage
      setProgress({
        phase: 'storing',
        phaseLabel: 'Saving to storage...',
        sectionsCompleted: generationResult.quality.structural.sectionCount.found,
        sectionsTotal: 48,
      });

      const storagePath = await uploadStyleguideHtml(projectId, mapId, generationResult.html);

      // Save tokens + metadata to map record
      const version = (existingData?.version || 0) + 1;
      const storageData = buildStorageData(generationResult, storagePath, version);
      await saveStyleguideData(mapId, storageData);

      onComplete?.(storageData);

      setProgress({
        phase: 'complete',
        phaseLabel: `Styleguide ready (score: ${generationResult.quality.overallScore}/100)`,
        sectionsCompleted: generationResult.quality.structural.sectionCount.found,
        sectionsTotal: 48,
      });

      return generationResult;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Styleguide generation failed';
      setError(message);
      setProgress({
        phase: 'error',
        phaseLabel: message,
        sectionsCompleted: 0,
        sectionsTotal: 48,
        error: message,
      });
      throw e;
    } finally {
      setIsGenerating(false);
    }
  }, [domain, businessInfo, dispatch, supabaseUrl, supabaseKey, projectId, mapId, existingData, onComplete]);

  const preview = useCallback(() => {
    if (result?.html) {
      // Open generated HTML in a new tab
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else if (existingData?.htmlStorageKey) {
      // Open stored HTML via Supabase public URL
      try {
        initStyleguideStorage(supabaseUrl, supabaseKey);
        const url = getStyleguideUrl(existingData.htmlStorageKey);
        window.open(url, '_blank');
      } catch {
        console.warn('[useStyleguideGenerator] Could not get storage URL');
      }
    }
  }, [result, existingData, supabaseUrl, supabaseKey]);

  const download = useCallback(() => {
    if (!result?.html && !existingData) return;

    const html = result?.html;
    if (html) {
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `styleguide-${domain.replace(/[^a-z0-9]/gi, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [result, existingData, domain]);

  return useMemo(() => ({
    isGenerating,
    progress,
    error,
    result,
    generate,
    preview,
    download,
  }), [isGenerating, progress, error, result, generate, preview, download]);
}
