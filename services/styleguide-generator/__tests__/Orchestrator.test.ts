import { describe, it, expect, vi } from 'vitest';
import { generateStyleguide, buildStorageData } from '../StyleguideOrchestrator';
import type { BrandAnalysis } from '../types';
import type { BusinessInfo } from '../../../types';

// ============================================================================
// Test fixtures
// ============================================================================

function makeAnalysis(): BrandAnalysis {
  return {
    brandName: 'Test Brand',
    domain: 'testbrand.com',
    industry: 'technology',
    colors: {
      primary: '#3b82f6', secondary: '#8b5cf6', accent: '#f59e0b',
      textDark: '#1a1a1a', textBody: '#374151', backgroundLight: '#ffffff', backgroundDark: '#111827',
      allExtracted: [
        { hex: '#3b82f6', usage: 'background-color', frequency: 10 },
        { hex: '#8b5cf6', usage: 'color', frequency: 5 },
      ],
    },
    typography: {
      headingFont: { family: 'Montserrat', weights: [600, 700] },
      bodyFont: { family: 'Open Sans', weights: [400, 500] },
      sizes: { h1: '2.5rem', h2: '2rem', h3: '1.75rem', h4: '1.5rem', h5: '1.25rem', h6: '1.125rem', body: '1rem', small: '0.875rem' },
      lineHeights: { heading: 1.25, body: 1.6 },
      letterSpacing: { h1: '-0.02em', h2: '-0.015em', h3: '-0.01em', body: '0' },
    },
    spacing: { sectionPadding: { desktop: '80px', mobile: '40px' }, cardPadding: '24px', containerMaxWidth: '1200px', gaps: ['16px', '24px', '32px'] },
    shapes: { buttonRadius: '8px', cardRadius: '12px', imageRadius: '8px', inputRadius: '6px', shadows: { card: '0 2px 8px rgba(0,0,0,0.1)', button: '0 1px 3px rgba(0,0,0,0.12)', elevated: '0 10px 25px rgba(0,0,0,0.15)' } },
    components: [],
    personality: { overall: 'professional', formality: 3, energy: 3, warmth: 3, toneOfVoice: '' },
    extractionMethod: 'http-fetch',
    confidence: 0.8,
    pagesAnalyzed: ['https://testbrand.com/'],
  };
}

function makeBusinessInfo(): BusinessInfo {
  return {
    businessName: 'Test Brand',
    language: 'en',
    aiProvider: 'gemini',
    geminiApiKey: 'test-key',
    domain: 'testbrand.com',
    projectName: 'Test',
    industry: 'technology',
    model: 'gemini-2.0-flash',
  } as unknown as BusinessInfo;
}

// ============================================================================
// Orchestrator tests (template-only, no AI)
// ============================================================================

describe('generateStyleguide (skipAi)', () => {
  it('generates a complete styleguide with template sections only', async () => {
    const dispatch = vi.fn();
    const progressUpdates: string[] = [];

    const result = await generateStyleguide({
      domain: 'testbrand.com',
      businessInfo: makeBusinessInfo(),
      dispatch,
      existingAnalysis: makeAnalysis(),
      skipAi: true,
      onProgress: (p) => progressUpdates.push(p.phase),
    });

    expect(result.html).toContain('<!DOCTYPE html>');
    expect(result.html).toContain('Test Brand');
    expect(result.tokens.prefix).toBeTruthy();
    expect(result.quality.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.aiSectionsGenerated).toBe(0);
  });

  it('progresses through all phases', async () => {
    const dispatch = vi.fn();
    const phases: string[] = [];

    await generateStyleguide({
      domain: 'testbrand.com',
      businessInfo: makeBusinessInfo(),
      dispatch,
      existingAnalysis: makeAnalysis(),
      skipAi: true,
      onProgress: (p) => phases.push(p.phase),
    });

    expect(phases).toContain('analyzing');
    expect(phases).toContain('generating-tokens');
    expect(phases).toContain('generating-sections');
    expect(phases).toContain('assembling');
    expect(phases).toContain('validating');
    expect(phases).toContain('complete');
  });

  it('returns valid quality report', async () => {
    const dispatch = vi.fn();

    const result = await generateStyleguide({
      domain: 'testbrand.com',
      businessInfo: makeBusinessInfo(),
      dispatch,
      existingAnalysis: makeAnalysis(),
      skipAi: true,
    });

    expect(result.quality.structural.divBalance.passed).toBe(true);
    expect(result.quality.structural.sectionCount.found).toBeGreaterThan(0);
    expect(result.quality.content.prefixConsistency).toBe(true);
    expect(result.quality.content.brandNameCorrect).toBe(true);
  });

  it('generates tokens from brand analysis', async () => {
    const dispatch = vi.fn();

    const result = await generateStyleguide({
      domain: 'testbrand.com',
      businessInfo: makeBusinessInfo(),
      dispatch,
      existingAnalysis: makeAnalysis(),
      skipAi: true,
    });

    expect(result.tokens.colors.primary[400]).toBeTruthy();
    expect(result.tokens.typography.headingFont).toContain('Montserrat');
    expect(result.tokens.typography.bodyFont).toContain('Open Sans');
    expect(result.tokens.typography.googleFontsUrl).toContain('fonts.googleapis.com');
  });
});

// ============================================================================
// buildStorageData tests
// ============================================================================

describe('buildStorageData', () => {
  it('creates storage data with correct structure', async () => {
    const dispatch = vi.fn();
    const result = await generateStyleguide({
      domain: 'testbrand.com',
      businessInfo: makeBusinessInfo(),
      dispatch,
      existingAnalysis: makeAnalysis(),
      skipAi: true,
    });

    const storageData = buildStorageData(result, 'project1/map1/styleguide.html', 1);

    expect(storageData.designTokens).toBe(result.tokens);
    expect(storageData.brandAnalysis).toBe(result.analysis);
    expect(storageData.htmlStorageKey).toBe('project1/map1/styleguide.html');
    expect(storageData.version).toBe(1);
    expect(storageData.generatedAt).toBeTruthy();
  });
});
