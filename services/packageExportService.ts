/**
 * Package Export Service
 *
 * Creates a ZIP package of all pipeline deliverables including:
 * strategy documents, topical map structure, content briefs,
 * generated content, audit reports, and tech specs.
 *
 * Created: 2026-02-19 - Pipeline package export step
 *
 * @module services/packageExportService
 */

import JSZip from 'jszip';
import type {
  TopicalMap,
  EnrichedTopic,
  ContentBrief,
  SemanticTriple,
} from '../types';
import { generateTechSpec } from './techSpecGenerationService';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Options controlling which sections are included in the export package.
 */
export interface ExportPackageOptions {
  /** Include generated article content (HTML) */
  includeContent: boolean;
  /** Include content briefs (Markdown) */
  includeBriefs: boolean;
  /** Include technical specifications (URL list, sitemap, robots.txt, etc.) */
  includeTechSpec: boolean;
  /** Include audit report (JSON) */
  includeAuditReport: boolean;
  /** Include strategy documents (five components, EAV inventory) */
  includeStrategy: boolean;
}

/**
 * Result of the package export process.
 */
export interface ExportResult {
  /** The generated ZIP file as a Blob */
  blob: Blob;
  /** Suggested filename for the download */
  filename: string;
  /** Number of files in the ZIP */
  fileCount: number;
  /** Total uncompressed size in bytes */
  totalSize: number;
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converts a string to a URL-safe slug.
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Converts a map name to a safe directory prefix.
 */
function safeDirectoryName(name: string): string {
  return slugify(name || 'seo-package');
}

/**
 * Formats EAVs (semantic triples) as CSV rows.
 */
function formatEavsAsCsv(eavs: SemanticTriple[]): string {
  const header =
    'entity,predicate,value,attribute_category,attribute_classification,value_type,unit';
  const rows = eavs.map((eav) =>
    [
      csvEscape(eav.subject?.label ?? ''),
      csvEscape(eav.predicate?.relation ?? ''),
      csvEscape(String(eav.object?.value ?? '')),
      csvEscape(eav.predicate?.category ?? ''),
      csvEscape(eav.predicate?.classification ?? ''),
      csvEscape(eav.object?.type ?? ''),
      csvEscape(eav.object?.unit ?? ''),
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

/**
 * Escapes a value for CSV.
 */
function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a five-components strategy document in Markdown.
 */
function generateFiveComponentsMarkdown(map: TopicalMap): string {
  const bi = map.business_info;
  const pillars = map.pillars;

  let md = `# Five Components of Holistic SEO Strategy\n\n`;
  md += `**Project:** ${bi?.projectName ?? map.name ?? 'Unnamed'}\n`;
  md += `**Domain:** ${bi?.domain ?? map.domain ?? 'N/A'}\n`;
  md += `**Generated:** ${new Date().toISOString().split('T')[0]}\n\n`;

  md += `## 1. Central Entity\n\n`;
  md += `**${pillars?.centralEntity ?? 'Not defined'}**\n\n`;
  md += `The Central Entity is the core subject that all content revolves around. `;
  md += `Every page on the site should have a semantic connection back to this entity.\n\n`;

  md += `## 2. Source Context\n\n`;
  md += `**${pillars?.sourceContext ?? 'Not defined'}**\n\n`;
  md += `The Source Context defines the unique perspective or authority angle that differentiates `;
  md += `this website's content from competitors.\n\n`;

  md += `## 3. Central Search Intent\n\n`;
  md += `**${pillars?.centralSearchIntent ?? 'Not defined'}**\n\n`;
  if (pillars?.primary_verb) {
    md += `- Primary Verb: ${pillars.primary_verb}\n`;
  }
  if (pillars?.auxiliary_verb) {
    md += `- Auxiliary Verb: ${pillars.auxiliary_verb}\n`;
  }
  md += `\nThe Central Search Intent captures the primary motivation behind user searches `;
  md += `in this topical domain.\n\n`;

  md += `## 4. Business Context\n\n`;
  md += `| Attribute | Value |\n`;
  md += `|-----------|-------|\n`;
  md += `| Industry | ${bi?.industry ?? 'N/A'} |\n`;
  md += `| Business Model | ${bi?.model ?? 'N/A'} |\n`;
  md += `| Website Type | ${bi?.websiteType ?? 'N/A'} |\n`;
  md += `| Target Market | ${bi?.targetMarket ?? 'N/A'} |\n`;
  md += `| Language | ${bi?.language ?? 'N/A'} |\n`;
  md += `| Region | ${bi?.region ?? 'N/A'} |\n`;
  md += `| Audience | ${bi?.audience ?? 'N/A'} |\n`;
  md += `| Value Proposition | ${bi?.valueProp ?? 'N/A'} |\n\n`;

  md += `## 5. Semantic Foundation (EAV Triples)\n\n`;
  const eavCount = map.eavs?.length ?? 0;
  md += `**${eavCount} Entity-Attribute-Value triples** define the semantic knowledge base.\n`;
  md += `See \`eav-inventory.csv\` for the complete inventory.\n`;

  return md;
}

/**
 * Generates a content brief in Markdown format.
 */
function formatBriefAsMarkdown(
  topic: EnrichedTopic,
  brief: ContentBrief
): string {
  let md = `# ${brief.title}\n\n`;

  md += `**Topic:** ${topic.title}\n`;
  md += `**Type:** ${topic.type} (${topic.topic_class ?? 'general'})\n`;
  md += `**Cluster Role:** ${topic.cluster_role ?? 'N/A'}\n`;
  if (brief.targetKeyword) {
    md += `**Target Keyword:** ${brief.targetKeyword}\n`;
  }
  if (brief.searchIntent) {
    md += `**Search Intent:** ${brief.searchIntent}\n`;
  }
  md += `\n---\n\n`;

  md += `## Meta Description\n\n${brief.metaDescription}\n\n`;

  if (brief.keyTakeaways?.length > 0) {
    md += `## Key Takeaways\n\n`;
    for (const takeaway of brief.keyTakeaways) {
      md += `- ${takeaway}\n`;
    }
    md += `\n`;
  }

  md += `## Outline\n\n`;
  if (brief.structured_outline && brief.structured_outline.length > 0) {
    for (const section of brief.structured_outline) {
      const prefix = '#'.repeat(Math.min(section.level + 1, 6));
      md += `${prefix} ${section.heading}\n\n`;
      if (section.methodology_note) {
        md += `*${section.methodology_note}*\n\n`;
      } else if (section.subordinate_text_hint) {
        md += `*${section.subordinate_text_hint}*\n\n`;
      }
    }
  } else if (brief.outline) {
    md += `${brief.outline}\n\n`;
  }

  if (brief.serpAnalysis?.peopleAlsoAsk?.length > 0) {
    md += `## People Also Ask\n\n`;
    for (const q of brief.serpAnalysis.peopleAlsoAsk) {
      md += `- ${q}\n`;
    }
    md += `\n`;
  }

  if (brief.contextualVectors?.length > 0) {
    md += `## Semantic Vectors (EAVs)\n\n`;
    for (const eav of brief.contextualVectors) {
      md += `- **${eav.subject?.label}** ${eav.predicate?.relation} ${eav.object?.value}\n`;
    }
    md += `\n`;
  }

  if (brief.cta) {
    md += `## Call to Action\n\n${brief.cta}\n\n`;
  }

  return md;
}

/**
 * Generates the README.md for the export package.
 */
function generateReadme(
  map: TopicalMap,
  options: ExportPackageOptions,
  fileCount: number
): string {
  const name = map.business_info?.projectName ?? map.name ?? 'SEO Package';
  const domain = map.domain ?? map.business_info?.domain ?? 'N/A';
  const date = new Date().toISOString().split('T')[0];

  let md = `# ${name} - SEO Content Package\n\n`;
  md += `**Domain:** ${domain}\n`;
  md += `**Generated:** ${date}\n`;
  md += `**Files:** ${fileCount}\n\n`;
  md += `---\n\n`;
  md += `## Package Contents\n\n`;

  if (options.includeStrategy) {
    md += `### \`strategy/\`\n`;
    md += `- **five-components.md** - The five components of Holistic SEO strategy (Central Entity, Source Context, Central Search Intent, Business Context, Semantic Foundation)\n`;
    md += `- **eav-inventory.csv** - Complete Entity-Attribute-Value triple inventory\n\n`;
  }

  md += `### \`topical-map/\`\n`;
  md += `- **map-structure.json** - Full topical map structure with topic hierarchy, types, and relationships\n\n`;

  if (options.includeBriefs) {
    md += `### \`briefs/\`\n`;
    md += `- **{topic-slug}.md** - Individual content briefs with outlines, SEO metadata, and semantic vectors\n\n`;
  }

  if (options.includeContent) {
    md += `### \`content/\`\n`;
    md += `- **{topic-slug}.html** - Generated article content in HTML format\n\n`;
  }

  if (options.includeAuditReport) {
    md += `### \`audit/\`\n`;
    md += `- **audit-report.json** - Content audit results with scores and findings\n\n`;
  }

  if (options.includeTechSpec) {
    md += `### \`tech-spec/\`\n`;
    md += `- **url-list.csv** - All page URLs with metadata\n`;
    md += `- **redirect-map.csv** - Redirect mapping template\n`;
    md += `- **meta-tag-templates.csv** - Meta tag templates per page type\n`;
    md += `- **sitemap.xml** - XML sitemap for search engines\n`;
    md += `- **robots.txt** - Robots.txt with sitemap reference\n`;
    md += `- **navigation-spec.md** - Main and footer navigation structure\n`;
    md += `- **performance-targets.md** - Core Web Vitals and performance targets\n`;
    md += `- **image-spec.csv** - Image specification with alt text\n\n`;
  }

  md += `---\n\n`;
  md += `## How to Use This Package\n\n`;
  md += `1. **Review the strategy** in \`strategy/five-components.md\` to understand the SEO foundation\n`;
  md += `2. **Examine the topical map** in \`topical-map/map-structure.json\` for the content hierarchy\n`;
  md += `3. **Use content briefs** from \`briefs/\` as specifications for content creation\n`;
  md += `4. **Implement tech specs** from \`tech-spec/\` for URL structure, sitemaps, and meta tags\n`;
  md += `5. **Review audit findings** in \`audit/\` to address content quality issues\n\n`;
  md += `## Generated By\n\n`;
  md += `Holistic SEO Topical Map Generator\n`;

  return md;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Generates a ZIP package containing all pipeline deliverables.
 *
 * @param map - The topical map with all associated data
 * @param options - Controls which sections are included in the package
 * @returns ExportResult with the ZIP blob, filename, file count, and total size
 */
export async function generateExportPackage(
  map: TopicalMap,
  options: ExportPackageOptions
): Promise<ExportResult> {
  const zip = new JSZip();
  const dirName = `${safeDirectoryName(map.name)}-seo-package`;
  const root = zip.folder(dirName)!;
  let fileCount = 0;
  let totalSize = 0;

  const topics = map.topics ?? [];
  const briefs = map.briefs ?? {};
  const eavs = map.eavs ?? [];

  // Helper to add a file and track metrics
  const addFile = (folder: JSZip, name: string, content: string) => {
    folder.file(name, content);
    fileCount++;
    totalSize += new Blob([content]).size;
  };

  // ── Strategy ──────────────────────────────────────────────────────────────
  if (options.includeStrategy) {
    const strategyFolder = root.folder('strategy')!;
    addFile(
      strategyFolder,
      'five-components.md',
      generateFiveComponentsMarkdown(map)
    );
    if (eavs.length > 0) {
      addFile(strategyFolder, 'eav-inventory.csv', formatEavsAsCsv(eavs));
    }
  }

  // ── Topical Map ───────────────────────────────────────────────────────────
  const mapFolder = root.folder('topical-map')!;
  const mapStructure = {
    name: map.name,
    domain: map.domain ?? map.business_info?.domain,
    centralEntity: map.pillars?.centralEntity,
    sourceContext: map.pillars?.sourceContext,
    totalTopics: topics.length,
    topics: topics.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      type: t.type,
      topic_class: t.topic_class,
      cluster_role: t.cluster_role,
      parent_topic_id: t.parent_topic_id,
      canonical_query: t.canonical_query,
      attribute_focus: t.attribute_focus,
    })),
    generatedAt: new Date().toISOString(),
  };
  addFile(
    mapFolder,
    'map-structure.json',
    JSON.stringify(mapStructure, null, 2)
  );

  // ── Briefs ────────────────────────────────────────────────────────────────
  if (options.includeBriefs) {
    const briefsFolder = root.folder('briefs')!;
    for (const topic of topics) {
      const brief = briefs[topic.id];
      if (brief) {
        const slug = topic.slug || slugify(topic.title);
        addFile(
          briefsFolder,
          `${slug}.md`,
          formatBriefAsMarkdown(topic, brief)
        );
      }
    }
  }

  // ── Content ───────────────────────────────────────────────────────────────
  if (options.includeContent) {
    const contentFolder = root.folder('content')!;
    for (const topic of topics) {
      const brief = briefs[topic.id];
      if (brief?.articleDraft) {
        const slug = topic.slug || slugify(topic.title);
        addFile(contentFolder, `${slug}.html`, brief.articleDraft);
      }
    }
  }

  // ── Audit ─────────────────────────────────────────────────────────────────
  if (options.includeAuditReport) {
    const auditFolder = root.folder('audit')!;
    // Collect audit data from briefs that have contentAudit
    const auditData: Array<{
      topicId: string;
      title: string;
      audit: unknown;
    }> = [];
    for (const topic of topics) {
      const brief = briefs[topic.id];
      if (brief?.contentAudit) {
        auditData.push({
          topicId: topic.id,
          title: topic.title,
          audit: brief.contentAudit,
        });
      }
    }
    // Also include map-level analysis state if available
    const auditReport = {
      mapName: map.name,
      generatedAt: new Date().toISOString(),
      totalPages: topics.length,
      auditedPages: auditData.length,
      analysisState: map.analysis_state ?? null,
      pageAudits: auditData,
    };
    addFile(
      auditFolder,
      'audit-report.json',
      JSON.stringify(auditReport, null, 2)
    );
  }

  // ── Tech Spec ─────────────────────────────────────────────────────────────
  if (options.includeTechSpec) {
    const techSpecFolder = root.folder('tech-spec')!;
    const techSpecResult = await generateTechSpec(map, topics, briefs);
    for (const deliverable of techSpecResult.deliverables) {
      addFile(techSpecFolder, deliverable.filename, deliverable.content);
    }
  }

  // ── README ────────────────────────────────────────────────────────────────
  // Add one more for the README itself
  const readmeContent = generateReadme(map, options, fileCount + 1);
  addFile(root, 'README.md', readmeContent);

  // ── Generate ZIP ──────────────────────────────────────────────────────────
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  return {
    blob,
    filename: `${dirName}.zip`,
    fileCount,
    totalSize,
  };
}
