// Section 48: Version & Changelog
// Generation metadata, version history, and regeneration notes.

import type { SectionGeneratorContext, RenderedSection } from '../../types';
import { wrapSection } from '../BaseSectionTemplate';
import { registerSection } from '../SectionRegistry';

function versionChangelogGenerator(ctx: SectionGeneratorContext): RenderedSection {
  const { tokens, analysis } = ctx;
  const now = new Date().toISOString().split('T')[0];

  const demoHtml = `<div style="font-family: ${tokens.typography.bodyFont}; font-size: 14px;">
    <div style="background: ${tokens.colors.gray[50]}; padding: 20px; border-radius: ${tokens.radius.lg}; margin-bottom: 20px;">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Brand</div>
          <div style="font-weight: 600; margin-top: 2px;">${analysis.brandName}</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Source URL</div>
          <div style="font-weight: 600; margin-top: 2px;">${analysis.domain}</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Generated</div>
          <div style="font-weight: 600; margin-top: 2px;">${now}</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Version</div>
          <div style="font-weight: 600; margin-top: 2px;">v1</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Extraction</div>
          <div style="font-weight: 600; margin-top: 2px;">${analysis.extractionMethod}</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Confidence</div>
          <div style="font-weight: 600; margin-top: 2px;">${Math.round(analysis.confidence * 100)}%</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">Pages Analyzed</div>
          <div style="font-weight: 600; margin-top: 2px;">${analysis.pagesAnalyzed.length}</div>
        </div>
        <div>
          <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: ${tokens.colors.gray[500]};">CSS Prefix</div>
          <div style="font-weight: 600; margin-top: 2px;">.${tokens.prefix}-*</div>
        </div>
      </div>
    </div>

    <div style="border-left: 3px solid ${tokens.colors.primary[400]}; padding-left: 16px;">
      <h4 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">Changelog</h4>
      <div style="font-size: 13px; color: ${tokens.colors.gray[600]};">
        <div style="margin-bottom: 8px;">
          <span style="font-weight: 600;">v1 — ${now}</span><br/>
          Initial generation from ${analysis.domain}. Full 48-section styleguide with
          ${analysis.colors.secondary ? '3' : '2'} color scales, ${tokens.typography.headingFont.split(',')[0].replace(/'/g, '')} + ${tokens.typography.bodyFont.split(',')[0].replace(/'/g, '')} typography,
          and ${analysis.extractionMethod} extraction method.
        </div>
      </div>
    </div>
  </div>`;

  const html = wrapSection(48, 'Version & Changelog', 'reference', {
    description: 'Generation metadata, extraction details, and version history. Each regeneration creates a new version with a changelog entry.',
    demoHtml,
    classRefs: [],
  });

  return { id: 48, anchorId: 'section-48', title: 'Version & Changelog', category: 'reference', html, classesGenerated: [] };
}

registerSection(48, versionChangelogGenerator);
export { versionChangelogGenerator };
