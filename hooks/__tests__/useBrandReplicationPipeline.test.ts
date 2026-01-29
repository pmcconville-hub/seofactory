/**
 * Tests for useBrandReplicationPipeline Hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useBrandReplicationPipeline } from '../useBrandReplicationPipeline';

// Mock the brand replication pipeline
vi.mock('../../services/brand-replication', () => ({
  BrandReplicationPipeline: vi.fn().mockImplementation(() => ({
    runDiscovery: vi.fn().mockResolvedValue({
      brandId: 'test-brand',
      brandUrl: 'https://example.com',
      analyzedPages: ['https://example.com'],
      screenshots: [{ url: 'https://example.com', path: '/tmp/screenshot.png', timestamp: '2024-01-01', viewport: { width: 1200, height: 800 } }],
      discoveredComponents: [
        { id: 'comp-1', name: 'Hero Section', purpose: 'Main hero', visualDescription: 'Large hero', usageContext: 'homepage', sourceScreenshots: ['/tmp/screenshot.png'], occurrences: 2, confidence: 0.9 }
      ],
      rawAnalysis: 'Analysis data',
      timestamp: '2024-01-01',
      status: 'success',
    }),
    runCodeGen: vi.fn().mockResolvedValue({
      brandId: 'test-brand',
      components: [
        { id: 'comp-1', brandId: 'test-brand', name: 'Hero Section', purpose: 'Main hero', usageContext: 'homepage', css: '.hero { }', htmlTemplate: '<div class="hero"></div>', previewHtml: '<div>Preview</div>', matchScore: 0.85, variants: [], createdAt: '2024-01-01', updatedAt: '2024-01-01' }
      ],
      compiledCss: '.hero { color: blue; }',
      timestamp: '2024-01-01',
      status: 'success',
      matchScores: [{ componentId: 'comp-1', score: 0.85, details: 'Good match' }],
    }),
    runIntelligence: vi.fn().mockResolvedValue({
      brandId: 'test-brand',
      articleId: 'article-1',
      decisions: [
        { sectionId: 'sec-1', sectionHeading: 'Introduction', component: 'Hero Section', componentId: 'comp-1', variant: 'default', layout: { columns: 1, width: 'full', emphasis: 'hero' }, reasoning: 'Good for intro', semanticRole: 'introduction', confidence: 0.9 }
      ],
      overallStrategy: 'Use hero for intro',
      timestamp: '2024-01-01',
      status: 'success',
    }),
    runValidation: vi.fn().mockResolvedValue({
      brandId: 'test-brand',
      articleId: 'article-1',
      scores: {
        brandMatch: { score: 85, maxScore: 100, percentage: 85, details: [], suggestions: [] },
        designQuality: { score: 80, maxScore: 100, percentage: 80, details: [], suggestions: [] },
        userExperience: { score: 90, maxScore: 100, percentage: 90, details: [], suggestions: [] },
        overall: 85,
      },
      wowFactorChecklist: [
        { id: 'wow-1', label: 'Visual Impact', description: 'Strong visual presence', required: true, passed: true }
      ],
      passesThreshold: true,
      suggestions: [],
      timestamp: '2024-01-01',
      status: 'success',
    }),
    getStatus: vi.fn().mockReturnValue({
      phase1: { phase: 'discovery', status: 'pending', progress: 0 },
      phase2: { phase: 'codegen', status: 'pending', progress: 0 },
      phase3: { phase: 'intelligence', status: 'pending', progress: 0 },
      phase4: { phase: 'validation', status: 'pending', progress: 0 },
      overall: 'idle',
    }),
    storage: {},
  })),
}));

describe('useBrandReplicationPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state when disabled', () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: '',
        enabled: false,
      })
    );

    expect(result.current.state.discoveryOutput).toBeNull();
    expect(result.current.state.codeGenOutput).toBeNull();
    expect(result.current.state.intelligenceOutput).toBeNull();
    expect(result.current.state.validationOutput).toBeNull();
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.pipeline).toBeNull();
  });

  it('should initialize pipeline when enabled with API key', () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        enabled: true,
      })
    );

    expect(result.current.pipeline).not.toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should run discovery phase and update state', async () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        enabled: true,
      })
    );

    await act(async () => {
      await result.current.runDiscovery({
        brandUrl: 'https://example.com',
        brandId: 'test-brand',
      });
    });

    await waitFor(() => {
      expect(result.current.state.discoveryOutput).not.toBeNull();
      expect(result.current.state.discoveryOutput?.discoveredComponents).toHaveLength(1);
    });
  });

  it('should run codegen phase after discovery', async () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        enabled: true,
      })
    );

    // Run discovery first
    await act(async () => {
      await result.current.runDiscovery({
        brandUrl: 'https://example.com',
        brandId: 'test-brand',
      });
    });

    // Then run codegen
    await act(async () => {
      await result.current.runCodeGen(
        result.current.state.discoveryOutput!,
        {
          colors: { primary: { hex: '#000', usage: 'primary' } },
          typography: { headings: { family: 'Arial', weight: 700 } },
          spacing: { baseUnit: 8 },
        } as any
      );
    });

    await waitFor(() => {
      expect(result.current.state.codeGenOutput).not.toBeNull();
      expect(result.current.state.codeGenOutput?.components).toHaveLength(1);
    });
  });

  it('should reset state correctly', async () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        enabled: true,
      })
    );

    // Run discovery
    await act(async () => {
      await result.current.runDiscovery({
        brandUrl: 'https://example.com',
        brandId: 'test-brand',
      });
    });

    // Verify discovery output exists
    expect(result.current.state.discoveryOutput).not.toBeNull();

    // Reset
    act(() => {
      result.current.reset();
    });

    // Verify state is reset
    expect(result.current.state.discoveryOutput).toBeNull();
    expect(result.current.state.codeGenOutput).toBeNull();
    expect(result.current.state.intelligenceOutput).toBeNull();
    expect(result.current.state.validationOutput).toBeNull();
    expect(result.current.state.error).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    // Override mock to throw error
    const mockPipeline = require('../../services/brand-replication').BrandReplicationPipeline;
    mockPipeline.mockImplementationOnce(() => ({
      runDiscovery: vi.fn().mockRejectedValue(new Error('Discovery failed')),
      getStatus: vi.fn().mockReturnValue({
        phase1: { phase: 'discovery', status: 'pending', progress: 0 },
        phase2: { phase: 'codegen', status: 'pending', progress: 0 },
        phase3: { phase: 'intelligence', status: 'pending', progress: 0 },
        phase4: { phase: 'validation', status: 'pending', progress: 0 },
        overall: 'idle',
      }),
      storage: {},
    }));

    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'test-api-key',
        enabled: true,
      })
    );

    await act(async () => {
      await result.current.runDiscovery({
        brandUrl: 'https://example.com',
        brandId: 'test-brand',
      });
    });

    expect(result.current.state.error).toBe('Discovery failed');
  });

  it('should use correct AI provider based on config', () => {
    const { result: geminiResult } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: 'gemini-key',
        enabled: true,
      })
    );

    const { result: anthropicResult } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'anthropic',
        apiKey: 'anthropic-key',
        enabled: true,
      })
    );

    expect(geminiResult.current.pipeline).not.toBeNull();
    expect(anthropicResult.current.pipeline).not.toBeNull();
  });

  it('should not create pipeline without API key', () => {
    const { result } = renderHook(() =>
      useBrandReplicationPipeline({
        aiProvider: 'gemini',
        apiKey: '',
        enabled: true,
      })
    );

    expect(result.current.pipeline).toBeNull();
  });
});
