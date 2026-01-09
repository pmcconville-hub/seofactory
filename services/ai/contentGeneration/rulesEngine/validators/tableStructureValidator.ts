// services/ai/contentGeneration/rulesEngine/validators/tableStructureValidator.ts

import { ValidationViolation, SectionGenerationContext } from '../../../../../types';

/**
 * Represents an extracted table from content
 */
export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  position: number;
  hasMergedCells: boolean;
  mergeTypes: ('colspan' | 'rowspan')[];
}

// L2 dimension constraints
const MIN_COLUMNS = 2;
const MIN_DATA_ROWS = 3;

// L3 generic/invalid header patterns
const GENERIC_HEADER_PATTERNS = [
  /^[a-z]$/i,                     // Single letters: A, B, C
  /^\d+$/,                        // Pure numbers: 1, 2, 3
  /^column\s*\d*$/i,              // Column1, Column 2
  /^col\s*\d*$/i,                 // Col1, Col 2
  /^header\s*\d*$/i,              // Header1, Header 2
  /^field\s*\d*$/i,               // Field1, Field 2
  /^data\s*\d*$/i,                // Data1, Data 2
];

// L5 data type patterns
const DATA_TYPE_PATTERNS = {
  number: /^-?\d+(?:,\d{3})*(?:\.\d+)?$/,
  currency: /^[$€£¥₹]?\s*-?\d+(?:,\d{3})*(?:\.\d+)?\s*[$€£¥₹]?$/,
  percentage: /^-?\d+(?:\.\d+)?%$/,
  date: /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/,
  placeholder: /^(?:N\/A|n\/a|NA|na|-|—|TBD|TBA|None|null|undefined)$/i,
  empty: /^\s*$/,
};

/**
 * TableStructureValidator enforces table structure rules L2-L5:
 * - L2: Minimum dimensions (2 columns, 3 rows)
 * - L3: Clear, descriptive headers
 * - L4: No merged cells (colspan/rowspan)
 * - L5: Consistent data types per column
 */
export class TableStructureValidator {
  /**
   * Extract tables from HTML and markdown content
   */
  static extractTables(content: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    // Extract HTML tables
    tables.push(...this.extractHtmlTables(content));

    // Extract markdown tables
    tables.push(...this.extractMarkdownTables(content));

    return tables;
  }

  /**
   * Extract HTML tables from content
   */
  private static extractHtmlTables(content: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const tableContent = match[1];
      const position = match.index;

      // Check for merged cells
      const hasMergedCells = /(?:colspan|rowspan)\s*=\s*["']?\d+["']?/i.test(tableContent);
      const mergeTypes: ('colspan' | 'rowspan')[] = [];
      if (/colspan\s*=\s*["']?\d+["']?/i.test(tableContent)) mergeTypes.push('colspan');
      if (/rowspan\s*=\s*["']?\d+["']?/i.test(tableContent)) mergeTypes.push('rowspan');

      // Extract headers (th elements)
      const headers = this.extractTableHeaders(tableContent);

      // Extract data rows (td elements, excluding header row)
      const rows = this.extractTableRows(tableContent, headers.length === 0);

      // If no th elements, use first row as headers
      if (headers.length === 0 && rows.length > 0) {
        const headerRow = rows.shift()!;
        tables.push({
          headers: headerRow,
          rows,
          position,
          hasMergedCells,
          mergeTypes,
        });
      } else {
        tables.push({
          headers,
          rows,
          position,
          hasMergedCells,
          mergeTypes,
        });
      }
    }

    return tables;
  }

  /**
   * Extract headers from table HTML
   */
  private static extractTableHeaders(tableContent: string): string[] {
    const headers: string[] = [];
    const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
    let match;

    while ((match = headerRegex.exec(tableContent)) !== null) {
      const text = this.stripHtml(match[1]).trim();
      headers.push(text);
    }

    return headers;
  }

  /**
   * Extract data rows from table HTML
   */
  private static extractTableRows(tableContent: string, includeFirstRow: boolean): string[][] {
    const rows: string[][] = [];
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let match;
    let isFirstRow = true;

    while ((match = rowRegex.exec(tableContent)) !== null) {
      const rowContent = match[1];

      // Check if row contains th elements (header row)
      const hasHeaders = /<th[^>]*>/i.test(rowContent);

      // Skip header rows unless we're including first row as headers
      if (hasHeaders && !includeFirstRow) {
        continue;
      }

      // Extract cells (td or th if first row)
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const text = this.stripHtml(cellMatch[1]).trim();
        cells.push(text);
      }

      if (cells.length > 0) {
        rows.push(cells);
      }

      isFirstRow = false;
    }

    return rows;
  }

  /**
   * Extract markdown tables from content
   */
  private static extractMarkdownTables(content: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    // Match markdown table pattern: header row, separator row, data rows
    const tableRegex = /(\|[^\n]+\|\n)(\|[-:\s|]+\|\n)((?:\|[^\n]+\|\n?)+)/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const headerLine = match[1];
      const dataLines = match[3];
      const position = match.index;

      // Extract headers
      const headers = this.extractMarkdownRow(headerLine);

      // Extract data rows
      const rows: string[][] = [];
      const rowLines = dataLines.trim().split('\n');
      for (const line of rowLines) {
        const row = this.extractMarkdownRow(line);
        if (row.length > 0) {
          rows.push(row);
        }
      }

      tables.push({
        headers,
        rows,
        position,
        hasMergedCells: false, // Markdown doesn't support merged cells
        mergeTypes: [],
      });
    }

    return tables;
  }

  /**
   * Extract cells from a markdown table row
   */
  private static extractMarkdownRow(line: string): string[] {
    // Remove leading/trailing pipes and split by pipe
    const trimmed = line.trim().replace(/^\||\|$/g, '');
    return trimmed.split('|').map(cell => cell.trim());
  }

  /**
   * Strip HTML tags from text
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Validate table structure rules L2-L5
   */
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const tables = this.extractTables(content);

    for (const table of tables) {
      // L2: Dimension validation
      violations.push(...this.validateDimensions(table));

      // L3: Header validation
      violations.push(...this.validateHeaders(table));

      // L4: Merged cells validation
      violations.push(...this.validateNoMergedCells(table));

      // L5: Column type consistency
      violations.push(...this.validateColumnTypes(table));
    }

    return violations;
  }

  /**
   * L2: Validate minimum dimensions (2 columns, 3 data rows)
   */
  private static validateDimensions(table: ExtractedTable): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const columnCount = Math.max(table.headers.length, table.rows[0]?.length || 0);
    const rowCount = table.rows.length;

    if (columnCount < MIN_COLUMNS) {
      violations.push({
        rule: 'L2_TABLE_DIMENSIONS',
        text: `Table has ${columnCount} column${columnCount !== 1 ? 's' : ''}, minimum is ${MIN_COLUMNS}`,
        position: table.position,
        suggestion: `Add at least ${MIN_COLUMNS - columnCount} more column${MIN_COLUMNS - columnCount !== 1 ? 's' : ''} to provide meaningful comparison or data structure.`,
        severity: 'warning',
      });
    }

    if (rowCount < MIN_DATA_ROWS) {
      violations.push({
        rule: 'L2_TABLE_DIMENSIONS',
        text: `Table has ${rowCount} data row${rowCount !== 1 ? 's' : ''}, minimum is ${MIN_DATA_ROWS}`,
        position: table.position,
        suggestion: `Add at least ${MIN_DATA_ROWS - rowCount} more data row${MIN_DATA_ROWS - rowCount !== 1 ? 's' : ''}, or convert to a list if fewer items are appropriate.`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * L3: Validate clear, descriptive headers
   */
  private static validateHeaders(table: ExtractedTable): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const problematicHeaders: string[] = [];

    for (const header of table.headers) {
      if (this.isGenericHeader(header)) {
        problematicHeaders.push(header || '(empty)');
      }
    }

    if (problematicHeaders.length > 0) {
      violations.push({
        rule: 'L3_TABLE_HEADERS',
        text: `Table has ${problematicHeaders.length} generic or empty header${problematicHeaders.length !== 1 ? 's' : ''}`,
        position: table.position,
        suggestion: `Replace generic headers with descriptive labels. Problematic headers: "${problematicHeaders.slice(0, 3).join('", "')}"${problematicHeaders.length > 3 ? '...' : ''}`,
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * Check if a header is generic or non-descriptive
   */
  private static isGenericHeader(header: string): boolean {
    // Empty header
    if (!header || header.trim().length === 0) {
      return true;
    }

    const trimmed = header.trim();

    // Check against generic patterns
    for (const pattern of GENERIC_HEADER_PATTERNS) {
      if (pattern.test(trimmed)) {
        return true;
      }
    }

    return false;
  }

  /**
   * L4: Validate no merged cells (colspan/rowspan)
   */
  private static validateNoMergedCells(table: ExtractedTable): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (table.hasMergedCells) {
      const mergeDescription = table.mergeTypes.join(' and ');
      violations.push({
        rule: 'L4_NO_MERGED_CELLS',
        text: `Table contains merged cells (${mergeDescription})`,
        position: table.position,
        suggestion: 'Remove colspan and rowspan attributes. Split merged cells into individual cells for better accessibility and data extraction.',
        severity: 'warning',
      });
    }

    return violations;
  }

  /**
   * L5: Validate consistent data types per column
   */
  private static validateColumnTypes(table: ExtractedTable): ValidationViolation[] {
    const violations: ValidationViolation[] = [];

    if (table.rows.length < 2) {
      // Not enough data to determine consistency
      return violations;
    }

    const columnCount = table.headers.length || table.rows[0]?.length || 0;

    for (let colIndex = 0; colIndex < columnCount; colIndex++) {
      const columnValues = table.rows
        .map(row => row[colIndex] || '')
        .filter(value => !DATA_TYPE_PATTERNS.empty.test(value) && !DATA_TYPE_PATTERNS.placeholder.test(value));

      if (columnValues.length < 2) {
        // Not enough non-empty values to determine consistency
        continue;
      }

      const inconsistency = this.checkColumnTypeConsistency(columnValues);

      if (inconsistency) {
        const headerName = table.headers[colIndex] || `Column ${colIndex + 1}`;
        violations.push({
          rule: 'L5_CONSISTENT_TYPES',
          text: `Column "${headerName}" has inconsistent data types`,
          position: table.position,
          suggestion: `Ensure all values in the "${headerName}" column use the same data format. Found: ${inconsistency.types.join(', ')}`,
          severity: 'warning',
        });
      }
    }

    return violations;
  }

  /**
   * Detect the data type of a cell value
   */
  private static detectDataType(value: string): string {
    const trimmed = value.trim();

    if (DATA_TYPE_PATTERNS.empty.test(trimmed)) return 'empty';
    if (DATA_TYPE_PATTERNS.placeholder.test(trimmed)) return 'placeholder';
    if (DATA_TYPE_PATTERNS.percentage.test(trimmed)) return 'percentage';
    if (DATA_TYPE_PATTERNS.currency.test(trimmed)) return 'currency';
    if (DATA_TYPE_PATTERNS.date.test(trimmed)) return 'date';
    if (DATA_TYPE_PATTERNS.number.test(trimmed)) return 'number';

    return 'text';
  }

  /**
   * Check if column values have consistent types
   */
  private static checkColumnTypeConsistency(values: string[]): { types: string[] } | null {
    const types = values.map(v => this.detectDataType(v));
    const uniqueTypes = Array.from(new Set(types.filter(t => t !== 'empty' && t !== 'placeholder')));

    // Allow currency and number to coexist (common pattern)
    const normalizedTypes = uniqueTypes.map(t => {
      if (t === 'currency') return 'numeric';
      if (t === 'number') return 'numeric';
      if (t === 'percentage') return 'numeric';
      return t;
    });

    const uniqueNormalized = Array.from(new Set(normalizedTypes));

    if (uniqueNormalized.length > 1) {
      return { types: uniqueTypes };
    }

    return null;
  }
}
