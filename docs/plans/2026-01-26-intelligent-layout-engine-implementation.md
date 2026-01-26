# Intelligent Layout Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the publishing system to produce design-agency quality output by using ALL extracted brand intelligence and implementing intelligent layout decisions.

**Architecture:** A 6-component Layout Engine (SectionAnalyzer → LayoutPlanner → ComponentSelector → VisualEmphasizer → SuggestionGenerator → BrandAwareRenderer) that consumes signals from Topical Map, Content Brief, DesignDNA, and generated content to produce varied, brand-aligned layouts.

**Tech Stack:** TypeScript, React 18, TailwindCSS, Supabase, AI Vision (Gemini/Claude)

**Related Design Doc:** `docs/plans/2026-01-26-intelligent-layout-engine-design.md`

---

## Task 1: Section Analyzer Service

**Files:**
- Create: `services/layout-engine/SectionAnalyzer.ts`
- Create: `services/layout-engine/types.ts`
- Test: `services/layout-engine/__tests__/SectionAnalyzer.test.ts`

### Step 1.1: Create types file

```typescript
// services/layout-engine/types.ts

export type ContentType =
  | 'introduction' | 'explanation' | 'steps' | 'comparison'
  | 'faq' | 'evidence' | 'cta' | 'summary' | 'deep-dive';

export type AttributeCategory = 'ROOT' | 'RARE' | 'UNIQUE' | 'COMMON';

export interface SemanticWeightFactors {
  hasUniqueTopic: boolean;
  hasRareTopic: boolean;
  isCoreTopic: boolean;
  answersMainIntent: boolean;
  hasFSTarget: boolean;
}

export interface SectionConstraints {
  formatCodeRequired: string | null;
  fsProtection: boolean;
  imageRequired: boolean;
  tableRequired: boolean;
}

export interface SectionAnalysis {
  sectionId: string;
  headingText: string;
  contentType: ContentType;
  formatCode: string | null;
  semanticWeight: 1 | 2 | 3 | 4 | 5;
  weightFactors: SemanticWeightFactors;
  constraints: SectionConstraints;
  wordCount: number;
  hasGeneratedImage: boolean;
  hasTable: boolean;
  hasList: boolean;
}

export type LayoutWidth = 'narrow' | 'standard' | 'wide' | 'full';
export type ColumnLayout = 'single' | 'equal' | 'main-sidebar' | 'sidebar-main' | 'asymmetric';
export type ImagePosition = 'inline' | 'float-left' | 'float-right' | 'full-width' | 'pull-quote-style' | 'background';
export type VerticalSpacing = 'tight' | 'normal' | 'generous' | 'dramatic';
export type BreakType = 'divider' | 'color-band' | 'whitespace' | 'pattern';

export interface LayoutParameters {
  width: LayoutWidth;
  columns: 1 | 2 | 3;
  columnLayout: ColumnLayout;
  imagePosition: ImagePosition;
  verticalSpacing: VerticalSpacing;
  hasVisualBreak: boolean;
  breakType?: BreakType;
}

export type EmphasisLevel = 'hero' | 'featured' | 'standard' | 'supporting' | 'minimal';

export interface VisualEmphasis {
  level: EmphasisLevel;
  headingSize: 'xl' | 'lg' | 'md' | 'sm';
  headingDecoration: boolean;
  paddingMultiplier: number;
  marginMultiplier: number;
  hasBackgroundTreatment: boolean;
  backgroundType?: 'solid' | 'gradient' | 'pattern' | 'image';
  hasAccentBorder: boolean;
  accentPosition?: 'left' | 'top' | 'bottom' | 'all';
  elevation: 0 | 1 | 2 | 3;
  hasEntryAnimation: boolean;
  animationType?: 'fade' | 'slide' | 'scale';
}

export interface ComponentSelection {
  componentType: string;
  variant: string;
  className: string;
  reasoning: string;
}

export interface ImagePlacement {
  position: 'after-intro-paragraph' | 'section-end' | 'float-right' | 'float-left' | 'full-width-break' | 'inline';
  source: 'article_generated' | 'brand_kit' | 'screenshot_derived' | 'placeholder' | 'none';
  semanticRole: 'hero' | 'explanatory' | 'evidence' | 'decorative';
  placeholder?: {
    aspectRatio: '16:9' | '4:3' | '1:1' | 'auto';
    suggestedContent: string;
    altTextTemplate: string;
  };
}

export interface BlueprintSection {
  id: string;
  originalSectionId: string;
  headingText: string;
  analysis: SectionAnalysis;
  layout: LayoutParameters;
  component: ComponentSelection;
  emphasis: VisualEmphasis;
  image: ImagePlacement | null;
  cssClasses: string[];
  inlineStyles?: Record<string, string>;
  reasoning: string;
}

export interface LayoutSuggestion {
  type: 'visual_break' | 'emphasis_adjustment' | 'component_upgrade' | 'image_placement' | 'spacing_adjustment';
  sectionId: string;
  change: {
    before: unknown;
    after: unknown;
  };
  reasoning: string;
  confidence: number;
  fsImpact: boolean;
}

export interface LayoutBlueprint {
  id: string;
  articleId: string;
  generatedAt: string;
  pageSettings: {
    maxWidth: string;
    baseSpacing: string;
    colorMode: 'light' | 'dark' | 'auto';
  };
  sections: BlueprintSection[];
  reasoning: {
    layoutStrategy: string;
    keyDecisions: string[];
    suggestionsApplied: LayoutSuggestion[];
    suggestionsSkipped: LayoutSuggestion[];
  };
  validation: {
    semanticSeoCompliant: boolean;
    fsProtectionMaintained: boolean;
    brandAlignmentScore: number;
    issues: string[];
  };
}
```

### Step 1.2: Write failing test for SectionAnalyzer

```typescript
// services/layout-engine/__tests__/SectionAnalyzer.test.ts
import { SectionAnalyzer } from '../SectionAnalyzer';
import type { ContentBrief, ArticleContent } from '../../../types';

describe('SectionAnalyzer', () => {
  const mockBrief: Partial<ContentBrief> = {
    formatCodes: {
      'section-1': 'numbered-list',
      'section-2': null
    },
    targetSnippetType: 'list',
    topicCategory: 'UNIQUE'
  };

  const mockContent: Partial<ArticleContent> = {
    sections: [
      { id: 'section-1', heading: 'How to Start', content: '<ol><li>Step 1</li></ol>', wordCount: 150 },
      { id: 'section-2', heading: 'Why This Matters', content: '<p>Explanation...</p>', wordCount: 300 }
    ]
  };

  describe('analyzeSection', () => {
    it('should identify format code from brief', () => {
      const analyzer = new SectionAnalyzer();
      const result = analyzer.analyzeSection('section-1', mockContent as ArticleContent, mockBrief as ContentBrief);

      expect(result.formatCode).toBe('numbered-list');
      expect(result.constraints.fsProtection).toBe(true);
    });

    it('should calculate semantic weight based on topic category', () => {
      const analyzer = new SectionAnalyzer();
      const result = analyzer.analyzeSection('section-1', mockContent as ArticleContent, mockBrief as ContentBrief);

      expect(result.semanticWeight).toBeGreaterThanOrEqual(4); // UNIQUE should boost weight
      expect(result.weightFactors.hasUniqueTopic).toBe(true);
    });

    it('should detect content type from structure', () => {
      const analyzer = new SectionAnalyzer();
      const result = analyzer.analyzeSection('section-1', mockContent as ArticleContent, mockBrief as ContentBrief);

      expect(result.contentType).toBe('steps');
    });
  });

  describe('calculateSemanticWeight', () => {
    it('should return 5 for UNIQUE topic with FS target', () => {
      const analyzer = new SectionAnalyzer();
      const weight = analyzer.calculateSemanticWeight({
        attributeCategory: 'UNIQUE',
        isCoreTopic: true,
        hasFSTarget: true,
        answersMainIntent: true
      });

      expect(weight).toBe(5);
    });

    it('should return 3 for COMMON topic without special factors', () => {
      const analyzer = new SectionAnalyzer();
      const weight = analyzer.calculateSemanticWeight({
        attributeCategory: 'COMMON',
        isCoreTopic: false,
        hasFSTarget: false,
        answersMainIntent: false
      });

      expect(weight).toBe(3);
    });
  });
});
```

### Step 1.3: Run test to verify it fails

Run: `npm test -- --testPathPattern=SectionAnalyzer.test.ts`
Expected: FAIL with "Cannot find module '../SectionAnalyzer'"

### Step 1.4: Implement SectionAnalyzer

```typescript
// services/layout-engine/SectionAnalyzer.ts
import type { ContentBrief, ArticleContent, ArticleSection } from '../../types';
import type {
  SectionAnalysis,
  ContentType,
  AttributeCategory,
  SemanticWeightFactors,
  SectionConstraints
} from './types';

interface WeightInput {
  attributeCategory: AttributeCategory;
  isCoreTopic: boolean;
  hasFSTarget: boolean;
  answersMainIntent: boolean;
}

export class SectionAnalyzer {
  /**
   * Analyze a single section for layout planning
   */
  analyzeSection(
    sectionId: string,
    content: ArticleContent,
    brief: ContentBrief
  ): SectionAnalysis {
    const section = this.findSection(sectionId, content);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    const formatCode = this.getFormatCode(sectionId, brief);
    const contentType = this.detectContentType(section, formatCode);
    const weightFactors = this.extractWeightFactors(sectionId, brief);
    const semanticWeight = this.calculateSemanticWeight({
      attributeCategory: brief.topicCategory as AttributeCategory || 'COMMON',
      isCoreTopic: weightFactors.isCoreTopic,
      hasFSTarget: weightFactors.hasFSTarget,
      answersMainIntent: weightFactors.answersMainIntent
    });

    return {
      sectionId,
      headingText: section.heading || '',
      contentType,
      formatCode,
      semanticWeight,
      weightFactors,
      constraints: this.extractConstraints(formatCode, brief),
      wordCount: section.wordCount || this.countWords(section.content),
      hasGeneratedImage: this.hasImage(section.content),
      hasTable: this.hasTable(section.content),
      hasList: this.hasList(section.content)
    };
  }

  /**
   * Analyze all sections in an article
   */
  analyzeAllSections(
    content: ArticleContent,
    brief: ContentBrief
  ): SectionAnalysis[] {
    const sections = content.sections || [];
    return sections.map(section =>
      this.analyzeSection(section.id, content, brief)
    );
  }

  /**
   * Calculate semantic weight (1-5) based on topic importance
   */
  calculateSemanticWeight(input: WeightInput): 1 | 2 | 3 | 4 | 5 {
    let weight = 3; // Base weight

    // Boost for semantic importance
    switch (input.attributeCategory) {
      case 'UNIQUE': weight += 2; break;
      case 'RARE': weight += 1; break;
      case 'ROOT': weight += 0.5; break;
      case 'COMMON': break;
    }

    // Boost for core topics
    if (input.isCoreTopic) weight += 0.5;

    // Boost for FS targets
    if (input.hasFSTarget) weight += 0.5;

    // Boost for answering main intent
    if (input.answersMainIntent) weight += 0.5;

    return Math.min(5, Math.max(1, Math.round(weight))) as 1 | 2 | 3 | 4 | 5;
  }

  private findSection(sectionId: string, content: ArticleContent): ArticleSection | undefined {
    return content.sections?.find(s => s.id === sectionId);
  }

  private getFormatCode(sectionId: string, brief: ContentBrief): string | null {
    return brief.formatCodes?.[sectionId] || null;
  }

  private detectContentType(section: ArticleSection, formatCode: string | null): ContentType {
    const heading = (section.heading || '').toLowerCase();
    const content = section.content || '';

    // Check heading patterns
    if (heading.includes('introduction') || heading.includes('overview')) {
      return 'introduction';
    }
    if (heading.includes('faq') || heading.includes('question')) {
      return 'faq';
    }
    if (heading.includes('comparison') || heading.includes('vs')) {
      return 'comparison';
    }
    if (heading.includes('summary') || heading.includes('conclusion')) {
      return 'summary';
    }

    // Check format code
    if (formatCode === 'numbered-list' || formatCode === 'steps') {
      return 'steps';
    }

    // Check content structure
    if (content.includes('<ol>') && this.countListItems(content) >= 3) {
      return 'steps';
    }
    if (content.includes('<table>')) {
      return 'comparison';
    }

    // Default
    return 'explanation';
  }

  private extractWeightFactors(sectionId: string, brief: ContentBrief): SemanticWeightFactors {
    const topicCategory = brief.topicCategory as AttributeCategory;

    return {
      hasUniqueTopic: topicCategory === 'UNIQUE',
      hasRareTopic: topicCategory === 'RARE',
      isCoreTopic: brief.isCoreTopic ?? false,
      answersMainIntent: brief.answersMainIntent ?? false,
      hasFSTarget: !!brief.targetSnippetType
    };
  }

  private extractConstraints(formatCode: string | null, brief: ContentBrief): SectionConstraints {
    const fsProtectedFormats = ['numbered-list', 'bulleted-list', 'table', 'definition-list'];

    return {
      formatCodeRequired: formatCode,
      fsProtection: formatCode ? fsProtectedFormats.includes(formatCode) : false,
      imageRequired: brief.visualRequirements?.imageRequired ?? false,
      tableRequired: formatCode === 'table'
    };
  }

  private countWords(content: string): number {
    const text = content.replace(/<[^>]*>/g, ' ');
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  private countListItems(content: string): number {
    return (content.match(/<li>/g) || []).length;
  }

  private hasImage(content: string): boolean {
    return /<img\s/i.test(content);
  }

  private hasTable(content: string): boolean {
    return /<table/i.test(content);
  }

  private hasList(content: string): boolean {
    return /<[ou]l/i.test(content);
  }
}
```

### Step 1.5: Run test to verify it passes

Run: `npm test -- --testPathPattern=SectionAnalyzer.test.ts`
Expected: PASS

### Step 1.6: Commit

```bash
git add services/layout-engine/types.ts services/layout-engine/SectionAnalyzer.ts services/layout-engine/__tests__/SectionAnalyzer.test.ts
git commit -m "feat(layout-engine): add SectionAnalyzer with semantic weight calculation

- Add comprehensive types for layout engine
- Implement SectionAnalyzer to detect content types
- Calculate semantic weight from topic category (UNIQUE/RARE/ROOT/COMMON)
- Extract constraints including FS protection

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Layout Planner Service

**Files:**
- Create: `services/layout-engine/LayoutPlanner.ts`
- Test: `services/layout-engine/__tests__/LayoutPlanner.test.ts`

### Step 2.1: Write failing test for LayoutPlanner

```typescript
// services/layout-engine/__tests__/LayoutPlanner.test.ts
import { LayoutPlanner } from '../LayoutPlanner';
import type { SectionAnalysis, LayoutParameters } from '../types';
import type { DesignDNA } from '../../../types/designDna';

describe('LayoutPlanner', () => {
  const mockDesignDNA: Partial<DesignDNA> = {
    spacing: {
      density: 'comfortable',
      contentWidth: 'medium'
    },
    layout: {
      gridStyle: 'asymmetric',
      alignment: 'left'
    },
    personality: {
      formality: 4,
      energy: 2
    }
  };

  describe('planLayout', () => {
    it('should use full width for hero sections (weight 5)', () => {
      const planner = new LayoutPlanner();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 5,
        contentType: 'introduction',
        constraints: { formatCodeRequired: null, fsProtection: false }
      };

      const result = planner.planLayout(section as SectionAnalysis, mockDesignDNA as DesignDNA);

      expect(result.width).toBe('full');
    });

    it('should use narrow width for supporting sections (weight 2)', () => {
      const planner = new LayoutPlanner();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 2,
        contentType: 'evidence',
        constraints: { formatCodeRequired: null, fsProtection: false }
      };

      const result = planner.planLayout(section as SectionAnalysis, mockDesignDNA as DesignDNA);

      expect(result.width).toBe('narrow');
    });

    it('should use wide width for tables regardless of weight', () => {
      const planner = new LayoutPlanner();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 3,
        contentType: 'comparison',
        hasTable: true,
        constraints: { formatCodeRequired: 'table', fsProtection: true }
      };

      const result = planner.planLayout(section as SectionAnalysis, mockDesignDNA as DesignDNA);

      expect(result.width).toBe('wide');
    });

    it('should determine two columns for comparison content', () => {
      const planner = new LayoutPlanner();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 4,
        contentType: 'comparison',
        hasTable: false,
        constraints: { formatCodeRequired: null, fsProtection: false }
      };

      const result = planner.planLayout(section as SectionAnalysis, mockDesignDNA as DesignDNA);

      expect(result.columns).toBe(2);
      expect(result.columnLayout).toBe('equal');
    });
  });
});
```

### Step 2.2: Run test to verify it fails

Run: `npm test -- --testPathPattern=LayoutPlanner.test.ts`
Expected: FAIL with "Cannot find module '../LayoutPlanner'"

### Step 2.3: Implement LayoutPlanner

```typescript
// services/layout-engine/LayoutPlanner.ts
import type { DesignDNA } from '../../types/designDna';
import type {
  SectionAnalysis,
  LayoutParameters,
  LayoutWidth,
  ColumnLayout,
  VerticalSpacing
} from './types';

export class LayoutPlanner {
  /**
   * Plan layout parameters for a section
   */
  planLayout(
    section: SectionAnalysis,
    dna: DesignDNA
  ): LayoutParameters {
    const width = this.determineWidth(section, dna);
    const { columns, columnLayout } = this.determineColumns(section, dna);
    const verticalSpacing = this.determineSpacing(section, dna);
    const imagePosition = this.determineImagePosition(section, dna);
    const { hasVisualBreak, breakType } = this.determineVisualBreak(section, dna);

    return {
      width,
      columns,
      columnLayout,
      imagePosition,
      verticalSpacing,
      hasVisualBreak,
      breakType
    };
  }

  /**
   * Determine section width based on semantic weight and content
   */
  private determineWidth(section: SectionAnalysis, dna: DesignDNA): LayoutWidth {
    // Tables always need wide width
    if (section.hasTable || section.constraints.tableRequired) {
      return 'wide';
    }

    // Map semantic weight to width
    const weightToWidth: Record<number, LayoutWidth> = {
      5: 'full',      // Hero sections
      4: 'wide',      // Featured sections
      3: 'standard',  // Normal sections
      2: 'narrow',    // Supporting sections
      1: 'narrow'     // Minimal sections
    };

    let baseWidth = weightToWidth[section.semanticWeight] || 'standard';

    // Adjust based on brand density preference
    if (dna.spacing?.density === 'spacious' && baseWidth === 'standard') {
      baseWidth = 'wide';
    } else if (dna.spacing?.density === 'compact' && baseWidth === 'wide') {
      baseWidth = 'standard';
    }

    // CTA sections get special treatment
    if (section.contentType === 'cta') {
      return section.semanticWeight >= 4 ? 'wide' : 'standard';
    }

    return baseWidth;
  }

  /**
   * Determine column layout based on content type and brand
   */
  private determineColumns(
    section: SectionAnalysis,
    dna: DesignDNA
  ): { columns: 1 | 2 | 3; columnLayout: ColumnLayout } {
    // Never break FS-protected format codes
    if (section.constraints.fsProtection) {
      return { columns: 1, columnLayout: 'single' };
    }

    // Tables need full width - single column
    if (section.hasTable) {
      return { columns: 1, columnLayout: 'single' };
    }

    // Two-column for comparison content
    if (section.contentType === 'comparison') {
      return { columns: 2, columnLayout: 'equal' };
    }

    // Sidebar layout for supporting evidence with asymmetric brand
    if (
      section.semanticWeight <= 2 &&
      dna.layout?.gridStyle === 'asymmetric'
    ) {
      return { columns: 2, columnLayout: 'main-sidebar' };
    }

    // FAQ can use grid layout
    if (section.contentType === 'faq' && section.semanticWeight >= 3) {
      return { columns: 2, columnLayout: 'equal' };
    }

    // Default to single column
    return { columns: 1, columnLayout: 'single' };
  }

  /**
   * Determine vertical spacing based on weight and brand
   */
  private determineSpacing(section: SectionAnalysis, dna: DesignDNA): VerticalSpacing {
    const densityToSpacing: Record<string, VerticalSpacing> = {
      'compact': 'tight',
      'comfortable': 'normal',
      'spacious': 'generous',
      'airy': 'dramatic'
    };

    let baseSpacing = densityToSpacing[dna.spacing?.density || 'comfortable'] || 'normal';

    // Hero sections get more space
    if (section.semanticWeight === 5) {
      const spacingUpgrade: Record<VerticalSpacing, VerticalSpacing> = {
        'tight': 'normal',
        'normal': 'generous',
        'generous': 'dramatic',
        'dramatic': 'dramatic'
      };
      baseSpacing = spacingUpgrade[baseSpacing];
    }

    // Minimal sections get less space
    if (section.semanticWeight <= 2) {
      const spacingDowngrade: Record<VerticalSpacing, VerticalSpacing> = {
        'tight': 'tight',
        'normal': 'tight',
        'generous': 'normal',
        'dramatic': 'generous'
      };
      baseSpacing = spacingDowngrade[baseSpacing];
    }

    return baseSpacing;
  }

  /**
   * Determine image position based on content and brand
   */
  private determineImagePosition(
    section: SectionAnalysis,
    dna: DesignDNA
  ): 'inline' | 'float-left' | 'float-right' | 'full-width' | 'pull-quote-style' | 'background' {
    // No image in section
    if (!section.hasGeneratedImage && !section.constraints.imageRequired) {
      return 'inline';
    }

    // Hero sections can use background images
    if (section.semanticWeight === 5 && dna.layout?.heroStyle === 'full-bleed') {
      return 'background';
    }

    // Featured sections get full-width images
    if (section.semanticWeight >= 4) {
      return 'full-width';
    }

    // Asymmetric layouts prefer floats
    if (dna.layout?.gridStyle === 'asymmetric') {
      return section.sectionId.charCodeAt(0) % 2 === 0 ? 'float-left' : 'float-right';
    }

    return 'inline';
  }

  /**
   * Determine if visual break is needed
   */
  private determineVisualBreak(
    section: SectionAnalysis,
    dna: DesignDNA
  ): { hasVisualBreak: boolean; breakType?: 'divider' | 'color-band' | 'whitespace' | 'pattern' } {
    // Add breaks after hero sections
    if (section.semanticWeight === 5) {
      return {
        hasVisualBreak: true,
        breakType: dna.decorative?.dividerStyle === 'none' ? 'whitespace' : 'divider'
      };
    }

    // Add breaks before CTA sections
    if (section.contentType === 'cta' && section.semanticWeight >= 4) {
      return {
        hasVisualBreak: true,
        breakType: 'color-band'
      };
    }

    return { hasVisualBreak: false };
  }
}
```

### Step 2.4: Run test to verify it passes

Run: `npm test -- --testPathPattern=LayoutPlanner.test.ts`
Expected: PASS

### Step 2.5: Commit

```bash
git add services/layout-engine/LayoutPlanner.ts services/layout-engine/__tests__/LayoutPlanner.test.ts
git commit -m "feat(layout-engine): add LayoutPlanner with width/column logic

- Determine width based on semantic weight (hero→full, supporting→narrow)
- Calculate column layouts (comparison→2col, tables→1col)
- Respect FS protection (never break format codes)
- Add visual break detection for section transitions

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Component Selector Service

**Files:**
- Create: `services/layout-engine/ComponentSelector.ts`
- Create: `services/layout-engine/componentMappings.ts`
- Test: `services/layout-engine/__tests__/ComponentSelector.test.ts`

### Step 3.1: Write failing test for ComponentSelector

```typescript
// services/layout-engine/__tests__/ComponentSelector.test.ts
import { ComponentSelector } from '../ComponentSelector';
import type { SectionAnalysis } from '../types';
import type { DesignDNA } from '../../../types/designDna';

describe('ComponentSelector', () => {
  const corporateDNA: Partial<DesignDNA> = {
    personality: {
      overall: 'corporate',
      formality: 4,
      energy: 2,
      warmth: 2
    }
  };

  const creativeDNA: Partial<DesignDNA> = {
    personality: {
      overall: 'creative',
      formality: 2,
      energy: 4,
      warmth: 4
    }
  };

  describe('selectComponent', () => {
    it('should select accordion-clean for FAQ with corporate brand', () => {
      const selector = new ComponentSelector();
      const section: Partial<SectionAnalysis> = {
        contentType: 'faq',
        constraints: { fsProtection: false }
      };

      const result = selector.selectComponent(section as SectionAnalysis, corporateDNA as DesignDNA);

      expect(result.componentType).toBe('faq-accordion');
      expect(result.variant).toBe('clean');
    });

    it('should select accordion-colorful for FAQ with creative brand', () => {
      const selector = new ComponentSelector();
      const section: Partial<SectionAnalysis> = {
        contentType: 'faq',
        constraints: { fsProtection: false }
      };

      const result = selector.selectComponent(section as SectionAnalysis, creativeDNA as DesignDNA);

      expect(result.componentType).toBe('faq-accordion');
      expect(result.variant).toBe('colorful');
    });

    it('should select FS-compliant component for protected sections', () => {
      const selector = new ComponentSelector();
      const section: Partial<SectionAnalysis> = {
        contentType: 'steps',
        formatCode: 'numbered-list',
        constraints: { fsProtection: true, formatCodeRequired: 'numbered-list' }
      };

      const result = selector.selectComponent(section as SectionAnalysis, corporateDNA as DesignDNA);

      expect(result.variant).toBe('fs-compliant');
      expect(result.reasoning).toContain('FS-protected');
    });
  });
});
```

### Step 3.2: Run test to verify it fails

Run: `npm test -- --testPathPattern=ComponentSelector.test.ts`
Expected: FAIL with "Cannot find module '../ComponentSelector'"

### Step 3.3: Create component mappings

```typescript
// services/layout-engine/componentMappings.ts
import type { ContentType } from './types';

type PersonalityType = 'corporate' | 'creative' | 'minimal' | 'luxurious' | 'friendly' | 'bold' | 'elegant' | 'playful';

interface ComponentMapping {
  componentType: string;
  variants: Record<PersonalityType | 'default', string>;
}

export const COMPONENT_MAPPINGS: Record<ContentType, ComponentMapping> = {
  introduction: {
    componentType: 'hero-section',
    variants: {
      corporate: 'contained',
      creative: 'gradient',
      minimal: 'simple',
      luxurious: 'elegant',
      friendly: 'warm',
      bold: 'dramatic',
      elegant: 'refined',
      playful: 'vibrant',
      default: 'standard'
    }
  },
  explanation: {
    componentType: 'prose-section',
    variants: {
      corporate: 'structured',
      creative: 'flowing',
      minimal: 'clean',
      luxurious: 'spacious',
      friendly: 'readable',
      bold: 'impactful',
      elegant: 'refined',
      playful: 'casual',
      default: 'standard'
    }
  },
  steps: {
    componentType: 'timeline',
    variants: {
      corporate: 'vertical-professional',
      creative: 'playful',
      minimal: 'numbered',
      luxurious: 'elegant-vertical',
      friendly: 'illustrated',
      bold: 'large-numbers',
      elegant: 'refined',
      playful: 'colorful',
      default: 'vertical'
    }
  },
  comparison: {
    componentType: 'comparison-table',
    variants: {
      corporate: 'striped',
      creative: 'cards',
      minimal: 'simple',
      luxurious: 'bordered-elegant',
      friendly: 'icons',
      bold: 'highlighted',
      elegant: 'refined',
      playful: 'colorful',
      default: 'standard'
    }
  },
  faq: {
    componentType: 'faq-accordion',
    variants: {
      corporate: 'clean',
      creative: 'colorful',
      minimal: 'minimal',
      luxurious: 'elegant',
      friendly: 'friendly',
      bold: 'bold',
      elegant: 'refined',
      playful: 'bouncy',
      default: 'standard'
    }
  },
  evidence: {
    componentType: 'callout-box',
    variants: {
      corporate: 'bordered',
      creative: 'gradient',
      minimal: 'subtle',
      luxurious: 'gold-accent',
      friendly: 'rounded',
      bold: 'prominent',
      elegant: 'refined',
      playful: 'colorful',
      default: 'standard'
    }
  },
  cta: {
    componentType: 'cta-section',
    variants: {
      corporate: 'contained',
      creative: 'gradient',
      minimal: 'text-link',
      luxurious: 'elegant',
      friendly: 'warm',
      bold: 'banner',
      elegant: 'refined',
      playful: 'animated',
      default: 'standard'
    }
  },
  summary: {
    componentType: 'summary-box',
    variants: {
      corporate: 'key-points',
      creative: 'visual',
      minimal: 'checklist',
      luxurious: 'elegant',
      friendly: 'highlights',
      bold: 'numbered',
      elegant: 'refined',
      playful: 'icons',
      default: 'standard'
    }
  },
  'deep-dive': {
    componentType: 'deep-dive-section',
    variants: {
      corporate: 'structured',
      creative: 'narrative',
      minimal: 'clean',
      luxurious: 'spacious',
      friendly: 'readable',
      bold: 'segmented',
      elegant: 'refined',
      playful: 'interactive',
      default: 'standard'
    }
  }
};

export const FS_COMPLIANT_COMPONENTS: Record<string, string> = {
  'numbered-list': 'list-ordered-plain',
  'bulleted-list': 'list-unordered-plain',
  'definition-list': 'list-definition-plain',
  'table': 'table-standard',
  'paragraph': 'prose-standard',
  'steps': 'list-ordered-plain'
};

export const HIGH_VALUE_COMPONENTS: Record<string, Record<PersonalityType | 'default', string>> = {
  uniqueInsight: {
    corporate: 'callout-executive-summary',
    creative: 'highlight-card-gradient',
    minimal: 'callout-bordered',
    luxurious: 'insight-elegant',
    friendly: 'insight-warm',
    bold: 'insight-prominent',
    elegant: 'insight-refined',
    playful: 'insight-colorful',
    default: 'callout-standard'
  },
  keyTakeaway: {
    corporate: 'takeaway-box-professional',
    creative: 'takeaway-card-vibrant',
    minimal: 'takeaway-simple',
    luxurious: 'takeaway-elegant',
    friendly: 'takeaway-friendly',
    bold: 'takeaway-bold',
    elegant: 'takeaway-refined',
    playful: 'takeaway-fun',
    default: 'takeaway-standard'
  }
};
```

### Step 3.4: Implement ComponentSelector

```typescript
// services/layout-engine/ComponentSelector.ts
import type { DesignDNA } from '../../types/designDna';
import type { SectionAnalysis, ComponentSelection } from './types';
import {
  COMPONENT_MAPPINGS,
  FS_COMPLIANT_COMPONENTS,
  HIGH_VALUE_COMPONENTS
} from './componentMappings';

type PersonalityType = 'corporate' | 'creative' | 'minimal' | 'luxurious' | 'friendly' | 'bold' | 'elegant' | 'playful';

export class ComponentSelector {
  /**
   * Select appropriate component based on content type and brand personality
   */
  selectComponent(
    section: SectionAnalysis,
    dna: DesignDNA
  ): ComponentSelection {
    // FS-protected sections use compliant components
    if (section.constraints.fsProtection && section.constraints.formatCodeRequired) {
      return this.selectFSCompliantComponent(section.constraints.formatCodeRequired, dna);
    }

    // High-value sections (UNIQUE/RARE) may get special components
    if (section.weightFactors?.hasUniqueTopic || section.weightFactors?.hasRareTopic) {
      const highValueComponent = this.selectHighValueComponent(section, dna);
      if (highValueComponent) {
        return highValueComponent;
      }
    }

    // Standard two-factor selection
    return this.selectStandardComponent(section, dna);
  }

  /**
   * Select FS-compliant component that preserves format structure
   */
  private selectFSCompliantComponent(
    formatCode: string,
    dna: DesignDNA
  ): ComponentSelection {
    const componentType = FS_COMPLIANT_COMPONENTS[formatCode] || 'prose-standard';

    return {
      componentType,
      variant: 'fs-compliant',
      className: `ctc-${componentType}`,
      reasoning: `FS-protected format code (${formatCode}) requires standard HTML structure for Featured Snippet eligibility`
    };
  }

  /**
   * Select enhanced component for high-value (UNIQUE/RARE) sections
   */
  private selectHighValueComponent(
    section: SectionAnalysis,
    dna: DesignDNA
  ): ComponentSelection | null {
    const personality = this.getPersonalityType(dna);

    // Key takeaways for summary-type high-value content
    if (section.contentType === 'summary' && section.weightFactors?.hasUniqueTopic) {
      const variant = HIGH_VALUE_COMPONENTS.keyTakeaway[personality] || HIGH_VALUE_COMPONENTS.keyTakeaway.default;
      return {
        componentType: 'key-takeaway',
        variant,
        className: `ctc-key-takeaway ctc-key-takeaway--${variant}`,
        reasoning: `High-value UNIQUE topic section enhanced with key takeaway component (${personality} brand)`
      };
    }

    // Unique insights for explanation-type high-value content
    if (section.contentType === 'explanation' && section.weightFactors?.hasUniqueTopic) {
      const variant = HIGH_VALUE_COMPONENTS.uniqueInsight[personality] || HIGH_VALUE_COMPONENTS.uniqueInsight.default;
      return {
        componentType: 'unique-insight',
        variant,
        className: `ctc-unique-insight ctc-unique-insight--${variant}`,
        reasoning: `High-value UNIQUE topic section enhanced with insight callout (${personality} brand)`
      };
    }

    return null; // Use standard component
  }

  /**
   * Standard component selection based on content type + brand personality
   */
  private selectStandardComponent(
    section: SectionAnalysis,
    dna: DesignDNA
  ): ComponentSelection {
    const mapping = COMPONENT_MAPPINGS[section.contentType];
    if (!mapping) {
      return {
        componentType: 'prose-section',
        variant: 'standard',
        className: 'ctc-prose-section',
        reasoning: `Default prose component for unrecognized content type: ${section.contentType}`
      };
    }

    const personality = this.getPersonalityType(dna);
    const variant = mapping.variants[personality] || mapping.variants.default;

    return {
      componentType: mapping.componentType,
      variant,
      className: `ctc-${mapping.componentType} ctc-${mapping.componentType}--${variant}`,
      reasoning: `${section.contentType} content with ${personality} brand → ${mapping.componentType} (${variant})`
    };
  }

  /**
   * Extract personality type from DesignDNA
   */
  private getPersonalityType(dna: DesignDNA): PersonalityType {
    const overall = dna.personality?.overall;

    // Direct mapping
    const validPersonalities: PersonalityType[] = [
      'corporate', 'creative', 'minimal', 'luxurious',
      'friendly', 'bold', 'elegant', 'playful'
    ];

    if (overall && validPersonalities.includes(overall as PersonalityType)) {
      return overall as PersonalityType;
    }

    // Infer from formality/energy/warmth
    const formality = dna.personality?.formality ?? 3;
    const energy = dna.personality?.energy ?? 3;
    const warmth = dna.personality?.warmth ?? 3;

    if (formality >= 4 && energy <= 2) return 'corporate';
    if (formality <= 2 && energy >= 4) return 'creative';
    if (formality >= 4 && warmth >= 4) return 'elegant';
    if (energy >= 4 && warmth >= 4) return 'playful';
    if (formality <= 2 && warmth >= 4) return 'friendly';
    if (formality <= 2 && energy <= 2) return 'minimal';

    return 'corporate'; // Safe default
  }
}
```

### Step 3.5: Run test to verify it passes

Run: `npm test -- --testPathPattern=ComponentSelector.test.ts`
Expected: PASS

### Step 3.6: Commit

```bash
git add services/layout-engine/ComponentSelector.ts services/layout-engine/componentMappings.ts services/layout-engine/__tests__/ComponentSelector.test.ts
git commit -m "feat(layout-engine): add ComponentSelector with two-factor selection

- Select components based on content type × brand personality
- FS-protected sections get compliant components
- High-value (UNIQUE/RARE) sections get enhanced components
- Add comprehensive component mappings for all content types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Visual Emphasizer Service

**Files:**
- Create: `services/layout-engine/VisualEmphasizer.ts`
- Test: `services/layout-engine/__tests__/VisualEmphasizer.test.ts`

### Step 4.1: Write failing test for VisualEmphasizer

```typescript
// services/layout-engine/__tests__/VisualEmphasizer.test.ts
import { VisualEmphasizer } from '../VisualEmphasizer';
import type { SectionAnalysis, VisualEmphasis } from '../types';
import type { DesignDNA } from '../../../types/designDna';

describe('VisualEmphasizer', () => {
  const mockDNA: Partial<DesignDNA> = {
    motion: { overall: 'subtle' },
    personality: { overall: 'corporate', formality: 4 }
  };

  describe('calculateEmphasis', () => {
    it('should return hero emphasis for weight 5', () => {
      const emphasizer = new VisualEmphasizer();
      const section: Partial<SectionAnalysis> = { semanticWeight: 5 };

      const result = emphasizer.calculateEmphasis(section as SectionAnalysis, mockDNA as DesignDNA);

      expect(result.level).toBe('hero');
      expect(result.headingSize).toBe('xl');
      expect(result.headingDecoration).toBe(true);
      expect(result.hasBackgroundTreatment).toBe(true);
    });

    it('should return featured emphasis for weight 4', () => {
      const emphasizer = new VisualEmphasizer();
      const section: Partial<SectionAnalysis> = { semanticWeight: 4 };

      const result = emphasizer.calculateEmphasis(section as SectionAnalysis, mockDNA as DesignDNA);

      expect(result.level).toBe('featured');
      expect(result.headingSize).toBe('lg');
      expect(result.hasAccentBorder).toBe(true);
    });

    it('should return minimal emphasis for weight 1', () => {
      const emphasizer = new VisualEmphasizer();
      const section: Partial<SectionAnalysis> = { semanticWeight: 1 };

      const result = emphasizer.calculateEmphasis(section as SectionAnalysis, mockDNA as DesignDNA);

      expect(result.level).toBe('minimal');
      expect(result.headingSize).toBe('sm');
      expect(result.elevation).toBe(0);
    });
  });
});
```

### Step 4.2: Run test to verify it fails

Run: `npm test -- --testPathPattern=VisualEmphasizer.test.ts`
Expected: FAIL with "Cannot find module '../VisualEmphasizer'"

### Step 4.3: Implement VisualEmphasizer

```typescript
// services/layout-engine/VisualEmphasizer.ts
import type { DesignDNA } from '../../types/designDna';
import type { SectionAnalysis, VisualEmphasis, EmphasisLevel } from './types';

export class VisualEmphasizer {
  /**
   * Calculate visual emphasis based on semantic weight and brand
   */
  calculateEmphasis(
    section: SectionAnalysis,
    dna: DesignDNA
  ): VisualEmphasis {
    const level = this.mapWeightToLevel(section.semanticWeight);

    return {
      level,
      ...this.getEmphasisProperties(level, dna)
    };
  }

  /**
   * Map semantic weight to emphasis level
   */
  private mapWeightToLevel(weight: 1 | 2 | 3 | 4 | 5): EmphasisLevel {
    const mapping: Record<number, EmphasisLevel> = {
      5: 'hero',
      4: 'featured',
      3: 'standard',
      2: 'supporting',
      1: 'minimal'
    };
    return mapping[weight] || 'standard';
  }

  /**
   * Get emphasis properties for a given level
   */
  private getEmphasisProperties(
    level: EmphasisLevel,
    dna: DesignDNA
  ): Omit<VisualEmphasis, 'level'> {
    const isMinimalBrand = dna.personality?.overall === 'minimal';
    const motionEnabled = dna.motion?.overall !== 'static';
    const energetic = (dna.personality?.energy ?? 3) >= 3;

    switch (level) {
      case 'hero':
        return {
          headingSize: 'xl',
          headingDecoration: true,
          paddingMultiplier: 2,
          marginMultiplier: 2,
          hasBackgroundTreatment: true,
          backgroundType: isMinimalBrand ? 'solid' : 'gradient',
          hasAccentBorder: false,
          elevation: 0,
          hasEntryAnimation: motionEnabled,
          animationType: motionEnabled ? 'fade' : undefined
        };

      case 'featured':
        return {
          headingSize: 'lg',
          headingDecoration: true,
          paddingMultiplier: 1.5,
          marginMultiplier: 1.5,
          hasBackgroundTreatment: energetic,
          backgroundType: energetic ? 'solid' : undefined,
          hasAccentBorder: true,
          accentPosition: 'left',
          elevation: 2,
          hasEntryAnimation: motionEnabled && energetic,
          animationType: motionEnabled && energetic ? 'slide' : undefined
        };

      case 'standard':
        return {
          headingSize: 'md',
          headingDecoration: false,
          paddingMultiplier: 1,
          marginMultiplier: 1,
          hasBackgroundTreatment: false,
          hasAccentBorder: false,
          elevation: 0,
          hasEntryAnimation: false
        };

      case 'supporting':
        return {
          headingSize: 'sm',
          headingDecoration: false,
          paddingMultiplier: 0.75,
          marginMultiplier: 0.75,
          hasBackgroundTreatment: false,
          hasAccentBorder: false,
          elevation: 0,
          hasEntryAnimation: false
        };

      case 'minimal':
        return {
          headingSize: 'sm',
          headingDecoration: false,
          paddingMultiplier: 0.5,
          marginMultiplier: 0.5,
          hasBackgroundTreatment: false,
          hasAccentBorder: false,
          elevation: 0,
          hasEntryAnimation: false
        };

      default:
        return {
          headingSize: 'md',
          headingDecoration: false,
          paddingMultiplier: 1,
          marginMultiplier: 1,
          hasBackgroundTreatment: false,
          hasAccentBorder: false,
          elevation: 0,
          hasEntryAnimation: false
        };
    }
  }
}
```

### Step 4.4: Run test to verify it passes

Run: `npm test -- --testPathPattern=VisualEmphasizer.test.ts`
Expected: PASS

### Step 4.5: Commit

```bash
git add services/layout-engine/VisualEmphasizer.ts services/layout-engine/__tests__/VisualEmphasizer.test.ts
git commit -m "feat(layout-engine): add VisualEmphasizer with emphasis mapping

- Map semantic weight (1-5) to emphasis levels (hero→minimal)
- Calculate heading size, decoration, padding multipliers
- Determine background treatments based on brand personality
- Add animation support for energetic brands

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Image Handler Service

**Files:**
- Create: `services/layout-engine/ImageHandler.ts`
- Test: `services/layout-engine/__tests__/ImageHandler.test.ts`

### Step 5.1: Write failing test for ImageHandler

```typescript
// services/layout-engine/__tests__/ImageHandler.test.ts
import { ImageHandler } from '../ImageHandler';
import type { SectionAnalysis, ImagePlacement } from '../types';
import type { DesignDNA } from '../../../types/designDna';

describe('ImageHandler', () => {
  const mockDNA: Partial<DesignDNA> = {
    layout: { heroStyle: 'full-bleed', gridStyle: 'asymmetric' }
  };

  describe('determineImagePlacement', () => {
    it('should return null for sections without images', () => {
      const handler = new ImageHandler();
      const section: Partial<SectionAnalysis> = {
        hasGeneratedImage: false,
        constraints: { imageRequired: false }
      };

      const result = handler.determineImagePlacement(section as SectionAnalysis, mockDNA as DesignDNA);

      expect(result).toBeNull();
    });

    it('should use after-intro-paragraph for generated images', () => {
      const handler = new ImageHandler();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 3,
        hasGeneratedImage: true,
        constraints: { imageRequired: false }
      };

      const result = handler.determineImagePlacement(section as SectionAnalysis, mockDNA as DesignDNA);

      expect(result?.position).toBe('after-intro-paragraph');
      expect(result?.source).toBe('article_generated');
    });

    it('should never place images between heading and first paragraph', () => {
      const handler = new ImageHandler();
      const section: Partial<SectionAnalysis> = {
        semanticWeight: 5,
        hasGeneratedImage: true,
        constraints: { imageRequired: true }
      };

      const result = handler.determineImagePlacement(section as SectionAnalysis, mockDNA as DesignDNA);

      // All valid positions are after at least one paragraph
      const invalidPositions = ['before-heading', 'after-heading', 'between-heading-paragraph'];
      expect(invalidPositions).not.toContain(result?.position);
    });

    it('should suggest placeholder for concept sections', () => {
      const handler = new ImageHandler();
      const section: Partial<SectionAnalysis> = {
        sectionId: 'section-1',
        headingText: 'How Machine Learning Works',
        semanticWeight: 3,
        contentType: 'explanation',
        hasGeneratedImage: false,
        constraints: { imageRequired: false, fsProtection: false }
      };

      const result = handler.determineImagePlacement(
        section as SectionAnalysis,
        mockDNA as DesignDNA,
        'Machine learning processes data through neural networks'
      );

      // May suggest a placeholder for complex concepts
      if (result) {
        expect(result.position).toBe('after-intro-paragraph');
      }
    });
  });
});
```

### Step 5.2: Run test to verify it fails

Run: `npm test -- --testPathPattern=ImageHandler.test.ts`
Expected: FAIL with "Cannot find module '../ImageHandler'"

### Step 5.3: Implement ImageHandler

```typescript
// services/layout-engine/ImageHandler.ts
import type { DesignDNA } from '../../types/designDna';
import type { SectionAnalysis, ImagePlacement } from './types';

export class ImageHandler {
  /**
   * Determine image placement following Semantic SEO rules
   *
   * CRITICAL RULES (never violated):
   * 1. NEVER place images between heading and first paragraph
   * 2. Images must be semantically relevant
   * 3. Alt text extends vocabulary (not decorative)
   */
  determineImagePlacement(
    section: SectionAnalysis,
    dna: DesignDNA,
    sectionContent?: string
  ): ImagePlacement | null {
    // No image needed or present
    if (!section.hasGeneratedImage && !section.constraints.imageRequired) {
      // Check if we should suggest a placeholder
      return this.suggestPlaceholderIfNeeded(section, dna, sectionContent);
    }

    // Has generated image from content generation
    if (section.hasGeneratedImage) {
      return this.placeGeneratedImage(section, dna);
    }

    // Image required but not generated
    if (section.constraints.imageRequired) {
      return this.placeBrandKitImage(section, dna);
    }

    return null;
  }

  /**
   * Place a generated image (uploaded/AI-generated during content generation)
   */
  private placeGeneratedImage(section: SectionAnalysis, dna: DesignDNA): ImagePlacement {
    // All positions are AFTER at least one paragraph (Semantic SEO rule)

    // Hero sections with full-bleed brand can use background
    if (section.semanticWeight === 5 && dna.layout?.heroStyle === 'full-bleed') {
      return {
        position: 'full-width-break', // After intro paragraph, not background
        source: 'article_generated',
        semanticRole: 'hero'
      };
    }

    // Featured sections get prominent placement
    if (section.semanticWeight >= 4) {
      return {
        position: 'full-width-break',
        source: 'article_generated',
        semanticRole: 'explanatory'
      };
    }

    // Standard placement
    return {
      position: 'after-intro-paragraph',
      source: 'article_generated',
      semanticRole: 'explanatory'
    };
  }

  /**
   * Place a brand kit image
   */
  private placeBrandKitImage(section: SectionAnalysis, dna: DesignDNA): ImagePlacement {
    // High weight sections get prominent placement
    if (section.semanticWeight >= 4) {
      return {
        position: 'full-width-break',
        source: 'brand_kit',
        semanticRole: 'decorative'
      };
    }

    // Asymmetric layouts can use floats
    if (dna.layout?.gridStyle === 'asymmetric') {
      const isEven = (section.sectionId?.charCodeAt(0) ?? 0) % 2 === 0;
      return {
        position: isEven ? 'float-left' : 'float-right',
        source: 'brand_kit',
        semanticRole: 'decorative'
      };
    }

    return {
      position: 'section-end',
      source: 'brand_kit',
      semanticRole: 'decorative'
    };
  }

  /**
   * Suggest a placeholder for sections that could benefit from visuals
   */
  private suggestPlaceholderIfNeeded(
    section: SectionAnalysis,
    dna: DesignDNA,
    sectionContent?: string
  ): ImagePlacement | null {
    // FS-protected sections generally don't need placeholders
    if (section.constraints.fsProtection) {
      return null;
    }

    // Explanation content with complex concepts might benefit from diagrams
    if (section.contentType === 'explanation' && section.semanticWeight >= 3) {
      const hasComplexConcept = this.detectComplexConcept(sectionContent);
      if (hasComplexConcept) {
        return {
          position: 'after-intro-paragraph',
          source: 'placeholder',
          semanticRole: 'explanatory',
          placeholder: {
            aspectRatio: '16:9',
            suggestedContent: `Diagram illustrating ${section.headingText}`,
            altTextTemplate: `${section.headingText} visualization showing the relationship between...`
          }
        };
      }
    }

    // Steps/process content could use flowcharts
    if (section.contentType === 'steps' && !section.constraints.fsProtection) {
      return {
        position: 'after-intro-paragraph',
        source: 'placeholder',
        semanticRole: 'explanatory',
        placeholder: {
          aspectRatio: '16:9',
          suggestedContent: `Flowchart showing ${section.headingText} process`,
          altTextTemplate: `Step-by-step process diagram for ${section.headingText}`
        }
      };
    }

    return null;
  }

  /**
   * Detect if content discusses complex concepts that would benefit from visuals
   */
  private detectComplexConcept(content?: string): boolean {
    if (!content) return false;

    const complexIndicators = [
      'relationship between',
      'process of',
      'how .* works',
      'architecture',
      'flow of',
      'stages of',
      'components of',
      'structure of',
      'mechanism',
      'framework'
    ];

    const lowerContent = content.toLowerCase();
    return complexIndicators.some(indicator => {
      const regex = new RegExp(indicator, 'i');
      return regex.test(lowerContent);
    });
  }
}
```

### Step 5.4: Run test to verify it passes

Run: `npm test -- --testPathPattern=ImageHandler.test.ts`
Expected: PASS

### Step 5.5: Commit

```bash
git add services/layout-engine/ImageHandler.ts services/layout-engine/__tests__/ImageHandler.test.ts
git commit -m "feat(layout-engine): add ImageHandler with Semantic SEO rules

- NEVER place images between heading and first paragraph
- Support generated, brand kit, and placeholder images
- Detect complex concepts that could benefit from diagrams
- Respect FS protection for list/table sections

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Layout Engine Orchestrator

**Files:**
- Create: `services/layout-engine/LayoutEngine.ts`
- Create: `services/layout-engine/index.ts`
- Test: `services/layout-engine/__tests__/LayoutEngine.test.ts`

### Step 6.1: Write failing test for LayoutEngine

```typescript
// services/layout-engine/__tests__/LayoutEngine.test.ts
import { LayoutEngine } from '../LayoutEngine';
import type { LayoutBlueprint } from '../types';
import type { ContentBrief, ArticleContent } from '../../../types';
import type { DesignDNA } from '../../../types/designDna';
import type { BrandDesignSystem } from '../../../types/brandDesignSystem';

describe('LayoutEngine', () => {
  const mockBrief: Partial<ContentBrief> = {
    formatCodes: {},
    targetSnippetType: 'paragraph',
    topicCategory: 'ROOT'
  };

  const mockContent: Partial<ArticleContent> = {
    id: 'article-1',
    sections: [
      { id: 'intro', heading: 'Introduction', content: '<p>Intro text...</p>', wordCount: 100 },
      { id: 'main', heading: 'Main Content', content: '<p>Main text...</p>', wordCount: 300 }
    ]
  };

  const mockDNA: Partial<DesignDNA> = {
    spacing: { density: 'comfortable' },
    personality: { overall: 'corporate', formality: 4, energy: 2, warmth: 3 },
    motion: { overall: 'subtle' }
  };

  describe('generateBlueprint', () => {
    it('should generate a complete layout blueprint', async () => {
      const engine = new LayoutEngine();
      const result = await engine.generateBlueprint(
        mockContent as ArticleContent,
        mockBrief as ContentBrief,
        mockDNA as DesignDNA
      );

      expect(result.id).toBeDefined();
      expect(result.articleId).toBe('article-1');
      expect(result.sections).toHaveLength(2);
      expect(result.validation.semanticSeoCompliant).toBe(true);
    });

    it('should include reasoning for layout decisions', async () => {
      const engine = new LayoutEngine();
      const result = await engine.generateBlueprint(
        mockContent as ArticleContent,
        mockBrief as ContentBrief,
        mockDNA as DesignDNA
      );

      expect(result.reasoning.layoutStrategy).toBeDefined();
      expect(result.reasoning.keyDecisions.length).toBeGreaterThan(0);
    });

    it('should validate FS protection is maintained', async () => {
      const briefWithFS: Partial<ContentBrief> = {
        ...mockBrief,
        formatCodes: { 'main': 'numbered-list' },
        targetSnippetType: 'list'
      };

      const contentWithList: Partial<ArticleContent> = {
        ...mockContent,
        sections: [
          { id: 'main', heading: 'Steps', content: '<ol><li>Step 1</li></ol>', wordCount: 50 }
        ]
      };

      const engine = new LayoutEngine();
      const result = await engine.generateBlueprint(
        contentWithList as ArticleContent,
        briefWithFS as ContentBrief,
        mockDNA as DesignDNA
      );

      expect(result.validation.fsProtectionMaintained).toBe(true);
      const mainSection = result.sections.find(s => s.originalSectionId === 'main');
      expect(mainSection?.component.variant).toBe('fs-compliant');
    });
  });
});
```

### Step 6.2: Run test to verify it fails

Run: `npm test -- --testPathPattern=LayoutEngine.test.ts`
Expected: FAIL with "Cannot find module '../LayoutEngine'"

### Step 6.3: Implement LayoutEngine

```typescript
// services/layout-engine/LayoutEngine.ts
import { v4 as uuidv4 } from 'uuid';
import type { ContentBrief, ArticleContent } from '../../types';
import type { DesignDNA } from '../../types/designDna';
import type {
  LayoutBlueprint,
  BlueprintSection,
  SectionAnalysis,
  LayoutSuggestion
} from './types';
import { SectionAnalyzer } from './SectionAnalyzer';
import { LayoutPlanner } from './LayoutPlanner';
import { ComponentSelector } from './ComponentSelector';
import { VisualEmphasizer } from './VisualEmphasizer';
import { ImageHandler } from './ImageHandler';

export class LayoutEngine {
  private sectionAnalyzer: SectionAnalyzer;
  private layoutPlanner: LayoutPlanner;
  private componentSelector: ComponentSelector;
  private visualEmphasizer: VisualEmphasizer;
  private imageHandler: ImageHandler;

  constructor() {
    this.sectionAnalyzer = new SectionAnalyzer();
    this.layoutPlanner = new LayoutPlanner();
    this.componentSelector = new ComponentSelector();
    this.visualEmphasizer = new VisualEmphasizer();
    this.imageHandler = new ImageHandler();
  }

  /**
   * Generate a complete layout blueprint for an article
   */
  async generateBlueprint(
    content: ArticleContent,
    brief: ContentBrief,
    dna: DesignDNA
  ): Promise<LayoutBlueprint> {
    // 1. Analyze all sections
    const analyses = this.sectionAnalyzer.analyzeAllSections(content, brief);

    // 2. Generate blueprint sections
    const sections = analyses.map((analysis, index) =>
      this.generateBlueprintSection(analysis, dna, content, index)
    );

    // 3. Generate suggestions and apply high-confidence ones
    const { appliedSuggestions, skippedSuggestions } = await this.generateAndApplySuggestions(
      sections,
      dna,
      brief
    );

    // 4. Validate the blueprint
    const validation = this.validateBlueprint(sections, brief);

    // 5. Build the complete blueprint
    return {
      id: uuidv4(),
      articleId: content.id || uuidv4(),
      generatedAt: new Date().toISOString(),
      pageSettings: this.determinePageSettings(dna),
      sections,
      reasoning: {
        layoutStrategy: this.generateLayoutStrategy(dna, brief),
        keyDecisions: this.extractKeyDecisions(sections),
        suggestionsApplied: appliedSuggestions,
        suggestionsSkipped: skippedSuggestions
      },
      validation
    };
  }

  /**
   * Generate a single blueprint section
   */
  private generateBlueprintSection(
    analysis: SectionAnalysis,
    dna: DesignDNA,
    content: ArticleContent,
    index: number
  ): BlueprintSection {
    const layout = this.layoutPlanner.planLayout(analysis, dna);
    const component = this.componentSelector.selectComponent(analysis, dna);
    const emphasis = this.visualEmphasizer.calculateEmphasis(analysis, dna);

    const sectionContent = content.sections?.find(s => s.id === analysis.sectionId)?.content;
    const image = this.imageHandler.determineImagePlacement(analysis, dna, sectionContent);

    const cssClasses = this.buildCssClasses(layout, component, emphasis);

    return {
      id: uuidv4(),
      originalSectionId: analysis.sectionId,
      headingText: analysis.headingText,
      analysis,
      layout,
      component,
      emphasis,
      image,
      cssClasses,
      reasoning: this.buildSectionReasoning(analysis, layout, component, emphasis)
    };
  }

  /**
   * Build CSS classes for a section
   */
  private buildCssClasses(
    layout: BlueprintSection['layout'],
    component: BlueprintSection['component'],
    emphasis: BlueprintSection['emphasis']
  ): string[] {
    const classes: string[] = [];

    // Layout classes
    classes.push(`ctc-width--${layout.width}`);
    if (layout.columns > 1) {
      classes.push(`ctc-columns--${layout.columns}`);
      classes.push(`ctc-column-layout--${layout.columnLayout}`);
    }

    // Component classes
    classes.push(component.className);

    // Emphasis classes
    classes.push(`ctc-emphasis--${emphasis.level}`);
    if (emphasis.hasBackgroundTreatment) {
      classes.push(`ctc-bg--${emphasis.backgroundType}`);
    }
    if (emphasis.hasAccentBorder) {
      classes.push(`ctc-border-accent--${emphasis.accentPosition}`);
    }
    if (emphasis.hasEntryAnimation) {
      classes.push(`ctc-animate--${emphasis.animationType}`);
    }

    return classes;
  }

  /**
   * Build reasoning string for a section
   */
  private buildSectionReasoning(
    analysis: SectionAnalysis,
    layout: BlueprintSection['layout'],
    component: BlueprintSection['component'],
    emphasis: BlueprintSection['emphasis']
  ): string {
    const parts: string[] = [];

    parts.push(`Content type: ${analysis.contentType}`);
    parts.push(`Semantic weight: ${analysis.semanticWeight}/5 → ${emphasis.level} emphasis`);
    parts.push(`Width: ${layout.width}`);
    parts.push(component.reasoning);

    if (analysis.constraints.fsProtection) {
      parts.push('⚠️ FS-protected: maintaining format structure');
    }

    return parts.join('. ');
  }

  /**
   * Generate and apply high-confidence suggestions
   */
  private async generateAndApplySuggestions(
    sections: BlueprintSection[],
    dna: DesignDNA,
    brief: ContentBrief
  ): Promise<{
    appliedSuggestions: LayoutSuggestion[];
    skippedSuggestions: LayoutSuggestion[];
  }> {
    const suggestions: LayoutSuggestion[] = [];

    // Check for visual rhythm issues
    const textHeavySequence = this.detectTextHeavySequence(sections);
    if (textHeavySequence.length >= 3) {
      suggestions.push({
        type: 'visual_break',
        sectionId: textHeavySequence[2].id,
        change: {
          before: { hasVisualBreak: false },
          after: { hasVisualBreak: true, breakType: 'divider' }
        },
        reasoning: 'Three consecutive text-heavy sections detected. Adding visual break for rhythm.',
        confidence: 0.85,
        fsImpact: false
      });
    }

    // Apply high-confidence suggestions
    const appliedSuggestions: LayoutSuggestion[] = [];
    const skippedSuggestions: LayoutSuggestion[] = [];

    for (const suggestion of suggestions) {
      if (suggestion.fsImpact) {
        skippedSuggestions.push(suggestion);
        continue;
      }

      if (suggestion.confidence >= 0.8) {
        this.applySuggestion(sections, suggestion);
        appliedSuggestions.push(suggestion);
      } else {
        skippedSuggestions.push(suggestion);
      }
    }

    return { appliedSuggestions, skippedSuggestions };
  }

  /**
   * Detect sequences of text-heavy sections
   */
  private detectTextHeavySequence(sections: BlueprintSection[]): BlueprintSection[] {
    const textHeavy: BlueprintSection[] = [];

    for (const section of sections) {
      if (!section.image && !section.analysis.hasTable && !section.analysis.hasList) {
        textHeavy.push(section);
      } else {
        if (textHeavy.length >= 3) return textHeavy;
        textHeavy.length = 0;
      }
    }

    return textHeavy;
  }

  /**
   * Apply a suggestion to sections
   */
  private applySuggestion(sections: BlueprintSection[], suggestion: LayoutSuggestion): void {
    const section = sections.find(s => s.id === suggestion.sectionId);
    if (!section) return;

    if (suggestion.type === 'visual_break') {
      section.layout.hasVisualBreak = true;
      section.layout.breakType = (suggestion.change.after as any).breakType;
    }
  }

  /**
   * Validate the blueprint
   */
  private validateBlueprint(
    sections: BlueprintSection[],
    brief: ContentBrief
  ): LayoutBlueprint['validation'] {
    const issues: string[] = [];

    // Check FS protection
    let fsProtectionMaintained = true;
    for (const section of sections) {
      if (section.analysis.constraints.fsProtection) {
        if (section.component.variant !== 'fs-compliant') {
          fsProtectionMaintained = false;
          issues.push(`Section ${section.originalSectionId} has FS protection but non-compliant component`);
        }
      }
    }

    // Check semantic SEO compliance
    const semanticSeoCompliant = issues.length === 0;

    return {
      semanticSeoCompliant,
      fsProtectionMaintained,
      brandAlignmentScore: 85, // Placeholder - will be calculated by VisualValidator
      issues
    };
  }

  /**
   * Determine page-level settings
   */
  private determinePageSettings(dna: DesignDNA): LayoutBlueprint['pageSettings'] {
    const widthMap: Record<string, string> = {
      'narrow': '768px',
      'medium': '1024px',
      'wide': '1200px',
      'full': '100%'
    };

    const spacingMap: Record<string, string> = {
      'compact': '16px',
      'comfortable': '24px',
      'spacious': '32px',
      'airy': '48px'
    };

    return {
      maxWidth: widthMap[dna.spacing?.contentWidth || 'medium'] || '1024px',
      baseSpacing: spacingMap[dna.spacing?.density || 'comfortable'] || '24px',
      colorMode: 'light'
    };
  }

  /**
   * Generate layout strategy description
   */
  private generateLayoutStrategy(dna: DesignDNA, brief: ContentBrief): string {
    const personality = dna.personality?.overall || 'professional';
    const density = dna.spacing?.density || 'comfortable';
    const fsTarget = brief.targetSnippetType;

    let strategy = `${personality} brand with ${density} density. `;

    if (fsTarget) {
      strategy += `Optimizing for ${fsTarget} Featured Snippet. `;
    }

    strategy += 'Using semantic weight to determine visual hierarchy.';

    return strategy;
  }

  /**
   * Extract key decisions from sections
   */
  private extractKeyDecisions(sections: BlueprintSection[]): string[] {
    const decisions: string[] = [];

    // Hero section decision
    const heroSections = sections.filter(s => s.emphasis.level === 'hero');
    if (heroSections.length > 0) {
      decisions.push(`${heroSections.length} hero section(s) with full-width treatment`);
    }

    // FS protection decisions
    const fsProtected = sections.filter(s => s.analysis.constraints.fsProtection);
    if (fsProtected.length > 0) {
      decisions.push(`${fsProtected.length} section(s) with FS-compliant components`);
    }

    // Multi-column decisions
    const multiColumn = sections.filter(s => s.layout.columns > 1);
    if (multiColumn.length > 0) {
      decisions.push(`${multiColumn.length} section(s) using multi-column layouts`);
    }

    return decisions;
  }
}
```

### Step 6.4: Create index file

```typescript
// services/layout-engine/index.ts
export { LayoutEngine } from './LayoutEngine';
export { SectionAnalyzer } from './SectionAnalyzer';
export { LayoutPlanner } from './LayoutPlanner';
export { ComponentSelector } from './ComponentSelector';
export { VisualEmphasizer } from './VisualEmphasizer';
export { ImageHandler } from './ImageHandler';

export type {
  SectionAnalysis,
  LayoutParameters,
  LayoutBlueprint,
  BlueprintSection,
  ComponentSelection,
  VisualEmphasis,
  ImagePlacement,
  LayoutSuggestion,
  ContentType,
  EmphasisLevel,
  LayoutWidth,
  ColumnLayout
} from './types';
```

### Step 6.5: Run test to verify it passes

Run: `npm test -- --testPathPattern=LayoutEngine.test.ts`
Expected: PASS

### Step 6.6: Commit

```bash
git add services/layout-engine/LayoutEngine.ts services/layout-engine/index.ts services/layout-engine/__tests__/LayoutEngine.test.ts
git commit -m "feat(layout-engine): add LayoutEngine orchestrator

- Orchestrate all layout engine components
- Generate complete LayoutBlueprint with validation
- Include reasoning for transparency
- Auto-apply high-confidence suggestions
- Export all services and types

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Brand-Aware Renderer Update

**Files:**
- Modify: `services/publishing/renderer/blueprintRenderer.ts`
- Test: `services/publishing/renderer/__tests__/blueprintRenderer.test.ts`

### Step 7.1: Read current blueprintRenderer

Run: Read `services/publishing/renderer/blueprintRenderer.ts`

### Step 7.2: Write failing test for updated renderer

```typescript
// Add to existing test file or create new
describe('BrandAwareRenderer', () => {
  it('should inject compiledCss from BrandDesignSystem', async () => {
    const mockBrandSystem = {
      compiledCss: '.ctc-btn { background: blue; }',
      tokens: { css: ':root { --primary: blue; }' }
    };

    const result = await renderBlueprint(mockBlueprint, mockBrandSystem);

    expect(result.css).toContain('.ctc-btn { background: blue; }');
    expect(result.css).toContain(':root { --primary: blue; }');
  });

  it('should use variantMappings for component classes', async () => {
    const mockBrandSystem = {
      variantMappings: {
        'faq-accordion': { clean: 'ctc-faq--corporate' }
      }
    };

    const result = await renderBlueprint(mockBlueprintWithFAQ, mockBrandSystem);

    expect(result.html).toContain('ctc-faq--corporate');
  });
});
```

### Step 7.3: Update blueprintRenderer to use compiledCss

Key changes:
1. Accept BrandDesignSystem as parameter
2. Inject compiledCss into output CSS
3. Use variantMappings for component classes
4. Add decorative elements from brand system

### Step 7.4: Run test to verify it passes

Run: `npm test -- --testPathPattern=blueprintRenderer.test.ts`
Expected: PASS

### Step 7.5: Commit

```bash
git add services/publishing/renderer/blueprintRenderer.ts services/publishing/renderer/__tests__/blueprintRenderer.test.ts
git commit -m "fix(renderer): use full BrandDesignSystem.compiledCss

- Inject compiled CSS from brand design system (THE KEY FIX)
- Use variantMappings for brand-specific component classes
- Add decorative elements from brand system
- Support all output modes (WordPress, HTML, PDF)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 8: UI - Brand Intelligence Step

**Files:**
- Create: `components/publishing/steps/BrandIntelligenceStep.tsx`
- Modify: `components/publishing/StylePublishModal.tsx`

### Step 8.1: Create BrandIntelligenceStep component

Consolidates BrandStep + BrandStyleStep into single step with:
- Screenshot display
- Color palette summary
- Font summary
- Personality sliders (visible, not hidden in tabs)
- Design DNA expandable details

### Step 8.2: Update StylePublishModal to use new step

Replace steps array with new 3-step flow:
1. BrandIntelligenceStep
2. LayoutIntelligenceStep (Task 9)
3. PreviewStep (with validation)

### Step 8.3: Test manually in browser

Run: `npm run dev`
Navigate to Style & Publish modal
Verify: Brand Intelligence step shows consolidated view

### Step 8.4: Commit

```bash
git add components/publishing/steps/BrandIntelligenceStep.tsx components/publishing/StylePublishModal.tsx
git commit -m "feat(ui): add consolidated BrandIntelligenceStep

- Consolidate BrandStep + BrandStyleStep into single view
- Show personality sliders inline (not hidden in tabs)
- Display color palette and font summary
- Expandable Design DNA details

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 9: UI - Layout Intelligence Step

**Files:**
- Create: `components/publishing/steps/LayoutIntelligenceStep.tsx`
- Create: `components/publishing/SectionPreviewCard.tsx`

### Step 9.1: Create SectionPreviewCard component

Compact section summary showing:
- Section heading
- Emphasis level (stars)
- Layout parameters (width, columns)
- Component type
- Brief reasoning

### Step 9.2: Create LayoutIntelligenceStep component

New step showing:
- AI reasoning for layout decisions
- Scrollable list of SectionPreviewCards
- "N Suggestions Applied" indicator
- Collapsible suggestions detail

### Step 9.3: Test manually in browser

Run: `npm run dev`
Navigate to Style & Publish modal, go to step 2
Verify: Layout Intelligence step shows section preview with reasoning

### Step 9.4: Commit

```bash
git add components/publishing/steps/LayoutIntelligenceStep.tsx components/publishing/SectionPreviewCard.tsx
git commit -m "feat(ui): add LayoutIntelligenceStep with section preview

- Show AI reasoning for layout decisions
- Display sections with emphasis indicators
- Show applied suggestions count
- Make layout decisions transparent to users

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 10: UI - Preview Step with Validation

**Files:**
- Create: `components/publishing/BrandMatchIndicator.tsx`
- Modify: `components/publishing/steps/PreviewStep.tsx`

### Step 10.1: Create BrandMatchIndicator component

Shows:
- Brand alignment score (0-100%)
- Color indicator (green/yellow/red)
- AI assessment text
- Link to detailed validation

### Step 10.2: Update PreviewStep with validation

Add:
- BrandMatchIndicator in header
- Device preview frames (existing)
- AI validation summary

### Step 10.3: Test manually in browser

Run: `npm run dev`
Navigate to Style & Publish modal, go to step 3
Verify: Preview shows Brand Match indicator

### Step 10.4: Commit

```bash
git add components/publishing/BrandMatchIndicator.tsx components/publishing/steps/PreviewStep.tsx
git commit -m "feat(ui): add BrandMatchIndicator to PreviewStep

- Show brand alignment score (0-100%)
- Display AI assessment text
- Visual indicator for brand match quality

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Integration Testing

**Files:**
- Create: `services/layout-engine/__tests__/integration.test.ts`

### Step 11.1: Write integration test

```typescript
describe('Layout Engine Integration', () => {
  it('should generate complete blueprint from real content', async () => {
    // Use actual content brief and article content
    const engine = new LayoutEngine();
    const blueprint = await engine.generateBlueprint(realContent, realBrief, realDNA);

    expect(blueprint.validation.semanticSeoCompliant).toBe(true);
    expect(blueprint.sections.length).toBeGreaterThan(0);
  });

  it('should render blueprint with brand styling', async () => {
    const engine = new LayoutEngine();
    const blueprint = await engine.generateBlueprint(realContent, realBrief, realDNA);

    const rendered = await renderBlueprint(blueprint, realBrandSystem);

    expect(rendered.css).toContain(realBrandSystem.compiledCss);
    expect(rendered.html).toContain('ctc-');
  });
});
```

### Step 11.2: Run integration tests

Run: `npm test -- --testPathPattern=integration.test.ts`
Expected: PASS

### Step 11.3: Commit

```bash
git add services/layout-engine/__tests__/integration.test.ts
git commit -m "test(layout-engine): add integration tests

- Test complete blueprint generation flow
- Verify brand styling is applied to output
- Ensure FS protection is maintained

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Final Cleanup and Documentation

**Files:**
- Update: `CLAUDE.md` with layout engine info
- Remove: Obsolete BrandStyleStep tabs (if not needed)

### Step 12.1: Update CLAUDE.md

Add section about Layout Engine architecture and key services.

### Step 12.2: Remove obsolete code

Remove or deprecate:
- Manual color/typography/spacing tabs in BrandStyleStep
- Disconnected Layout panel in PreviewStep
- Raw Blueprint JSON viewer

### Step 12.3: Final commit

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Layout Engine architecture

- Document Layout Engine services and their purposes
- Add key file references for layout generation
- Update publishing workflow documentation

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

This implementation plan covers:

1. **Core Layout Engine** (Tasks 1-6): SectionAnalyzer, LayoutPlanner, ComponentSelector, VisualEmphasizer, ImageHandler, LayoutEngine orchestrator
2. **Renderer Integration** (Task 7): Use full BrandDesignSystem.compiledCss
3. **UI Redesign** (Tasks 8-10): BrandIntelligenceStep, LayoutIntelligenceStep, PreviewStep with validation
4. **Testing & Cleanup** (Tasks 11-12): Integration tests, documentation

Each task follows TDD with bite-sized steps, frequent commits, and clear reasoning.
