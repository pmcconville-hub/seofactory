// services/ai/contentGeneration/rulesEngine/validators/factConsistencyValidator.ts

import { SectionGenerationContext, ValidationViolation } from '../../../../../types';

/**
 * Lightweight fact consistency check.
 * Detects:
 * 1. Numeric claims not supported by brief data
 * 2. Contradictions with EAV triples (negation patterns)
 */
export class FactConsistencyValidator {
  static validate(content: string, context: SectionGenerationContext): ValidationViolation[] {
    const violations: ValidationViolation[] = [];
    const brief = context.brief;
    if (!brief) return violations;

    // Check for unsupported statistics (numbers followed by %, million, billion, etc.)
    const statPatterns = /(\d+(?:\.\d+)?)\s*(%|percent|million|billion|thousand)/gi;
    let match;
    const briefText = JSON.stringify(brief).toLowerCase();

    while ((match = statPatterns.exec(content)) !== null) {
      const number = match[1];
      if (!briefText.includes(number)) {
        violations.push({
          rule: 'FACT_CONSISTENCY',
          text: `Statistic "${match[0]}" not found in brief data — may be hallucinated`,
          position: match.index,
          suggestion: 'Verify this statistic against source data or remove it.',
          severity: 'warning',
        });
      }
    }

    // Check for EAV contradictions (negation of known facts)
    const eavs = brief.eavs || [];
    const contentLower = content.toLowerCase();

    for (const eav of eavs) {
      const subject = eav.subject?.label?.toLowerCase();
      const relation = eav.predicate?.relation?.toLowerCase() || '';

      if (!subject || !relation) continue;
      if (!contentLower.includes(subject)) continue;

      // Look for negation of the EAV relationship
      const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedRelation = relation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const negationPattern = new RegExp(
        `${escapedSubject}\\s+(?:does not|doesn't|is not|isn't|cannot|can't|never|no longer)\\s+${escapedRelation}`,
        'i'
      );

      if (negationPattern.test(content)) {
        violations.push({
          rule: 'FACT_CONSISTENCY',
          text: `Content negates EAV: "${eav.subject?.label} ${relation} ${eav.object?.value}"`,
          position: 0,
          suggestion: `The brief states "${eav.subject?.label} ${relation} ${eav.object?.value}". Remove the contradicting statement.`,
          severity: 'error',
        });
      }
    }

    // Cross-reference numbers and dates in content against brief's SERP data
    this.crossReferenceSerpData(content, brief, violations);

    return violations;
  }

  /**
   * Cross-reference numbers and dates found in content against numbers and dates
   * present in the brief's SERP data. Flag inconsistencies as warnings.
   */
  private static crossReferenceSerpData(
    content: string,
    brief: SectionGenerationContext['brief'],
    violations: ValidationViolation[]
  ): void {
    if (!brief) return;

    // Collect numbers and dates from SERP data sources
    const serpNumbers = new Set<string>();
    const serpDates = new Set<string>();
    const serpSources: string[] = [];

    // Gather text from SERP analysis fields
    if (brief.serpAnalysis) {
      const serp = brief.serpAnalysis;
      if (serp.peopleAlsoAsk) {
        serpSources.push(...serp.peopleAlsoAsk);
      }
      if (serp.competitorHeadings) {
        for (const comp of serp.competitorHeadings) {
          if (comp.title) serpSources.push(comp.title);
          if (comp.headings) {
            for (const h of comp.headings) {
              if (h.text) serpSources.push(h.text);
            }
          }
        }
      }
      if (serp.avgWordCount !== undefined) serpNumbers.add(String(serp.avgWordCount));
      if (serp.avgHeadings !== undefined) serpNumbers.add(String(serp.avgHeadings));
    }

    // Gather from competitorSpecs if available
    if (brief.competitorSpecs) {
      const specs = brief.competitorSpecs;
      if (specs.targetWordCount) serpNumbers.add(String(specs.targetWordCount));
      if (specs.targetImageCount) serpNumbers.add(String(specs.targetImageCount));
      if (specs.competitorsAnalyzed) serpNumbers.add(String(specs.competitorsAnalyzed));
    }

    // Extract numbers and dates from SERP source texts
    const serpText = serpSources.join(' ');
    this.extractNumbers(serpText).forEach(n => serpNumbers.add(n));
    this.extractDates(serpText).forEach(d => serpDates.add(d));

    // Also extract from keyTakeaways (these often contain brief-sourced facts)
    if (brief.keyTakeaways) {
      const takeawayText = brief.keyTakeaways.join(' ');
      this.extractNumbers(takeawayText).forEach(n => serpNumbers.add(n));
      this.extractDates(takeawayText).forEach(d => serpDates.add(d));
    }

    // If we have no SERP data to compare against, skip
    if (serpNumbers.size === 0 && serpDates.size === 0) return;

    // Extract numbers and dates from the content
    const contentNumbers = this.extractNumbers(content);
    const contentDates = this.extractDates(content);

    // Flag numbers in content that contradict SERP data
    // A contradiction is when a number appears in SERP context and a different
    // number appears in a similar context in the content
    for (const contentNum of contentNumbers) {
      // Skip trivially common numbers (1-10) as they appear everywhere
      const numVal = parseFloat(contentNum);
      if (numVal >= 0 && numVal <= 10) continue;

      // Check if this number is already in the SERP data (consistent)
      if (serpNumbers.has(contentNum)) continue;

      // Check if the content has a number that is close but different from a SERP number
      // (potential inconsistency - e.g., SERP says "85%" but content says "80%")
      for (const serpNum of serpNumbers) {
        const serpVal = parseFloat(serpNum);
        if (isNaN(serpVal) || isNaN(numVal)) continue;
        if (serpVal >= 0 && serpVal <= 10) continue;

        // Check if numbers are in similar magnitude but different
        // Same order of magnitude and within 20% difference suggests a potential conflict
        if (serpVal > 0 && numVal > 0) {
          const ratio = Math.max(numVal, serpVal) / Math.min(numVal, serpVal);
          if (ratio > 1.0 && ratio < 1.5) {
            // Find the position of this number in content
            const numPattern = new RegExp(`\\b${contentNum.replace('.', '\\.')}\\b`);
            const numMatch = numPattern.exec(content);
            violations.push({
              rule: 'FACT_CONSISTENCY',
              text: `Number "${contentNum}" in content may conflict with "${serpNum}" from SERP/brief data`,
              position: numMatch?.index || 0,
              suggestion: `SERP data references "${serpNum}" but content uses "${contentNum}". Verify this number is accurate and consistent with source data.`,
              severity: 'warning',
            });
          }
        }
      }
    }

    // Flag dates in content that conflict with SERP-sourced dates
    for (const contentDate of contentDates) {
      if (serpDates.has(contentDate)) continue;

      // Check for year discrepancies (e.g., SERP says 2023 but content says 2022)
      const contentYear = this.extractYear(contentDate);
      if (!contentYear) continue;

      for (const serpDate of serpDates) {
        const serpYear = this.extractYear(serpDate);
        if (!serpYear) continue;

        // Flag if years are close but different (within 2 years suggests potential outdated data)
        const yearDiff = Math.abs(contentYear - serpYear);
        if (yearDiff > 0 && yearDiff <= 2) {
          const datePattern = new RegExp(contentDate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          const dateMatch = datePattern.exec(content);
          violations.push({
            rule: 'FACT_CONSISTENCY',
            text: `Date "${contentDate}" in content may conflict with "${serpDate}" from SERP/brief data`,
            position: dateMatch?.index || 0,
            suggestion: `SERP data references "${serpDate}" but content uses "${contentDate}". Verify the date is current and accurate.`,
            severity: 'warning',
          });
        }
      }
    }
  }

  /**
   * Extract significant numbers from text
   */
  private static extractNumbers(text: string): string[] {
    const numbers: string[] = [];
    const pattern = /\b(\d+(?:,\d{3})*(?:\.\d+)?)\b/g;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      // Normalize by removing commas
      numbers.push(m[1].replace(/,/g, ''));
    }
    return numbers;
  }

  /**
   * Extract dates from text (various formats)
   */
  private static extractDates(text: string): string[] {
    const dates: string[] = [];
    // Match common date formats: YYYY, Month YYYY, DD/MM/YYYY, MM-DD-YYYY, etc.
    const patterns = [
      /\b((?:19|20)\d{2})\b/g,                                          // Standalone year: 2023
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-](?:19|20)\d{2})\b/g,              // DD/MM/YYYY or MM-DD-YYYY
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+(?:19|20)\d{2})\b/gi,  // Month DD, YYYY
      /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+(?:19|20)\d{2})\b/gi,    // DD Month YYYY
    ];

    for (const pattern of patterns) {
      let m;
      while ((m = pattern.exec(text)) !== null) {
        dates.push(m[1]);
      }
    }
    return dates;
  }

  /**
   * Extract a 4-digit year from a date string
   */
  private static extractYear(dateStr: string): number | null {
    const yearMatch = dateStr.match(/((?:19|20)\d{2})/);
    return yearMatch ? parseInt(yearMatch[1], 10) : null;
  }
}
