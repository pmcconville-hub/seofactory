// hooks/useBrandDetection.ts
import { useState, useCallback } from 'react';
import { BrandDiscoveryService } from '../services/design-analysis/BrandDiscoveryService';
import { AIDesignAnalyzer } from '../services/design-analysis/AIDesignAnalyzer';
import { BrandDesignSystemGenerator } from '../services/design-analysis/BrandDesignSystemGenerator';
import {
  initBrandDesignSystemStorage,
  saveDesignDNA,
  saveBrandDesignSystem,
  getDesignDNA,
  getBrandDesignSystem,
  hasDesignSystemForHash,
} from '../services/design-analysis/brandDesignSystemStorage';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../types/designDna';
import type { AnalysisStep } from '../components/publishing/AnalysisProgress';

interface UseBrandDetectionConfig {
  apifyToken: string;
  geminiApiKey?: string;
  anthropicApiKey?: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId?: string;
}

interface BrandDetectionState {
  isAnalyzing: boolean;
  progress: number;
  steps: AnalysisStep[];
  error: string | null;
  result: {
    designDna: DesignDNA;
    designSystem: BrandDesignSystem;
    screenshotBase64: string;
    sourceUrl: string;
    confidence: number;
    fromCache: boolean;
  } | null;
}

const INITIAL_STEPS: AnalysisStep[] = [
  { id: 'screenshot', label: 'Capturing screenshot', status: 'pending' },
  { id: 'colors', label: 'Extracting colors', status: 'pending' },
  { id: 'typography', label: 'Detecting typography', status: 'pending' },
  { id: 'dna', label: 'Analyzing design DNA', status: 'pending' },
  { id: 'generate', label: 'Generating unique styles', status: 'pending' },
];

export function useBrandDetection(config: UseBrandDetectionConfig) {
  const [state, setState] = useState<BrandDetectionState>({
    isAnalyzing: false,
    progress: 0,
    steps: INITIAL_STEPS,
    error: null,
    result: null,
  });

  const updateStep = useCallback((stepId: string, status: AnalysisStep['status']) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, status } : s),
    }));
  }, []);

  const detect = useCallback(async (url: string) => {
    if (!url) return;

    setState({
      isAnalyzing: true,
      progress: 0,
      steps: INITIAL_STEPS.map(s => ({ ...s, status: 'pending' })),
      error: null,
      result: null,
    });

    try {
      // Initialize storage
      initBrandDesignSystemStorage(config.supabaseUrl, config.supabaseAnonKey);

      // Step 1: Capture screenshot and extract basic colors via DOM
      updateStep('screenshot', 'active');
      setState(prev => ({ ...prev, progress: 10 }));

      const discoveryReport = await BrandDiscoveryService.analyze(url, config.apifyToken);
      if (!discoveryReport || !discoveryReport.screenshotBase64) {
        throw new Error('Failed to capture website screenshot');
      }

      updateStep('screenshot', 'complete');
      updateStep('colors', 'active');
      setState(prev => ({ ...prev, progress: 25 }));

      // Step 2: Use AI Vision to extract full Design DNA
      updateStep('colors', 'complete');
      updateStep('typography', 'active');
      setState(prev => ({ ...prev, progress: 40 }));

      const aiProvider = config.geminiApiKey ? 'gemini' : 'anthropic';
      const apiKey = config.geminiApiKey || config.anthropicApiKey;

      if (!apiKey) {
        throw new Error('Gemini or Anthropic API key required for AI analysis');
      }

      const analyzer = new AIDesignAnalyzer({
        provider: aiProvider,
        apiKey,
      });

      updateStep('typography', 'complete');
      updateStep('dna', 'active');
      setState(prev => ({ ...prev, progress: 55 }));

      const dnaResult: DesignDNAExtractionResult = await analyzer.extractDesignDNA(
        discoveryReport.screenshotBase64,
        url
      );

      updateStep('dna', 'complete');
      setState(prev => ({ ...prev, progress: 70 }));

      // Merge DOM-extracted colors into AI DesignDNA when DOM has high confidence
      // DOM extraction gets actual CSS values (precise), AI gets approximations from screenshots
      const findings = discoveryReport.findings;
      if (findings) {
        const dna = dnaResult.designDna;
        if (findings.primaryColor?.confidence === 'found' && findings.primaryColor.value) {
          console.log('[useBrandDetection] Overriding AI primary color', dna.colors.primary.hex, '→', findings.primaryColor.value, '(source:', findings.primaryColor.source, ')');
          dna.colors.primary = { ...dna.colors.primary, hex: findings.primaryColor.value, confidence: 95 };
        }
        if (findings.secondaryColor?.confidence === 'found' && findings.secondaryColor.value) {
          console.log('[useBrandDetection] Overriding AI secondary color', dna.colors.secondary.hex, '→', findings.secondaryColor.value);
          dna.colors.secondary = { ...dna.colors.secondary, hex: findings.secondaryColor.value, confidence: 95 };
        }
        if (findings.accentColor?.confidence === 'found' && findings.accentColor.value) {
          console.log('[useBrandDetection] Overriding AI accent color', dna.colors.accent.hex, '→', findings.accentColor.value);
          dna.colors.accent = { ...dna.colors.accent, hex: findings.accentColor.value, confidence: 95 };
        }
        // Also apply DOM fonts if detected from Google Fonts (more reliable than screenshot inference)
        if (findings.headingFont?.confidence === 'found' && findings.headingFont.value) {
          console.log('[useBrandDetection] Overriding AI heading font →', findings.headingFont.value);
          dna.typography.headingFont.family = findings.headingFont.value;
        }
        if (findings.bodyFont?.confidence === 'found' && findings.bodyFont.value) {
          console.log('[useBrandDetection] Overriding AI body font →', findings.bodyFont.value);
          dna.typography.bodyFont.family = findings.bodyFont.value;
        }
      }

      // Step 3: Check cache before generating
      const generator = new BrandDesignSystemGenerator({
        provider: aiProvider,
        apiKey,
      });

      const dnaHash = generator.computeDesignDnaHash(dnaResult.designDna);

      let designSystem: BrandDesignSystem;
      let fromCache = false;

      if (config.projectId) {
        const hasCache = await hasDesignSystemForHash(config.projectId, dnaHash);
        if (hasCache) {
          const cached = await getBrandDesignSystem(config.projectId);
          if (cached) {
            designSystem = cached;
            fromCache = true;
            updateStep('generate', 'complete');
            setState(prev => ({ ...prev, progress: 100 }));
          }
        }
      }

      // Step 4: Generate design system if not cached
      if (!fromCache) {
        updateStep('generate', 'active');
        setState(prev => ({ ...prev, progress: 85 }));

        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        console.log('[useBrandDetection] Generating brand design system for:', domain);
        console.log('[useBrandDetection] Design DNA colors:', {
          primary: dnaResult.designDna.colors?.primary,
          secondary: dnaResult.designDna.colors?.secondary,
        });

        designSystem = await generator.generate(dnaResult.designDna, domain, url, discoveryReport.screenshotBase64, discoveryReport.googleFontsUrl);

        console.log('[useBrandDetection] Brand design system generated:', {
          brandName: designSystem.brandName,
          hasCompiledCss: !!designSystem.compiledCss,
          compiledCssLength: designSystem.compiledCss?.length || 0,
          designDnaHash: designSystem.designDnaHash,
          componentStyleKeys: designSystem.componentStyles ? Object.keys(designSystem.componentStyles) : [],
        });

        updateStep('generate', 'complete');
        setState(prev => ({ ...prev, progress: 95 }));

        // Save to database (best-effort - continues even if tables don't exist)
        if (config.projectId) {
          console.log('[useBrandDetection] Saving brand data to database for projectId:', config.projectId);
          const dnaId = await saveDesignDNA(config.projectId, dnaResult);
          console.log('[useBrandDetection] Saved Design DNA with id:', dnaId || '(table not found)');
          // dnaId may be null if table doesn't exist yet
          await saveBrandDesignSystem(config.projectId, dnaId, designSystem);
          console.log('[useBrandDetection] Saved Brand Design System');
        }

        setState(prev => ({ ...prev, progress: 100 }));
      }

      // Success!
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        result: {
          designDna: dnaResult.designDna,
          designSystem: designSystem!,
          screenshotBase64: discoveryReport.screenshotBase64,
          sourceUrl: url,
          confidence: dnaResult.designDna.confidence?.overall || 90,
          fromCache,
        },
      }));

    } catch (error) {
      console.error('[useBrandDetection] Error:', error);

      // Mark current active step as error
      setState(prev => ({
        ...prev,
        isAnalyzing: false,
        error: error instanceof Error ? error.message : 'Unknown error during analysis',
        steps: prev.steps.map(s => s.status === 'active' ? { ...s, status: 'error' } : s),
      }));
    }
  }, [config, updateStep]);

  const reset = useCallback(() => {
    setState({
      isAnalyzing: false,
      progress: 0,
      steps: INITIAL_STEPS,
      error: null,
      result: null,
    });
  }, []);

  return {
    ...state,
    detect,
    reset,
  };
}
