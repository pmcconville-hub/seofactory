/**
 * useBrandExtraction Hook
 *
 * Orchestrates the full brand extraction flow from URL discovery
 * through component extraction.
 */

import { useState, useCallback } from 'react';
import { UrlDiscoveryService, type UrlSuggestion } from '../services/brand-extraction/UrlDiscoveryService';
// NOTE: PageCrawler uses Playwright (Node.js only) - must be dynamically imported
// import { PageCrawler } from '../services/brand-extraction/PageCrawler';
import { ExtractionAnalyzer } from '../services/brand-extraction/ExtractionAnalyzer';
import { ComponentLibrary } from '../services/brand-extraction/ComponentLibrary';
import type { ExtractedComponent, BrandExtraction, PageCaptureResult } from '../types/brandExtraction';
import { supabase } from '../lib/supabase';

// Browser-compatible stub - actual crawling must happen server-side
const PageCrawlerStub = {
  async capturePage(url: string): Promise<PageCaptureResult> {
    throw new Error(
      'PageCrawler requires server-side execution (Playwright). ' +
      'Use the /api/brand-extraction endpoint instead.'
    );
  }
};

// ============================================================================
// TYPES
// ============================================================================

export type ExtractionPhase =
  | 'idle'
  | 'discovering'
  | 'selecting'
  | 'extracting'
  | 'analyzing'
  | 'complete'
  | 'error';

export interface ExtractionProgress {
  phase: ExtractionPhase;
  currentUrl?: string;
  completedUrls: number;
  totalUrls: number;
  message: string;
}

export interface UseBrandExtractionResult {
  // State
  phase: ExtractionPhase;
  progress: ExtractionProgress;
  suggestions: UrlSuggestion[];
  selectedUrls: string[];
  extractedComponents: ExtractedComponent[];
  error: string | null;

  // Actions
  discoverUrls: (domain: string) => Promise<void>;
  toggleUrlSelection: (url: string) => void;
  selectAllUrls: () => void;
  clearSelection: () => void;
  startExtraction: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialProgress: ExtractionProgress = {
  phase: 'idle',
  completedUrls: 0,
  totalUrls: 0,
  message: 'Ready to start'
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useBrandExtraction(
  projectId: string,
  aiProvider: 'gemini' | 'anthropic',
  apiKey: string
): UseBrandExtractionResult {
  // State
  const [phase, setPhase] = useState<ExtractionPhase>('idle');
  const [progress, setProgress] = useState<ExtractionProgress>(initialProgress);
  const [suggestions, setSuggestions] = useState<UrlSuggestion[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [extractedComponents, setExtractedComponents] = useState<ExtractedComponent[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Discover URLs from a domain
   * Auto-selects top 5 suggestions after discovery
   */
  const discoverUrls = useCallback(async (domain: string) => {
    setPhase('discovering');
    setError(null);
    setProgress({
      phase: 'discovering',
      completedUrls: 0,
      totalUrls: 0,
      message: `Discovering pages on ${domain}...`
    });

    try {
      const discoveryService = new UrlDiscoveryService();
      const discovered = await discoveryService.discoverUrls(domain);

      setSuggestions(discovered);

      // Auto-select top 5 suggestions
      const topUrls = discovered.slice(0, 5).map(s => s.url);
      setSelectedUrls(topUrls);

      setPhase('selecting');
      setProgress({
        phase: 'selecting',
        completedUrls: 0,
        totalUrls: discovered.length,
        message: `Found ${discovered.length} pages. Select pages to extract.`
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to discover URLs';
      setError(message);
      setPhase('error');
      setProgress({
        phase: 'error',
        completedUrls: 0,
        totalUrls: 0,
        message: `Error: ${message}`
      });
    }
  }, []);

  /**
   * Toggle URL selection
   */
  const toggleUrlSelection = useCallback((url: string) => {
    setSelectedUrls(prev => {
      if (prev.includes(url)) {
        return prev.filter(u => u !== url);
      } else {
        return [...prev, url];
      }
    });
  }, []);

  /**
   * Select all suggested URLs
   */
  const selectAllUrls = useCallback(() => {
    setSelectedUrls(suggestions.map(s => s.url));
  }, [suggestions]);

  /**
   * Clear all selections
   */
  const clearSelection = useCallback(() => {
    setSelectedUrls([]);
  }, []);

  /**
   * Start extraction process for selected URLs
   */
  const startExtraction = useCallback(async () => {
    if (selectedUrls.length === 0) {
      setError('No URLs selected');
      return;
    }

    setPhase('extracting');
    setError(null);
    setExtractedComponents([]);

    const totalUrls = selectedUrls.length;
    // PageCrawler uses Playwright (Node.js only) - must call server-side API
    // const crawler = new PageCrawler({ headless: true, timeout: 30000 });
    const analyzer = new ExtractionAnalyzer({ provider: aiProvider, apiKey });
    const library = new ComponentLibrary(projectId);

    try {
      for (let i = 0; i < selectedUrls.length; i++) {
        const url = selectedUrls[i];

        // Update progress - extracting
        setProgress({
          phase: 'extracting',
          currentUrl: url,
          completedUrls: i,
          totalUrls,
          message: `Capturing page ${i + 1}/${totalUrls}: ${url}`
        });

        // Capture page via server-side API (PageCrawler requires Playwright/Node.js)
        const captureResult = await PageCrawlerStub.capturePage(url);

        // Save extraction to database
        const extractionId = crypto.randomUUID();
        const extraction: BrandExtraction = {
          id: extractionId,
          projectId,
          sourceUrl: captureResult.sourceUrl,
          pageType: captureResult.pageType,
          screenshotBase64: captureResult.screenshotBase64,
          rawHtml: captureResult.rawHtml,
          computedStyles: captureResult.computedStyles,
          extractedAt: captureResult.capturedAt
        };

        // Store extraction in database
        await supabase.from('brand_extractions').upsert({
          id: extraction.id,
          project_id: extraction.projectId,
          source_url: extraction.sourceUrl,
          page_type: extraction.pageType,
          screenshot_base64: extraction.screenshotBase64,
          raw_html: extraction.rawHtml,
          computed_styles: extraction.computedStyles,
          extracted_at: extraction.extractedAt
        });

        // Update progress - analyzing
        setPhase('analyzing');
        setProgress({
          phase: 'analyzing',
          currentUrl: url,
          completedUrls: i,
          totalUrls,
          message: `Analyzing design ${i + 1}/${totalUrls}: ${url}`
        });

        // Analyze with ExtractionAnalyzer
        const analysisResult = await analyzer.analyze({
          screenshotBase64: captureResult.screenshotBase64,
          rawHtml: captureResult.rawHtml
        });

        // Save components to ComponentLibrary
        for (const component of analysisResult.components) {
          const fullComponent: ExtractedComponent = {
            id: crypto.randomUUID(),
            extractionId,
            projectId,
            visualDescription: component.visualDescription,
            componentType: component.componentType,
            literalHtml: component.literalHtml,
            literalCss: component.literalCss,
            theirClassNames: component.theirClassNames,
            contentSlots: component.contentSlots,
            boundingBox: component.boundingBox,
            createdAt: new Date().toISOString()
          };

          await library.saveComponent(fullComponent);
          setExtractedComponents(prev => [...prev, fullComponent]);
        }

        // Save tokens to database
        const tokensId = crypto.randomUUID();
        await supabase.from('brand_tokens').upsert({
          id: tokensId,
          project_id: projectId,
          colors: analysisResult.tokens.colors,
          typography: analysisResult.tokens.typography,
          spacing: analysisResult.tokens.spacing,
          shadows: analysisResult.tokens.shadows,
          borders: analysisResult.tokens.borders,
          gradients: analysisResult.tokens.gradients,
          extracted_from: analysisResult.tokens.extractedFrom,
          extracted_at: new Date().toISOString()
        });

        // Back to extracting phase for next URL
        setPhase('extracting');
      }

      // Close crawler
      await crawler.close();

      // Complete
      setPhase('complete');
      setProgress({
        phase: 'complete',
        completedUrls: totalUrls,
        totalUrls,
        message: `Extraction complete! Extracted components from ${totalUrls} pages.`
      });
    } catch (err) {
      await crawler.close();
      const message = err instanceof Error ? err.message : 'Extraction failed';
      setError(message);
      setPhase('error');
      setProgress({
        phase: 'error',
        completedUrls: progress.completedUrls,
        totalUrls,
        message: `Error: ${message}`
      });
    }
  }, [selectedUrls, projectId, aiProvider, apiKey, progress.completedUrls]);

  /**
   * Reset to idle state
   */
  const reset = useCallback(() => {
    setPhase('idle');
    setProgress(initialProgress);
    setSuggestions([]);
    setSelectedUrls([]);
    setExtractedComponents([]);
    setError(null);
  }, []);

  return {
    // State
    phase,
    progress,
    suggestions,
    selectedUrls,
    extractedComponents,
    error,

    // Actions
    discoverUrls,
    toggleUrlSelection,
    selectAllUrls,
    clearSelection,
    startExtraction,
    reset
  };
}
