import { ContentBrief, BusinessInfo, EnrichedTopic, BriefSection } from '../types';
import {
  BriefComplianceCheck,
  MissingField,
  AutoSuggestion,
  FeaturedSnippetTarget
} from '../types/contentGeneration';

type Methodology = 'ordered_list' | 'unordered_list' | 'comparison_table' | 'definition_prose' | 'prose';

export class BriefComplianceService {
  /**
   * Infer methodology (list/table/prose) from heading pattern
   */
  inferMethodology(section: { heading: string }): Methodology {
    const heading = section.heading.toLowerCase();

    // Ordered list patterns
    if (/^(how to|steps to|guide to|\d+\s+(ways|steps|tips|methods))/i.test(heading)) {
      return 'ordered_list';
    }

    // Unordered list patterns
    if (/^(types of|benefits of|advantages|features|characteristics)/i.test(heading)) {
      return 'unordered_list';
    }

    // Table patterns (check for "vs" anywhere in heading, or starts with comparison/versus)
    if (/\s+vs\.?\s+|^(comparison|versus|differences between|pricing)/i.test(heading)) {
      return 'comparison_table';
    }

    // Definition patterns
    if (/^(what is|what are|definition|meaning of)/i.test(heading)) {
      return 'definition_prose';
    }

    return 'prose';
  }
}
