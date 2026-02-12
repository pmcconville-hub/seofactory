// services/styleguide-generator/sections/ai-batches/aiSectionUtils.ts
// Shared utilities for AI-enhanced section generation.

import type { DesignTokenSet, BrandAnalysis, RenderedSection, SectionCategory } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';
import { dispatchToProvider } from '../../../ai/providerDispatcher';
import * as geminiService from '../../../geminiService';
import * as openAiService from '../../../openAiService';
import * as anthropicService from '../../../anthropicService';
import * as perplexityService from '../../../perplexityService';
import * as openRouterService from '../../../openRouterService';
import type { BusinessInfo } from '../../../../types';

/** Configuration for a single section within a batch */
export interface AiSectionSpec {
  id: number;
  title: string;
  category: SectionCategory;
  description: string;
  tip?: string;
  warning?: string;
}

/** Parsed AI output for one section */
export interface AiSectionOutput {
  sectionId: number;
  demoHtml: string;
  cssCode: string;
  classNames: string[];
}

/**
 * Build a token summary string for the AI prompt.
 * Compact representation of the full DesignTokenSet.
 */
export function buildTokenSummary(tokens: DesignTokenSet): string {
  const p = tokens.prefix;
  return `CSS PREFIX: .${p}-*

PRIMARY COLORS:
  50: ${tokens.colors.primary[50]}
  100: ${tokens.colors.primary[100]}
  200: ${tokens.colors.primary[200]}
  300: ${tokens.colors.primary[300]}
  400: ${tokens.colors.primary[400]} (brand color)
  500: ${tokens.colors.primary[500]}
  600: ${tokens.colors.primary[600]}
  700: ${tokens.colors.primary[700]}
  800: ${tokens.colors.primary[800]}
  900: ${tokens.colors.primary[900]}

GRAY: ${tokens.colors.gray[50]} ... ${tokens.colors.gray[500]} ... ${tokens.colors.gray[900]}

SEMANTIC: success=${tokens.colors.semantic.success}, error=${tokens.colors.semantic.error}, warning=${tokens.colors.semantic.warning}, info=${tokens.colors.semantic.info}

TYPOGRAPHY:
  Heading: ${tokens.typography.headingFont}
  Body: ${tokens.typography.bodyFont}

RADIUS: sm=${tokens.radius.sm}, md=${tokens.radius.md}, lg=${tokens.radius.lg}
SHADOWS: sm="${tokens.shadows.sm}", md="${tokens.shadows.md}", colored="${tokens.shadows.colored}"
TRANSITIONS: fast=${tokens.transitions.fast}, base=${tokens.transitions.base}`;
}

/**
 * Build a brand personality summary for the AI prompt.
 */
export function buildBrandSummary(analysis: BrandAnalysis): string {
  return `BRAND: ${analysis.brandName}
DOMAIN: ${analysis.domain}
INDUSTRY: ${analysis.industry || 'general'}
PERSONALITY: ${analysis.personality.overall}
FORMALITY: ${analysis.personality.formality}/5
ENERGY: ${analysis.personality.energy}/5
WARMTH: ${analysis.personality.warmth}/5`;
}

/**
 * Call the AI provider to generate CSS for a batch of sections.
 */
export async function callAiForBatch(
  prompt: string,
  businessInfo: BusinessInfo,
  dispatch: React.Dispatch<unknown>,
): Promise<string> {
  return dispatchToProvider(businessInfo, {
    gemini: () => geminiService.generateText(prompt, businessInfo, dispatch),
    openai: () => openAiService.generateText(prompt, businessInfo, dispatch),
    anthropic: () => anthropicService.generateText(prompt, businessInfo, dispatch),
    perplexity: () => perplexityService.generateText(prompt, businessInfo, dispatch),
    openrouter: () => openRouterService.generateText(prompt, businessInfo, dispatch),
  });
}

/**
 * Parse AI response into per-section outputs.
 * Expected format: sections delimited by === SECTION {id} ===
 */
export function parseAiBatchResponse(response: string, sectionIds: number[]): Map<number, AiSectionOutput> {
  const results = new Map<number, AiSectionOutput>();

  for (const id of sectionIds) {
    const sectionRegex = new RegExp(
      `===\\s*SECTION\\s+${id}\\s*===\\s*([\\s\\S]*?)(?====\\s*SECTION|$)`,
      'i'
    );
    const match = response.match(sectionRegex);
    if (!match) continue;

    const content = match[1].trim();

    // Extract demo HTML (between ```html and ```)
    const htmlMatch = content.match(/```html\s*([\s\S]*?)```/);
    const demoHtml = htmlMatch?.[1]?.trim() || '';

    // Extract CSS (between ```css and ```)
    const cssMatch = content.match(/```css\s*([\s\S]*?)```/);
    const cssCode = cssMatch?.[1]?.trim() || '';

    // Extract class names from CSS
    const classNames: string[] = [];
    const classRegex = /\.([a-z][a-z0-9-]+)/g;
    let classMatch;
    while ((classMatch = classRegex.exec(cssCode)) !== null) {
      if (!classMatch[1].startsWith('sg-')) {
        classNames.push(classMatch[1]);
      }
    }

    results.set(id, { sectionId: id, demoHtml, cssCode, classNames: [...new Set(classNames)] });
  }

  return results;
}

/**
 * Convert AI output into registered section generators.
 */
export function registerAiSections(
  specs: AiSectionSpec[],
  outputs: Map<number, AiSectionOutput>,
): void {
  for (const spec of specs) {
    const output = outputs.get(spec.id);
    if (!output) {
      // Register a placeholder if AI didn't generate this section
      registerSection(spec.id, () => createPlaceholderSection(spec));
      continue;
    }

    registerSection(spec.id, () => ({
      id: spec.id,
      anchorId: `section-${spec.id}`,
      title: spec.title,
      category: spec.category,
      html: wrapSection(spec.id, spec.title, spec.category, {
        description: spec.description,
        tip: spec.tip,
        demoHtml: output.demoHtml,
        classRefs: output.classNames,
        cssCode: output.cssCode,
        warning: spec.warning,
      }),
      classesGenerated: output.classNames,
    }));
  }
}

function createPlaceholderSection(spec: AiSectionSpec): RenderedSection {
  return {
    id: spec.id,
    anchorId: `section-${spec.id}`,
    title: spec.title,
    category: spec.category,
    html: wrapSection(spec.id, spec.title, spec.category, {
      description: spec.description,
      demoHtml: `<p style="color: #9ca3af; font-style: italic;">This section will be generated with AI-enhanced CSS in a future pass.</p>`,
    }),
    classesGenerated: [],
  };
}
