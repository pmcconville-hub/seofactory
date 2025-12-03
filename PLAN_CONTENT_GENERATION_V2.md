# Content Generation V2 - Implementation Plan

## Executive Summary

This plan redesigns the multi-pass content generation system to produce **human-readable, business-focused content** that is also optimized for search engines. The core principle is: **Human First, Machine Optimized**.

---

## Phase 1: Database & Type Foundations

### 1.1 New Database Tables

```sql
-- Content Generation Settings (per map or global)
CREATE TABLE content_generation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  map_id UUID REFERENCES topical_maps(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default',
  is_default BOOLEAN DEFAULT false,

  -- Priority Weights (0-100)
  priority_human_readability INTEGER DEFAULT 40,
  priority_business_conversion INTEGER DEFAULT 25,
  priority_machine_optimization INTEGER DEFAULT 20,
  priority_factual_density INTEGER DEFAULT 15,

  -- Tone & Style
  tone TEXT DEFAULT 'professional', -- conversational, professional, academic, sales
  audience_expertise TEXT DEFAULT 'intermediate', -- beginner, intermediate, expert

  -- Pass Configuration
  pass_config JSONB DEFAULT '{
    "checkpoint_after_pass_1": false,
    "passes": {
      "pass_2_headers": {"enabled": true, "store_version": true},
      "pass_3_lists": {"enabled": true, "store_version": true},
      "pass_4_visuals": {"enabled": true, "store_version": true},
      "pass_5_micro": {"enabled": true, "store_version": true},
      "pass_6_discourse": {"enabled": true, "store_version": true},
      "pass_7_intro": {"enabled": true, "store_version": true},
      "pass_8_audit": {"enabled": true, "store_version": false}
    }
  }',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt Templates (overrides for default prompts)
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  prompt_key TEXT NOT NULL, -- e.g., 'pass_1_section', 'pass_2_headers'
  name TEXT NOT NULL,
  description TEXT,

  -- The template content (uses {{variables}})
  template_content TEXT NOT NULL,

  -- Variables available in this template
  available_variables JSONB DEFAULT '[]',

  -- Version tracking
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  parent_version_id UUID REFERENCES prompt_templates(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, prompt_key, version)
);

-- Content Versions (for each pass execution)
CREATE TABLE content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES content_generation_jobs(id) ON DELETE CASCADE,

  pass_number INTEGER NOT NULL,
  version_number INTEGER NOT NULL DEFAULT 1,

  content TEXT NOT NULL,
  word_count INTEGER,

  -- Compliance audit results
  compliance_audit JSONB,
  compliance_score INTEGER,

  -- What settings were used
  settings_snapshot JSONB,
  prompt_used TEXT,

  -- User actions
  is_active BOOLEAN DEFAULT true,
  reverted_at TIMESTAMPTZ,
  reverted_by UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brief Compliance Checks
CREATE TABLE brief_compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id UUID REFERENCES content_briefs(id) ON DELETE CASCADE,

  -- Check results
  check_results JSONB NOT NULL,
  overall_score INTEGER,

  -- Missing fields and suggestions
  missing_fields JSONB DEFAULT '[]',
  auto_suggestions JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_content_versions_job ON content_versions(job_id, pass_number);
CREATE INDEX idx_prompt_templates_user ON prompt_templates(user_id, prompt_key);
CREATE INDEX idx_gen_settings_user ON content_generation_settings(user_id);
```

### 1.2 New TypeScript Types

```typescript
// types/contentGeneration.ts

export interface ContentGenerationPriorities {
  humanReadability: number;      // 0-100
  businessConversion: number;    // 0-100
  machineOptimization: number;   // 0-100
  factualDensity: number;        // 0-100
}

export type ContentTone = 'conversational' | 'professional' | 'academic' | 'sales';
export type AudienceExpertise = 'beginner' | 'intermediate' | 'expert';

export interface PassConfig {
  enabled: boolean;
  storeVersion: boolean;
  requireApproval?: boolean;
}

export interface ContentGenerationSettings {
  id: string;
  userId: string;
  mapId?: string;
  name: string;
  isDefault: boolean;

  priorities: ContentGenerationPriorities;
  tone: ContentTone;
  audienceExpertise: AudienceExpertise;

  checkpointAfterPass1: boolean;
  passes: {
    pass_2_headers: PassConfig;
    pass_3_lists: PassConfig;
    pass_4_visuals: PassConfig;
    pass_5_micro: PassConfig;
    pass_6_discourse: PassConfig;
    pass_7_intro: PassConfig;
    pass_8_audit: PassConfig;
  };
}

export interface PromptTemplate {
  id: string;
  promptKey: string;
  name: string;
  description: string;
  templateContent: string;
  availableVariables: PromptVariable[];
  version: number;
  isActive: boolean;
}

export interface PromptVariable {
  name: string;
  description: string;
  source: 'brief' | 'businessInfo' | 'settings' | 'section' | 'computed';
  example: string;
}

export interface ContentVersion {
  id: string;
  jobId: string;
  passNumber: number;
  versionNumber: number;
  content: string;
  wordCount: number;
  complianceAudit: ComplianceAuditResult;
  complianceScore: number;
  isActive: boolean;
  createdAt: string;
}

export interface ComplianceAuditResult {
  // Brief compliance
  subordinateTextCompliance: SectionCompliance[];
  methodologyCompliance: SectionCompliance[];
  featuredSnippetCompliance: boolean;
  internalLinkCompliance: LinkCompliance[];

  // Quality metrics
  eachSentenceHasEAV: boolean;
  noRepetitiveOpenings: boolean;
  languageCorrect: boolean;
  toneMatches: boolean;

  // Business metrics
  ctaPresent: boolean;
  valuePropositionClear: boolean;

  // Scores
  briefComplianceScore: number;
  qualityScore: number;
  businessScore: number;
  overallScore: number;

  // Improvements
  suggestions: string[];
}

export interface BriefComplianceCheck {
  // Required fields check
  hasStructuredOutline: boolean;
  hasSubordinateTextHints: boolean;
  hasMethodologyNotes: boolean;
  hasSerpAnalysis: boolean;
  hasFeaturedSnippetTarget: boolean;
  hasContextualBridge: boolean;
  hasDiscourseAnchors: boolean;

  // Business fields check
  hasBusinessGoal: boolean;
  hasCTA: boolean;
  hasTargetAudience: boolean;

  // Overall
  score: number;
  missingFields: MissingField[];
  suggestions: AutoSuggestion[];
}

export interface MissingField {
  field: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  canAutoGenerate: boolean;
}

export interface AutoSuggestion {
  field: string;
  suggestedValue: any;
  confidence: number;
  source: string; // e.g., 'inferred from title', 'SERP analysis'
}
```

---

## Phase 2: Brief Validation & Auto-Completion Service

### 2.1 Brief Compliance Checker

```typescript
// services/briefComplianceService.ts

export class BriefComplianceService {

  /**
   * Check brief completeness and return missing fields with suggestions
   */
  async checkBriefCompliance(
    brief: ContentBrief,
    businessInfo: BusinessInfo,
    topics: EnrichedTopic[]
  ): Promise<BriefComplianceCheck> {

    const missingFields: MissingField[] = [];
    const suggestions: AutoSuggestion[] = [];

    // Check structured outline
    if (!brief.structured_outline || brief.structured_outline.length === 0) {
      missingFields.push({
        field: 'structured_outline',
        importance: 'critical',
        description: 'Structured outline with subordinate text hints required for quality content',
        canAutoGenerate: true
      });

      // Auto-generate suggestion from outline
      if (brief.outline) {
        const parsedOutline = this.parseOutlineToStructured(brief.outline, brief);
        suggestions.push({
          field: 'structured_outline',
          suggestedValue: parsedOutline,
          confidence: 0.8,
          source: 'Parsed from markdown outline'
        });
      }
    } else {
      // Check if subordinate_text_hints are present
      const missingSubs = brief.structured_outline.filter(s => !s.subordinate_text_hint);
      if (missingSubs.length > 0) {
        missingFields.push({
          field: 'subordinate_text_hints',
          importance: 'high',
          description: `${missingSubs.length} sections missing subordinate text hints`,
          canAutoGenerate: true
        });

        // Generate hints for each missing section
        for (const section of missingSubs) {
          const hint = await this.generateSubordinateTextHint(section, brief, businessInfo);
          suggestions.push({
            field: `subordinate_text_hint:${section.heading}`,
            suggestedValue: hint,
            confidence: 0.7,
            source: 'AI-generated based on heading and context'
          });
        }
      }
    }

    // Check methodology notes
    const sectionsNeedingMethodology = this.identifySectionsNeedingMethodology(brief);
    if (sectionsNeedingMethodology.length > 0) {
      for (const section of sectionsNeedingMethodology) {
        const methodology = this.inferMethodology(section, brief);
        suggestions.push({
          field: `methodology_note:${section.heading}`,
          suggestedValue: methodology,
          confidence: 0.75,
          source: `Inferred from heading pattern: "${section.heading}"`
        });
      }
    }

    // Check featured snippet target
    if (!brief.featured_snippet_target) {
      missingFields.push({
        field: 'featured_snippet_target',
        importance: 'medium',
        description: 'No featured snippet target defined',
        canAutoGenerate: true
      });

      // Infer from title and SERP data
      const fsTarget = this.inferFeaturedSnippetTarget(brief);
      if (fsTarget) {
        suggestions.push({
          field: 'featured_snippet_target',
          suggestedValue: fsTarget,
          confidence: 0.6,
          source: 'Inferred from title pattern and SERP analysis'
        });
      }
    }

    // Check internal linking (contextual bridge)
    if (!brief.contextualBridge ||
        (Array.isArray(brief.contextualBridge) && brief.contextualBridge.length === 0)) {
      missingFields.push({
        field: 'contextualBridge',
        importance: 'high',
        description: 'No internal linking plan defined',
        canAutoGenerate: true
      });

      // Generate linking suggestions based on related topics
      const linkSuggestions = this.generateLinkingSuggestions(brief, topics);
      suggestions.push({
        field: 'contextualBridge',
        suggestedValue: linkSuggestions,
        confidence: 0.7,
        source: 'Generated from related topics in topical map'
      });
    }

    // Check business fields
    if (!businessInfo.conversionGoal) {
      missingFields.push({
        field: 'businessGoal',
        importance: 'high',
        description: 'No conversion/business goal defined',
        canAutoGenerate: false
      });
    }

    // Calculate score
    const score = this.calculateComplianceScore(missingFields);

    return {
      hasStructuredOutline: !!brief.structured_outline?.length,
      hasSubordinateTextHints: brief.structured_outline?.every(s => s.subordinate_text_hint) || false,
      hasMethodologyNotes: brief.structured_outline?.some(s => s.methodology_note) || false,
      hasSerpAnalysis: !!brief.serpAnalysis?.peopleAlsoAsk?.length,
      hasFeaturedSnippetTarget: !!brief.featured_snippet_target,
      hasContextualBridge: this.hasContextualBridge(brief),
      hasDiscourseAnchors: !!brief.discourse_anchors?.length,
      hasBusinessGoal: !!businessInfo.conversionGoal,
      hasCTA: !!brief.cta,
      hasTargetAudience: !!businessInfo.audience,
      score,
      missingFields,
      suggestions
    };
  }

  /**
   * Infer methodology (list/table/prose) from heading pattern
   */
  private inferMethodology(section: BriefSection, brief: ContentBrief): string {
    const heading = section.heading.toLowerCase();

    // Ordered list patterns
    if (/^(how to|steps to|guide to|\d+\s+(ways|steps|tips|methods))/i.test(heading)) {
      return 'ordered_list';
    }

    // Unordered list patterns
    if (/^(types of|benefits of|advantages|features|characteristics)/i.test(heading)) {
      return 'unordered_list';
    }

    // Table patterns
    if (/^(comparison|vs\.?|versus|differences between|pricing)/i.test(heading)) {
      return 'comparison_table';
    }

    // Definition patterns
    if (/^(what is|definition|meaning of|understanding)/i.test(heading)) {
      return 'definition_prose';
    }

    return 'prose';
  }

  /**
   * Generate subordinate text hint for a section
   */
  private async generateSubordinateTextHint(
    section: BriefSection,
    brief: ContentBrief,
    businessInfo: BusinessInfo
  ): Promise<string> {
    // Rule: First sentence must directly answer the heading's implied question
    const heading = section.heading;

    // Pattern matching for common heading types
    if (/^what (is|are)/i.test(heading)) {
      return `Define ${brief.targetKeyword} clearly using the "is-a" structure: "[Entity] is a [category] that [function]"`;
    }

    if (/^how to/i.test(heading)) {
      return `Start with the key action verb. State the primary method in one sentence.`;
    }

    if (/^why/i.test(heading)) {
      return `State the primary reason directly. Use "because" or causative language.`;
    }

    if (/^(benefits|advantages)/i.test(heading)) {
      return `State the number of benefits and the primary benefit first: "The X main benefits include [primary benefit], which..."`;
    }

    if (/^(types|kinds|categories)/i.test(heading)) {
      return `State the exact count: "There are X types of ${brief.targetKeyword}:" followed by the list.`;
    }

    // Default
    return `Directly answer the question implied by "${heading}" in the first sentence. Be definitive, not vague.`;
  }

  /**
   * Infer featured snippet target from brief data
   */
  private inferFeaturedSnippetTarget(brief: ContentBrief): FeaturedSnippetTarget | null {
    const title = brief.title.toLowerCase();

    // Definition snippet
    if (/^what (is|are)/i.test(title)) {
      return {
        type: 'paragraph',
        target: brief.title,
        format: 'Under 50 words definition starting with "[Entity] is..."',
        maxLength: 50
      };
    }

    // List snippet
    if (/^(how to|steps|guide|\d+\s+(ways|tips|methods))/i.test(title)) {
      return {
        type: 'ordered_list',
        target: brief.title,
        format: 'Numbered steps, each starting with action verb',
        maxItems: 8
      };
    }

    // Table snippet
    if (/^(comparison|vs|best|top \d+)/i.test(title)) {
      return {
        type: 'table',
        target: brief.title,
        format: 'Comparison table with clear column headers'
      };
    }

    return null;
  }
}
```

---

## Phase 3: Rewritten Prompts (Human-First)

### 3.1 New Prompt Architecture

```typescript
// config/contentPrompts/index.ts

export interface PromptContext {
  section: SectionDefinition;
  brief: ContentBrief;
  businessInfo: BusinessInfo;
  settings: ContentGenerationSettings;
  allSections: SectionDefinition[];
  previousSections?: GeneratedSection[]; // For context continuity
}

/**
 * Master prompt builder that constructs prompts based on user priorities
 */
export function buildSectionPrompt(ctx: PromptContext): string {
  const { section, brief, businessInfo, settings, allSections, previousSections } = ctx;
  const { priorities, tone, audienceExpertise } = settings;

  // Normalize priorities
  const total = Object.values(priorities).reduce((a, b) => a + b, 0);
  const norm = (v: number) => Math.round((v / total) * 100);

  return `
# CONTENT GENERATION TASK

You are an expert content writer creating a section for an article about "${brief.title}".

## YOUR WRITING PRIORITIES (Follow this balance)

${buildPriorityInstructions(priorities, norm)}

## SECTION DETAILS

**Section Heading:** ${section.heading}
**Heading Level:** H${section.level}
**Position in Article:** Section ${section.order + 1} of ${allSections.length}

## CRITICAL: FIRST SENTENCE RULE (Subordinate Text)

${section.subordinateTextHint ? `
YOUR FIRST SENTENCE MUST: ${section.subordinateTextHint}

This is the "Candidate Answer Passage" - the sentence search engines will extract for Featured Snippets.
Make it definitive, factual, and directly responsive to the heading.
` : `
Start with a direct, informative sentence that answers the question implied by the heading.
`}

## CONTENT FORMAT REQUIREMENT

${buildMethodologyInstructions(section, brief)}

## LANGUAGE & TONE

- **Language:** ${businessInfo.language || 'English'}
- **Target Market:** ${businessInfo.targetMarket || 'Global'}
- **Tone:** ${getToneInstructions(tone)}
- **Audience Level:** ${getAudienceInstructions(audienceExpertise)}

## ARTICLE CONTEXT

**Central Entity:** ${businessInfo.seedKeyword}
**Target Keyword:** ${brief.targetKeyword || businessInfo.seedKeyword}
**Meta Description:** ${brief.metaDescription}
**Key Takeaways:** ${brief.keyTakeaways?.join(', ') || 'N/A'}

## FULL ARTICLE STRUCTURE (for flow context)

${allSections.map((s, i) => `${i + 1}. ${s.heading}${s.key === section.key ? ' ← YOU ARE HERE' : ''}`).join('\n')}

${previousSections?.length ? `
## PREVIOUSLY WRITTEN SECTIONS (maintain continuity)

${previousSections.slice(-2).map(s => `### ${s.heading}\n${s.content.substring(0, 300)}...`).join('\n\n')}
` : ''}

## SERP INTELLIGENCE

${buildSerpInstructions(brief, section)}

## BUSINESS CONTEXT

${buildBusinessInstructions(businessInfo, brief)}

## INTERNAL LINKING REQUIREMENTS

${buildLinkingInstructions(brief, section)}

## QUALITY RULES

${buildQualityRules(priorities)}

## OUTPUT INSTRUCTIONS

Write ${getWordCountRange(section)} words of content for this section.

- Output ONLY the prose content
- Do NOT include the heading itself
- Do NOT add meta-commentary
- Write in ${businessInfo.language || 'English'}

BEGIN WRITING:
`;
}

function buildPriorityInstructions(
  priorities: ContentGenerationPriorities,
  norm: (v: number) => number
): string {
  const lines: string[] = [];

  if (norm(priorities.humanReadability) >= 30) {
    lines.push(`### Human Readability (${norm(priorities.humanReadability)}% priority)
- Write naturally, like explaining to a knowledgeable friend
- Use varied sentence structures and rhythms
- Create smooth transitions between ideas
- Make it engaging - the reader should WANT to continue reading
- Avoid robotic, template-like language`);
  }

  if (norm(priorities.businessConversion) >= 20) {
    lines.push(`### Business & Conversion (${norm(priorities.businessConversion)}% priority)
- Every section should move the reader toward action
- Clearly communicate VALUE - what does the reader gain?
- Address objections and build confidence
- Use language that motivates without being pushy`);
  }

  if (norm(priorities.machineOptimization) >= 20) {
    lines.push(`### Machine Optimization (${norm(priorities.machineOptimization)}% priority)
- Use the central entity as the grammatical SUBJECT where natural
- Structure sentences for clear Entity-Attribute-Value extraction
- Include contextual terms that link back to the main topic
- Place the most important information early in paragraphs`);
  }

  if (norm(priorities.factualDensity) >= 15) {
    lines.push(`### Information Density (${norm(priorities.factualDensity)}% priority)
- Every sentence should add a new fact or insight
- Avoid filler words: "basically", "actually", "very", "really"
- Use specific numbers, dates, and measurements where available
- No sentence should repeat information from another sentence`);
  }

  return lines.join('\n\n');
}

function buildMethodologyInstructions(section: SectionDefinition, brief: ContentBrief): string {
  const methodology = section.methodologyNote ||
    brief.query_type_format ||
    'prose';

  switch (methodology) {
    case 'ordered_list':
      return `**FORMAT: ORDERED LIST**
- Use a numbered list for this section
- Start with a complete sentence stating the count: "There are X steps to..."
- Each list item MUST start with an ACTION VERB (command form)
- Each item delivers ONE clear instruction
- Keep items concise but complete`;

    case 'unordered_list':
      return `**FORMAT: UNORDERED LIST**
- Use bullet points for this section
- Start with a complete sentence introducing the list: "The main types include:"
- Each item should be a distinct category/type/benefit
- Bold the key term at the start of each item
- Explain briefly after the bolded term`;

    case 'comparison_table':
      return `**FORMAT: COMPARISON TABLE**
- Create a markdown table for this section
- Columns = attributes (features, specs, prices)
- Rows = entities being compared
- Use clear, specific headers
- Fill every cell with factual data`;

    case 'definition_prose':
      return `**FORMAT: DEFINITION PROSE**
- First sentence MUST be a clear definition: "[Entity] is a [category] that [function]"
- Follow with elaboration on key attributes
- Use the "Is-A" structure (hypernymy)
- Be authoritative and precise`;

    default:
      return `**FORMAT: PROSE**
- Use flowing paragraphs
- Vary sentence length for rhythm
- Use transitions between ideas
- Break into multiple paragraphs if content is substantial`;
  }
}

function buildSerpInstructions(brief: ContentBrief, section: SectionDefinition): string {
  const lines: string[] = [];

  if (brief.serpAnalysis?.peopleAlsoAsk?.length) {
    lines.push(`**"People Also Ask" Questions (address if relevant to this section):**
${brief.serpAnalysis.peopleAlsoAsk.slice(0, 4).map(q => `- ${q}`).join('\n')}`);
  }

  if (brief.serpAnalysis?.competitorHeadings?.length) {
    const relevantHeadings = brief.serpAnalysis.competitorHeadings
      .flatMap(c => c.headings)
      .filter(h => h.text.toLowerCase().includes(section.heading.split(' ')[0].toLowerCase()))
      .slice(0, 3);

    if (relevantHeadings.length) {
      lines.push(`**Competitor Approaches (for inspiration, don't copy):**
${relevantHeadings.map(h => `- ${h.text}`).join('\n')}`);
    }
  }

  if (brief.featured_snippet_target && section.order === 0) {
    lines.push(`**Featured Snippet Target:**
Type: ${brief.featured_snippet_target.type}
Format: ${brief.featured_snippet_target.format}
Keep the direct answer under ${brief.featured_snippet_target.maxLength || 50} words.`);
  }

  return lines.length ? lines.join('\n\n') : 'No specific SERP data for this section.';
}

function buildBusinessInstructions(businessInfo: BusinessInfo, brief: ContentBrief): string {
  return `**Business Goal:** ${businessInfo.conversionGoal || 'Inform and establish authority'}
**Value Proposition:** ${businessInfo.valueProp || 'Expert knowledge in ' + businessInfo.industry}
**Target Audience:** ${businessInfo.audience || 'Professionals seeking expertise'}

The content should subtly support these goals without being salesy.`;
}

function buildLinkingInstructions(brief: ContentBrief, section: SectionDefinition): string {
  // Get links relevant to this section
  const links = Array.isArray(brief.contextualBridge)
    ? brief.contextualBridge
    : brief.contextualBridge?.links || [];

  if (!links.length) {
    return 'No specific internal links required for this section.';
  }

  // Find links that might be relevant to this section
  const sectionKeywords = section.heading.toLowerCase().split(' ');
  const relevantLinks = links.filter(link =>
    sectionKeywords.some(kw =>
      link.anchorText?.toLowerCase().includes(kw) ||
      link.targetTopic?.toLowerCase().includes(kw)
    )
  );

  if (relevantLinks.length === 0) return 'No specific internal links for this section.';

  return `**Internal Links to Include:**
${relevantLinks.map(link => `
- Link to: "${link.targetTopic}"
- Anchor text: "${link.anchorText}"
- Context hint: ${link.annotation_text_hint || 'Introduce the topic before linking'}
- Placement: AFTER you define/explain the concept, NOT at the start of a sentence
`).join('\n')}`;
}

function buildQualityRules(priorities: ContentGenerationPriorities): string {
  const rules: string[] = [
    '1. **No Repetitive Openings**: Each paragraph must start differently',
    '2. **Definitive Language**: Use "is/are" not "can be/might be" for facts',
    '3. **No Fluff**: Remove "also", "basically", "very", "actually", "really"'
  ];

  if (priorities.machineOptimization > 25) {
    rules.push('4. **Subject Positioning**: Central entity should be grammatical SUBJECT');
    rules.push('5. **First 400 Chars**: Put the most important answer in the first paragraph');
  }

  if (priorities.factualDensity > 20) {
    rules.push('6. **One Fact Per Sentence**: Each sentence adds unique information');
    rules.push('7. **Specific Numbers**: Use exact figures, dates, measurements');
  }

  if (priorities.businessConversion > 25) {
    rules.push('8. **Value Clarity**: Make the reader benefit obvious');
    rules.push('9. **Action Orientation**: Guide toward next steps');
  }

  return rules.join('\n');
}

function getToneInstructions(tone: ContentTone): string {
  switch (tone) {
    case 'conversational':
      return 'Friendly and approachable, like talking to a knowledgeable colleague. Use "you" and occasional questions.';
    case 'professional':
      return 'Authoritative but accessible. Clear and confident without being stiff.';
    case 'academic':
      return 'Formal and precise. Cite sources where relevant. Measured and objective.';
    case 'sales':
      return 'Persuasive and benefit-focused. Emphasize value and create urgency without being pushy.';
    default:
      return 'Professional and clear.';
  }
}

function getAudienceInstructions(level: AudienceExpertise): string {
  switch (level) {
    case 'beginner':
      return 'Explain concepts from scratch. Define technical terms. Use analogies.';
    case 'intermediate':
      return 'Assume basic familiarity. Can use industry terms with brief context.';
    case 'expert':
      return 'Assume deep knowledge. Focus on nuance and advanced concepts.';
    default:
      return 'Assume intermediate familiarity with the topic.';
  }
}

function getWordCountRange(section: SectionDefinition): string {
  // Adjust based on section level and type
  if (section.level === 2) return '200-350';
  if (section.level === 3) return '150-250';
  return '100-200';
}
```

---

## Phase 4: UI Components

### 4.1 Priority Settings Component

```tsx
// components/ContentGenerationSettings.tsx

interface Props {
  settings: ContentGenerationSettings;
  onChange: (settings: ContentGenerationSettings) => void;
  presets: Record<string, ContentGenerationPriorities>;
}

export const ContentGenerationSettingsPanel: React.FC<Props> = ({
  settings,
  onChange,
  presets
}) => {
  const [activePreset, setActivePreset] = useState<string | null>('balanced');

  const handlePriorityChange = (key: keyof ContentGenerationPriorities, value: number) => {
    setActivePreset(null); // Custom when manually changed
    onChange({
      ...settings,
      priorities: { ...settings.priorities, [key]: value }
    });
  };

  const handlePresetSelect = (presetKey: string) => {
    setActivePreset(presetKey);
    onChange({
      ...settings,
      priorities: presets[presetKey]
    });
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Content Generation Settings</h3>

      {/* Presets */}
      <div className="mb-6">
        <label className="text-sm text-gray-400 mb-2 block">Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(presets).map(key => (
            <Button
              key={key}
              variant={activePreset === key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handlePresetSelect(key)}
            >
              {formatPresetName(key)}
            </Button>
          ))}
        </div>
      </div>

      {/* Priority Sliders */}
      <div className="space-y-4 mb-6">
        <PrioritySlider
          label="Human Readability"
          description="Natural flow, engagement, readability"
          value={settings.priorities.humanReadability}
          onChange={(v) => handlePriorityChange('humanReadability', v)}
          color="blue"
        />
        <PrioritySlider
          label="Business & Conversion"
          description="CTAs, value props, action-oriented"
          value={settings.priorities.businessConversion}
          onChange={(v) => handlePriorityChange('businessConversion', v)}
          color="green"
        />
        <PrioritySlider
          label="Machine Optimization"
          description="SEO signals, entity positioning"
          value={settings.priorities.machineOptimization}
          onChange={(v) => handlePriorityChange('machineOptimization', v)}
          color="purple"
        />
        <PrioritySlider
          label="Factual Density"
          description="Information per sentence, EAV triples"
          value={settings.priorities.factualDensity}
          onChange={(v) => handlePriorityChange('factualDensity', v)}
          color="orange"
        />
      </div>

      {/* Tone & Audience */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Tone</label>
          <select
            value={settings.tone}
            onChange={(e) => onChange({ ...settings, tone: e.target.value as ContentTone })}
            className="w-full bg-gray-700 border-gray-600 rounded px-3 py-2"
          >
            <option value="conversational">Conversational</option>
            <option value="professional">Professional</option>
            <option value="academic">Academic</option>
            <option value="sales">Sales-focused</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Audience Level</label>
          <select
            value={settings.audienceExpertise}
            onChange={(e) => onChange({ ...settings, audienceExpertise: e.target.value as AudienceExpertise })}
            className="w-full bg-gray-700 border-gray-600 rounded px-3 py-2"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
        </div>
      </div>

      {/* Pass Configuration */}
      <div className="border-t border-gray-700 pt-4">
        <h4 className="text-sm font-semibold mb-3">Refinement Passes</h4>
        <div className="space-y-2">
          {Object.entries(settings.passes).map(([passKey, config]) => (
            <PassToggle
              key={passKey}
              passKey={passKey}
              config={config}
              onChange={(newConfig) => onChange({
                ...settings,
                passes: { ...settings.passes, [passKey]: newConfig }
              })}
            />
          ))}
        </div>
      </div>

      {/* Checkpoint Setting */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="checkbox"
          id="checkpoint"
          checked={settings.checkpointAfterPass1}
          onChange={(e) => onChange({ ...settings, checkpointAfterPass1: e.target.checked })}
        />
        <label htmlFor="checkpoint" className="text-sm text-gray-300">
          Pause for approval after initial draft
        </label>
      </div>
    </Card>
  );
};

const PrioritySlider: React.FC<{
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  color: string;
}> = ({ label, description, value, onChange, color }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm text-gray-200">{label}</span>
      <span className="text-sm text-gray-400">{value}%</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className={`w-full accent-${color}-500`}
    />
    <p className="text-xs text-gray-500">{description}</p>
  </div>
);
```

### 4.2 Pass Control Panel Component

```tsx
// components/PassControlPanel.tsx

interface Props {
  job: ContentGenerationJob;
  versions: Record<number, ContentVersion[]>;
  onRunPass: (passNumber: number) => Promise<void>;
  onRevertToVersion: (passNumber: number, versionId: string) => Promise<void>;
  onViewDiff: (versionA: string, versionB: string) => void;
  onSkipPass: (passNumber: number) => void;
}

export const PassControlPanel: React.FC<Props> = ({
  job,
  versions,
  onRunPass,
  onRevertToVersion,
  onViewDiff,
  onSkipPass
}) => {
  const passes = [
    { num: 1, name: 'Initial Draft', key: 'pass_1_draft' },
    { num: 2, name: 'Header Optimization', key: 'pass_2_headers' },
    { num: 3, name: 'Lists & Tables', key: 'pass_3_lists' },
    { num: 4, name: 'Visual Semantics', key: 'pass_4_visuals' },
    { num: 5, name: 'Micro Semantics', key: 'pass_5_microsemantics' },
    { num: 6, name: 'Discourse Integration', key: 'pass_6_discourse' },
    { num: 7, name: 'Introduction Synthesis', key: 'pass_7_intro' },
    { num: 8, name: 'Final Audit', key: 'pass_8_audit' },
  ];

  const getPassStatus = (passNum: number) => {
    const status = job.passes_status[passes[passNum - 1].key];
    if (status === 'completed') return 'completed';
    if (status === 'in_progress') return 'running';
    if (status === 'skipped') return 'skipped';
    if (job.current_pass === passNum) return 'current';
    if (job.current_pass > passNum) return 'completed';
    return 'pending';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4">Pass Control</h3>

      <div className="space-y-3">
        {passes.map(pass => {
          const status = getPassStatus(pass.num);
          const passVersions = versions[pass.num] || [];
          const activeVersion = passVersions.find(v => v.isActive);

          return (
            <div
              key={pass.num}
              className={`p-3 rounded-lg border ${
                status === 'completed' ? 'border-green-700 bg-green-900/20' :
                status === 'running' ? 'border-blue-700 bg-blue-900/20' :
                status === 'skipped' ? 'border-gray-700 bg-gray-800/50' :
                'border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={status} />
                  <div>
                    <span className="font-medium">Pass {pass.num}: {pass.name}</span>
                    {activeVersion && (
                      <div className="text-xs text-gray-400">
                        v{activeVersion.versionNumber} | {activeVersion.wordCount} words |
                        Score: {activeVersion.complianceScore}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Version selector */}
                  {passVersions.length > 1 && (
                    <select
                      value={activeVersion?.id}
                      onChange={(e) => onRevertToVersion(pass.num, e.target.value)}
                      className="bg-gray-700 border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      {passVersions.map(v => (
                        <option key={v.id} value={v.id}>
                          v{v.versionNumber} ({v.complianceScore}%)
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Actions */}
                  {status === 'completed' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => onViewDiff(
                        passVersions[0]?.id,
                        passVersions[passVersions.length - 1]?.id
                      )}>
                        View
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onRunPass(pass.num)}>
                        Re-run
                      </Button>
                    </>
                  )}

                  {status === 'pending' && pass.num > 1 && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => onSkipPass(pass.num)}>
                        Skip
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => onRunPass(pass.num)}>
                        Run
                      </Button>
                    </>
                  )}

                  {status === 'skipped' && (
                    <Button size="sm" variant="secondary" onClick={() => onRunPass(pass.num)}>
                      Run Now
                    </Button>
                  )}

                  {status === 'running' && (
                    <Loader className="w-5 h-5" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Batch Actions */}
      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          onClick={() => {/* Run all pending */}}
          disabled={job.status === 'completed'}
        >
          Run All Remaining
        </Button>
        <Button variant="secondary">
          Export Current Draft
        </Button>
      </div>
    </div>
  );
};
```

### 4.3 Prompt Editor Component

```tsx
// components/PromptEditor.tsx

interface Props {
  promptKey: string;
  defaultTemplate: string;
  customTemplate?: PromptTemplate;
  availableVariables: PromptVariable[];
  onSave: (template: string) => Promise<void>;
  onReset: () => void;
}

export const PromptEditor: React.FC<Props> = ({
  promptKey,
  defaultTemplate,
  customTemplate,
  availableVariables,
  onSave,
  onReset
}) => {
  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [template, setTemplate] = useState(customTemplate?.templateContent || defaultTemplate);
  const [simpleOverrides, setSimpleOverrides] = useState<Record<string, string>>({});

  // Simple mode: Key instruction overrides
  const simpleOptions = [
    { key: 'tone_instruction', label: 'Tone Guidance', default: getToneSection(defaultTemplate) },
    { key: 'quality_rules', label: 'Quality Rules', default: getQualityRulesSection(defaultTemplate) },
    { key: 'format_instruction', label: 'Format Instructions', default: getFormatSection(defaultTemplate) },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Prompt: {formatPromptKey(promptKey)}</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'simple' ? 'primary' : 'ghost'}
            onClick={() => setMode('simple')}
          >
            Simple
          </Button>
          <Button
            size="sm"
            variant={mode === 'advanced' ? 'primary' : 'ghost'}
            onClick={() => setMode('advanced')}
          >
            Advanced
          </Button>
        </div>
      </div>

      {mode === 'simple' ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Customize key sections of the prompt without editing the full template.
          </p>

          {simpleOptions.map(option => (
            <div key={option.key}>
              <label className="text-sm font-medium text-gray-300 mb-1 block">
                {option.label}
              </label>
              <textarea
                value={simpleOverrides[option.key] || option.default}
                onChange={(e) => setSimpleOverrides({
                  ...simpleOverrides,
                  [option.key]: e.target.value
                })}
                className="w-full h-24 bg-gray-700 border-gray-600 rounded p-2 text-sm font-mono"
                placeholder={option.default}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-400 mb-2">
            Full template editor. Use {'{{variable}}'} syntax for dynamic values.
          </p>

          {/* Variable reference */}
          <details className="mb-4">
            <summary className="text-sm text-blue-400 cursor-pointer">
              Available Variables ({availableVariables.length})
            </summary>
            <div className="mt-2 bg-gray-900 p-3 rounded max-h-40 overflow-y-auto">
              {availableVariables.map(v => (
                <div key={v.name} className="text-xs mb-2">
                  <code className="text-green-400">{`{{${v.name}}}`}</code>
                  <span className="text-gray-400 ml-2">{v.description}</span>
                </div>
              ))}
            </div>
          </details>

          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full h-96 bg-gray-900 border-gray-600 rounded p-3 font-mono text-sm"
            spellCheck={false}
          />
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex justify-between">
        <Button variant="ghost" onClick={onReset}>
          Reset to Default
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary">
            Preview with Sample Data
          </Button>
          <Button variant="primary" onClick={() => onSave(template)}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## Phase 5: Implementation Order

### Week 1: Foundation
1. Create database migrations (Phase 1.1)
2. Add TypeScript types (Phase 1.2)
3. Implement BriefComplianceService (Phase 2.1)

### Week 2: Core Prompts
4. Rewrite GENERATE_SECTION_DRAFT_PROMPT (Phase 3)
5. Create prompt builder functions
6. Test new prompts with sample briefs

### Week 3: UI Components
7. Build ContentGenerationSettingsPanel
8. Build PassControlPanel
9. Build PromptEditor (simple mode first)

### Week 4: Integration
10. Integrate settings into useContentGeneration hook
11. Add version tracking to orchestrator
12. Add compliance auditing after each pass

### Week 5: Polish
13. Add PromptEditor advanced mode
14. Add diff viewer for version comparison
15. Full end-to-end testing

---

## Success Metrics

1. **Content Readability**: Flesch Reading Ease score > 60
2. **Brief Compliance**: All subordinate text hints followed
3. **Business Goals**: CTAs present where appropriate
4. **SEO Compliance**: Audit score > 85%
5. **User Satisfaction**: Content requires minimal manual editing

---

## Files to Create/Modify

### New Files
- `supabase/migrations/YYYYMMDD_content_gen_v2.sql`
- `types/contentGeneration.ts`
- `services/briefComplianceService.ts`
- `config/contentPrompts/index.ts`
- `config/contentPrompts/sectionPrompt.ts`
- `config/contentPrompts/passPrompts.ts`
- `components/ContentGenerationSettingsPanel.tsx`
- `components/PassControlPanel.tsx`
- `components/PromptEditor.tsx`
- `components/BriefComplianceChecker.tsx`

### Modified Files
- `services/ai/contentGeneration/orchestrator.ts` - Add version tracking
- `services/ai/contentGeneration/passes/pass1DraftGeneration.ts` - Use new prompts
- `hooks/useContentGeneration.ts` - Add settings support
- `components/ContentBriefModal.tsx` - Add settings UI
- `types.ts` - Export new types
