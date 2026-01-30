// config/prompts/_common.ts
// Shared utilities and helpers for prompt generation

import { BusinessInfo, AuthorProfile, WebsiteType } from '../../types';
import { MarketPatterns } from '../../types/competitiveIntelligence';
import { getWebsiteTypeConfig } from '../websiteTypeTemplates';
import { getLanguageName, getLanguageAndRegionInstruction, getRegionalLanguageVariant } from '../../utils/languageUtils';
import { getMonetizationPromptEnhancement, shouldApplyMonetizationEnhancement } from '../../utils/monetizationPromptUtils';

// Re-export for use in content generation passes
export { getLanguageAndRegionInstruction };

export const jsonResponseInstruction = `
Respond with a valid JSON object. Do not include any explanatory text or markdown formatting before or after the JSON.
`;

export const businessContext = (info: BusinessInfo): string => {
    const typeConfig = info.websiteType ? getWebsiteTypeConfig(info.websiteType) : null;
    const regionalVariant = getRegionalLanguageVariant(info.language, info.region);
    return `
Business Context:
- Domain: ${info.domain}
- Industry: ${info.industry}
- Business Model: ${info.model}
- Website Type: ${typeConfig?.label || 'General/Informational'}
- Target Audience: ${info.audience}
- Unique Value Proposition: ${info.valueProp}
- Stated Expertise Level: ${info.expertise}
- Main Topic / Seed Keyword: ${info.seedKeyword}
- Target Market: ${info.targetMarket}
- Language: ${regionalVariant}
- Region/Location: ${info.region || 'Not specified'}
${info.authorName ? `- Author: ${info.authorName} (${info.authorBio || ''})` : ''}
${info.authorCredentials ? `- Author Credentials: ${info.authorCredentials}` : ''}
${info.uniqueDataAssets ? `- Unique Data Assets: ${info.uniqueDataAssets}` : ''}
`;
};

/**
 * Generate website type-specific instructions for topical map generation
 */
export const getWebsiteTypeInstructions = (websiteType?: WebsiteType): string => {
    if (!websiteType) return '';

    const config = getWebsiteTypeConfig(websiteType);

    let instructions = `
**WEBSITE TYPE-SPECIFIC STRATEGY: ${config.label.toUpperCase()}**
${config.description}

**Core Section Focus (Monetization):**
${config.coreSectionRules.description}
- Required page types: ${config.coreSectionRules.requiredPageTypes.join(', ')}
- Optional page types: ${config.coreSectionRules.optionalPageTypes.join(', ')}
- Content depth: ${config.coreSectionRules.contentDepth}
- Attribute priority: ${config.coreSectionRules.attributePriority.join(' → ')}

**Author Section Focus (Authority Building):**
${config.authorSectionRules.description}
- Required page types: ${config.authorSectionRules.requiredPageTypes.join(', ')}
- Link-back strategy: ${config.authorSectionRules.linkBackStrategy} (PageRank should flow from Author → Core)

**Hub-Spoke Structure:**
- Optimal ratio: 1:${config.hubSpokeRatio.optimal} (min: ${config.hubSpokeRatio.min}, max: ${config.hubSpokeRatio.max})
- Generate ${config.hubSpokeRatio.optimal} spokes per core topic

**Linking Rules:**
- Max ${config.linkingRules.maxAnchorsPerPage} anchors per page
- Max ${config.linkingRules.maxAnchorRepetition} repetitions of same anchor text
- Link direction: ${config.linkingRules.preferredLinkDirection.replace(/_/g, ' ')}
`;

    // Add type-specific template patterns
    if (config.templatePatterns.length > 0) {
        instructions += `
**Recommended Topic Templates:**
`;
        config.templatePatterns.forEach(template => {
            instructions += `- ${template.name}: ${template.description} (Schema: ${template.schemaType})
`;
        });
    }

    // Add type-specific EAV priorities
    instructions += `
**Prioritized Attributes for this Website Type:**
- ROOT (Essential): ${config.eavPriority.requiredCategories.ROOT.join(', ')}
- UNIQUE (Differentiating): ${config.eavPriority.requiredCategories.UNIQUE.join(', ')}
- RARE (Detailed): ${config.eavPriority.requiredCategories.RARE.join(', ')}
- Composite: ${config.eavPriority.compositeAttributes.join(', ')}
`;

    return instructions;
};

export const getStylometryInstructions = (profile?: AuthorProfile): string => {
    if (!profile) return "Tone: Professional and authoritative.";

    let stylePrompt = "";
    switch (profile.stylometry) {
        case 'ACADEMIC_FORMAL':
            stylePrompt = "Tone: Academic and Formal. Use objective language. Prioritize precision, nuance, and citation of principles. Avoid colloquialisms. Complex sentence structures are permitted if they add precision.";
            break;
        case 'DIRECT_TECHNICAL':
            stylePrompt = "Tone: Direct and Technical. Use short, declarative sentences. Focus on mechanics, specifications, and 'how-to'. Avoid adjectives and fluff. Prioritize clarity and brevity over elegance.";
            break;
        case 'PERSUASIVE_SALES':
            stylePrompt = "Tone: Persuasive and Benefit-Driven. Use active voice. Focus on outcomes, value propositions, and solving user pain points. Use rhetorical questions sparingly to drive engagement.";
            break;
        case 'INSTRUCTIONAL_CLEAR':
        default:
            stylePrompt = "Tone: Instructional and Clear. Use simple, accessible language (EL15). Focus on step-by-step logic. Define technical terms immediately upon introduction.";
            break;
    }

    if (profile.customStylometryRules && profile.customStylometryRules.length > 0) {
        stylePrompt += "\n\nNEGATIVE CONSTRAINTS (Strictly Forbidden):";
        profile.customStylometryRules.forEach(rule => {
            stylePrompt += `\n- ${rule}`;
        });
    }

    return stylePrompt;
};

/**
 * Generate market data section for content brief prompt
 * Injects real competitor analysis data to enhance brief generation
 */
export const getMarketDataPromptSection = (marketPatterns?: MarketPatterns): string => {
    if (!marketPatterns || marketPatterns.dataQuality === 'none') {
        return '';
    }

    const sections: string[] = [];

    sections.push(`
## COMPETITOR ANALYSIS DATA (Real SERP Analysis)

Based on analysis of ${marketPatterns.competitorsAnalyzed} competitors (Data Quality: ${marketPatterns.dataQuality.toUpperCase()}):

### Content Benchmarks
- **Average word count**: ${marketPatterns.content.avgWordCount} words (Confidence: ${marketPatterns.content.wordCountConfidence})
- **Recommended target**: ${marketPatterns.content.recommendedWordCount} words
- **Word count range**: ${marketPatterns.content.wordCountRange.min} - ${marketPatterns.content.wordCountRange.max} words
- **Average headings**: ${marketPatterns.structure.avgH2Count} H2s, ${marketPatterns.structure.avgH3Count} H3s
- **Dominant audience level**: ${marketPatterns.content.dominantAudienceLevel}
- **Dominant content template**: ${marketPatterns.structure.dominantContentTemplate}`);

    if (marketPatterns.semantic.requiredTopics.length > 0) {
        sections.push(`
### Required Topics (70%+ competitors cover)
${marketPatterns.semantic.requiredTopics.slice(0, 10).map(t => `- ${t}`).join('\n')}`);
    }

    if (marketPatterns.semantic.differentiationTopics.length > 0) {
        sections.push(`
### Differentiation Opportunities (rare/unique topics)
${marketPatterns.semantic.differentiationTopics.slice(0, 8).map(t => `- ${t}`).join('\n')}`);
    }

    sections.push(`
### Visual Requirements
- **Average images**: ${marketPatterns.visuals.avgImageCount}
- **${marketPatterns.visuals.hasVideoPercentage}%** of competitors have video content
- **Recommended image count**: ${marketPatterns.visuals.recommendedImageCount}
${marketPatterns.visuals.commonImageTypes.length > 0 ? `- **Common image types**: ${marketPatterns.visuals.commonImageTypes.join(', ')}` : ''}`);

    sections.push(`
### Technical Requirements
- **Common schema types**: ${marketPatterns.technical.commonSchemaTypes.join(', ') || 'Article'}
- **${marketPatterns.technical.schemaPresencePercentage}%** use structured data
- **Recommended schema types**: ${marketPatterns.technical.recommendedSchemaTypes.join(', ')}`);

    if (marketPatterns.warnings.length > 0) {
        sections.push(`
### Analysis Notes
${marketPatterns.warnings.map(w => `⚠️ ${w}`).join('\n')}`);
    }

    sections.push(`
### IMPORTANT: Use This Data
- Set **serpAnalysis.avgWordCount** to approximately ${marketPatterns.content.recommendedWordCount}
- Set **serpAnalysis.avgHeadings** to approximately ${marketPatterns.structure.avgH2Count + marketPatterns.structure.avgH3Count}
- Include the **Required Topics** in your structured_outline
- Prioritize **Differentiation Opportunities** for unique content angles
- Ensure visual recommendations align with the competitor benchmarks
`);

    return sections.join('\n');
};

/**
 * Condense a content brief for prompt inclusion (reduces token usage)
 */
export const condenseBriefForPrompt = (brief: any): string => {
    return JSON.stringify({
        title: brief.title,
        targetKeyword: brief.targetKeyword,
        searchIntent: brief.searchIntent,
        metaDescription: brief.metaDescription,
        keyTakeaways: brief.keyTakeaways?.slice(0, 5),
        structured_outline: brief.structured_outline?.map((s: any) => ({
            heading: s.heading,
            format_code: s.format_code,
        })),
    }, null, 2);
};

// Re-export utility functions that may be needed by prompt modules
export {
    getLanguageName,
    getRegionalLanguageVariant,
    getMonetizationPromptEnhancement,
    shouldApplyMonetizationEnhancement,
    getWebsiteTypeConfig,
};
