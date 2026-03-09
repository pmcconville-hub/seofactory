/**
 * Answer Capsule Validator
 *
 * Validates that the first paragraph after each H2 heading serves as a
 * 40-70 word answer capsule: direct, factual, entity-explicit, no preamble.
 * Capsules must read as natural, compelling opening paragraphs.
 */

export interface CapsuleIssue {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedElement?: string;
  exampleFix?: string;
}

const PREAMBLE_PATTERNS = [
  /^in this section/i,
  /^let's explore/i,
  /^let us explore/i,
  /^we will discuss/i,
  /^this section covers/i,
  /^this section explores/i,
  /^here we will/i,
  /^now let's/i,
  /^before we begin/i,
  /^to understand/i,
  /^it is important to note/i,
  /^in today's world/i,
  /^in the ever-evolving/i,
];

export class AnswerCapsuleValidator {
  validate(html: string, entityName?: string): CapsuleIssue[] {
    const issues: CapsuleIssue[] = [];
    const sections = this.extractH2Sections(html);

    if (sections.length === 0) return issues;

    const openingPatterns: string[] = [];

    for (const section of sections) {
      const firstPara = section.firstParagraph;
      if (!firstPara) continue;

      const wordCount = firstPara.split(/\s+/).filter(w => w.length > 0).length;

      // Check length (40-70 words)
      if (wordCount < 40 || wordCount > 70) {
        issues.push({
          ruleId: 'rule-capsule-length',
          severity: 'medium',
          title: 'Answer capsule outside 40-70 word range',
          description: `First paragraph after "${section.heading}" is ${wordCount} words (target: 40-70).`,
          affectedElement: section.heading,
          exampleFix: wordCount < 40
            ? 'Expand with a supporting fact or evidence to reach 40 words'
            : 'Tighten to core facts only — move detail to subsequent paragraphs',
        });
      }

      // Check entity presence
      if (entityName && !firstPara.toLowerCase().includes(entityName.toLowerCase())) {
        issues.push({
          ruleId: 'rule-capsule-entity',
          severity: 'medium',
          title: 'Answer capsule missing entity name',
          description: `First paragraph after "${section.heading}" does not mention "${entityName}".`,
          affectedElement: section.heading,
          exampleFix: `Include "${entityName}" naturally in the opening sentence`,
        });
      }

      // Check preamble
      const trimmed = firstPara.trim();
      for (const pattern of PREAMBLE_PATTERNS) {
        if (pattern.test(trimmed)) {
          issues.push({
            ruleId: 'rule-capsule-preamble',
            severity: 'medium',
            title: 'Answer capsule starts with preamble',
            description: `First paragraph after "${section.heading}" starts with introductory fluff.`,
            affectedElement: section.heading,
            exampleFix: 'Remove the introductory phrase and start with the direct answer',
          });
          break;
        }
      }

      // Track opening pattern for variety check
      const firstWords = trimmed.split(/\s+/).slice(0, 4).join(' ').toLowerCase();
      openingPatterns.push(firstWords);
    }

    // Check variety: flag if 3+ capsules start with the same 4-word pattern
    const patternCounts = new Map<string, number>();
    for (const p of openingPatterns) {
      patternCounts.set(p, (patternCounts.get(p) || 0) + 1);
    }
    for (const [pattern, count] of patternCounts) {
      if (count >= 3) {
        issues.push({
          ruleId: 'rule-capsule-variety',
          severity: 'low',
          title: 'Repetitive answer capsule openings',
          description: `${count} answer capsules start with "${pattern}...".`,
          exampleFix: 'Rewrite some capsules to open with a statistic, question-answer, or narrative approach',
        });
      }
    }

    return issues;
  }

  private extractH2Sections(html: string): Array<{ heading: string; firstParagraph: string }> {
    const results: Array<{ heading: string; firstParagraph: string }> = [];
    const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
    let match;
    while ((match = h2Regex.exec(html)) !== null) {
      const heading = match[1].replace(/<[^>]+>/g, '').trim();
      const afterH2 = html.slice(match.index + match[0].length);
      const pMatch = afterH2.match(/<p[^>]*>(.*?)<\/p>/is);
      if (pMatch) {
        const paraText = pMatch[1].replace(/<[^>]+>/g, '').trim();
        results.push({ heading, firstParagraph: paraText });
      }
    }
    return results;
  }
}
