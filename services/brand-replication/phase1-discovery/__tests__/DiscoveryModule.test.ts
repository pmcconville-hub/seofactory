// services/brand-replication/phase1-discovery/__tests__/DiscoveryModule.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  DiscoveryInput,
  DiscoveryOutput,
  DiscoveryConfig,
  DiscoveredComponent,
  Screenshot,
} from '../../interfaces';

// Mock playwright BEFORE importing modules that use it
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(undefined),
          waitForSelector: vi.fn().mockResolvedValue(undefined),
          waitForTimeout: vi.fn().mockResolvedValue(undefined),
          screenshot: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
          $$eval: vi.fn().mockResolvedValue([]),
        }),
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock fs
vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue(Buffer.from('fake-image-data')),
}));

// Mock AI SDKs - these MUST be defined before any code that imports them
// Use class syntax to properly mock constructors
const mockAnthropicResponse = {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        components: [
          {
            name: 'Hero Section',
            purpose: 'Main visual impact',
            visualDescription: 'Large hero with background image',
            usageContext: 'Homepage top',
            occurrences: 3,
            confidence: 0.9,
          },
          {
            name: 'Service Card',
            purpose: 'Display services',
            visualDescription: 'Card with icon and text',
            usageContext: 'Services section',
            occurrences: 2,
            confidence: 0.85,
          },
        ],
        brandObservations: 'Clean modern design',
      }),
    },
  ],
};

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: vi.fn().mockResolvedValue(mockAnthropicResponse),
      };
    },
  };
});

// Mock Google Generative AI with virtual module since the package isn't installed
const mockGeminiResponse = JSON.stringify({
  components: [
    {
      name: 'Hero Section',
      purpose: 'Main visual impact',
      visualDescription: 'Large hero with background image',
      usageContext: 'Homepage top',
      occurrences: 3,
      confidence: 0.9,
    },
  ],
  brandObservations: 'Clean modern design',
});

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      getGenerativeModel() {
        return {
          generateContent: vi.fn().mockResolvedValue({
            response: {
              text: () => mockGeminiResponse,
            },
          }),
        };
      }
    },
  };
})

// Import after mocks are set up
import { DiscoveryModule, ScreenshotCapture, VisualAnalyzer } from '../index';

// Test fixtures
const createDiscoveryConfig = (overrides: Partial<DiscoveryConfig> = {}): DiscoveryConfig => ({
  aiProvider: 'anthropic',
  apiKey: 'test-api-key',
  minOccurrences: 2,
  confidenceThreshold: 0.7,
  screenshotDir: './tmp/test-screenshots',
  ...overrides,
});

const createDiscoveryInput = (overrides: Partial<DiscoveryInput> = {}): DiscoveryInput => ({
  brandId: 'test-brand',
  brandUrl: 'https://example.com',
  pagesToAnalyze: ['https://example.com', 'https://example.com/about'],
  options: {
    maxPages: 5,
  },
  ...overrides,
});

const createMockScreenshot = (url: string): Screenshot => ({
  url,
  path: `/tmp/screenshots/test_${Date.now()}_home.png`,
  timestamp: new Date().toISOString(),
  viewport: { width: 1400, height: 900 },
});

const createMockDiscoveredComponent = (id: string): DiscoveredComponent => ({
  id,
  name: `Component ${id}`,
  purpose: 'Test purpose',
  visualDescription: 'Test visual description',
  usageContext: 'Test context',
  sourceScreenshots: ['screenshot1.png'],
  occurrences: 3,
  confidence: 0.85,
});

const createSuccessfulOutput = (brandId: string): DiscoveryOutput => ({
  brandId,
  brandUrl: 'https://example.com',
  analyzedPages: ['https://example.com'],
  screenshots: [createMockScreenshot('https://example.com')],
  discoveredComponents: [
    createMockDiscoveredComponent('comp-1'),
    createMockDiscoveredComponent('comp-2'),
    createMockDiscoveredComponent('comp-3'),
  ],
  rawAnalysis: 'Raw analysis text',
  timestamp: new Date().toISOString(),
  status: 'success',
});

const createPartialOutput = (brandId: string): DiscoveryOutput => ({
  brandId,
  brandUrl: 'https://example.com',
  analyzedPages: ['https://example.com'],
  screenshots: [createMockScreenshot('https://example.com')],
  discoveredComponents: [],
  rawAnalysis: 'Raw analysis text',
  timestamp: new Date().toISOString(),
  status: 'partial',
});

const createFailedOutput = (brandId: string, error: string): DiscoveryOutput => ({
  brandId,
  brandUrl: 'https://example.com',
  analyzedPages: [],
  screenshots: [],
  discoveredComponents: [],
  rawAnalysis: '',
  timestamp: new Date().toISOString(),
  status: 'failed',
  errors: [error],
});

describe('DiscoveryModule', () => {
  let module: DiscoveryModule;
  let config: DiscoveryConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    config = createDiscoveryConfig();
    module = new DiscoveryModule(config);
  });

  describe('getPhaseName', () => {
    it('should return "discovery"', () => {
      expect(module.getPhaseName()).toBe('discovery');
    });
  });

  describe('getStatus', () => {
    it('should return initial pending status', () => {
      const status = module.getStatus();
      expect(status.phase).toBe('discovery');
      expect(status.status).toBe('pending');
      expect(status.progress).toBe(0);
    });
  });

  describe('validateOutput', () => {
    it('should return valid for successful output with components', () => {
      const output = createSuccessfulOutput('test-brand');
      const result = module.validateOutput(output);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return invalid for failed output', () => {
      const output = createFailedOutput('test-brand', 'Screenshot capture failed');
      const result = module.validateOutput(output);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Discovery failed: Screenshot capture failed');
    });

    it('should return invalid when no screenshots captured', () => {
      const output = createSuccessfulOutput('test-brand');
      output.screenshots = [];
      const result = module.validateOutput(output);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('No screenshots were captured');
    });

    it('should add warning when no components discovered', () => {
      const output = createPartialOutput('test-brand');
      const result = module.validateOutput(output);

      expect(result.valid).toBe(true); // Valid but with warnings
      expect(result.warnings).toContain('No components were discovered');
    });

    it('should add warning when fewer than 3 components discovered', () => {
      const output = createSuccessfulOutput('test-brand');
      output.discoveredComponents = [createMockDiscoveredComponent('comp-1')];
      const result = module.validateOutput(output);

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Fewer than 3 components discovered - may need manual additions');
    });
  });

  describe('getLastRawResponse', () => {
    it('should return empty string initially', () => {
      expect(module.getLastRawResponse()).toBe('');
    });
  });
});

describe('ScreenshotCapture', () => {
  let screenshotCapture: ScreenshotCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    screenshotCapture = new ScreenshotCapture({
      outputDir: './tmp/test-screenshots',
    });
  });

  describe('constructor', () => {
    it('should use default config when no config provided', () => {
      const capture = new ScreenshotCapture();
      // Constructor doesn't expose config directly, but we can test behavior
      expect(capture).toBeInstanceOf(ScreenshotCapture);
    });

    it('should merge provided config with defaults', () => {
      const capture = new ScreenshotCapture({
        viewport: { width: 1920, height: 1080 },
        timeout: 60000,
      });
      expect(capture).toBeInstanceOf(ScreenshotCapture);
    });
  });

  describe('capturePages', () => {
    it('should capture screenshots for provided pages', async () => {
      const input = createDiscoveryInput();
      const screenshots = await screenshotCapture.capturePages(input);

      expect(screenshots).toHaveLength(2);
      expect(screenshots[0].url).toBe('https://example.com');
      expect(screenshots[1].url).toBe('https://example.com/about');
    });

    it('should respect maxPages option', async () => {
      const input = createDiscoveryInput({
        pagesToAnalyze: [
          'https://example.com',
          'https://example.com/about',
          'https://example.com/services',
          'https://example.com/contact',
        ],
        options: { maxPages: 2 },
      });

      const screenshots = await screenshotCapture.capturePages(input);
      expect(screenshots).toHaveLength(2);
    });
  });
});

describe('VisualAnalyzer', () => {
  describe('with Anthropic provider', () => {
    let analyzer: VisualAnalyzer;

    beforeEach(() => {
      vi.clearAllMocks();
      analyzer = new VisualAnalyzer({
        aiProvider: 'anthropic',
        apiKey: 'test-api-key',
        minOccurrences: 2,
        confidenceThreshold: 0.7,
      });
    });

    it('should analyze screenshots and return components', async () => {
      const screenshots: Screenshot[] = [
        createMockScreenshot('https://example.com'),
        createMockScreenshot('https://example.com/about'),
      ];

      const result = await analyzer.analyze(screenshots);

      expect(result.components).toHaveLength(2);
      expect(result.components[0].name).toBe('Hero Section');
      expect(result.rawAnalysis).toBeTruthy();
    });

    it('should filter components by minOccurrences', async () => {
      const screenshots: Screenshot[] = [createMockScreenshot('https://example.com')];

      // The mock returns components with occurrences 3 and 2
      // With minOccurrences of 3, only one should pass
      const strictAnalyzer = new VisualAnalyzer({
        aiProvider: 'anthropic',
        apiKey: 'test-api-key',
        minOccurrences: 3,
        confidenceThreshold: 0.7,
      });

      const result = await strictAnalyzer.analyze(screenshots);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Hero Section');
    });

    it('should filter components by confidenceThreshold', async () => {
      const screenshots: Screenshot[] = [createMockScreenshot('https://example.com')];

      // The mock returns components with confidence 0.9 and 0.85
      // With threshold of 0.87, only one should pass
      const strictAnalyzer = new VisualAnalyzer({
        aiProvider: 'anthropic',
        apiKey: 'test-api-key',
        minOccurrences: 1,
        confidenceThreshold: 0.87,
      });

      const result = await strictAnalyzer.analyze(screenshots);
      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Hero Section');
    });

    it('should store raw response', async () => {
      const screenshots: Screenshot[] = [createMockScreenshot('https://example.com')];

      await analyzer.analyze(screenshots);
      const rawResponse = analyzer.getLastRawResponse();

      expect(rawResponse).toBeTruthy();
      expect(rawResponse).toContain('Hero Section');
    });
  });

  describe('with Gemini provider', () => {
    let analyzer: VisualAnalyzer;

    beforeEach(() => {
      vi.clearAllMocks();
      analyzer = new VisualAnalyzer({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        minOccurrences: 2,
        confidenceThreshold: 0.7,
      });
    });

    it('should analyze screenshots using Gemini', async () => {
      const screenshots: Screenshot[] = [createMockScreenshot('https://example.com')];

      const result = await analyzer.analyze(screenshots);

      expect(result.components).toHaveLength(1);
      expect(result.components[0].name).toBe('Hero Section');
    });
  });

  describe('custom prompt', () => {
    it('should use custom prompt when provided', async () => {
      const customPrompt = 'Custom analysis prompt';
      const analyzer = new VisualAnalyzer({
        aiProvider: 'anthropic',
        apiKey: 'test-api-key',
        customPrompt,
        minOccurrences: 2,
        confidenceThreshold: 0.7,
      });

      const screenshots: Screenshot[] = [createMockScreenshot('https://example.com')];
      const result = await analyzer.analyze(screenshots);

      // We can't directly verify the prompt was used, but the analyzer should work
      expect(result.components).toBeDefined();
    });
  });
});

describe('Status tracking', () => {
  let module: DiscoveryModule;

  beforeEach(() => {
    vi.clearAllMocks();
    module = new DiscoveryModule(createDiscoveryConfig());
  });

  it('should update status during execution', async () => {
    const input = createDiscoveryInput();

    // Initial status
    expect(module.getStatus().status).toBe('pending');
    expect(module.getStatus().progress).toBe(0);

    // Run will update status through the process
    // Note: we're testing the final status since the intermediate states
    // are updated synchronously within run()
    await module.run(input);

    const finalStatus = module.getStatus();
    expect(finalStatus.progress).toBe(100);
    expect(['success', 'partial', 'failed']).toContain(finalStatus.status);
    expect(finalStatus.completedAt).toBeDefined();
  });
});

describe('runWithPrompt', () => {
  let module: DiscoveryModule;

  beforeEach(() => {
    vi.clearAllMocks();
    module = new DiscoveryModule(createDiscoveryConfig());
  });

  it('should run with custom prompt and restore original', async () => {
    const input = createDiscoveryInput();
    const customPrompt = 'Custom discovery prompt';

    const originalConfig = module['config'].customPrompt;

    await module.runWithPrompt(input, customPrompt);

    // Config should be restored to original
    expect(module['config'].customPrompt).toBe(originalConfig);
  });
});
