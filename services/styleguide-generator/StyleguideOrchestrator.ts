// services/styleguide-generator/StyleguideOrchestrator.ts
// Main entry point: coordinates the full styleguide generation pipeline.
//
// Pipeline: extract → analyze → build tokens → generate sections → assemble → validate → store

import type {
  DesignTokenSet,
  BrandAnalysis,
  StyleguideProgress,
  BrandStyleguideData,
  QualityReport,
} from './types';
import type { BusinessInfo } from '../../types';
import { extractSite, mergePersonalityData } from './extraction/SiteExtractor';
import { buildTokenSet } from './tokens/TokenSetBuilder';
import { generateTemplateSections, generateAllSections } from './sections/SectionRegistry';
import { assembleDocument } from './assembly/DocumentAssembler';
import { validateDocument } from './assembly/QualityValidator';
import { generateBatchA } from './sections/ai-batches/batchA-core';
import { generateBatchB } from './sections/ai-batches/batchB-content';
import { generateBatchC } from './sections/ai-batches/batchC-site';
import { generateBatchD } from './sections/ai-batches/batchD-guidelines';

// Import template side-effects (registers all 17 template generators)
import './sections/templates/index';

export interface StyleguideResult {
  html: string;
  tokens: DesignTokenSet;
  analysis: BrandAnalysis;
  quality: QualityReport;
  /** How many AI-enhanced sections were successfully generated (out of 31) */
  aiSectionsGenerated: number;
}

export interface OrchestratorOptions {
  domain: string;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<unknown>;
  onProgress?: (progress: StyleguideProgress) => void;
  /** Skip AI section generation (produce template-only styleguide) */
  skipAi?: boolean;
  /** Pre-computed BrandAnalysis (skip extraction phase) */
  existingAnalysis?: BrandAnalysis;
  /** Max auto-repair attempts before accepting low quality */
  maxRepairAttempts?: number;
}

/**
 * Generate a complete brand styleguide.
 *
 * This is the main public API for the styleguide generator module.
 * It orchestrates the full pipeline from URL to final HTML document.
 */
export async function generateStyleguide(options: OrchestratorOptions): Promise<StyleguideResult> {
  const {
    domain,
    businessInfo,
    dispatch,
    onProgress,
    skipAi = false,
    existingAnalysis,
    maxRepairAttempts = 2,
  } = options;

  const language = businessInfo.language || 'en';

  // ─── Phase 1: Extract ──────────────────────────────────────────────
  let analysis: BrandAnalysis;

  if (existingAnalysis) {
    analysis = existingAnalysis;
  } else {
    onProgress?.({
      phase: 'extracting',
      phaseLabel: 'Extracting brand data...',
      sectionsCompleted: 0,
      sectionsTotal: 48,
    });

    const extraction = await extractSite(domain, businessInfo, (msg) => {
      onProgress?.({
        phase: 'extracting',
        phaseLabel: msg,
        sectionsCompleted: 0,
        sectionsTotal: 48,
      });
    });

    analysis = extraction.analysis;
  }

  // ─── Phase 2: Analyze (AI personality if screenshot available) ─────
  onProgress?.({
    phase: 'analyzing',
    phaseLabel: 'Analyzing brand personality...',
    sectionsCompleted: 0,
    sectionsTotal: 48,
  });

  // If we have a screenshot and personality is at defaults, we could enhance with AI
  // For now we keep the extracted personality as-is
  if (analysis.industry && analysis.personality.overall === 'professional') {
    // Personality was not enriched — use defaults based on industry
    analysis = mergePersonalityData(analysis, analysis.personality, analysis.industry);
  }

  // ─── Phase 3: Generate Tokens ──────────────────────────────────────
  onProgress?.({
    phase: 'generating-tokens',
    phaseLabel: 'Building design token set...',
    sectionsCompleted: 0,
    sectionsTotal: 48,
  });

  const tokens = buildTokenSet(analysis);

  // ─── Phase 4: Generate Sections ────────────────────────────────────
  onProgress?.({
    phase: 'generating-sections',
    phaseLabel: 'Generating template sections...',
    sectionsCompleted: 0,
    sectionsTotal: 48,
  });

  const ctx = { tokens, analysis, language };

  // Template sections are instant (no AI)
  generateTemplateSections(ctx);

  let aiSectionsGenerated = 0;

  if (!skipAi) {
    // AI Batch A: Core components (buttons, cards, lists, icon boxes, forms, tables)
    onProgress?.({
      phase: 'generating-sections',
      phaseLabel: 'AI generating core components...',
      sectionsCompleted: 17,
      sectionsTotal: 48,
      currentBatch: 'Batch A: Core Components',
    });
    try {
      const batchAIds = await generateBatchA(tokens, analysis, businessInfo, dispatch);
      aiSectionsGenerated += batchAIds.length;
    } catch (e) {
      console.warn('[StyleguideOrchestrator] Batch A failed:', e);
    }

    // AI Batch B: Content blocks (reviews, CTA, hero, alerts, steps, pricing, FAQ, stats)
    onProgress?.({
      phase: 'generating-sections',
      phaseLabel: 'AI generating content blocks...',
      sectionsCompleted: 17 + aiSectionsGenerated,
      sectionsTotal: 48,
      currentBatch: 'Batch B: Content Blocks',
    });
    try {
      const batchBIds = await generateBatchB(tokens, analysis, businessInfo, dispatch);
      aiSectionsGenerated += batchBIds.length;
    } catch (e) {
      console.warn('[StyleguideOrchestrator] Batch B failed:', e);
    }

    // AI Batch C: Site-wide components (header, footer, blog, gallery, etc.)
    onProgress?.({
      phase: 'generating-sections',
      phaseLabel: 'AI generating site-wide components...',
      sectionsCompleted: 17 + aiSectionsGenerated,
      sectionsTotal: 48,
      currentBatch: 'Batch C: Site-Wide',
    });
    try {
      const batchCIds = await generateBatchC(tokens, analysis, businessInfo, dispatch);
      aiSectionsGenerated += batchCIds.length;
    } catch (e) {
      console.warn('[StyleguideOrchestrator] Batch C failed:', e);
    }

    // AI Batch D: Guidelines (compositions, icons, images, schema, tone)
    onProgress?.({
      phase: 'generating-sections',
      phaseLabel: 'AI generating guidelines...',
      sectionsCompleted: 17 + aiSectionsGenerated,
      sectionsTotal: 48,
      currentBatch: 'Batch D: Guidelines',
    });
    try {
      const batchDIds = await generateBatchD(tokens, analysis, businessInfo, dispatch);
      aiSectionsGenerated += batchDIds.length;
    } catch (e) {
      console.warn('[StyleguideOrchestrator] Batch D failed:', e);
    }
  }

  // ─── Phase 5: Assemble ─────────────────────────────────────────────
  onProgress?.({
    phase: 'assembling',
    phaseLabel: 'Assembling document...',
    sectionsCompleted: 17 + aiSectionsGenerated,
    sectionsTotal: 48,
  });

  const allSections = generateAllSections(ctx);

  let html = assembleDocument({
    tokens,
    analysis,
    sections: allSections,
  });

  // ─── Phase 6: Validate ─────────────────────────────────────────────
  onProgress?.({
    phase: 'validating',
    phaseLabel: 'Validating quality...',
    sectionsCompleted: 17 + aiSectionsGenerated,
    sectionsTotal: 48,
  });

  let quality = validateDocument(html, tokens, analysis.brandName, allSections.length);

  // Auto-repair: if quality is below threshold, attempt to fix common issues
  let repairAttempt = 0;
  while (quality.overallScore < 80 && repairAttempt < maxRepairAttempts) {
    repairAttempt++;
    onProgress?.({
      phase: 'validating',
      phaseLabel: `Auto-repair attempt ${repairAttempt}...`,
      sectionsCompleted: 17 + aiSectionsGenerated,
      sectionsTotal: 48,
    });

    html = autoRepair(html, quality);
    quality = validateDocument(html, tokens, analysis.brandName, allSections.length);
  }

  // ─── Done ──────────────────────────────────────────────────────────
  onProgress?.({
    phase: 'complete',
    phaseLabel: `Styleguide ready (score: ${quality.overallScore}/100)`,
    sectionsCompleted: allSections.length,
    sectionsTotal: 48,
  });

  return {
    html,
    tokens,
    analysis,
    quality,
    aiSectionsGenerated,
  };
}

/**
 * Attempt to auto-repair common quality issues in the HTML document.
 * Returns a patched version of the HTML.
 */
function autoRepair(html: string, quality: QualityReport): string {
  let patched = html;

  // Fix unbalanced divs by appending missing closing tags
  if (!quality.structural.divBalance.passed) {
    const diff = quality.structural.divBalance.open - quality.structural.divBalance.close;
    if (diff > 0) {
      // More open than close — append closing divs before </body>
      const closingTags = '</div>'.repeat(diff);
      patched = patched.replace('</body>', `${closingTags}\n</body>`);
    }
  }

  // Fix empty sections by adding a placeholder message
  for (const emptySection of quality.structural.emptySections) {
    const pattern = `id="${emptySection}">`;
    const replacement = `id="${emptySection}"><p style="color:#9ca3af;font-style:italic;">Content pending generation.</p>`;
    if (patched.includes(pattern) && !patched.includes(replacement)) {
      // Only add if section appears to be genuinely empty (very small content between open/close)
      const sectionStart = patched.indexOf(pattern);
      if (sectionStart !== -1) {
        const afterTag = sectionStart + pattern.length;
        const nextClosingDiv = patched.indexOf('</div>', afterTag);
        if (nextClosingDiv !== -1 && nextClosingDiv - afterTag < 20) {
          patched = patched.replace(pattern, replacement);
        }
      }
    }
  }

  return patched;
}

/**
 * Build the BrandStyleguideData structure for storage on a topical map.
 */
export function buildStorageData(
  result: StyleguideResult,
  storageKey: string,
  version: number = 1,
): BrandStyleguideData {
  return {
    designTokens: result.tokens,
    brandAnalysis: result.analysis,
    htmlStorageKey: storageKey,
    generatedAt: new Date().toISOString(),
    version,
  };
}
