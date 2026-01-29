// services/brand-replication/config/defaultPrompts.ts

export const DISCOVERY_PROMPT = `You are a senior UI/UX designer analyzing a website to extract its visual component library.

Analyze the provided screenshots and identify DISTINCT visual component patterns used on this website.

For each component pattern you discover:
1. Give it a descriptive name (e.g., "Service Card", "Emergency CTA", "Testimonial Block")
2. Describe its visual characteristics in detail (colors, spacing, typography, icons, borders, shadows)
3. Explain its PURPOSE - what information does it communicate?
4. Describe its USAGE CONTEXT - where on the site is it used and for what type of content?
5. Note how many times you see it across the pages (occurrences)
6. Rate your confidence that this is a distinct, reusable component (0.0-1.0)

Focus on components that:
- Appear multiple times across different pages
- Have consistent styling
- Serve a clear communication purpose
- Could be reused for similar content

Do NOT include:
- One-off decorative elements
- Basic HTML elements without custom styling
- Navigation or footer elements (unless they contain notable components)

Return your analysis as JSON:
{
  "components": [
    {
      "name": "Component Name",
      "purpose": "What this component communicates",
      "visualDescription": "Detailed visual characteristics",
      "usageContext": "Where and when this is used",
      "occurrences": 3,
      "confidence": 0.9
    }
  ],
  "brandObservations": "Overall notes about the brand's visual language"
}`;

export const CSS_GENERATION_PROMPT = `You are a senior frontend developer generating production-quality CSS for a brand component.

Component to generate CSS for:
- Name: {{componentName}}
- Purpose: {{purpose}}
- Visual Description: {{visualDescription}}

Brand Design Tokens:
{{designTokens}}

Generate CSS that:
1. Uses CSS custom properties (--brand-*) for all colors, fonts, and key values
2. Follows the spacing scale: {{spacingScale}}
3. Includes :hover and :focus states for interactive elements
4. Uses transitions (0.2-0.3s ease) for smooth interactions
5. Is responsive (include @media queries for mobile/tablet)
6. Has accessible contrast ratios
7. Uses semantic class names

Return ONLY the CSS code, no explanation. The CSS should be complete and production-ready.`;

export const HTML_GENERATION_PROMPT = `You are a senior frontend developer generating semantic HTML for a brand component.

Component:
- Name: {{componentName}}
- Purpose: {{purpose}}
- Visual Description: {{visualDescription}}

The HTML should:
1. Use semantic elements (article, section, header, etc.)
2. Include ARIA attributes for accessibility
3. Use placeholder markers for dynamic content: {{title}}, {{content}}, {{items}}, {{ctaText}}, {{ctaUrl}}
4. Have class names that match the CSS generated for this component
5. Be clean and properly indented

Return ONLY the HTML template, no explanation.`;

export const SECTION_ANALYSIS_PROMPT = `You are a content strategist analyzing an article section to determine its semantic role and ideal presentation.

CONTEXT:
Business: {{centralEntity}} - {{sourceContext}}
Target Audience: {{targetAudience}}
Article Topic: {{articleTitle}}
Article Main Message: {{mainMessage}}

SECTION TO ANALYZE:
Position: {{position}} (section {{positionIndex}} of {{totalSections}})
Heading: {{sectionHeading}}
Content:
{{sectionContent}}

Previous sections covered: {{precedingSections}}
Upcoming sections will cover: {{followingSections}}

Analyze this section and determine:
1. SEMANTIC ROLE: What is this section's purpose? (introduction, key-benefits, process-steps, warning, comparison, case-study, call-to-action, supporting-detail, conclusion, etc.)
2. CONTENT STRUCTURE: Does this contain a list, process, comparison, single concept, or mixed content?
3. EMPHASIS LEVEL: How important is this section to the article's main message? (hero, featured, standard, supporting, minimal)
4. READER NEED: What does the reader need from this section? (quick scan, detailed read, action prompt, etc.)

Return JSON:
{
  "semanticRole": "the role",
  "contentStructure": "list|process|comparison|single-concept|mixed",
  "emphasisLevel": "hero|featured|standard|supporting|minimal",
  "readerNeed": "description of reader need",
  "reasoning": "why you made these determinations"
}`;

export const COMPONENT_MATCHING_PROMPT = `You are a design system expert matching content to the ideal component.

SECTION ANALYSIS:
- Semantic Role: {{semanticRole}}
- Content Structure: {{contentStructure}}
- Emphasis Level: {{emphasisLevel}}
- Reader Need: {{readerNeed}}

AVAILABLE COMPONENTS:
{{componentList}}

SECTION CONTENT:
{{sectionContent}}

Select the best component and configure its layout:

1. COMPONENT: Which component from the library best presents this content?
2. VARIANT: If the component has variants, which one?
3. LAYOUT:
   - columns: How many columns? (1, 2, 3, or 4)
   - width: How wide? (narrow, medium, wide, full)
   - emphasis: Visual weight (hero, featured, standard, supporting, minimal)
4. CONTENT MAPPING: How does the section content map to the component's placeholders?

Return JSON:
{
  "componentId": "id from library",
  "componentName": "name",
  "variant": "default|featured|compact|etc",
  "layout": {
    "columns": 2,
    "width": "medium",
    "emphasis": "standard"
  },
  "contentMapping": {
    "title": "extracted or derived title",
    "items": ["item1", "item2"],
    "ctaText": "Call to action text"
  },
  "reasoning": "Why this component and layout work best"
}`;

export const VALIDATION_PROMPT = `You are a design quality assessor evaluating generated article output.

Evaluate the rendered HTML against these criteria:

BRAND MATCH (target: {{brandMatchThreshold}}%):
- Colors match the brand palette
- Typography matches brand fonts
- Component styles match the source website

DESIGN QUALITY (target: {{designQualityThreshold}}%):
- Clear visual hierarchy
- Consistent spacing rhythm
- Appropriate emphasis distribution
- Good balance of visual components vs prose

USER EXPERIENCE (target: {{uxThreshold}}%):
- Content is scannable (headings, bullets, cards break up text)
- Clear reading flow from intro to conclusion
- Actionable next steps are clear

For each dimension, provide:
- Score (0-100)
- Specific observations
- Improvement suggestions

Return JSON:
{
  "brandMatch": { "score": 85, "observations": [...], "suggestions": [...] },
  "designQuality": { "score": 90, "observations": [...], "suggestions": [...] },
  "userExperience": { "score": 88, "observations": [...], "suggestions": [...] },
  "wowFactorResults": {
    "hero-section": { "passed": true, "details": "..." },
    "multi-column": { "passed": true, "details": "..." }
  }
}`;
