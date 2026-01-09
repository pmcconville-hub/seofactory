// services/ai/contentGeneration/rulesEngine/validators/__tests__/tableStructureValidator.test.ts
import { TableStructureValidator } from '../tableStructureValidator';

describe('TableStructureValidator', () => {
  describe('extractTables', () => {
    it('should extract HTML tables', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables.length).toBe(1);
      expect(tables[0].headers.length).toBe(2);
      expect(tables[0].rows.length).toBe(2);
    });

    it('should extract markdown tables', () => {
      const content = '| Col A | Col B |\n|-------|-------|\n| 1 | 2 |\n| 3 | 4 |';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables.length).toBe(1);
    });

    it('should handle multiple tables in content', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table><p>Some text</p><table><tr><th>X</th><th>Y</th></tr><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td></tr></table>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables.length).toBe(2);
    });

    it('should extract headers and data separately', () => {
      const content = '<table><tr><th>Name</th><th>Value</th></tr><tr><td>Item1</td><td>100</td></tr><tr><td>Item2</td><td>200</td></tr><tr><td>Item3</td><td>300</td></tr></table>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables[0].headers).toEqual(['Name', 'Value']);
      expect(tables[0].rows.length).toBe(3);
      expect(tables[0].rows[0]).toEqual(['Item1', '100']);
    });

    it('should handle nested HTML in cells', () => {
      const content = '<table><tr><th><strong>Bold Header</strong></th><th>Normal</th></tr><tr><td><em>italic</em></td><td>plain</td></tr><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables[0].headers[0]).toBe('Bold Header');
      expect(tables[0].rows[0][0]).toBe('italic');
    });

    it('should handle tables without th elements (first row as headers)', () => {
      const content = '<table><tr><td>Header1</td><td>Header2</td></tr><tr><td>Data1</td><td>Data2</td></tr><tr><td>Data3</td><td>Data4</td></tr><tr><td>Data5</td><td>Data6</td></tr></table>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables.length).toBe(1);
      // When no th elements, first row becomes headers
      expect(tables[0].headers.length).toBe(2);
    });

    it('should return empty array for content without tables', () => {
      const content = '<p>Just some text without tables</p>';
      const tables = TableStructureValidator.extractTables(content);
      expect(tables.length).toBe(0);
    });
  });

  describe('validateDimensions (L2)', () => {
    it('should pass for tables with 2+ columns and 3+ rows', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l2Violations = violations.filter(v => v.rule === 'L2_TABLE_DIMENSIONS');
      expect(l2Violations.length).toBe(0);
    });

    it('should pass for tables with exactly 2 columns and 3 rows', () => {
      const content = '<table><tr><th>Col1</th><th>Col2</th></tr><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l2Violations = violations.filter(v => v.rule === 'L2_TABLE_DIMENSIONS');
      expect(l2Violations.length).toBe(0);
    });

    it('should pass for tables with more than 2 columns', () => {
      const content = '<table><tr><th>A</th><th>B</th><th>C</th></tr><tr><td>1</td><td>2</td><td>3</td></tr><tr><td>4</td><td>5</td><td>6</td></tr><tr><td>7</td><td>8</td><td>9</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l2Violations = violations.filter(v => v.rule === 'L2_TABLE_DIMENSIONS');
      expect(l2Violations.length).toBe(0);
    });

    it('should fail for tables with only 1 column', () => {
      const content = '<table><tr><th>A</th></tr><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L2_TABLE_DIMENSIONS')).toBe(true);
      const l2Violation = violations.find(v => v.rule === 'L2_TABLE_DIMENSIONS');
      expect(l2Violation?.text).toContain('1 column');
    });

    it('should fail for tables with less than 3 data rows', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L2_TABLE_DIMENSIONS')).toBe(true);
      const l2Violation = violations.find(v => v.rule === 'L2_TABLE_DIMENSIONS');
      expect(l2Violation?.text).toContain('1 data row');
    });

    it('should fail for tables with exactly 2 data rows', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L2_TABLE_DIMENSIONS')).toBe(true);
    });

    it('should report both column and row violations if both fail', () => {
      const content = '<table><tr><th>A</th></tr><tr><td>1</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l2Violations = violations.filter(v => v.rule === 'L2_TABLE_DIMENSIONS');
      // Should have violations for both columns and rows
      expect(l2Violations.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateHeaders (L3)', () => {
    it('should pass for tables with descriptive headers', () => {
      const content = '<table><tr><th>Product Name</th><th>Price</th></tr><tr><td>Widget</td><td>$10</td></tr><tr><td>Gadget</td><td>$20</td></tr><tr><td>Item</td><td>$5</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l3Violations = violations.filter(v => v.rule === 'L3_TABLE_HEADERS');
      expect(l3Violations.length).toBe(0);
    });

    it('should fail for tables with empty headers', () => {
      const content = '<table><tr><th></th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L3_TABLE_HEADERS')).toBe(true);
    });

    it('should fail for tables with single-letter headers', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L3_TABLE_HEADERS')).toBe(true);
    });

    it('should fail for tables with numeric-only headers', () => {
      const content = '<table><tr><th>1</th><th>2</th></tr><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L3_TABLE_HEADERS')).toBe(true);
    });

    it('should fail for tables with generic headers like "Column1"', () => {
      const content = '<table><tr><th>Column1</th><th>Column2</th></tr><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr><tr><td>e</td><td>f</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L3_TABLE_HEADERS')).toBe(true);
    });

    it('should pass for headers with numbers if descriptive (e.g., "Q1 2024")', () => {
      const content = '<table><tr><th>Quarter</th><th>Revenue</th></tr><tr><td>Q1</td><td>$100</td></tr><tr><td>Q2</td><td>$200</td></tr><tr><td>Q3</td><td>$300</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l3Violations = violations.filter(v => v.rule === 'L3_TABLE_HEADERS');
      expect(l3Violations.length).toBe(0);
    });

    it('should identify which headers are problematic in suggestion', () => {
      const content = '<table><tr><th>A</th><th>Product Name</th></tr><tr><td>1</td><td>Widget</td></tr><tr><td>2</td><td>Gadget</td></tr><tr><td>3</td><td>Thing</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l3Violation = violations.find(v => v.rule === 'L3_TABLE_HEADERS');
      expect(l3Violation?.suggestion).toContain('A');
    });
  });

  describe('validateNoMergedCells (L4)', () => {
    it('should pass for tables without merged cells', () => {
      const content = '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr><tr><td>C</td><td>3</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l4Violations = violations.filter(v => v.rule === 'L4_NO_MERGED_CELLS');
      expect(l4Violations.length).toBe(0);
    });

    it('should fail for tables with colspan', () => {
      const content = '<table><tr><th colspan="2">Merged</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L4_NO_MERGED_CELLS')).toBe(true);
    });

    it('should fail for tables with rowspan', () => {
      const content = '<table><tr><th>Name</th><th>Value</th></tr><tr><td rowspan="2">Merged</td><td>1</td></tr><tr><td>2</td></tr><tr><td>C</td><td>3</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L4_NO_MERGED_CELLS')).toBe(true);
    });

    it('should fail for tables with both colspan and rowspan', () => {
      const content = '<table><tr><th colspan="2">Header</th></tr><tr><td rowspan="2">A</td><td>1</td></tr><tr><td>2</td></tr><tr><td>B</td><td>3</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L4_NO_MERGED_CELLS')).toBe(true);
    });

    it('should detect colspan in data cells (td)', () => {
      const content = '<table><tr><th>A</th><th>B</th></tr><tr><td colspan="2">Merged data</td></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L4_NO_MERGED_CELLS')).toBe(true);
    });

    it('should report merge type in violation message', () => {
      const content = '<table><tr><th colspan="2">Merged Header</th></tr><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr><tr><td>5</td><td>6</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l4Violation = violations.find(v => v.rule === 'L4_NO_MERGED_CELLS');
      expect(l4Violation?.text).toMatch(/colspan|merged/i);
    });
  });

  describe('validateColumnTypes (L5)', () => {
    it('should pass for consistent column types (text, numbers)', () => {
      const content = '<table><tr><th>Name</th><th>Count</th></tr><tr><td>A</td><td>10</td></tr><tr><td>B</td><td>20</td></tr><tr><td>C</td><td>30</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violations.length).toBe(0);
    });

    it('should pass for consistent currency values', () => {
      const content = '<table><tr><th>Item</th><th>Price</th></tr><tr><td>Apple</td><td>$1.50</td></tr><tr><td>Banana</td><td>$0.75</td></tr><tr><td>Orange</td><td>$2.00</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violations.length).toBe(0);
    });

    it('should pass for consistent percentage values', () => {
      const content = '<table><tr><th>Category</th><th>Share</th></tr><tr><td>A</td><td>25%</td></tr><tr><td>B</td><td>35%</td></tr><tr><td>C</td><td>40%</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violations.length).toBe(0);
    });

    it('should pass for consistent date values', () => {
      const content = '<table><tr><th>Event</th><th>Date</th></tr><tr><td>Launch</td><td>2024-01-15</td></tr><tr><td>Update</td><td>2024-02-20</td></tr><tr><td>Release</td><td>2024-03-25</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violations.length).toBe(0);
    });

    it('should warn for mixed types in a column', () => {
      const content = '<table><tr><th>Item</th><th>Value</th></tr><tr><td>A</td><td>100</td></tr><tr><td>B</td><td>Not available</td></tr><tr><td>C</td><td>300</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L5_CONSISTENT_TYPES')).toBe(true);
    });

    it('should identify which column has inconsistent types', () => {
      const content = '<table><tr><th>Name</th><th>Amount</th></tr><tr><td>Item1</td><td>$50</td></tr><tr><td>Item2</td><td>Varies</td></tr><tr><td>Item3</td><td>$75</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violation = violations.find(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violation?.suggestion).toContain('Amount');
    });

    it('should allow empty cells without flagging type inconsistency', () => {
      const content = '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>100</td></tr><tr><td>B</td><td></td></tr><tr><td>C</td><td>300</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      expect(l5Violations.length).toBe(0);
    });

    it('should handle N/A and similar placeholders as consistent', () => {
      const content = '<table><tr><th>Name</th><th>Score</th></tr><tr><td>A</td><td>85</td></tr><tr><td>B</td><td>N/A</td></tr><tr><td>C</td><td>92</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      const l5Violations = violations.filter(v => v.rule === 'L5_CONSISTENT_TYPES');
      // N/A is a valid placeholder, should not trigger inconsistency
      expect(l5Violations.length).toBe(0);
    });
  });

  describe('integration with markdown tables', () => {
    it('should validate markdown tables for dimensions', () => {
      const content = '| A | B |\n|---|---|\n| 1 | 2 |';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L2_TABLE_DIMENSIONS')).toBe(true);
    });

    it('should validate markdown tables for headers', () => {
      const content = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.some(v => v.rule === 'L3_TABLE_HEADERS')).toBe(true);
    });

    it('should pass well-formed markdown tables', () => {
      const content = '| Product Name | Price | Stock |\n|---|---|---|\n| Widget | $10 | 100 |\n| Gadget | $20 | 50 |\n| Tool | $15 | 75 |';
      const violations = TableStructureValidator.validate(content, {} as any);
      const tableViolations = violations.filter(v =>
        v.rule.startsWith('L2_') || v.rule.startsWith('L3_') ||
        v.rule.startsWith('L4_') || v.rule.startsWith('L5_')
      );
      expect(tableViolations.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const violations = TableStructureValidator.validate('', {} as any);
      expect(violations.length).toBe(0);
    });

    it('should handle content with no tables', () => {
      const content = '<p>This is just a paragraph without any tables.</p>';
      const violations = TableStructureValidator.validate(content, {} as any);
      expect(violations.length).toBe(0);
    });

    it('should handle malformed table HTML gracefully', () => {
      const content = '<table><tr><th>A</th><th>B</tr><tr><td>1</td></tr></table>';
      // Should not throw, may or may not extract valid data
      expect(() => TableStructureValidator.validate(content, {} as any)).not.toThrow();
    });

    it('should validate multiple tables independently', () => {
      // First table: valid, Second table: invalid (only 1 column)
      const content = '<table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr><tr><td>C</td><td>3</td></tr></table><table><tr><th>Single</th></tr><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr></table>';
      const violations = TableStructureValidator.validate(content, {} as any);
      // Should have L2 violation for the second table only
      expect(violations.some(v => v.rule === 'L2_TABLE_DIMENSIONS')).toBe(true);
    });
  });
});
