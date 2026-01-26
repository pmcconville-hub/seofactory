import { describe, it, expect } from 'vitest';
import { LayoutPlanner } from '../LayoutPlanner';
import { SectionAnalysis, ContentType, SectionConstraints, SemanticWeightFactors } from '../types';
import { DesignDNA } from '../../../types/designDna';

// =============================================================================
// HELPER FACTORIES
// =============================================================================

function createMockSectionAnalysis(overrides: Partial<SectionAnalysis> = {}): SectionAnalysis {
  const defaultFactors: SemanticWeightFactors = {
    baseWeight: 3,
    topicCategoryBonus: 0,
    coreTopicBonus: 0,
    fsTargetBonus: 0,
    mainIntentBonus: 0,
    totalWeight: 3,
  };

  const defaultConstraints: SectionConstraints = {};

  return {
    sectionId: 'section-1',
    heading: 'Test Section',
    headingLevel: 2,
    contentType: 'explanation' as ContentType,
    semanticWeight: 3,
    semanticWeightFactors: defaultFactors,
    constraints: defaultConstraints,
    wordCount: 100,
    hasTable: false,
    hasList: false,
    hasQuote: false,
    hasImage: false,
    isCoreTopic: false,
    answersMainIntent: false,
    contentZone: 'MAIN',
    ...overrides,
  };
}

function createMockDesignDNA(overrides: Partial<DesignDNA> = {}): DesignDNA {
  return {
    colors: {
      primary: { hex: '#3B82F6', usage: 'primary', confidence: 0.9 },
      primaryLight: { hex: '#60A5FA', usage: 'primary-light', confidence: 0.8 },
      primaryDark: { hex: '#1D4ED8', usage: 'primary-dark', confidence: 0.8 },
      secondary: { hex: '#10B981', usage: 'secondary', confidence: 0.8 },
      accent: { hex: '#F59E0B', usage: 'accent', confidence: 0.8 },
      neutrals: {
        darkest: '#111827',
        dark: '#374151',
        medium: '#6B7280',
        light: '#D1D5DB',
        lightest: '#F9FAFB',
      },
      semantic: {
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
      },
      harmony: 'complementary',
      dominantMood: 'corporate',
      contrastLevel: 'medium',
    },
    typography: {
      headingFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 700,
        style: 'sans-serif',
        character: 'modern',
      },
      bodyFont: {
        family: 'Inter',
        fallback: 'sans-serif',
        weight: 400,
        style: 'sans-serif',
        lineHeight: 1.6,
      },
      scaleRatio: 1.25,
      baseSize: '16px',
      headingCase: 'none',
      headingLetterSpacing: 'normal',
      usesDropCaps: false,
      headingUnderlineStyle: 'none',
      linkStyle: 'underline',
    },
    spacing: {
      baseUnit: 8,
      density: 'comfortable',
      sectionGap: 'moderate',
      contentWidth: 'medium',
      whitespacePhilosophy: 'balanced',
    },
    shapes: {
      borderRadius: {
        style: 'subtle',
        small: '4px',
        medium: '8px',
        large: '12px',
        full: '9999px',
      },
      buttonStyle: 'soft',
      cardStyle: 'subtle-shadow',
      inputStyle: 'bordered',
    },
    effects: {
      shadows: {
        style: 'subtle',
        cardShadow: '0 1px 3px rgba(0,0,0,0.1)',
        buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
        elevatedShadow: '0 4px 6px rgba(0,0,0,0.1)',
      },
      gradients: {
        usage: 'subtle',
        primaryGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
        heroGradient: 'linear-gradient(180deg, #F9FAFB, #FFFFFF)',
        ctaGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
      },
      backgrounds: {
        usesPatterns: false,
        usesTextures: false,
        usesOverlays: false,
      },
      borders: {
        style: 'subtle',
        defaultColor: '#E5E7EB',
        accentBorderUsage: false,
      },
    },
    decorative: {
      dividerStyle: 'line',
      usesFloatingShapes: false,
      usesCornerAccents: false,
      usesWaveShapes: false,
      usesGeometricPatterns: false,
      iconStyle: 'outline',
      decorativeAccentColor: '#3B82F6',
    },
    layout: {
      gridStyle: 'strict-12',
      alignment: 'left',
      heroStyle: 'contained',
      cardLayout: 'grid',
      ctaPlacement: 'section-end',
      navigationStyle: 'standard',
    },
    motion: {
      overall: 'subtle',
      transitionSpeed: 'normal',
      easingStyle: 'ease',
      hoverEffects: {
        buttons: 'darken',
        cards: 'lift',
        links: 'underline',
      },
      scrollAnimations: false,
      parallaxEffects: false,
    },
    images: {
      treatment: 'natural',
      frameStyle: 'rounded',
      hoverEffect: 'none',
      aspectRatioPreference: '16:9',
    },
    componentPreferences: {
      preferredListStyle: 'bullets',
      preferredCardStyle: 'minimal',
      testimonialStyle: 'card',
      faqStyle: 'accordion',
      ctaStyle: 'button',
    },
    personality: {
      overall: 'corporate',
      formality: 3,
      energy: 3,
      warmth: 3,
      trustSignals: 'moderate',
    },
    confidence: {
      overall: 0.85,
      colorsConfidence: 0.9,
      typographyConfidence: 0.85,
      layoutConfidence: 0.8,
    },
    analysisNotes: [],
    ...overrides,
  } as DesignDNA;
}

// =============================================================================
// WIDTH DECISION TESTS
// =============================================================================

describe('LayoutPlanner', () => {
  describe('planLayout - width decisions', () => {
    it('should return medium width for standard semantic weight (3)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('medium');
    });

    it('should return full width for hero sections (weight 5)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('full');
    });

    it('should return wide width for featured sections (weight 4)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('wide');
    });

    it('should return narrow width for supporting sections (weight 2)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('narrow');
    });

    it('should return narrow width for minimal sections (weight 1)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('narrow');
    });

    it('should always use wide width for sections with tables', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 2,
        hasTable: true,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('wide');
    });

    it('should bump up width for spacious brand density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'spacious',
          sectionGap: 'generous',
          contentWidth: 'wide',
          whitespacePhilosophy: 'luxurious',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // medium bumped up to wide
      expect(layout.width).toBe('wide');
    });

    it('should bump up width for airy brand density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'airy',
          sectionGap: 'dramatic',
          contentWidth: 'wide',
          whitespacePhilosophy: 'luxurious',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // medium bumped up to wide
      expect(layout.width).toBe('wide');
    });

    it('should bump down width for compact brand density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 4 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'compact',
          sectionGap: 'tight',
          contentWidth: 'narrow',
          whitespacePhilosophy: 'minimal',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // wide bumped down to medium
      expect(layout.width).toBe('medium');
    });

    it('should not bump width below narrow', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 1 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'compact',
          sectionGap: 'tight',
          contentWidth: 'narrow',
          whitespacePhilosophy: 'minimal',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.width).toBe('narrow');
    });

    it('should not bump width above full', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'airy',
          sectionGap: 'dramatic',
          contentWidth: 'wide',
          whitespacePhilosophy: 'luxurious',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.width).toBe('full');
    });
  });

  // =============================================================================
  // COLUMN DECISION TESTS
  // =============================================================================

  describe('planLayout - column decisions', () => {
    it('should default to 1-column layout', () => {
      const analysis = createMockSectionAnalysis();
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('1-column');
    });

    it('should use 1-column for FS-protected sections', () => {
      const analysis = createMockSectionAnalysis({
        formatCode: 'FS',
        constraints: { fsTarget: true },
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('1-column');
    });

    it('should use 1-column for sections with tables', () => {
      const analysis = createMockSectionAnalysis({ hasTable: true });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('1-column');
    });

    it('should use 2-column for comparison content', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'comparison',
        hasTable: false,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('2-column');
    });

    it('should use asymmetric-right for supporting evidence with asymmetric brand', () => {
      const analysis = createMockSectionAnalysis({
        contentZone: 'SUPPLEMENTARY',
        semanticWeight: 2,
      });
      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'asymmetric',
          alignment: 'left',
          heroStyle: 'contained',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.columns).toBe('asymmetric-right');
    });

    it('should use 2-column for FAQ with high weight', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'faq',
        semanticWeight: 3,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('2-column');
    });

    it('should use 1-column for FAQ with low weight', () => {
      const analysis = createMockSectionAnalysis({
        contentType: 'faq',
        semanticWeight: 2,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('1-column');
    });
  });

  // =============================================================================
  // SPACING DECISION TESTS
  // =============================================================================

  describe('planLayout - spacing decisions', () => {
    it('should use normal spacing for comfortable density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'comfortable',
          sectionGap: 'moderate',
          contentWidth: 'medium',
          whitespacePhilosophy: 'balanced',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.verticalSpacingBefore).toBe('normal');
      expect(layout.verticalSpacingAfter).toBe('normal');
    });

    it('should use tight spacing for compact density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'compact',
          sectionGap: 'tight',
          contentWidth: 'medium',
          whitespacePhilosophy: 'minimal',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.verticalSpacingBefore).toBe('tight');
      expect(layout.verticalSpacingAfter).toBe('tight');
    });

    it('should use generous spacing for spacious density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'spacious',
          sectionGap: 'generous',
          contentWidth: 'medium',
          whitespacePhilosophy: 'balanced',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.verticalSpacingBefore).toBe('generous');
      expect(layout.verticalSpacingAfter).toBe('generous');
    });

    it('should use dramatic spacing for airy density', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'airy',
          sectionGap: 'dramatic',
          contentWidth: 'medium',
          whitespacePhilosophy: 'luxurious',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.verticalSpacingBefore).toBe('dramatic');
      expect(layout.verticalSpacingAfter).toBe('dramatic');
    });

    it('should upgrade spacing for hero sections (weight 5)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'comfortable',
          sectionGap: 'moderate',
          contentWidth: 'medium',
          whitespacePhilosophy: 'balanced',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // normal upgraded to generous
      expect(layout.verticalSpacingBefore).toBe('generous');
      expect(layout.verticalSpacingAfter).toBe('generous');
    });

    it('should downgrade spacing for minimal sections (weight ≤ 2)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 2 });
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'comfortable',
          sectionGap: 'moderate',
          contentWidth: 'medium',
          whitespacePhilosophy: 'balanced',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      // normal downgraded to tight
      expect(layout.verticalSpacingBefore).toBe('tight');
      expect(layout.verticalSpacingAfter).toBe('tight');
    });

    it('should default to normal spacing when no DNA provided', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.verticalSpacingBefore).toBe('normal');
      expect(layout.verticalSpacingAfter).toBe('normal');
    });
  });

  // =============================================================================
  // BREAK DECISION TESTS
  // =============================================================================

  describe('planLayout - break decisions', () => {
    it('should add hard break after hero sections (weight 5)', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.breakAfter).toBe('hard');
    });

    it('should add soft break before high-importance CTA-style sections', () => {
      const analysis = createMockSectionAnalysis({
        semanticWeight: 4,
        contentType: 'summary',
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.breakBefore).toBe('soft');
    });

    it('should have no break for regular sections', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.breakBefore).toBe('none');
      expect(layout.breakAfter).toBe('none');
    });
  });

  // =============================================================================
  // IMAGE POSITION TESTS
  // =============================================================================

  describe('planLayout - image position decisions', () => {
    it('should return none when section has no image', () => {
      const analysis = createMockSectionAnalysis({ hasImage: false });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.imagePosition).toBe('none');
    });

    it('should return above for hero sections with images', () => {
      const analysis = createMockSectionAnalysis({
        hasImage: true,
        semanticWeight: 5,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.imagePosition).toBe('above');
    });

    it('should return left for standard sections with images', () => {
      const analysis = createMockSectionAnalysis({
        hasImage: true,
        semanticWeight: 3,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.imagePosition).toBe('left');
    });

    it('should return inline for sections with lists and images', () => {
      const analysis = createMockSectionAnalysis({
        hasImage: true,
        hasList: true,
        semanticWeight: 3,
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.imagePosition).toBe('inline');
    });

    it('should return background for hero sections when brand uses backgrounds', () => {
      const analysis = createMockSectionAnalysis({
        hasImage: true,
        semanticWeight: 5,
      });
      const dna = createMockDesignDNA({
        effects: {
          shadows: {
            style: 'medium',
            cardShadow: '0 2px 4px rgba(0,0,0,0.1)',
            buttonShadow: '0 1px 2px rgba(0,0,0,0.05)',
            elevatedShadow: '0 4px 6px rgba(0,0,0,0.1)',
          },
          gradients: {
            usage: 'prominent',
            primaryGradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            heroGradient: 'linear-gradient(180deg, #F9FAFB, #FFFFFF)',
            ctaGradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
          },
          backgrounds: {
            usesPatterns: false,
            usesTextures: false,
            usesOverlays: true,
          },
          borders: {
            style: 'subtle',
            defaultColor: '#E5E7EB',
            accentBorderUsage: false,
          },
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.imagePosition).toBe('background');
    });
  });

  // =============================================================================
  // TEXT ALIGNMENT TESTS
  // =============================================================================

  describe('planLayout - text alignment decisions', () => {
    it('should use left alignment by default', () => {
      const analysis = createMockSectionAnalysis();
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.alignText).toBe('left');
    });

    it('should use center alignment for hero sections', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 5 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.alignText).toBe('center');
    });

    it('should respect brand alignment preference', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3 });
      const dna = createMockDesignDNA({
        layout: {
          gridStyle: 'strict-12',
          alignment: 'center',
          heroStyle: 'contained',
          cardLayout: 'grid',
          ctaPlacement: 'section-end',
          navigationStyle: 'standard',
        },
      });
      const layout = LayoutPlanner.planLayout(analysis, dna);

      expect(layout.alignText).toBe('center');
    });
  });

  // =============================================================================
  // PLAN ALL LAYOUTS TESTS
  // =============================================================================

  describe('planAllLayouts', () => {
    it('should plan layouts for all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 5 }),
        createMockSectionAnalysis({ sectionId: 'section-2', semanticWeight: 3 }),
        createMockSectionAnalysis({ sectionId: 'section-3', semanticWeight: 2 }),
      ];

      const layouts = LayoutPlanner.planAllLayouts(analyses);

      expect(layouts).toHaveLength(3);
      expect(layouts[0].width).toBe('full');
      expect(layouts[1].width).toBe('medium');
      expect(layouts[2].width).toBe('narrow');
    });

    it('should apply design DNA consistently to all sections', () => {
      const analyses = [
        createMockSectionAnalysis({ sectionId: 'section-1', semanticWeight: 3 }),
        createMockSectionAnalysis({ sectionId: 'section-2', semanticWeight: 3 }),
      ];
      const dna = createMockDesignDNA({
        spacing: {
          baseUnit: 8,
          density: 'spacious',
          sectionGap: 'generous',
          contentWidth: 'wide',
          whitespacePhilosophy: 'luxurious',
        },
      });

      const layouts = LayoutPlanner.planAllLayouts(analyses, dna);

      expect(layouts[0].verticalSpacingBefore).toBe('generous');
      expect(layouts[1].verticalSpacingBefore).toBe('generous');
    });

    it('should return empty array for empty input', () => {
      const layouts = LayoutPlanner.planAllLayouts([]);
      expect(layouts).toEqual([]);
    });
  });

  // =============================================================================
  // INSTANCE METHODS TESTS
  // =============================================================================

  describe('instance methods', () => {
    it('should provide instance method for planLayout', () => {
      const planner = new LayoutPlanner();
      const analysis = createMockSectionAnalysis();
      const layout = planner.planLayout(analysis);

      expect(layout).toBeDefined();
      expect(layout.width).toBeDefined();
    });

    it('should provide instance method for planAllLayouts', () => {
      const planner = new LayoutPlanner();
      const analyses = [createMockSectionAnalysis()];
      const layouts = planner.planAllLayouts(analyses);

      expect(layouts).toHaveLength(1);
    });
  });

  // =============================================================================
  // EDGE CASES
  // =============================================================================

  describe('edge cases', () => {
    it('should handle fractional semantic weights', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 3.5 });
      const layout = LayoutPlanner.planLayout(analysis);

      // 3.5 rounds to 4 -> wide
      expect(layout.width).toBe('wide');
    });

    it('should handle weight below 1', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 0.5 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('narrow');
    });

    it('should handle weight above 5', () => {
      const analysis = createMockSectionAnalysis({ semanticWeight: 6 });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.width).toBe('full');
    });

    it('should handle undefined design DNA gracefully', () => {
      const analysis = createMockSectionAnalysis();
      const layout = LayoutPlanner.planLayout(analysis, undefined);

      expect(layout).toBeDefined();
      expect(layout.width).toBe('medium');
    });

    it('should preserve FS protection even with other column triggers', () => {
      // FS target + comparison type should still be 1-column
      const analysis = createMockSectionAnalysis({
        formatCode: 'FS',
        constraints: { fsTarget: true },
        contentType: 'comparison',
      });
      const layout = LayoutPlanner.planLayout(analysis);

      expect(layout.columns).toBe('1-column');
    });
  });
});
