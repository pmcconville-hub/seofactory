// services/brand-replication/phase1-discovery/index.ts

import {
  BaseModule,
  type DiscoveryInput,
  type DiscoveryOutput,
  type DiscoveryConfig,
  type ValidationResult,
} from '../interfaces';
import { ScreenshotCapture } from './ScreenshotCapture';
import { VisualAnalyzer } from './VisualAnalyzer';
import { DEFAULT_DISCOVERY_CONFIG } from '../config';

export class DiscoveryModule extends BaseModule<DiscoveryInput, DiscoveryOutput, DiscoveryConfig> {
  private screenshotCapture: ScreenshotCapture;
  private visualAnalyzer: VisualAnalyzer;

  constructor(config: DiscoveryConfig) {
    super(config);

    this.screenshotCapture = new ScreenshotCapture({
      viewport: DEFAULT_DISCOVERY_CONFIG.viewport,
      timeout: DEFAULT_DISCOVERY_CONFIG.timeout,
      outputDir: config.screenshotDir,
    });

    this.visualAnalyzer = new VisualAnalyzer({
      aiProvider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.model,
      customPrompt: config.customPrompt,
      minOccurrences: config.minOccurrences ?? DEFAULT_DISCOVERY_CONFIG.minOccurrences,
      confidenceThreshold: config.confidenceThreshold ?? DEFAULT_DISCOVERY_CONFIG.confidenceThreshold,
    });
  }

  getPhaseName(): string {
    return 'discovery';
  }

  async run(input: DiscoveryInput): Promise<DiscoveryOutput> {
    this.updateStatus({ status: 'running', progress: 0, startedAt: new Date().toISOString() });

    try {
      // Step 1: Capture screenshots
      this.updateStatus({ progress: 20, message: 'Capturing screenshots...' });
      const screenshots = await this.screenshotCapture.capturePages(input);

      if (screenshots.length === 0) {
        throw new Error('No screenshots captured');
      }

      // Step 2: Analyze visually
      this.updateStatus({ progress: 50, message: 'Analyzing visual patterns...' });
      const { components, rawAnalysis } = await this.visualAnalyzer.analyze(screenshots);

      this.lastRawResponse = rawAnalysis;

      // Step 3: Build output
      const output: DiscoveryOutput = {
        brandId: input.brandId,
        brandUrl: input.brandUrl,
        analyzedPages: screenshots.map(s => s.url),
        screenshots,
        discoveredComponents: components,
        rawAnalysis,
        timestamp: new Date().toISOString(),
        status: components.length > 0 ? 'success' : 'partial',
      };

      this.updateStatus({ status: output.status, progress: 100, completedAt: new Date().toISOString() });

      return output;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus({ status: 'failed', message: errorMessage });

      return {
        brandId: input.brandId,
        brandUrl: input.brandUrl,
        analyzedPages: [],
        screenshots: [],
        discoveredComponents: [],
        rawAnalysis: this.lastRawResponse,
        timestamp: new Date().toISOString(),
        status: 'failed',
        errors: [errorMessage],
      };
    }
  }

  validateOutput(output: DiscoveryOutput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (output.status === 'failed') {
      errors.push('Discovery failed: ' + (output.errors?.join(', ') ?? 'unknown error'));
    }

    if (output.screenshots.length === 0) {
      errors.push('No screenshots were captured');
    }

    if (output.discoveredComponents.length === 0) {
      warnings.push('No components were discovered');
    }

    if (output.discoveredComponents.length < 3) {
      warnings.push('Fewer than 3 components discovered - may need manual additions');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export { ScreenshotCapture } from './ScreenshotCapture';
export { VisualAnalyzer } from './VisualAnalyzer';
