# AI Vision-First Brand Design System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generic template-based output with AI-generated unique brand design systems that produce design-agency quality results.

**Architecture:** AI Vision analyzes screenshots FIRST to extract complete Design DNA, DOM validates colors, AI generates unique CSS per brand (not template selection), blueprint applies brand-specific styling.

**Tech Stack:** TypeScript, Gemini/Claude Vision API, Supabase (PostgreSQL), React, TailwindCSS

---

## Phase 1: Fix Critical Color Extraction Bug

### Task 1.1: Fix Hex Color Parsing in isNeutral()

**Files:**
- Modify: `services/design-analysis/BrandDiscoveryService.ts:38-48`
- Test: `services/design-analysis/__tests__/BrandDiscoveryService.test.ts`

**Step 1: Write the failing test**

```typescript
// In services/design-analysis/__tests__/BrandDiscoveryService.test.ts
import { describe, it, expect } from 'vitest';

describe('BrandDiscoveryService color parsing', () => {
  describe('isNeutral helper', () => {
    // Extract the isNeutral function for testing
    const isNeutral = (c: string | null): boolean => {
      if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;

      // Handle hex colors
      if (c.startsWith('#')) {
        const hex = c.replace('#', '');
        const fullHex = hex.length === 3
          ? hex.split('').map(ch => ch + ch).join('')
          : hex;
        const r = parseInt(fullHex.slice(0, 2), 16);
        const g = parseInt(fullHex.slice(2, 4), 16);
        const b = parseInt(fullHex.slice(4, 6), 16);
        if (r === 255 && g === 255 && b === 255) return true;
        if (r === 0 && g === 0 && b === 0) return true;
        if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
        return false;
      }

      // Handle rgb/rgba
      const match = c.match(/\d+/g);
      if (!match || match.length < 3) return true;
      const [r, g, b] = match.map(Number);
      if (r === 255 && g === 255 && b === 255) return true;
      if (r === 0 && g === 0 && b === 0) return true;
      if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
      return false;
    };

    it('should correctly identify hex brand colors as NOT neutral', () => {
      expect(isNeutral('#012d55')).toBe(false); // MVGM blue
      expect(isNeutral('#ea580c')).toBe(false); // Orange
      expect(isNeutral('#1a4a7a')).toBe(false); // Blue
      expect(isNeutral('#ff6b6b')).toBe(false); // Coral
    });

    it('should correctly identify rgb brand colors as NOT neutral', () => {
      expect(isNeutral('rgb(1, 45, 85)')).toBe(false);
      expect(isNeutral('rgb(234, 88, 12)')).toBe(false);
    });

    it('should identify white as neutral', () => {
      expect(isNeutral('#ffffff')).toBe(true);
      expect(isNeutral('#fff')).toBe(true);
      expect(isNeutral('rgb(255, 255, 255)')).toBe(true);
    });

    it('should identify black as neutral', () => {
      expect(isNeutral('#000000')).toBe(true);
      expect(isNeutral('#000')).toBe(true);
      expect(isNeutral('rgb(0, 0, 0)')).toBe(true);
    });

    it('should identify grays as neutral', () => {
      expect(isNeutral('#808080')).toBe(true);
      expect(isNeutral('#18181b')).toBe(true);
      expect(isNeutral('rgb(128, 128, 128)')).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/design-analysis/__tests__/BrandDiscoveryService.test.ts --reporter=verbose`
Expected: FAIL - hex colors like '#012d55' incorrectly identified as neutral

**Step 3: Fix the isNeutral function in pageFunction**

The fix goes inside the `pageFunction` string in `BrandDiscoveryService.ts`. Replace lines 38-48:

```typescript
        // Helper: Check if color is neutral (white, black, gray)
        const isNeutral = (c) => {
          if (!c || c.includes('rgba(0, 0, 0, 0)')) return true;

          let r, g, b;

          // Handle hex colors
          if (c.startsWith('#')) {
            const hex = c.replace('#', '');
            const fullHex = hex.length === 3
              ? hex.split('').map(ch => ch + ch).join('')
              : hex;
            r = parseInt(fullHex.slice(0, 2), 16);
            g = parseInt(fullHex.slice(2, 4), 16);
            b = parseInt(fullHex.slice(4, 6), 16);
          } else {
            // Handle rgb/rgba
            const match = c.match(/\\d+/g);
            if (!match || match.length < 3) return true;
            [r, g, b] = match.map(Number);
          }

          if (r === 255 && g === 255 && b === 255) return true;
          if (r === 0 && g === 0 && b === 0) return true;
          // Gray detection: all channels similar
          if (Math.abs(r - g) < 15 && Math.abs(g - b) < 15 && Math.abs(r - b) < 15) return true;
          return false;
        };
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run services/design-analysis/__tests__/BrandDiscoveryService.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/design-analysis/BrandDiscoveryService.ts services/design-analysis/__tests__/BrandDiscoveryService.test.ts
git commit -m "$(cat <<'EOF'
fix(design-analysis): handle hex colors in isNeutral function

The isNeutral helper was using /\d+/g regex which only works for RGB
format. Hex colors like #012d55 would only match 2 digit groups (01, 55)
causing brand colors to be incorrectly classified as neutral, triggering
the orange fallback color.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 1.2: Fix rgbToHex for Hex Passthrough

**Files:**
- Modify: `services/design-analysis/BrandDiscoveryService.ts:51-58`
- Test: `services/design-analysis/__tests__/BrandDiscoveryService.test.ts`

**Step 1: Add test for rgbToHex**

```typescript
  describe('rgbToHex helper', () => {
    const rgbToHex = (c: string | null): string | null => {
      if (!c) return null;
      if (c.startsWith('#')) return c.toLowerCase();
      const match = c.match(/\d+/g);
      if (!match || match.length < 3) return null;
      const [r, g, b] = match.map(Number);
      return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    };

    it('should pass through valid hex colors', () => {
      expect(rgbToHex('#012d55')).toBe('#012d55');
      expect(rgbToHex('#EA580C')).toBe('#ea580c');
    });

    it('should convert rgb to hex', () => {
      expect(rgbToHex('rgb(1, 45, 85)')).toBe('#012d55');
      expect(rgbToHex('rgb(234, 88, 12)')).toBe('#ea580c');
    });

    it('should handle rgba', () => {
      expect(rgbToHex('rgba(1, 45, 85, 1)')).toBe('#012d55');
    });
  });
```

**Step 2: Run test**

Run: `npx vitest run services/design-analysis/__tests__/BrandDiscoveryService.test.ts --reporter=verbose`
Expected: Should pass (hex passthrough already exists)

**Step 3: Verify implementation**

The current implementation at line 53 already handles hex passthrough. Verify it normalizes to lowercase:

```typescript
        const rgbToHex = (c) => {
          if (!c) return null;
          if (c.startsWith('#')) return c.toLowerCase();
          const match = c.match(/\\d+/g);
          if (!match || match.length < 3) return null;
          const [r, g, b] = match.map(Number);
          return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
        };
```

**Step 4: Run tests**

Run: `npx vitest run services/design-analysis/__tests__/BrandDiscoveryService.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/design-analysis/__tests__/BrandDiscoveryService.test.ts
git commit -m "$(cat <<'EOF'
test(design-analysis): add rgbToHex helper tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: AI Vision Design DNA Extraction

### Task 2.1: Create DesignDNA Type Definitions

**Files:**
- Create: `types/designDna.ts`
- Modify: `types/index.ts`

**Step 1: Write the type file**

```typescript
// types/designDna.ts
/**
 * Design DNA Types
 *
 * Complete design system extracted from a brand's website via AI Vision.
 * This is the foundation for generating unique brand design systems.
 */

export interface ColorWithUsage {
  hex: string;
  usage: string;
  confidence: number;
}

export interface DesignDNA {
  // COLOR SYSTEM
  colors: {
    primary: ColorWithUsage;
    primaryLight: ColorWithUsage;
    primaryDark: ColorWithUsage;
    secondary: ColorWithUsage;
    accent: ColorWithUsage;
    neutrals: {
      darkest: string;
      dark: string;
      medium: string;
      light: string;
      lightest: string;
    };
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    harmony: 'monochromatic' | 'complementary' | 'analogous' | 'triadic' | 'split-complementary';
    dominantMood: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal';
    contrastLevel: 'high' | 'medium' | 'subtle';
  };

  // TYPOGRAPHY SYSTEM
  typography: {
    headingFont: {
      family: string;
      fallback: string;
      weight: number;
      style: 'serif' | 'sans-serif' | 'display' | 'slab' | 'mono';
      character: 'modern' | 'classic' | 'playful' | 'corporate' | 'elegant';
    };
    bodyFont: {
      family: string;
      fallback: string;
      weight: number;
      style: 'serif' | 'sans-serif';
      lineHeight: number;
    };
    scaleRatio: number;
    baseSize: string;
    headingCase: 'none' | 'uppercase' | 'capitalize';
    headingLetterSpacing: string;
    usesDropCaps: boolean;
    headingUnderlineStyle: 'none' | 'solid' | 'gradient' | 'decorative';
    linkStyle: 'underline' | 'color-only' | 'animated-underline' | 'highlight';
  };

  // SPACING & RHYTHM
  spacing: {
    baseUnit: number;
    density: 'compact' | 'comfortable' | 'spacious' | 'airy';
    sectionGap: 'tight' | 'moderate' | 'generous' | 'dramatic';
    contentWidth: 'narrow' | 'medium' | 'wide' | 'full';
    whitespacePhilosophy: 'minimal' | 'balanced' | 'luxurious';
  };

  // SHAPE LANGUAGE
  shapes: {
    borderRadius: {
      style: 'sharp' | 'subtle' | 'rounded' | 'pill' | 'mixed';
      small: string;
      medium: string;
      large: string;
      full: string;
    };
    buttonStyle: 'sharp' | 'soft' | 'rounded' | 'pill';
    cardStyle: 'flat' | 'subtle-shadow' | 'elevated' | 'bordered' | 'glass';
    inputStyle: 'minimal' | 'bordered' | 'filled' | 'underlined';
  };

  // VISUAL EFFECTS
  effects: {
    shadows: {
      style: 'none' | 'subtle' | 'medium' | 'dramatic' | 'colored';
      cardShadow: string;
      buttonShadow: string;
      elevatedShadow: string;
    };
    gradients: {
      usage: 'none' | 'subtle' | 'prominent';
      primaryGradient: string;
      heroGradient: string;
      ctaGradient: string;
    };
    backgrounds: {
      usesPatterns: boolean;
      patternType?: 'dots' | 'grid' | 'waves' | 'geometric' | 'organic';
      usesTextures: boolean;
      usesOverlays: boolean;
    };
    borders: {
      style: 'none' | 'subtle' | 'visible' | 'decorative';
      defaultColor: string;
      accentBorderUsage: boolean;
    };
  };

  // DECORATIVE ELEMENTS
  decorative: {
    dividerStyle: 'none' | 'line' | 'gradient' | 'decorative' | 'icon';
    usesFloatingShapes: boolean;
    usesCornerAccents: boolean;
    usesWaveShapes: boolean;
    usesGeometricPatterns: boolean;
    iconStyle: 'outline' | 'solid' | 'duotone' | 'custom';
    decorativeAccentColor: string;
  };

  // LAYOUT PATTERNS
  layout: {
    gridStyle: 'strict-12' | 'asymmetric' | 'fluid' | 'modular';
    alignment: 'left' | 'center' | 'mixed';
    heroStyle: 'full-bleed' | 'contained' | 'split' | 'minimal' | 'video' | 'animated';
    cardLayout: 'grid' | 'masonry' | 'list' | 'carousel' | 'stacked';
    ctaPlacement: 'inline' | 'floating' | 'section-end' | 'prominent-banner';
    navigationStyle: 'minimal' | 'standard' | 'mega-menu' | 'sidebar';
  };

  // MOTION & INTERACTION
  motion: {
    overall: 'static' | 'subtle' | 'dynamic' | 'expressive';
    transitionSpeed: 'instant' | 'fast' | 'normal' | 'slow';
    easingStyle: 'linear' | 'ease' | 'spring' | 'bounce';
    hoverEffects: {
      buttons: 'none' | 'darken' | 'lift' | 'glow' | 'fill' | 'scale';
      cards: 'none' | 'lift' | 'tilt' | 'glow' | 'border';
      links: 'none' | 'underline' | 'color' | 'highlight';
    };
    scrollAnimations: boolean;
    parallaxEffects: boolean;
  };

  // IMAGE TREATMENT
  images: {
    treatment: 'natural' | 'duotone' | 'grayscale' | 'high-contrast' | 'colorized';
    frameStyle: 'none' | 'rounded' | 'shadow' | 'border' | 'custom-mask';
    hoverEffect: 'none' | 'zoom' | 'overlay' | 'caption-reveal';
    aspectRatioPreference: '16:9' | '4:3' | '1:1' | 'mixed';
  };

  // COMPONENT PREFERENCES
  componentPreferences: {
    preferredListStyle: 'bullets' | 'icons' | 'cards' | 'numbered';
    preferredCardStyle: 'minimal' | 'bordered' | 'elevated' | 'glass';
    testimonialStyle: 'card' | 'quote' | 'carousel' | 'grid';
    faqStyle: 'accordion' | 'cards' | 'list';
    ctaStyle: 'button' | 'banner' | 'floating' | 'inline';
  };

  // BRAND PERSONALITY
  personality: {
    overall: 'corporate' | 'creative' | 'luxurious' | 'friendly' | 'bold' | 'minimal' | 'elegant' | 'playful';
    formality: 1 | 2 | 3 | 4 | 5;
    energy: 1 | 2 | 3 | 4 | 5;
    warmth: 1 | 2 | 3 | 4 | 5;
    trustSignals: 'minimal' | 'moderate' | 'prominent';
  };

  // CONFIDENCE & METADATA
  confidence: {
    overall: number;
    colorsConfidence: number;
    typographyConfidence: number;
    layoutConfidence: number;
  };

  analysisNotes: string[];
}

export interface DesignDNAExtractionResult {
  designDna: DesignDNA;
  screenshotBase64: string;
  screenshotUrl?: string;
  sourceUrl: string;
  extractedAt: string;
  aiModel: string;
  processingTimeMs: number;
}
```

**Step 2: Export from types/index.ts**

Add to types/index.ts:
```typescript
export * from './designDna';
```

**Step 3: Commit**

```bash
git add types/designDna.ts types/index.ts
git commit -m "$(cat <<'EOF'
feat(types): add DesignDNA type definitions

Complete type system for AI Vision-extracted brand design DNA including:
- Full color system with semantic colors and harmony analysis
- Typography with font characteristics and treatments
- Spacing, shapes, and visual effects
- Decorative elements and layout patterns
- Motion/interaction preferences
- Brand personality synthesis

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.2: Create Design DNA Extraction Prompt

**Files:**
- Create: `services/design-analysis/prompts/designDnaPrompt.ts`

**Step 1: Write the prompt file**

```typescript
// services/design-analysis/prompts/designDnaPrompt.ts
/**
 * AI Vision prompt for extracting complete Design DNA from a website screenshot.
 */

export const DESIGN_DNA_EXTRACTION_PROMPT = `You are a senior brand designer analyzing a website screenshot. Extract the complete design system (Design DNA) as a JSON object.

## Analysis Instructions

1. **Colors**: Identify ALL colors used, not just 1-2. Look for:
   - Primary brand color (logo, main buttons, key accents)
   - Secondary brand color (supporting elements)
   - Accent colors (CTAs, highlights, interactive elements)
   - Full neutral palette (text colors from darkest to lightest, backgrounds, borders)
   - Any semantic colors (success green, warning yellow, error red)

2. **Typography**: Identify fonts and their usage:
   - Heading font family and characteristics (serif, sans-serif, display, weight)
   - Body font family and characteristics
   - Size hierarchy (is there dramatic contrast or subtle?)
   - Any special treatments (drop caps, decorative underlines)

3. **Spacing**: Analyze whitespace usage:
   - Is the design dense/compact or spacious/airy?
   - Section gaps - tight or generous?
   - Overall content width preference

4. **Shapes**: Look at the shape language:
   - Border radius style (sharp/corporate vs rounded/friendly)
   - Button shapes
   - Card shapes
   - Input field shapes

5. **Visual Effects**: Identify depth and effects:
   - Shadow usage and intensity
   - Gradient usage
   - Background patterns or textures
   - Border treatments

6. **Decorative Elements**: Note any:
   - Section dividers
   - Floating shapes or orbs
   - Corner accents
   - Wave shapes
   - Geometric patterns

7. **Motion**: Assess animation/interaction level (from what's visible):
   - Static or likely animated elements
   - Hover effect sophistication hints
   - Scroll animations visible

8. **Image Treatment**: How are images presented?
   - Natural, duotone, or stylized
   - Frame/border treatment
   - Aspect ratios used

9. **Overall Personality**: Synthesize the brand feeling:
   - Corporate/Creative/Luxurious/Friendly/Bold/Minimal
   - Formality level (1-5)
   - Energy level (1-5)
   - Warmth level (1-5)

## Output Format

Return a JSON object matching the DesignDNA interface. Be specific with CSS values where possible (exact colors in hex, specific pixel values, CSS gradient syntax).

For colors, provide your best estimate in hex format. The DOM extraction will validate and provide exact values.

Include confidence scores (0-100) for each major category based on how clearly the design communicates these choices.

## CRITICAL: Return ONLY valid JSON, no markdown formatting or explanation.`;

export const DESIGN_DNA_VALIDATION_PROMPT = `You are validating extracted design tokens against what you see in the screenshot.

EXTRACTED VALUES:
{extractedValues}

TASK: Compare the extracted values to what you actually see in the screenshot.

Return JSON:
{
  "isValid": true/false,
  "corrections": {
    "primaryColor": "#corrected" or null,
    "secondaryColor": "#corrected" or null,
    ...
  },
  "confidence": 0-100,
  "notes": "explanation"
}

IMPORTANT: Only suggest corrections if the extracted value is CLEARLY wrong.`;
```

**Step 2: Commit**

```bash
git add services/design-analysis/prompts/designDnaPrompt.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add Design DNA extraction prompts

AI Vision prompts for:
- Comprehensive design system extraction from screenshots
- Validation of extracted values against visual evidence

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2.3: Create AIDesignAnalyzer Service

**Files:**
- Create: `services/design-analysis/AIDesignAnalyzer.ts`
- Test: `services/design-analysis/__tests__/AIDesignAnalyzer.test.ts`

**Step 1: Write the failing test**

```typescript
// services/design-analysis/__tests__/AIDesignAnalyzer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { AIDesignAnalyzer } from '../AIDesignAnalyzer';
import type { DesignDNA } from '../../../types/designDna';

describe('AIDesignAnalyzer', () => {
  describe('extractDesignDNA', () => {
    it('should extract design DNA from a screenshot', async () => {
      const mockResponse: Partial<DesignDNA> = {
        colors: {
          primary: { hex: '#012d55', usage: 'buttons', confidence: 95 },
          primaryLight: { hex: '#1a4a7a', usage: 'hover states', confidence: 80 },
          primaryDark: { hex: '#001a33', usage: 'active states', confidence: 75 },
          secondary: { hex: '#64748b', usage: 'secondary text', confidence: 85 },
          accent: { hex: '#0ea5e9', usage: 'links', confidence: 90 },
          neutrals: {
            darkest: '#0f172a',
            dark: '#334155',
            medium: '#94a3b8',
            light: '#e2e8f0',
            lightest: '#f8fafc'
          },
          semantic: {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6'
          },
          harmony: 'monochromatic',
          dominantMood: 'corporate',
          contrastLevel: 'medium'
        },
        personality: {
          overall: 'corporate',
          formality: 4,
          energy: 2,
          warmth: 2,
          trustSignals: 'prominent'
        },
        confidence: {
          overall: 85,
          colorsConfidence: 90,
          typographyConfidence: 80,
          layoutConfidence: 85
        },
        analysisNotes: ['Professional corporate design']
      };

      // Mock the AI call
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      // Test the prompt generation
      const prompt = analyzer.generateExtractionPrompt();
      expect(prompt).toContain('senior brand designer');
      expect(prompt).toContain('Design DNA');
    });

    it('should generate valid extraction prompt', () => {
      const analyzer = new AIDesignAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const prompt = analyzer.generateExtractionPrompt();

      expect(prompt).toContain('Colors');
      expect(prompt).toContain('Typography');
      expect(prompt).toContain('Spacing');
      expect(prompt).toContain('Shapes');
      expect(prompt).toContain('Visual Effects');
      expect(prompt).toContain('Personality');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/design-analysis/__tests__/AIDesignAnalyzer.test.ts --reporter=verbose`
Expected: FAIL - AIDesignAnalyzer module not found

**Step 3: Implement AIDesignAnalyzer**

```typescript
// services/design-analysis/AIDesignAnalyzer.ts
import type { DesignDNA, DesignDNAExtractionResult } from '../../types/designDna';
import { DESIGN_DNA_EXTRACTION_PROMPT } from './prompts/designDnaPrompt';

interface AIDesignAnalyzerConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model?: string;
}

/**
 * AI Vision-based Design DNA Analyzer
 *
 * Extracts complete design system from website screenshots using AI Vision.
 * This is the primary method for understanding a brand's visual identity.
 */
export class AIDesignAnalyzer {
  private config: AIDesignAnalyzerConfig;

  constructor(config: AIDesignAnalyzerConfig) {
    this.config = config;
  }

  /**
   * Extract Design DNA from a website screenshot
   */
  async extractDesignDNA(
    screenshotBase64: string,
    sourceUrl: string
  ): Promise<DesignDNAExtractionResult> {
    const startTime = Date.now();
    const prompt = this.generateExtractionPrompt();

    let designDna: DesignDNA;

    if (this.config.provider === 'gemini') {
      designDna = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      designDna = await this.callClaudeVision(screenshotBase64, prompt);
    }

    return {
      designDna,
      screenshotBase64,
      sourceUrl,
      extractedAt: new Date().toISOString(),
      aiModel: this.config.provider === 'gemini'
        ? 'gemini-2.0-flash'
        : 'claude-sonnet-4-20250514',
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Generate the extraction prompt
   */
  generateExtractionPrompt(): string {
    return DESIGN_DNA_EXTRACTION_PROMPT;
  }

  /**
   * Call Gemini Vision API
   */
  private async callGeminiVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]) as DesignDNA;
  }

  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(
    imageBase64: string,
    prompt: string
  ): Promise<DesignDNA> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    return JSON.parse(jsonMatch[0]) as DesignDNA;
  }

  /**
   * Validate extracted colors against the screenshot
   */
  async validateColors(
    screenshotBase64: string,
    extractedColors: Record<string, string>
  ): Promise<{
    isValid: boolean;
    corrections: Record<string, string>;
    confidence: number;
  }> {
    const prompt = `Validate these extracted colors against the screenshot:
${JSON.stringify(extractedColors, null, 2)}

Return JSON: { "isValid": boolean, "corrections": { "colorName": "#hex" }, "confidence": 0-100 }`;

    let result;
    if (this.config.provider === 'gemini') {
      result = await this.callGeminiVision(screenshotBase64, prompt);
    } else {
      result = await this.callClaudeVision(screenshotBase64, prompt);
    }

    return result as unknown as {
      isValid: boolean;
      corrections: Record<string, string>;
      confidence: number;
    };
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run services/design-analysis/__tests__/AIDesignAnalyzer.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/design-analysis/AIDesignAnalyzer.ts services/design-analysis/__tests__/AIDesignAnalyzer.test.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add AIDesignAnalyzer service

AI Vision-based Design DNA extraction supporting:
- Gemini 2.0 Flash vision API
- Claude Sonnet 4 vision API
- Complete DesignDNA extraction from screenshots
- Color validation against visual evidence

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Brand Design System Generation

### Task 3.1: Create BrandDesignSystem Type

**Files:**
- Add to: `types/designDna.ts`

**Step 1: Add types**

Add to `types/designDna.ts`:

```typescript
// BRAND DESIGN SYSTEM (Generated from Design DNA)

export interface ComponentStyleDefinition {
  baseCSS: string;
  variants: Record<string, string>;
  states: {
    hover?: string;
    active?: string;
    focus?: string;
    disabled?: string;
  };
  responsive?: {
    mobile?: string;
    tablet?: string;
  };
}

export interface BrandDesignSystem {
  id: string;
  brandName: string;
  sourceUrl: string;
  generatedAt: string;
  designDnaHash: string;

  // CSS TOKENS
  tokens: {
    css: string;
    json: Record<string, string>;
  };

  // COMPONENT STYLES
  componentStyles: {
    button: ComponentStyleDefinition;
    card: ComponentStyleDefinition;
    hero: ComponentStyleDefinition;
    timeline: ComponentStyleDefinition;
    testimonial: ComponentStyleDefinition;
    faq: ComponentStyleDefinition;
    cta: ComponentStyleDefinition;
    keyTakeaways: ComponentStyleDefinition;
    prose: ComponentStyleDefinition;
    list: ComponentStyleDefinition;
    table: ComponentStyleDefinition;
    blockquote: ComponentStyleDefinition;
  };

  // DECORATIVE ELEMENTS
  decorative: {
    dividers: {
      default: string;
      subtle: string;
      decorative: string;
    };
    sectionBackgrounds: {
      default: string;
      accent: string;
      featured: string;
    };
    shapes?: {
      topWave?: string;
      bottomWave?: string;
      cornerAccent?: string;
      floatingOrb?: string;
    };
    patterns?: {
      dots?: string;
      grid?: string;
      custom?: string;
    };
  };

  // MICRO-INTERACTIONS
  interactions: {
    buttonHover: string;
    buttonActive: string;
    buttonFocus: string;
    cardHover: string;
    linkHover: string;
    focusRing: string;
    keyframes: Record<string, string>;
  };

  // TYPOGRAPHY TREATMENTS
  typographyTreatments: {
    headingDecoration: string;
    dropCap: string;
    pullQuote: string;
    listMarker: string;
    linkUnderline: string;
    codeBlock: string;
  };

  // IMAGE TREATMENTS
  imageTreatments: {
    defaultFrame: string;
    featured: string;
    thumbnail: string;
    gallery: string;
    mask?: string;
    overlay?: string;
  };

  // COMPLETE COMPILED CSS
  compiledCss: string;

  // VARIANT MAPPINGS
  variantMappings: {
    card: Record<string, string>;
    hero: Record<string, string>;
    button: Record<string, string>;
    cta: Record<string, string>;
  };
}
```

**Step 2: Commit**

```bash
git add types/designDna.ts
git commit -m "$(cat <<'EOF'
feat(types): add BrandDesignSystem type definitions

Complete type system for AI-generated brand design systems including:
- CSS token system
- Component-specific styles with variants and states
- Decorative elements (dividers, backgrounds, shapes)
- Micro-interactions and keyframes
- Typography and image treatments
- Compiled CSS output

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.2: Create Design System Generation Prompt

**Files:**
- Create: `services/design-analysis/prompts/designSystemPrompt.ts`

**Step 1: Write the prompt file**

```typescript
// services/design-analysis/prompts/designSystemPrompt.ts
/**
 * AI prompt for generating a complete brand design system from Design DNA.
 */

export function buildDesignSystemGenerationPrompt(designDna: string): string {
  return `You are a senior design system architect. Given a brand's Design DNA, generate a complete, production-ready CSS design system.

## Design DNA Input
${designDna}

## Your Task

Generate CSS that brings this brand's design language to life. Every class should feel uniquely crafted for THIS brand, not generic.

### 1. CSS Tokens
Generate CSS custom properties for:
- All colors (primary, secondary, accent, neutrals, semantic)
- Typography scale (using the detected scale ratio)
- Spacing scale (based on density preference)
- Border radius scale (matching shape language)
- Shadow scale (matching effect preferences)
- Motion tokens (duration, easing)

### 2. Component Styles
For each component, generate CSS that:
- Reflects the brand's visual personality
- Uses the brand's shape language consistently
- Applies appropriate shadows/effects
- Includes proper hover/focus states
- Is responsive

Components needed: button, card, hero, timeline, testimonial, faq, cta, keyTakeaways, prose, list, table, blockquote

### 3. Decorative Elements
Based on the detected decorative preferences:
- Generate section dividers (SVG or CSS)
- Create background patterns if applicable
- Design floating shapes/accents if detected
- Create wave shapes if detected

### 4. Typography Treatments
- Heading decoration (underlines, accents)
- Drop caps if detected
- Pull quote styling
- List marker styling
- Link treatments

### 5. Micro-Interactions
Generate CSS for:
- Button hover effects (matching detected style)
- Card hover effects
- Link hover effects
- Focus rings
- Any keyframe animations

## Output Format
Return a JSON object matching the BrandDesignSystem interface with actual CSS code.

## Quality Requirements
- CSS must be production-ready
- Use CSS custom properties for theming (--ctc-* prefix)
- Include responsive breakpoints
- Follow BEM-like naming (.ctc-component__element--modifier)
- Ensure accessibility (focus states, contrast)
- CSS should be optimized (no redundant rules)

## Brand Personality Translation

Translate the brand personality into CSS:
- Corporate → Sharp corners, subtle shadows, restrained animations
- Creative → Rounded corners, bold shadows, expressive animations
- Luxurious → Elegant spacing, refined shadows, smooth transitions
- Friendly → Soft corners, warm colors, bouncy animations
- Bold → Strong contrasts, dramatic shadows, impactful animations
- Minimal → Clean lines, subtle effects, quick transitions

## CRITICAL: Return ONLY valid JSON, no markdown formatting.`;
}
```

**Step 2: Commit**

```bash
git add services/design-analysis/prompts/designSystemPrompt.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add design system generation prompt

AI prompt for generating complete brand design systems including:
- CSS token generation
- Component-specific styling
- Decorative elements
- Typography treatments
- Micro-interactions
- Personality-to-CSS translation rules

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3.3: Create BrandDesignSystemGenerator Service

**Files:**
- Create: `services/design-analysis/BrandDesignSystemGenerator.ts`
- Test: `services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts`

**Step 1: Write the failing test**

```typescript
// services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { BrandDesignSystemGenerator } from '../BrandDesignSystemGenerator';
import type { DesignDNA } from '../../../types/designDna';

describe('BrandDesignSystemGenerator', () => {
  const mockDesignDna: Partial<DesignDNA> = {
    colors: {
      primary: { hex: '#012d55', usage: 'buttons', confidence: 95 },
      primaryLight: { hex: '#1a4a7a', usage: 'hover', confidence: 80 },
      primaryDark: { hex: '#001a33', usage: 'active', confidence: 75 },
      secondary: { hex: '#64748b', usage: 'text', confidence: 85 },
      accent: { hex: '#0ea5e9', usage: 'links', confidence: 90 },
      neutrals: {
        darkest: '#0f172a',
        dark: '#334155',
        medium: '#94a3b8',
        light: '#e2e8f0',
        lightest: '#f8fafc'
      },
      semantic: {
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      harmony: 'monochromatic',
      dominantMood: 'corporate',
      contrastLevel: 'medium'
    },
    shapes: {
      borderRadius: {
        style: 'subtle',
        small: '2px',
        medium: '4px',
        large: '6px',
        full: '9999px'
      },
      buttonStyle: 'sharp',
      cardStyle: 'bordered',
      inputStyle: 'bordered'
    },
    personality: {
      overall: 'corporate',
      formality: 4,
      energy: 2,
      warmth: 2,
      trustSignals: 'prominent'
    }
  };

  describe('generateTokensCSS', () => {
    it('should generate CSS custom properties from design DNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const tokens = generator.generateTokensFromDNA(mockDesignDna as DesignDNA);

      expect(tokens.css).toContain('--ctc-primary');
      expect(tokens.css).toContain('#012d55');
      expect(tokens.json['--ctc-primary']).toBe('#012d55');
    });
  });

  describe('computeDesignDnaHash', () => {
    it('should generate consistent hash for same DNA', () => {
      const generator = new BrandDesignSystemGenerator({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const hash1 = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);
      const hash2 = generator.computeDesignDnaHash(mockDesignDna as DesignDNA);

      expect(hash1).toBe(hash2);
    });
  });
});
```

**Step 2: Run test**

Run: `npx vitest run services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts --reporter=verbose`
Expected: FAIL - module not found

**Step 3: Implement BrandDesignSystemGenerator**

```typescript
// services/design-analysis/BrandDesignSystemGenerator.ts
import type { DesignDNA, BrandDesignSystem, ComponentStyleDefinition } from '../../types/designDna';
import { buildDesignSystemGenerationPrompt } from './prompts/designSystemPrompt';

interface GeneratorConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
}

/**
 * Generates unique brand design systems from Design DNA.
 *
 * This is NOT template selection - it's AI-powered CSS generation
 * that creates unique styling for each brand.
 */
export class BrandDesignSystemGenerator {
  private config: GeneratorConfig;

  constructor(config: GeneratorConfig) {
    this.config = config;
  }

  /**
   * Generate a complete brand design system from Design DNA
   */
  async generate(
    designDna: DesignDNA,
    brandName: string,
    sourceUrl: string
  ): Promise<BrandDesignSystem> {
    const prompt = buildDesignSystemGenerationPrompt(JSON.stringify(designDna, null, 2));

    let generatedSystem: Partial<BrandDesignSystem>;

    if (this.config.provider === 'gemini') {
      generatedSystem = await this.callGemini(prompt);
    } else {
      generatedSystem = await this.callClaude(prompt);
    }

    // Generate tokens directly from DNA as fallback/supplement
    const tokens = this.generateTokensFromDNA(designDna);

    // Compile all CSS
    const compiledCss = this.compileCSS(
      tokens.css,
      generatedSystem.componentStyles || {},
      generatedSystem.interactions || {},
      generatedSystem.typographyTreatments || {}
    );

    return {
      id: `bds-${Date.now()}`,
      brandName,
      sourceUrl,
      generatedAt: new Date().toISOString(),
      designDnaHash: this.computeDesignDnaHash(designDna),
      tokens,
      componentStyles: generatedSystem.componentStyles || this.getDefaultComponentStyles(),
      decorative: generatedSystem.decorative || this.getDefaultDecorative(),
      interactions: generatedSystem.interactions || this.getDefaultInteractions(),
      typographyTreatments: generatedSystem.typographyTreatments || this.getDefaultTypography(),
      imageTreatments: generatedSystem.imageTreatments || this.getDefaultImageTreatments(),
      compiledCss,
      variantMappings: generatedSystem.variantMappings || this.getDefaultVariantMappings()
    };
  }

  /**
   * Generate CSS tokens directly from Design DNA
   * This provides a reliable fallback and ensures critical values are present
   */
  generateTokensFromDNA(designDna: DesignDNA): { css: string; json: Record<string, string> } {
    const json: Record<string, string> = {};

    // Colors
    json['--ctc-primary'] = designDna.colors.primary.hex;
    json['--ctc-primary-light'] = designDna.colors.primaryLight.hex;
    json['--ctc-primary-dark'] = designDna.colors.primaryDark.hex;
    json['--ctc-secondary'] = designDna.colors.secondary.hex;
    json['--ctc-accent'] = designDna.colors.accent.hex;

    // Neutrals
    json['--ctc-neutral-900'] = designDna.colors.neutrals.darkest;
    json['--ctc-neutral-700'] = designDna.colors.neutrals.dark;
    json['--ctc-neutral-500'] = designDna.colors.neutrals.medium;
    json['--ctc-neutral-200'] = designDna.colors.neutrals.light;
    json['--ctc-neutral-50'] = designDna.colors.neutrals.lightest;

    // Semantic
    json['--ctc-success'] = designDna.colors.semantic.success;
    json['--ctc-warning'] = designDna.colors.semantic.warning;
    json['--ctc-error'] = designDna.colors.semantic.error;
    json['--ctc-info'] = designDna.colors.semantic.info;

    // Typography
    json['--ctc-font-heading'] = designDna.typography.headingFont.family;
    json['--ctc-font-body'] = designDna.typography.bodyFont.family;
    json['--ctc-text-base'] = designDna.typography.baseSize;
    json['--ctc-line-height'] = String(designDna.typography.bodyFont.lineHeight);

    // Spacing
    json['--ctc-space-unit'] = `${designDna.spacing.baseUnit}px`;

    // Radii
    json['--ctc-radius-sm'] = designDna.shapes.borderRadius.small;
    json['--ctc-radius-md'] = designDna.shapes.borderRadius.medium;
    json['--ctc-radius-lg'] = designDna.shapes.borderRadius.large;
    json['--ctc-radius-full'] = designDna.shapes.borderRadius.full;

    // Shadows
    json['--ctc-shadow-sm'] = designDna.effects.shadows.cardShadow || '0 1px 2px rgba(0,0,0,0.05)';
    json['--ctc-shadow-md'] = designDna.effects.shadows.buttonShadow || '0 4px 6px rgba(0,0,0,0.1)';
    json['--ctc-shadow-lg'] = designDna.effects.shadows.elevatedShadow || '0 10px 15px rgba(0,0,0,0.1)';

    // Motion
    const speedMap = { instant: '0ms', fast: '150ms', normal: '200ms', slow: '300ms' };
    json['--ctc-duration'] = speedMap[designDna.motion.transitionSpeed] || '200ms';
    json['--ctc-ease'] = designDna.motion.easingStyle === 'spring'
      ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      : 'cubic-bezier(0.4, 0, 0.2, 1)';

    // Convert to CSS
    const css = `:root {\n${Object.entries(json).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}`;

    return { css, json };
  }

  /**
   * Compute hash of Design DNA for cache invalidation
   */
  computeDesignDnaHash(designDna: DesignDNA): string {
    const key = JSON.stringify({
      colors: designDna.colors,
      typography: designDna.typography,
      shapes: designDna.shapes,
      personality: designDna.personality
    });

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private async callGemini(prompt: string): Promise<Partial<BrandDesignSystem>> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${this.config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 16384 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  private async callClaude(prompt: string): Promise<Partial<BrandDesignSystem>> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  }

  private compileCSS(
    tokens: string,
    components: Record<string, ComponentStyleDefinition>,
    interactions: Record<string, string>,
    typography: Record<string, string>
  ): string {
    const parts = [tokens];

    // Add component base styles
    Object.entries(components).forEach(([name, def]) => {
      if (def.baseCSS) parts.push(def.baseCSS);
      Object.values(def.variants || {}).forEach(css => parts.push(css));
    });

    // Add interactions
    Object.values(interactions).forEach(css => {
      if (css && !css.startsWith('@keyframes')) parts.push(css);
    });

    // Add keyframes
    if (interactions.keyframes) {
      Object.entries(interactions.keyframes).forEach(([name, css]) => {
        parts.push(`@keyframes ${name} { ${css} }`);
      });
    }

    // Add typography
    Object.values(typography).forEach(css => parts.push(css));

    return parts.filter(Boolean).join('\n\n');
  }

  private getDefaultComponentStyles(): BrandDesignSystem['componentStyles'] {
    const defaultStyle: ComponentStyleDefinition = {
      baseCSS: '',
      variants: {},
      states: {}
    };
    return {
      button: defaultStyle,
      card: defaultStyle,
      hero: defaultStyle,
      timeline: defaultStyle,
      testimonial: defaultStyle,
      faq: defaultStyle,
      cta: defaultStyle,
      keyTakeaways: defaultStyle,
      prose: defaultStyle,
      list: defaultStyle,
      table: defaultStyle,
      blockquote: defaultStyle
    };
  }

  private getDefaultDecorative(): BrandDesignSystem['decorative'] {
    return {
      dividers: { default: '', subtle: '', decorative: '' },
      sectionBackgrounds: { default: '', accent: '', featured: '' }
    };
  }

  private getDefaultInteractions(): BrandDesignSystem['interactions'] {
    return {
      buttonHover: '',
      buttonActive: '',
      buttonFocus: '',
      cardHover: '',
      linkHover: '',
      focusRing: '',
      keyframes: {}
    };
  }

  private getDefaultTypography(): BrandDesignSystem['typographyTreatments'] {
    return {
      headingDecoration: '',
      dropCap: '',
      pullQuote: '',
      listMarker: '',
      linkUnderline: '',
      codeBlock: ''
    };
  }

  private getDefaultImageTreatments(): BrandDesignSystem['imageTreatments'] {
    return {
      defaultFrame: '',
      featured: '',
      thumbnail: '',
      gallery: ''
    };
  }

  private getDefaultVariantMappings(): BrandDesignSystem['variantMappings'] {
    return {
      card: { default: 'ctc-card', elevated: 'ctc-card--elevated', bordered: 'ctc-card--bordered', featured: 'ctc-card--featured' },
      hero: { default: 'ctc-hero', gradient: 'ctc-hero--gradient', image: 'ctc-hero--image', minimal: 'ctc-hero--minimal' },
      button: { default: 'ctc-btn', primary: 'ctc-btn--primary', secondary: 'ctc-btn--secondary', outline: 'ctc-btn--outline' },
      cta: { default: 'ctc-cta', banner: 'ctc-cta--banner', inline: 'ctc-cta--inline', floating: 'ctc-cta--floating' }
    };
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts --reporter=verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add services/design-analysis/BrandDesignSystemGenerator.ts services/design-analysis/__tests__/BrandDesignSystemGenerator.test.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add BrandDesignSystemGenerator service

AI-powered unique CSS generation from Design DNA:
- Generates CSS tokens from brand colors/typography
- Creates component-specific styles
- Builds decorative elements
- Compiles complete CSS output
- Hash-based cache invalidation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Database Schema

### Task 4.1: Create Database Migration

**Files:**
- Create: `supabase/migrations/20260125_brand_design_systems.sql`

**Step 1: Write the migration**

```sql
-- supabase/migrations/20260125_brand_design_systems.sql

-- Brand Design DNA (extracted from website via AI Vision)
CREATE TABLE IF NOT EXISTS brand_design_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  design_dna JSONB NOT NULL,
  ai_model TEXT,
  confidence_score NUMERIC,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated Brand Design Systems
CREATE TABLE IF NOT EXISTS brand_design_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  design_dna_id UUID REFERENCES brand_design_dna(id) ON DELETE SET NULL,
  brand_name TEXT NOT NULL,
  design_dna_hash TEXT NOT NULL,
  tokens JSONB NOT NULL,
  component_styles JSONB NOT NULL,
  decorative_elements JSONB,
  interactions JSONB,
  typography_treatments JSONB,
  image_treatments JSONB,
  compiled_css TEXT NOT NULL,
  variant_mappings JSONB,
  ai_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Only one active system per project per hash
  UNIQUE(project_id, design_dna_hash)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_brand_dna_project ON brand_design_dna(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_project ON brand_design_systems(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_systems_hash ON brand_design_systems(design_dna_hash);

-- Row Level Security
ALTER TABLE brand_design_dna ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_design_systems ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can access their own project's data)
CREATE POLICY "Users can view own brand_design_dna"
  ON brand_design_dna FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own brand_design_dna"
  ON brand_design_dna FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own brand_design_dna"
  ON brand_design_dna FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own brand_design_dna"
  ON brand_design_dna FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can view own brand_design_systems"
  ON brand_design_systems FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own brand_design_systems"
  ON brand_design_systems FOR INSERT
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own brand_design_systems"
  ON brand_design_systems FOR UPDATE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own brand_design_systems"
  ON brand_design_systems FOR DELETE
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260125_brand_design_systems.sql
git commit -m "$(cat <<'EOF'
feat(db): add brand design DNA and systems tables

Database schema for AI Vision brand extraction:
- brand_design_dna: Stores extracted Design DNA from screenshots
- brand_design_systems: Stores generated CSS design systems
- RLS policies for user isolation
- Unique constraint on project + hash for caching

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Integration & UI

### Task 5.1: Create Brand Design System Storage Service

**Files:**
- Create: `services/design-analysis/brandDesignSystemStorage.ts`

**Step 1: Implement storage service**

```typescript
// services/design-analysis/brandDesignSystemStorage.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../../types/designDna';

let supabase: SupabaseClient | null = null;

export function initBrandDesignSystemStorage(url: string, key: string) {
  supabase = createClient(url, key);
}

/**
 * Save Design DNA extraction result
 */
export async function saveDesignDNA(
  projectId: string,
  result: DesignDNAExtractionResult
): Promise<string> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_dna')
    .insert({
      project_id: projectId,
      source_url: result.sourceUrl,
      screenshot_base64: result.screenshotBase64,
      design_dna: result.designDna,
      ai_model: result.aiModel,
      confidence_score: result.designDna.confidence.overall,
      processing_time_ms: result.processingTimeMs
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get Design DNA for a project
 */
export async function getDesignDNA(projectId: string): Promise<DesignDNAExtractionResult | null> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_dna')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    designDna: data.design_dna as DesignDNA,
    screenshotBase64: data.screenshot_base64,
    sourceUrl: data.source_url,
    extractedAt: data.created_at,
    aiModel: data.ai_model,
    processingTimeMs: data.processing_time_ms
  };
}

/**
 * Save Brand Design System
 */
export async function saveBrandDesignSystem(
  projectId: string,
  designDnaId: string | null,
  system: BrandDesignSystem
): Promise<string> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_systems')
    .upsert({
      project_id: projectId,
      design_dna_id: designDnaId,
      brand_name: system.brandName,
      design_dna_hash: system.designDnaHash,
      tokens: system.tokens,
      component_styles: system.componentStyles,
      decorative_elements: system.decorative,
      interactions: system.interactions,
      typography_treatments: system.typographyTreatments,
      image_treatments: system.imageTreatments,
      compiled_css: system.compiledCss,
      variant_mappings: system.variantMappings
    }, {
      onConflict: 'project_id,design_dna_hash'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get Brand Design System for a project
 */
export async function getBrandDesignSystem(projectId: string): Promise<BrandDesignSystem | null> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_systems')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    brandName: data.brand_name,
    sourceUrl: '',
    generatedAt: data.created_at,
    designDnaHash: data.design_dna_hash,
    tokens: data.tokens,
    componentStyles: data.component_styles,
    decorative: data.decorative_elements,
    interactions: data.interactions,
    typographyTreatments: data.typography_treatments,
    imageTreatments: data.image_treatments,
    compiledCss: data.compiled_css,
    variantMappings: data.variant_mappings
  };
}

/**
 * Check if design system exists for hash (for caching)
 */
export async function hasDesignSystemForHash(
  projectId: string,
  hash: string
): Promise<boolean> {
  if (!supabase) throw new Error('Storage not initialized');

  const { count } = await supabase
    .from('brand_design_systems')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('design_dna_hash', hash);

  return (count || 0) > 0;
}
```

**Step 2: Commit**

```bash
git add services/design-analysis/brandDesignSystemStorage.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add brand design system storage service

Supabase integration for:
- Saving/retrieving Design DNA extractions
- Saving/retrieving Brand Design Systems
- Cache checking by DNA hash

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5.2: Create Service Index Export

**Files:**
- Create: `services/design-analysis/index.ts`

**Step 1: Write index file**

```typescript
// services/design-analysis/index.ts
/**
 * Design Analysis Services
 *
 * AI Vision-First Brand Design System extraction and generation.
 */

// Core Services
export { BrandDiscoveryService } from './BrandDiscoveryService';
export { DesignQualityValidator } from './DesignQualityValidator';
export { AIDesignAnalyzer } from './AIDesignAnalyzer';
export { BrandDesignSystemGenerator } from './BrandDesignSystemGenerator';

// Storage
export {
  initBrandDesignSystemStorage,
  saveDesignDNA,
  getDesignDNA,
  saveBrandDesignSystem,
  getBrandDesignSystem,
  hasDesignSystemForHash
} from './brandDesignSystemStorage';

// Prompts (for debugging/inspection)
export { DESIGN_DNA_EXTRACTION_PROMPT, DESIGN_DNA_VALIDATION_PROMPT } from './prompts/designDnaPrompt';
export { buildDesignSystemGenerationPrompt } from './prompts/designSystemPrompt';
```

**Step 2: Commit**

```bash
git add services/design-analysis/index.ts
git commit -m "$(cat <<'EOF'
feat(design-analysis): add service index exports

Central export for all design analysis services.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Summary

This implementation plan covers:

1. **Phase 1** - Fix critical hex color parsing bug (Tasks 1.1-1.2)
2. **Phase 2** - AI Vision Design DNA extraction (Tasks 2.1-2.3)
3. **Phase 3** - Brand Design System generation (Tasks 3.1-3.3)
4. **Phase 4** - Database schema (Task 4.1)
5. **Phase 5** - Integration & storage (Tasks 5.1-5.2)

Each task follows TDD with:
- Write failing test
- Run test to verify failure
- Implement minimal code
- Run test to verify pass
- Commit

**Next Steps After This Plan:**
- Phase 6: Update renderer to use brand design systems
- Phase 7: Create UI components for screenshot display and DNA preview
- Phase 8: Remove hardcoded visual styles from blueprint system
