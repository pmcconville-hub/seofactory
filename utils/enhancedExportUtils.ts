// utils/enhancedExportUtils.ts
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import {
  EnrichedTopic, ContentBrief, SEOPillars, ValidationResult,
  SemanticTriple, BusinessInfo, BriefSection
} from '../types';
import { safeString } from './parsers';

// Color scheme constants
const COLORS = {
  // Headers
  headerBg: 'FF343A40',        // Dark gray
  headerText: 'FFFFFFFF',      // White

  // Topic types
  coreTopicBg: 'FF1E3A5F',     // Deep blue
  coreTopicText: 'FFFFFFFF',   // White
  outerTopicBg: 'FFE8F4FD',    // Light blue
  outerTopicText: 'FF1E3A5F',  // Dark blue

  // RAG Status
  statusGreen: 'FFD4EDDA',     // Success green
  statusAmber: 'FFFFF3CD',     // Warning yellow
  statusRed: 'FFF8D7DA',       // Alert red

  // Section dividers
  sectionDivider: 'FF6C757D',  // Medium gray

  // Alternating rows
  altRowBg: 'FFF8F9FA',        // Very light gray
};

// RAG status calculation
type RAGStatus = 'green' | 'amber' | 'red';

const calculateRAGStatus = (topic: EnrichedTopic, brief?: ContentBrief): RAGStatus => {
  if (!brief) return 'red';
  if (!brief.articleDraft) return 'amber';

  // Check if content audit passed - if any check is failing, mark as amber
  if (brief.contentAudit) {
    const audit = brief.contentAudit;
    if (!audit.eavCheck?.isPassing || !audit.linkCheck?.isPassing) {
      return 'amber';
    }
  }

  return 'green';
};

const getRAGColor = (status: RAGStatus): string => {
  switch (status) {
    case 'green': return COLORS.statusGreen;
    case 'amber': return COLORS.statusAmber;
    case 'red': return COLORS.statusRed;
  }
};

export interface EnhancedExportInput {
  topics: EnrichedTopic[];
  briefs: Record<string, ContentBrief>;
  pillars?: SEOPillars;
  eavs?: SemanticTriple[];
  competitors?: string[];
  metrics?: ValidationResult | null;
  businessInfo?: Partial<BusinessInfo>;
  mapName?: string;
  projectName?: string;
}

export interface ExportSettings {
  includeBriefJsonFiles: boolean;
  includeArticleDrafts: boolean;
  includeSchemas: boolean;
  includeAuditResults: boolean;
  compactBriefsView: boolean;
  includeEavMatrix: boolean;
  exportFormat: 'xlsx' | 'zip';
}

export class EnhancedExportGenerator {
  private workbook: ExcelJS.Workbook;
  private input: EnhancedExportInput;
  private settings: ExportSettings;

  constructor(input: EnhancedExportInput, settings: ExportSettings) {
    this.workbook = new ExcelJS.Workbook();
    this.input = input;
    this.settings = settings;

    // Set workbook properties
    this.workbook.creator = 'Holistic SEO Topical Map Generator';
    this.workbook.created = new Date();
  }

  async generate(): Promise<ExcelJS.Workbook> {
    // Create sheets in order
    this.createExecutiveSummarySheet();
    this.createTopicalMapSheet();
    this.createContentBriefsSheet();
    this.createSeoPillarsSheet();

    if (this.settings.includeEavMatrix && this.input.eavs?.length) {
      this.createSemanticTriplesSheet();
    }

    this.createBusinessContextSheet();
    this.createCompetitorsSheet();

    if (this.settings.includeAuditResults && this.input.metrics) {
      this.createAuditResultsSheet();
    }

    return this.workbook;
  }

  private createExecutiveSummarySheet(): void {
    const sheet = this.workbook.addWorksheet('Executive Summary', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });

    const { topics, briefs, pillars } = this.input;
    const coreTopics = topics.filter(t => t.type === 'core');
    const outerTopics = topics.filter(t => t.type === 'outer');
    const briefsGenerated = Object.keys(briefs).length;
    const draftsGenerated = Object.values(briefs).filter(b => b.articleDraft).length;

    // Title
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `${this.input.projectName || 'Topical Map'} - Export Summary`;
    titleCell.font = { bold: true, size: 18, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'center' };

    // Export date
    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Exported: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6C757D' } };
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    // Section: Completion Stats
    let row = 4;
    this.addSectionHeader(sheet, row, 'COMPLETION STATISTICS');
    row += 2;

    const stats = [
      ['Total Topics', topics.length],
      ['Core Topics', coreTopics.length],
      ['Outer Topics', outerTopics.length],
      ['Briefs Generated', `${briefsGenerated} / ${topics.length}`],
      ['Drafts Written', `${draftsGenerated} / ${topics.length}`],
      ['Completion Rate', `${Math.round((draftsGenerated / Math.max(topics.length, 1)) * 100)}%`]
    ];

    stats.forEach(([label, value]) => {
      sheet.getCell(`B${row}`).value = label;
      sheet.getCell(`B${row}`).font = { bold: true };
      sheet.getCell(`C${row}`).value = value;
      row++;
    });

    // Section: Coverage Analysis
    row += 2;
    this.addSectionHeader(sheet, row, 'COVERAGE ANALYSIS');
    row += 2;

    // Calculate pillar coverage
    const pillarCoverage = pillars ? [
      ['Central Entity', pillars.centralEntity || 'Not defined'],
      ['Central Search Intent', pillars.centralSearchIntent || 'Not defined'],
      ['Primary Verb', pillars.primary_verb || 'Not defined'],
    ] : [['Pillars', 'Not defined']];

    pillarCoverage.forEach(([label, value]) => {
      sheet.getCell(`B${row}`).value = label;
      sheet.getCell(`B${row}`).font = { bold: true };
      sheet.getCell(`C${row}`).value = value;
      row++;
    });

    // Section: RAG Status Overview
    row += 2;
    this.addSectionHeader(sheet, row, 'TOPIC STATUS OVERVIEW');
    row += 2;

    const ragCounts = { green: 0, amber: 0, red: 0 };
    topics.forEach(topic => {
      const status = calculateRAGStatus(topic, briefs[topic.id]);
      ragCounts[status]++;
    });

    const ragData: [string, number, RAGStatus][] = [
      ['Complete (Brief + Draft + Audit ≥80%)', ragCounts.green, 'green'],
      ['In Progress (Brief but missing draft/low audit)', ragCounts.amber, 'amber'],
      ['Not Started (No brief)', ragCounts.red, 'red']
    ];

    ragData.forEach(([label, count, status]) => {
      const statusCell = sheet.getCell(`B${row}`);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getRAGColor(status) }
      };
      sheet.getCell(`C${row}`).value = label;
      sheet.getCell(`D${row}`).value = count;
      row++;
    });

    // Set column widths
    sheet.getColumn('A').width = 5;
    sheet.getColumn('B').width = 20;
    sheet.getColumn('C').width = 45;
    sheet.getColumn('D').width = 15;
  }

  private addSectionHeader(sheet: ExcelJS.Worksheet, row: number, title: string): void {
    sheet.mergeCells(`B${row}:D${row}`);
    const cell = sheet.getCell(`B${row}`);
    cell.value = title;
    cell.font = { bold: true, size: 12, color: { argb: COLORS.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.sectionDivider }
    };
  }

  private createTopicalMapSheet(): void {
    const sheet = this.workbook.addWorksheet('Topical Map', {
      properties: { tabColor: { argb: 'FF2196F3' } }
    });

    const { topics, briefs } = this.input;
    const coreTopics = topics.filter(t => t.type === 'core');

    // Headers
    const headers = [
      'Topic Title', 'Slug', 'Type', 'Status', 'Has Brief',
      'Has Draft', 'Description', 'Canonical Query', 'Parent'
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg }
      };
      cell.alignment = { horizontal: 'center' };
    });

    // Freeze header row
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Add topics grouped by core topic
    coreTopics.forEach(coreTopic => {
      const outerTopics = topics.filter(t => t.parent_topic_id === coreTopic.id);
      const ragStatus = calculateRAGStatus(coreTopic, briefs[coreTopic.id]);

      // Core topic row (styled as group header)
      const coreRow = sheet.addRow([
        coreTopic.title,
        coreTopic.slug,
        'CORE',
        ragStatus.toUpperCase(),
        briefs[coreTopic.id] ? 'Yes' : 'No',
        briefs[coreTopic.id]?.articleDraft ? 'Yes' : 'No',
        this.truncate(coreTopic.description, 200),
        coreTopic.metadata?.canonical_query || coreTopic.canonical_query || '',
        'ROOT'
      ]);

      // Style core topic row
      coreRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: COLORS.coreTopicText } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.coreTopicBg }
        };
      });

      // Status cell gets RAG color
      const statusCell = coreRow.getCell(4);
      statusCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getRAGColor(ragStatus) }
      };
      statusCell.font = { bold: true, color: { argb: 'FF000000' } };

      // Outer topics (indented under core)
      outerTopics.forEach((outerTopic, idx) => {
        const outerRagStatus = calculateRAGStatus(outerTopic, briefs[outerTopic.id]);

        const outerRow = sheet.addRow([
          `    └─ ${outerTopic.title}`, // Visual indentation
          outerTopic.slug,
          'Outer',
          outerRagStatus.toUpperCase(),
          briefs[outerTopic.id] ? 'Yes' : 'No',
          briefs[outerTopic.id]?.articleDraft ? 'Yes' : 'No',
          this.truncate(outerTopic.description, 200),
          outerTopic.metadata?.canonical_query || outerTopic.canonical_query || '',
          coreTopic.title
        ]);

        // Style outer topic row
        outerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: idx % 2 === 0 ? COLORS.outerTopicBg : COLORS.altRowBg }
          };
        });

        // Status cell gets RAG color
        const outerStatusCell = outerRow.getCell(4);
        outerStatusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: getRAGColor(outerRagStatus) }
        };
      });

      // Add empty row between core topic groups
      sheet.addRow([]);
    });

    // Set specific widths
    sheet.getColumn(1).width = 45; // Topic Title
    sheet.getColumn(2).width = 30; // Slug
    sheet.getColumn(3).width = 10; // Type
    sheet.getColumn(4).width = 12; // Status
    sheet.getColumn(5).width = 12; // Has Brief
    sheet.getColumn(6).width = 12; // Has Draft
    sheet.getColumn(7).width = 60; // Description
    sheet.getColumn(8).width = 30; // Canonical Query
    sheet.getColumn(9).width = 25; // Parent
  }

  private truncate(text: string | undefined, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }

  private createSemanticTriplesSheet(): void {
    const sheet = this.workbook.addWorksheet('Semantic Triples', {
      properties: { tabColor: { argb: 'FF9C27B0' } }
    });

    const { eavs } = this.input;
    if (!eavs || eavs.length === 0) return;

    // Group EAVs by subject (entity)
    const groupedByEntity: Record<string, SemanticTriple[]> = {};
    eavs.forEach(eav => {
      const entity = eav.subject.label;
      if (!groupedByEntity[entity]) {
        groupedByEntity[entity] = [];
      }
      groupedByEntity[entity].push(eav);
    });

    // Get unique predicates (attributes)
    const uniquePredicates = [...new Set(eavs.map(e => e.predicate.relation))];

    // Get entities
    const entities = Object.keys(groupedByEntity);

    if (entities.length <= 50 && uniquePredicates.length <= 20) {
      // Matrix view is feasible
      this.createEavMatrix(sheet, groupedByEntity, uniquePredicates);
    } else {
      // Fall back to grouped list view
      this.createEavGroupedList(sheet, groupedByEntity);
    }
  }

  private createEavMatrix(
    sheet: ExcelJS.Worksheet,
    grouped: Record<string, SemanticTriple[]>,
    predicates: string[]
  ): void {
    // Header row: Entity | Predicate1 | Predicate2 | ...
    const headers = ['Entity', ...predicates];
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg }
      };
      cell.alignment = { horizontal: 'center', textRotation: 45 };
    });

    // Freeze header
    sheet.views = [{ state: 'frozen', ySplit: 1, xSplit: 1 }];

    // Data rows
    Object.entries(grouped).forEach(([entity, triples], idx) => {
      const rowData: (string | number)[] = [entity];

      predicates.forEach(pred => {
        const match = triples.find(t => t.predicate.relation === pred);
        rowData.push(match ? String(match.object.value) : '');
      });

      const row = sheet.addRow(rowData);

      // Alternate row coloring
      if (idx % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.altRowBg }
          };
        });
      }

      // Entity column bold
      row.getCell(1).font = { bold: true };
    });

    // Column widths
    sheet.getColumn(1).width = 30;
    for (let i = 2; i <= predicates.length + 1; i++) {
      sheet.getColumn(i).width = 20;
    }
  }

  private createEavGroupedList(
    sheet: ExcelJS.Worksheet,
    grouped: Record<string, SemanticTriple[]>
  ): void {
    // Fallback: grouped list view
    const headers = ['Entity', 'Attribute', 'Value', 'Type', 'Category', 'Classification'];
    const headerRow = sheet.addRow(headers);

    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg }
      };
    });

    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    Object.entries(grouped).forEach(([entity, triples]) => {
      // Entity header row
      const entityRow = sheet.addRow([entity, '', '', '', '', '']);
      entityRow.getCell(1).font = { bold: true };
      entityRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.outerTopicBg }
        };
      });

      // Triple rows
      triples.forEach(triple => {
        sheet.addRow([
          '',
          triple.predicate.relation,
          String(triple.object.value),
          triple.object.type,
          triple.predicate.category || '',
          triple.predicate.classification || ''
        ]);
      });

      // Spacer
      sheet.addRow([]);
    });

    // Column widths
    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 35;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 20;
    sheet.getColumn(6).width = 20;
  }

  private createContentBriefsSheet(): void {
    const sheet = this.workbook.addWorksheet('Content Briefs', {
      properties: { tabColor: { argb: 'FFFF9800' } }
    });

    const { topics, briefs } = this.input;
    const compact = this.settings.compactBriefsView;

    const headers = compact
      ? ['Topic', 'Meta Description', 'Status', 'Key Takeaways', 'Outline Vector']
      : ['Topic', 'Meta Description', 'Status', 'Key Takeaways', 'Outline Vector',
         'Methodology', 'Perspectives', 'Featured Snippet Q', 'Discourse Anchors'];

    const headerRow = sheet.addRow(headers);
    this.styleHeaderRow(headerRow);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    topics.filter(t => briefs[t.id]).forEach((topic, idx) => {
      const brief = briefs[topic.id];
      const ragStatus = calculateRAGStatus(topic, brief);

      const rowData = compact ? [
        topic.title,
        this.truncate(brief.metaDescription, 300),
        ragStatus.toUpperCase(),
        this.truncate(brief.keyTakeaways?.join(' | '), 500),
        this.formatOutlineVector(brief.outline, brief.structured_outline)
      ] : [
        topic.title,
        this.truncate(brief.metaDescription, 300),
        ragStatus.toUpperCase(),
        this.truncate(brief.keyTakeaways?.join(' | '), 500),
        this.formatOutlineVector(brief.outline, brief.structured_outline),
        this.truncate(brief.methodology_note, 300),
        brief.perspectives?.join(', ') || '',
        brief.featured_snippet_target?.question || '',
        this.truncate(brief.discourse_anchors?.join(' | '), 300)
      ];

      const row = sheet.addRow(rowData);

      // Status cell RAG coloring
      row.getCell(3).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getRAGColor(ragStatus) }
      };

      // Alternate row background
      if (idx % 2 === 0) {
        row.eachCell((cell, colNum) => {
          if (colNum !== 3) { // Don't override status color
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: COLORS.altRowBg }
            };
          }
        });
      }
    });

    // Set column widths
    sheet.getColumn(1).width = 35;
    sheet.getColumn(2).width = 50;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 40;
    sheet.getColumn(5).width = 50;
    if (!compact) {
      sheet.getColumn(6).width = 40;
      sheet.getColumn(7).width = 30;
      sheet.getColumn(8).width = 40;
      sheet.getColumn(9).width = 40;
    }
  }

  private formatOutlineVector(outline?: string, structured?: BriefSection[]): string {
    if (structured && structured.length > 0) {
      return structured.map(s => `H${s.level}: ${s.heading}`).join(' → ');
    }
    if (outline) {
      return outline.split('\n')
        .filter(line => line.trim().startsWith('#'))
        .map(line => line.trim().replace(/^#+\s*/, ''))
        .join(' → ');
    }
    return '';
  }

  private createSeoPillarsSheet(): void {
    const sheet = this.workbook.addWorksheet('SEO Pillars', {
      properties: { tabColor: { argb: 'FF4CAF50' } }
    });

    const { pillars } = this.input;
    if (!pillars) {
      sheet.addRow(['No pillars defined']);
      return;
    }

    // Title
    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'SEO PILLARS & STRATEGY';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    const pillarData = [
      ['Central Entity', pillars.centralEntity || ''],
      ['Source Context', pillars.sourceContext || ''],
      ['Central Search Intent', pillars.centralSearchIntent || ''],
      ['Primary Verb', pillars.primary_verb || ''],
      ['Auxiliary Verb', pillars.auxiliary_verb || ''],
    ];

    let row = 3;
    pillarData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`A${row}`).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.outerTopicBg }
      };
      sheet.getCell(`B${row}`).value = value;
      row++;
    });

    sheet.getColumn(1).width = 25;
    sheet.getColumn(2).width = 60;
  }

  private createBusinessContextSheet(): void {
    const sheet = this.workbook.addWorksheet('Business Context', {
      properties: { tabColor: { argb: 'FF607D8B' } }
    });

    const { businessInfo } = this.input;

    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'BUSINESS CONTEXT';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    const contextData = [
      ['Industry', businessInfo?.industry || ''],
      ['Target Market', businessInfo?.targetMarket || ''],
      ['Language', businessInfo?.language || ''],
      ['Seed Keyword', businessInfo?.seedKeyword || ''],
      ['Domain', businessInfo?.domain || ''],
      ['Value Proposition', businessInfo?.valueProp || ''],
    ];

    let row = 3;
    contextData.forEach(([label, value]) => {
      sheet.getCell(`A${row}`).value = label;
      sheet.getCell(`A${row}`).font = { bold: true };
      sheet.getCell(`B${row}`).value = this.truncate(String(value), 500);
      row++;
    });

    sheet.getColumn(1).width = 20;
    sheet.getColumn(2).width = 60;
  }

  private createCompetitorsSheet(): void {
    const sheet = this.workbook.addWorksheet('Competitors', {
      properties: { tabColor: { argb: 'FFE91E63' } }
    });

    const { competitors } = this.input;

    sheet.mergeCells('A1:B1');
    sheet.getCell('A1').value = 'COMPETITOR ANALYSIS';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    if (!competitors || competitors.length === 0) {
      sheet.getCell('A3').value = 'No competitors defined';
      return;
    }

    // Add header row starting from row 3
    sheet.getCell('A3').value = '#';
    sheet.getCell('B3').value = 'Competitor URL';
    const headerRow = sheet.getRow(3);
    this.styleHeaderRow(headerRow);

    competitors.forEach((url, idx) => {
      const rowNum = idx + 4;
      sheet.getCell(`A${rowNum}`).value = idx + 1;
      sheet.getCell(`B${rowNum}`).value = url;

      if (idx % 2 === 0) {
        sheet.getCell(`A${rowNum}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
        sheet.getCell(`B${rowNum}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.altRowBg }
        };
      }
    });

    sheet.getColumn(1).width = 5;
    sheet.getColumn(2).width = 60;
  }

  private createAuditResultsSheet(): void {
    const sheet = this.workbook.addWorksheet('Audit Results', {
      properties: { tabColor: { argb: 'FFF44336' } }
    });

    const { metrics } = this.input;
    if (!metrics) {
      sheet.addRow(['No audit results available']);
      return;
    }

    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'MAP VALIDATION & AUDIT RESULTS';
    sheet.getCell('A1').font = { bold: true, size: 14 };

    // Hub-Spoke metrics
    if (metrics.metrics?.hubSpoke) {
      let row = 3;
      sheet.getCell(`A${row}`).value = 'Hub-Spoke Metrics';
      sheet.getCell(`A${row}`).font = { bold: true };
      row++;

      sheet.getCell(`A${row}`).value = 'Hub Topic';
      sheet.getCell(`B${row}`).value = 'Spoke Count';
      sheet.getCell(`C${row}`).value = 'Status';
      const headerRow = sheet.getRow(row);
      this.styleHeaderRow(headerRow);
      row++;

      metrics.metrics.hubSpoke.forEach((m) => {
        sheet.getCell(`A${row}`).value = m.hubTitle;
        sheet.getCell(`B${row}`).value = m.spokeCount;
        sheet.getCell(`C${row}`).value = m.status;

        // Status coloring
        const statusColor = m.status === 'OPTIMAL' ? COLORS.statusGreen
          : m.status === 'UNDER_SUPPORTED' ? COLORS.statusAmber
          : COLORS.statusRed;

        sheet.getCell(`C${row}`).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusColor }
        };
        row++;
      });
    }

    sheet.getColumn(1).width = 40;
    sheet.getColumn(2).width = 15;
    sheet.getColumn(3).width = 15;
  }

  private styleHeaderRow(row: ExcelJS.Row): void {
    row.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: COLORS.headerText } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: COLORS.headerBg }
      };
      cell.alignment = { horizontal: 'center' };
    });
  }
}

export const generateEnhancedExport = async (
  input: EnhancedExportInput,
  settings: ExportSettings,
  filename: string
): Promise<void> => {
  const generator = new EnhancedExportGenerator(input, settings);
  const workbook = await generator.generate();

  if (settings.exportFormat === 'xlsx') {
    // Direct XLSX download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    downloadBlob(blob, `${filename}.xlsx`);
  } else {
    // ZIP with workbook + separate files
    const zip = new JSZip();

    // Add workbook
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    zip.file(`${filename}.xlsx`, xlsxBuffer);

    // Add article drafts
    if (settings.includeArticleDrafts) {
      const articlesFolder = zip.folder('articles');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        if (brief.articleDraft) {
          const topic = input.topics.find(t => t.id === topicId);
          const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
          const content = `# ${brief.title}\n\n> ${brief.metaDescription}\n\n---\n\n${brief.articleDraft}`;
          articlesFolder?.file(`${slug}.md`, content);
        }
      });
    }

    // Add brief JSONs
    if (settings.includeBriefJsonFiles) {
      const briefsFolder = zip.folder('briefs');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        const topic = input.topics.find(t => t.id === topicId);
        const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
        briefsFolder?.file(`${slug}-brief.json`, JSON.stringify(brief, null, 2));
      });
    }

    // Add schemas (if available and requested)
    if (settings.includeSchemas) {
      const schemasFolder = zip.folder('schemas');
      Object.entries(input.briefs).forEach(([topicId, brief]) => {
        // Schema data would need to be stored on brief or fetched
        // Check if brief has jsonLdSchema property
        const briefAny = brief as unknown as Record<string, unknown>;
        if (briefAny.jsonLdSchema) {
          const topic = input.topics.find(t => t.id === topicId);
          const slug = safeString(topic?.slug || topicId).replace(/[^a-z0-9-]/gi, '-');
          schemasFolder?.file(`${slug}-schema.json`, JSON.stringify(briefAny.jsonLdSchema, null, 2));
        }
      });
    }

    // Add metadata
    const metadata = {
      exportDate: new Date().toISOString(),
      projectName: input.projectName,
      mapName: input.mapName,
      stats: {
        totalTopics: input.topics.length,
        coreTopics: input.topics.filter(t => t.type === 'core').length,
        outerTopics: input.topics.filter(t => t.type === 'outer').length,
        briefsGenerated: Object.keys(input.briefs).length,
        draftsGenerated: Object.values(input.briefs).filter(b => b.articleDraft).length
      }
    };
    zip.file('export-metadata.json', JSON.stringify(metadata, null, 2));

    // Generate and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(zipBlob, `${filename}.zip`);
  }
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
