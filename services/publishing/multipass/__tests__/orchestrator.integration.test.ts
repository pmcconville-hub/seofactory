import { describe, it, expect, vi } from 'vitest';
import { MultiPassOrchestrator } from '../orchestrator';
import type { BrandDiscoveryReport, DesignTokens } from '../../../../types/publishing';

// Sample markdown content for testing
const SAMPLE_MARKDOWN = `
# The Complete Guide to Modern Web Development

Introduction to web development in 2024. This guide covers everything you need to know.

## Key Features

- Fast performance
- Responsive design
- Accessibility first
- SEO optimized

## How It Works

1. First, set up your development environment
2. Then, create your project structure
3. Build your components
4. Test and deploy

## Feature Comparison

| Feature | Plan A | Plan B |
|---------|--------|--------|
| Price | $10 | $20 |
| Users | 5 | Unlimited |

## Frequently Asked Questions

**Q: What languages should I learn?**
A: Start with HTML, CSS, and JavaScript.

**Q: How long does it take?**
A: It depends on your dedication, but most people see results in 3-6 months.

## Conclusion

Web development is an exciting field with endless opportunities.
`;

// Mock brand discovery report
const createMockBrandReport = (): BrandDiscoveryReport => ({
  id: 'test-report-1',
  targetUrl: 'https://example.com',
  screenshotBase64: undefined,
  analyzedAt: new Date().toISOString(),
  findings: {
    primaryColor: { value: '#3B82F6', confidence: 'found', source: 'logo' },
    secondaryColor: { value: '#6366F1', confidence: 'found', source: 'header' },
    accentColor: { value: '#F59E0B', confidence: 'guessed', source: 'button' },
    backgroundColor: { value: '#FFFFFF', confidence: 'found', source: 'body' },
    headingFont: { value: 'Inter', confidence: 'found', source: 'h1' },
    bodyFont: { value: 'Inter', confidence: 'found', source: 'body' },
    borderRadius: { value: 'rounded', confidence: 'guessed', source: 'cards' },
    shadowStyle: { value: 'subtle', confidence: 'guessed', source: 'cards' },
  },
  overallConfidence: 85,
  derivedTokens: {
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#F59E0B',
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#111827',
      textMuted: '#6B7280',
      border: '#E5E7EB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    fonts: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
    },
    spacing: {
      sectionGap: 'normal',
      contentWidth: 'standard',
      paragraphSpacing: 'normal',
    },
    borderRadius: 'rounded',
    shadows: 'subtle',
    typography: {
      headingWeight: 'semibold',
      bodyLineHeight: 'normal',
      headingLineHeight: 'tight',
    },
  },
});

describe('MultiPassOrchestrator Integration', () => {
  it('should complete all 5 passes successfully', async () => {
    const passResults: Array<{ pass: number; result: unknown }> = [];

    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key', // Not used for passes 1-4
      onPassComplete: (pass, result) => {
        passResults.push({ pass, result });
      },
    });

    const result = await orchestrator.execute();

    // Verify all passes completed
    expect(passResults.length).toBe(5);
    expect(passResults.map(p => p.pass)).toEqual([1, 2, 3, 4, 5]);

    // Verify state
    expect(result.state.currentPass).toBe('complete');
    expect(result.state.pass1).not.toBeNull();
    expect(result.state.pass2).not.toBeNull();
    expect(result.state.pass3).not.toBeNull();
    expect(result.state.pass4Complete).toBe(true);
    expect(result.state.pass5).not.toBeNull();
  });

  it('should correctly analyze content structure in pass 1', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    const result = await orchestrator.execute();

    // Verify content analysis
    const analysis = result.state.pass1!;
    expect(analysis.sections.length).toBeGreaterThan(0);
    expect(analysis.totalWordCount).toBeGreaterThan(100);
    expect(analysis.estimatedReadTime).toBeGreaterThan(0);

    // Check specific content types were detected
    const contentTypes = analysis.sections.map(s => s.contentType);
    expect(contentTypes).toContain('list'); // Key Features section
    expect(contentTypes).toContain('process'); // How It Works section
    expect(contentTypes).toContain('comparison'); // Feature Comparison table
    expect(contentTypes).toContain('faq'); // FAQ section
  });

  it('should select appropriate components in pass 2', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    const result = await orchestrator.execute();

    // Verify component selections
    const selections = result.state.pass2!;
    expect(selections.length).toBe(result.state.pass1!.sections.length);

    // Each selection should have required properties
    selections.forEach((selection, i) => {
      expect(selection.sectionIndex).toBe(i);
      expect(selection.selectedComponent).toBeTruthy();
      expect(selection.reasoning).toBeTruthy();
      expect(Array.isArray(selection.alternatives)).toBe(true);
    });
  });

  it('should plan visual rhythm in pass 3', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    const result = await orchestrator.execute();

    // Verify rhythm plan
    const plan = result.state.pass3!;
    expect(plan.sections.length).toBe(result.state.pass1!.sections.length);
    expect(['dense', 'balanced', 'spacious']).toContain(plan.overallPacing);

    // Each section should have rhythm properties
    plan.sections.forEach(section => {
      expect(['normal', 'background', 'featured', 'hero-moment']).toContain(section.emphasisLevel);
      expect(['tight', 'normal', 'breathe', 'dramatic']).toContain(section.spacingBefore);
      expect(typeof section.visualAnchor).toBe('boolean');
    });

    // First section should be hero-moment
    expect(plan.sections[0].emphasisLevel).toBe('hero-moment');
  });

  it('should build complete blueprint in pass 4', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    const result = await orchestrator.execute();

    // Verify blueprint
    const blueprint = result.blueprint;
    expect(blueprint.sections.length).toBe(result.state.pass1!.sections.length);
    expect(['dense', 'balanced', 'spacious']).toContain(blueprint.pacing);
    expect(blueprint.tokens).toBeDefined();
    expect(blueprint.tokens.colors.primary).toBe('#3B82F6');

    // Each section should be fully defined
    blueprint.sections.forEach(section => {
      expect(section.component).toBeTruthy();
      expect(section.emphasisLevel).toBeTruthy();
      expect(section.spacingBefore).toBeTruthy();
      expect(typeof section.visualAnchor).toBe('boolean');
      expect(typeof section.content).toBe('string');
    });
  });

  it('should return quality validation in pass 5', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    const result = await orchestrator.execute();

    // Verify validation
    const validation = result.state.pass5!;
    expect(validation.overallScore).toBeGreaterThan(0);
    expect(validation.overallScore).toBeLessThanOrEqual(100);
    expect(typeof validation.passesThreshold).toBe('boolean');

    // Check all validation categories
    expect(validation.colorMatch).toBeDefined();
    expect(validation.typographyMatch).toBeDefined();
    expect(validation.visualDepth).toBeDefined();
    expect(validation.brandFit).toBeDefined();
  });

  it('should handle different personalities', async () => {
    const personalities = ['modern-minimal', 'bold-editorial', 'corporate-professional'] as const;

    for (const personality of personalities) {
      const orchestrator = new MultiPassOrchestrator({
        markdown: SAMPLE_MARKDOWN,
        personality,
        brandDiscovery: createMockBrandReport(),
        aiProvider: 'gemini',
        aiApiKey: 'test-key',
      });

      const result = await orchestrator.execute();
      expect(result.state.currentPass).toBe('complete');
    }
  });

  it('should expose state during execution', async () => {
    const orchestrator = new MultiPassOrchestrator({
      markdown: SAMPLE_MARKDOWN,
      personality: 'modern-minimal',
      brandDiscovery: createMockBrandReport(),
      aiProvider: 'gemini',
      aiApiKey: 'test-key',
    });

    // Check initial state
    const initialState = orchestrator.getState();
    expect(initialState.currentPass).toBe(1);
    expect(initialState.pass1).toBeNull();

    // Execute and check final state
    await orchestrator.execute();
    const finalState = orchestrator.getState();
    expect(finalState.currentPass).toBe('complete');
    expect(finalState.pass1).not.toBeNull();
  });
});
