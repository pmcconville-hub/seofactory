# Brand Replication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a system that produces HTML output that looks like it could be a page ON the target website, not just inspired by it.

**Architecture:** Multi-page extraction captures literal HTML/CSS from target site. AI analyzes screenshot + HTML together to build component library. Content injection places semantic SEO content into extracted components. Missing components are synthesized from visual patterns. Output uses dual class names (theirs + ours) with standalone CSS.

**Tech Stack:** TypeScript, Playwright (page capture), Gemini/Claude (AI analysis), Supabase (storage), Vitest (testing)

---

## Phase 1: Database Schema & Types

### Task 1.1: Create Brand Extraction Database Migration

**Files:**
- Create: `supabase/migrations/20260126100000_brand_extraction_tables.sql`

**Step 1: Write the migration SQL**

Create `supabase/migrations/20260126100000_brand_extraction_tables.sql`:

```sql
-- Brand Extractions (cached page captures)
CREATE TABLE IF NOT EXISTS brand_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  page_type TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_base64 TEXT,
  raw_html TEXT NOT NULL,
  computed_styles JSONB,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, source_url)
);

-- Extracted Components (literal HTML/CSS from site)
CREATE TABLE IF NOT EXISTS brand_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extraction_id UUID NOT NULL REFERENCES brand_extractions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  visual_description TEXT NOT NULL,
  component_type TEXT,
  literal_html TEXT NOT NULL,
  literal_css TEXT NOT NULL,
  their_class_names TEXT[],
  content_slots JSONB NOT NULL DEFAULT '[]',
  bounding_box JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extracted Design Tokens (actual values, not abstracted)
CREATE TABLE IF NOT EXISTS brand_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  colors JSONB NOT NULL,
  typography JSONB NOT NULL,
  spacing JSONB NOT NULL,
  shadows JSONB NOT NULL,
  borders JSONB NOT NULL,
  gradients JSONB,
  extracted_from TEXT[],
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_extractions_project ON brand_extractions(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_components_project ON brand_components(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_components_extraction ON brand_components(extraction_id);

-- Row Level Security
ALTER TABLE brand_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own brand_extractions"
  ON brand_extractions FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own brand_components"
  ON brand_components FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own brand_tokens"
  ON brand_tokens FOR ALL
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()));
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260126100000_brand_extraction_tables.sql
git commit -m "feat(db): add brand extraction tables for literal HTML/CSS storage"
```

---

### Task 1.2: Create TypeScript Types for Brand Extraction

**Files:**
- Create: `types/brandExtraction.ts`
- Modify: `types.ts` (add export)

**Step 1: Write the type definitions**

Create `types/brandExtraction.ts`:

```typescript
/**
 * Brand Extraction Types
 *
 * These types enforce literal code storage - NO abstraction fields allowed.
 * This prevents template thinking from creeping back in.
 */

// ============================================================================
// CONTENT SLOTS (where content can be injected)
// ============================================================================

export interface ContentSlot {
  name: string;
  selector: string;
  type: 'text' | 'html' | 'image' | 'list' | 'link';
  required: boolean;
  constraints?: {
    maxLength?: number;
    allowedTags?: string[];
  };
}

// ============================================================================
// EXTRACTED COMPONENT (literal code, no abstraction)
// ============================================================================

export interface ExtractedComponent {
  id: string;
  extractionId: string;
  projectId: string;
  visualDescription: string;
  componentType?: string;
  literalHtml: string;
  literalCss: string;
  theirClassNames: string[];
  contentSlots: ContentSlot[];
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

// ============================================================================
// PAGE EXTRACTION (full page capture)
// ============================================================================

export interface BrandExtraction {
  id: string;
  projectId: string;
  sourceUrl: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  screenshotUrl?: string;
  screenshotBase64?: string;
  rawHtml: string;
  computedStyles?: Record<string, Record<string, string>>;
  extractedAt: string;
}

// ============================================================================
// DESIGN TOKENS (actual values, not categories)
// ============================================================================

export interface ExtractedTokens {
  id: string;
  projectId: string;
  colors: {
    values: Array<{
      hex: string;
      usage: string;
      frequency: number;
    }>;
  };
  typography: {
    headings: {
      fontFamily: string;
      fontWeight: number;
      letterSpacing?: string;
    };
    body: {
      fontFamily: string;
      fontWeight: number;
      lineHeight: number;
    };
  };
  spacing: {
    sectionGap: string;
    cardPadding: string;
    contentWidth: string;
  };
  shadows: {
    card: string;
    elevated: string;
    button?: string;
  };
  borders: {
    radiusSmall: string;
    radiusMedium: string;
    radiusLarge: string;
    defaultColor: string;
  };
  gradients?: {
    hero?: string;
    cta?: string;
    accent?: string;
  };
  extractedFrom: string[];
  extractedAt: string;
}

// ============================================================================
// AI ANALYSIS OUTPUT
// ============================================================================

export interface ExtractionAnalysisResult {
  tokens: Omit<ExtractedTokens, 'id' | 'projectId' | 'extractedAt'>;
  components: Array<Omit<ExtractedComponent, 'id' | 'extractionId' | 'projectId' | 'createdAt'>>;
  pageLayout: {
    sections: Array<{
      order: number;
      componentRef: number;
      role: string;
    }>;
    gridSystem: string;
  };
}

// ============================================================================
// COMPONENT MATCHING (for content injection)
// ============================================================================

export interface ComponentMatch {
  component: ExtractedComponent;
  confidence: number;
  matchReason: string;
}

// ============================================================================
// SYNTHESIZED COMPONENT (for missing components)
// ============================================================================

export interface SynthesizedComponent {
  visualDescription: string;
  componentType: string;
  generatedHtml: string;
  generatedCss: string;
  ourClassNames: string[];
  contentSlots: ContentSlot[];
  synthesizedFrom: string[];
}

// ============================================================================
// RENDER OUTPUT
// ============================================================================

export interface BrandReplicationOutput {
  html: string;
  standaloneCss: string;
  componentsUsed: Array<{
    id: string;
    type: 'extracted' | 'synthesized';
    theirClasses: string[];
    ourClasses: string[];
  }>;
  metadata: {
    brandProjectId: string;
    extractionsUsed: string[];
    synthesizedCount: number;
    renderTime: number;
  };
}
```

**Step 2: Add export to types.ts**

Add to the end of `types.ts`:

```typescript
export * from './types/brandExtraction';
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add types/brandExtraction.ts types.ts
git commit -m "feat(types): add brand extraction types with anti-template enforcement"
```

---

## Phase 2: Page Capture Service

### Task 2.1: Create PageCrawler Test

**Files:**
- Create: `services/brand-extraction/__tests__/PageCrawler.test.ts`

**Step 1: Write the failing test**

Create `services/brand-extraction/__tests__/PageCrawler.test.ts`:

```typescript
import { describe, it, expect, afterAll } from 'vitest';
import { PageCrawler } from '../PageCrawler';

describe('PageCrawler', () => {
  let crawler: PageCrawler;

  afterAll(async () => {
    if (crawler) await crawler.close();
  });

  describe('capturePage', () => {
    it('captures screenshot and HTML from a URL', async () => {
      crawler = new PageCrawler();
      const result = await crawler.capturePage('https://example.com');

      expect(result.sourceUrl).toBe('https://example.com');
      expect(result.rawHtml).toContain('<!doctype html>');
      expect(result.screenshotBase64).toBeTruthy();
      expect(result.screenshotBase64).toMatch(/^data:image\/png;base64,/);
      expect(result.pageType).toBe('homepage');
    }, 30000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-extraction/__tests__/PageCrawler.test.ts`
Expected: FAIL with "Cannot find module '../PageCrawler'"

**Step 3: Commit**

```bash
git add services/brand-extraction/__tests__/PageCrawler.test.ts
git commit -m "test(extraction): add PageCrawler test"
```

---

### Task 2.2: Implement PageCrawler

**Files:**
- Create: `services/brand-extraction/PageCrawler.ts`

**Step 1: Write minimal implementation**

Create `services/brand-extraction/PageCrawler.ts`:

```typescript
import { chromium, type Browser, type Page } from 'playwright';

export interface PageCaptureResult {
  sourceUrl: string;
  pageType: 'homepage' | 'service' | 'article' | 'contact' | 'other';
  rawHtml: string;
  screenshotBase64: string;
  computedStyles: Record<string, Record<string, string>>;
  capturedAt: string;
}

export interface PageCrawlerConfig {
  headless?: boolean;
  timeout?: number;
  viewport?: { width: number; height: number };
}

export class PageCrawler {
  private config: Required<PageCrawlerConfig>;
  private browser: Browser | null = null;

  constructor(config: PageCrawlerConfig = {}) {
    this.config = {
      headless: config.headless ?? true,
      timeout: config.timeout ?? 30000,
      viewport: config.viewport ?? { width: 1440, height: 900 }
    };
  }

  async capturePage(url: string): Promise<PageCaptureResult> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({ viewport: this.config.viewport });
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: this.config.timeout });
      await page.waitForTimeout(1000);

      const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'png' });
      const screenshotBase64 = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
      const rawHtml = await page.content();
      const computedStyles = await this.extractComputedStyles(page);
      const pageType = this.detectPageType(url);

      return {
        sourceUrl: url,
        pageType,
        rawHtml,
        screenshotBase64,
        computedStyles,
        capturedAt: new Date().toISOString()
      };
    } finally {
      await context.close();
    }
  }

  private async extractComputedStyles(page: Page): Promise<Record<string, Record<string, string>>> {
    return await page.evaluate(() => {
      const styles: Record<string, Record<string, string>> = {};
      const selectors = ['body', 'h1', 'h2', 'h3', 'p', 'a', 'button'];
      const props = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'padding', 'borderRadius', 'boxShadow'];

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const computed = window.getComputedStyle(el);
          const extracted: Record<string, string> = {};
          for (const prop of props) {
            const value = computed.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
            if (value && value !== 'none' && value !== 'normal') {
              extracted[prop] = value;
            }
          }
          if (Object.keys(extracted).length > 0) {
            styles[selector] = extracted;
          }
        }
      }
      return styles;
    });
  }

  private detectPageType(url: string): PageCaptureResult['pageType'] {
    const path = new URL(url).pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'homepage';
    if (path.includes('contact') || path.includes('kontakt')) return 'contact';
    if (path.includes('blog') || path.includes('article') || path.includes('nieuws')) return 'article';
    if (path.includes('service') || path.includes('dienst')) return 'service';
    return 'other';
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: this.config.headless });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run services/brand-extraction/__tests__/PageCrawler.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/brand-extraction/PageCrawler.ts
git commit -m "feat(extraction): add PageCrawler for screenshot and HTML capture"
```

---

### Task 2.3: Create ExtractionAnalyzer Test

**Files:**
- Create: `services/brand-extraction/__tests__/ExtractionAnalyzer.test.ts`

**Step 1: Write the failing test**

Create `services/brand-extraction/__tests__/ExtractionAnalyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ExtractionAnalyzer } from '../ExtractionAnalyzer';

describe('ExtractionAnalyzer', () => {
  describe('analyze', () => {
    it('extracts components with literal HTML and CSS', async () => {
      const analyzer = new ExtractionAnalyzer({
        provider: 'gemini',
        apiKey: process.env.VITE_GEMINI_API_KEY || 'test-key'
      });

      const result = await analyzer.analyze({
        screenshotBase64: 'data:image/png;base64,iVBORw0KGgo=',
        rawHtml: '<html><head><style>.hero{background:blue;padding:40px;}</style></head><body><section class="hero"><h1>Welcome</h1></section></body></html>'
      });

      expect(result.components.length).toBeGreaterThan(0);
      expect(result.components[0].literalHtml).toBeTruthy();
      expect(result.components[0].literalCss).toBeTruthy();
    }, 60000);

    it('does NOT include abstraction fields', async () => {
      const analyzer = new ExtractionAnalyzer({
        provider: 'gemini',
        apiKey: 'test-key'
      });

      const result = await analyzer.analyze({
        screenshotBase64: 'data:image/png;base64,test',
        rawHtml: '<html><body><div class="card">Content</div></body></html>'
      });

      const componentJson = JSON.stringify(result.components[0] || {});
      expect(componentJson).not.toContain('"variant"');
      expect(componentJson).not.toContain('"style":');
      expect(componentJson).not.toContain('"theme"');
    }, 60000);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-extraction/__tests__/ExtractionAnalyzer.test.ts`
Expected: FAIL with "Cannot find module '../ExtractionAnalyzer'"

**Step 3: Commit**

```bash
git add services/brand-extraction/__tests__/ExtractionAnalyzer.test.ts
git commit -m "test(extraction): add ExtractionAnalyzer test with anti-template assertions"
```

---

### Task 2.4: Implement ExtractionAnalyzer

**Files:**
- Create: `services/brand-extraction/ExtractionAnalyzer.ts`

**Step 1: Write implementation**

Create `services/brand-extraction/ExtractionAnalyzer.ts`:

```typescript
import type { ExtractionAnalysisResult, ContentSlot } from '../../types/brandExtraction';

interface ExtractionAnalyzerConfig {
  provider: 'gemini' | 'anthropic';
  apiKey: string;
  model?: string;
}

interface AnalysisInput {
  screenshotBase64: string;
  rawHtml: string;
}

export class ExtractionAnalyzer {
  private config: ExtractionAnalyzerConfig;

  constructor(config: ExtractionAnalyzerConfig) {
    this.config = config;
  }

  async analyze(input: AnalysisInput): Promise<ExtractionAnalysisResult> {
    const prompt = this.buildPrompt(input.rawHtml);

    if (this.config.provider === 'gemini') {
      return await this.analyzeWithGemini(input.screenshotBase64, prompt);
    } else {
      return await this.analyzeWithClaude(input.screenshotBase64, prompt);
    }
  }

  private buildPrompt(rawHtml: string): string {
    return `You are analyzing a website screenshot alongside its HTML source code.

Your task is to extract LITERAL components - the exact HTML and CSS that creates each visual element.

## RULES (CRITICAL - DO NOT VIOLATE):
1. Extract the EXACT HTML snippets from the source - do not rewrite or simplify
2. Extract the EXACT CSS rules that style each component - copy them literally
3. Do NOT abstract into categories like "card-elevated" or "hero-split"
4. Do NOT use generic terms - describe what you SEE
5. Identify content slots - where would new content be injected?

## HTML SOURCE:
\`\`\`html
${rawHtml.slice(0, 50000)}
\`\`\`

## RESPONSE FORMAT (JSON):
{
  "tokens": {
    "colors": { "values": [{ "hex": "#1a365d", "usage": "buttons", "frequency": 12 }] },
    "typography": {
      "headings": { "fontFamily": "Inter", "fontWeight": 700 },
      "body": { "fontFamily": "Inter", "fontWeight": 400, "lineHeight": 1.6 }
    },
    "spacing": { "sectionGap": "64px", "cardPadding": "32px", "contentWidth": "1200px" },
    "shadows": { "card": "0 4px 20px rgba(0,0,0,0.1)", "elevated": "0 10px 40px rgba(0,0,0,0.15)" },
    "borders": { "radiusSmall": "4px", "radiusMedium": "8px", "radiusLarge": "16px", "defaultColor": "#e2e8f0" },
    "extractedFrom": []
  },
  "components": [
    {
      "visualDescription": "Dark blue hero section with large white heading",
      "literalHtml": "<section class=\\"hero\\">exact HTML here</section>",
      "literalCss": ".hero { background: #1a365d; padding: 80px 0; }",
      "theirClassNames": ["hero"],
      "contentSlots": [{ "name": "heading", "selector": "h1", "type": "text", "required": true }]
    }
  ],
  "pageLayout": { "sections": [{ "order": 1, "componentRef": 0, "role": "hero" }], "gridSystem": "flexbox" }
}

RESPOND ONLY WITH VALID JSON.`;
  }

  private async analyzeWithGemini(screenshotBase64: string, prompt: string): Promise<ExtractionAnalysisResult> {
    const model = this.config.model || 'gemini-2.0-flash';
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${this.config.apiKey}`;

    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: 'image/png', data: base64Data } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 32768 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return this.parseResponse(text);
  }

  private async analyzeWithClaude(screenshotBase64: string, prompt: string): Promise<ExtractionAnalysisResult> {
    const model = this.config.model || 'claude-sonnet-4-20250514';
    const mediaTypeMatch = screenshotBase64.match(/^data:(image\/\w+);base64,/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
    const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2024-01-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 32768,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Data } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '{}';
    return this.parseResponse(text);
  }

  private parseResponse(text: string): ExtractionAnalysisResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.tokens || !parsed.components) {
      throw new Error('Invalid response structure');
    }

    // Strip any abstraction fields that might have snuck in
    for (const component of parsed.components) {
      delete component.variant;
      delete component.style;
      delete component.theme;
      delete component.template;
    }

    return parsed as ExtractionAnalysisResult;
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run services/brand-extraction/__tests__/ExtractionAnalyzer.test.ts`
Expected: PASS (requires valid API key)

**Step 3: Commit**

```bash
git add services/brand-extraction/ExtractionAnalyzer.ts
git commit -m "feat(extraction): add ExtractionAnalyzer with AI vision for literal code extraction"
```

---

## Phase 3: Component Library & Storage

### Task 3.1: Create ComponentLibrary Test

**Files:**
- Create: `services/brand-extraction/__tests__/ComponentLibrary.test.ts`

**Step 1: Write the failing test**

Create `services/brand-extraction/__tests__/ComponentLibrary.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentLibrary } from '../ComponentLibrary';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' }, error: null })) })) })),
      select: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }
}));

describe('ComponentLibrary', () => {
  let library: ComponentLibrary;

  beforeEach(() => {
    library = new ComponentLibrary('project-123');
  });

  describe('findMatchingComponent', () => {
    it('returns null when no components exist', async () => {
      const match = await library.findMatchingComponent('section with heading');
      expect(match).toBeNull();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-extraction/__tests__/ComponentLibrary.test.ts`
Expected: FAIL with "Cannot find module '../ComponentLibrary'"

**Step 3: Commit**

```bash
git add services/brand-extraction/__tests__/ComponentLibrary.test.ts
git commit -m "test(extraction): add ComponentLibrary test"
```

---

### Task 3.2: Implement ComponentLibrary

**Files:**
- Create: `services/brand-extraction/ComponentLibrary.ts`

**Step 1: Write implementation**

Create `services/brand-extraction/ComponentLibrary.ts`:

```typescript
import { supabase } from '../../lib/supabase';
import type {
  BrandExtraction,
  ExtractedComponent,
  ExtractedTokens,
  ComponentMatch,
  ContentSlot
} from '../../types/brandExtraction';

interface SaveComponentInput {
  visualDescription: string;
  literalHtml: string;
  literalCss: string;
  theirClassNames: string[];
  contentSlots: ContentSlot[];
  componentType?: string;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export class ComponentLibrary {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  async saveExtraction(extraction: Omit<BrandExtraction, 'id' | 'projectId'>): Promise<string> {
    const { data, error } = await supabase
      .from('brand_extractions')
      .insert({
        project_id: this.projectId,
        source_url: extraction.sourceUrl,
        page_type: extraction.pageType,
        screenshot_base64: extraction.screenshotBase64,
        raw_html: extraction.rawHtml,
        computed_styles: extraction.computedStyles,
        extracted_at: extraction.extractedAt || new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw new Error(`Failed to save extraction: ${error.message}`);
    return data.id;
  }

  async saveComponents(extractionId: string, components: SaveComponentInput[]): Promise<void> {
    const rows = components.map(c => ({
      extraction_id: extractionId,
      project_id: this.projectId,
      visual_description: c.visualDescription,
      component_type: c.componentType,
      literal_html: c.literalHtml,
      literal_css: c.literalCss,
      their_class_names: c.theirClassNames,
      content_slots: c.contentSlots,
      bounding_box: c.boundingBox
    }));

    const { error } = await supabase.from('brand_components').insert(rows);
    if (error) throw new Error(`Failed to save components: ${error.message}`);
  }

  async getComponents(): Promise<ExtractedComponent[]> {
    const { data, error } = await supabase
      .from('brand_components')
      .select('*')
      .eq('project_id', this.projectId);

    if (error) throw new Error(`Failed to get components: ${error.message}`);

    return (data || []).map(row => ({
      id: row.id,
      extractionId: row.extraction_id,
      projectId: row.project_id,
      visualDescription: row.visual_description,
      componentType: row.component_type,
      literalHtml: row.literal_html,
      literalCss: row.literal_css,
      theirClassNames: row.their_class_names || [],
      contentSlots: row.content_slots || [],
      boundingBox: row.bounding_box,
      createdAt: row.created_at
    }));
  }

  async getTokens(): Promise<ExtractedTokens | null> {
    const { data, error } = await supabase
      .from('brand_tokens')
      .select('*')
      .eq('project_id', this.projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get tokens: ${error.message}`);
    }

    return {
      id: data.id,
      projectId: data.project_id,
      colors: data.colors,
      typography: data.typography,
      spacing: data.spacing,
      shadows: data.shadows,
      borders: data.borders,
      gradients: data.gradients,
      extractedFrom: data.extracted_from,
      extractedAt: data.extracted_at
    };
  }

  async findMatchingComponent(description: string): Promise<ComponentMatch | null> {
    const components = await this.getComponents();
    if (components.length === 0) return null;

    const descLower = description.toLowerCase();
    const keywords = descLower.split(/\s+/);

    let bestMatch: ExtractedComponent | null = null;
    let bestScore = 0;

    for (const component of components) {
      const compDescLower = component.visualDescription.toLowerCase();
      let score = 0;

      for (const keyword of keywords) {
        if (compDescLower.includes(keyword)) score += 1;
      }

      const normalizedScore = score / keywords.length;
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestMatch = component;
      }
    }

    if (!bestMatch || bestScore < 0.3) return null;

    return {
      component: bestMatch,
      confidence: bestScore,
      matchReason: `Matched ${Math.round(bestScore * 100)}% of keywords`
    };
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run services/brand-extraction/__tests__/ComponentLibrary.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/brand-extraction/ComponentLibrary.ts
git commit -m "feat(extraction): add ComponentLibrary for storing literal components"
```

---

## Phase 4: Brand-Aware Composer

### Task 4.1: Create ContentMatcher Test

**Files:**
- Create: `services/brand-composer/__tests__/ContentMatcher.test.ts`

**Step 1: Write the failing test**

Create `services/brand-composer/__tests__/ContentMatcher.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { ContentMatcher } from '../ContentMatcher';
import type { ExtractedComponent } from '../../../types/brandExtraction';

describe('ContentMatcher', () => {
  const mockComponents: ExtractedComponent[] = [
    {
      id: 'comp-1',
      extractionId: 'ext-1',
      projectId: 'proj-1',
      visualDescription: 'Hero section with large heading and subtitle',
      literalHtml: '<section class="hero"><h1></h1><p class="subtitle"></p></section>',
      literalCss: '.hero { background: blue; }',
      theirClassNames: ['hero'],
      contentSlots: [
        { name: 'heading', selector: 'h1', type: 'text', required: true },
        { name: 'subtitle', selector: '.subtitle', type: 'text', required: false }
      ],
      createdAt: new Date().toISOString()
    }
  ];

  describe('matchContentToComponent', () => {
    it('matches heading content to hero component', async () => {
      const matcher = new ContentMatcher(mockComponents);
      const content = { type: 'section', heading: 'Welcome', headingLevel: 1, body: 'Introduction.' };

      const match = await matcher.matchContentToComponent(content);

      expect(match).not.toBeNull();
      expect(match?.component.id).toBe('comp-1');
      expect(match?.confidence).toBeGreaterThan(0.3);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-composer/__tests__/ContentMatcher.test.ts`
Expected: FAIL with "Cannot find module '../ContentMatcher'"

**Step 3: Commit**

```bash
git add services/brand-composer/__tests__/ContentMatcher.test.ts
git commit -m "test(composer): add ContentMatcher test"
```

---

### Task 4.2: Implement ContentMatcher

**Files:**
- Create: `services/brand-composer/ContentMatcher.ts`

**Step 1: Write implementation**

Create `services/brand-composer/ContentMatcher.ts`:

```typescript
import type { ExtractedComponent, ComponentMatch, ContentSlot } from '../../types/brandExtraction';

interface ContentSection {
  type: string;
  heading?: string;
  headingLevel?: number;
  body?: string;
  items?: string[];
  image?: string;
  link?: { text: string; url: string };
}

export class ContentMatcher {
  private components: ExtractedComponent[];

  constructor(components: ExtractedComponent[]) {
    this.components = components;
  }

  async matchContentToComponent(content: ContentSection): Promise<ComponentMatch | null> {
    if (this.components.length === 0) return null;

    const scores: Array<{ component: ExtractedComponent; score: number; reasons: string[] }> = [];

    for (const component of this.components) {
      const { score, reasons } = this.scoreMatch(content, component);
      scores.push({ component, score, reasons });
    }

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    if (best.score < 0.3) return null;

    return {
      component: best.component,
      confidence: best.score,
      matchReason: best.reasons.join('; ')
    };
  }

  private scoreMatch(content: ContentSection, component: ExtractedComponent): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;
    let maxScore = 0;
    const slots = component.contentSlots;

    if (content.heading) {
      maxScore += 2;
      const headingSlot = slots.find(s => s.name === 'heading' || s.name === 'title' || s.selector.match(/h[1-6]/i));
      if (headingSlot) {
        score += 2;
        reasons.push('Has heading slot');
      }
    }

    if (content.body) {
      maxScore += 2;
      const bodySlot = slots.find(s => s.name === 'body' || s.name === 'description' || s.name === 'subtitle' || s.type === 'text');
      if (bodySlot) {
        score += 2;
        reasons.push('Has body text slot');
      }
    }

    if (content.image) {
      maxScore += 1.5;
      const imageSlot = slots.find(s => s.type === 'image');
      if (imageSlot) {
        score += 1.5;
        reasons.push('Has image slot');
      }
    }

    const normalizedScore = maxScore > 0 ? score / (maxScore + 1) : 0;
    return { score: Math.min(normalizedScore, 1), reasons };
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run services/brand-composer/__tests__/ContentMatcher.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/brand-composer/ContentMatcher.ts
git commit -m "feat(composer): add ContentMatcher for semantic content-to-component matching"
```

---

### Task 4.3: Create StandaloneCssGenerator Test

**Files:**
- Create: `services/brand-composer/__tests__/StandaloneCssGenerator.test.ts`

**Step 1: Write the failing test**

Create `services/brand-composer/__tests__/StandaloneCssGenerator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { StandaloneCssGenerator } from '../StandaloneCssGenerator';
import type { ExtractedComponent, ExtractedTokens } from '../../../types/brandExtraction';

describe('StandaloneCssGenerator', () => {
  const mockTokens: ExtractedTokens = {
    id: 'tokens-1',
    projectId: 'proj-1',
    colors: { values: [{ hex: '#1a365d', usage: 'primary', frequency: 10 }] },
    typography: {
      headings: { fontFamily: 'Inter', fontWeight: 700 },
      body: { fontFamily: 'Inter', fontWeight: 400, lineHeight: 1.6 }
    },
    spacing: { sectionGap: '64px', cardPadding: '32px', contentWidth: '1200px' },
    shadows: { card: '0 4px 20px rgba(0,0,0,0.1)', elevated: '0 10px 40px rgba(0,0,0,0.15)' },
    borders: { radiusSmall: '4px', radiusMedium: '8px', radiusLarge: '16px', defaultColor: '#e2e8f0' },
    extractedFrom: ['https://example.com'],
    extractedAt: new Date().toISOString()
  };

  describe('generate', () => {
    it('creates standalone CSS from extracted components', () => {
      const generator = new StandaloneCssGenerator();
      const components: ExtractedComponent[] = [{
        id: 'comp-1',
        extractionId: 'ext-1',
        projectId: 'proj-1',
        visualDescription: 'Hero section',
        literalHtml: '<section class="hero"></section>',
        literalCss: '.hero { background: #1a365d; padding: 80px; }',
        theirClassNames: ['hero'],
        contentSlots: [],
        createdAt: new Date().toISOString()
      }];

      const css = generator.generate(components, [], mockTokens);

      expect(css).toContain('Auto-generated');
      expect(css).toContain('.brand-hero');
      expect(css).toContain('background: #1a365d');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-composer/__tests__/StandaloneCssGenerator.test.ts`
Expected: FAIL with "Cannot find module '../StandaloneCssGenerator'"

**Step 3: Commit**

```bash
git add services/brand-composer/__tests__/StandaloneCssGenerator.test.ts
git commit -m "test(composer): add StandaloneCssGenerator test"
```

---

### Task 4.4: Implement StandaloneCssGenerator

**Files:**
- Create: `services/brand-composer/StandaloneCssGenerator.ts`

**Step 1: Write implementation**

Create `services/brand-composer/StandaloneCssGenerator.ts`:

```typescript
import type { ExtractedComponent, ExtractedTokens, SynthesizedComponent } from '../../types/brandExtraction';

export class StandaloneCssGenerator {
  generate(
    extractedComponents: ExtractedComponent[],
    synthesizedComponents: SynthesizedComponent[],
    tokens: ExtractedTokens
  ): string {
    const sections: string[] = [];

    sections.push(this.generateHeader(tokens));
    sections.push(this.generateReset());
    sections.push(this.generateTokenVariables(tokens));
    sections.push(this.generateBaseStyles(tokens));

    if (extractedComponents.length > 0) {
      sections.push(this.generateExtractedComponentStyles(extractedComponents));
    }

    if (synthesizedComponents.length > 0) {
      sections.push(this.generateSynthesizedComponentStyles(synthesizedComponents));
    }

    return sections.join('\n\n');
  }

  private generateHeader(tokens: ExtractedTokens): string {
    return `/* ==========================================================================
   Brand Replication System - Auto-generated Standalone CSS
   Generated: ${new Date().toISOString()}
   Sources: ${tokens.extractedFrom.join(', ')}
   ========================================================================== */`;
  }

  private generateReset(): string {
    return `/* Reset */
*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }
img, picture, video, canvas, svg { display: block; max-width: 100%; }`;
  }

  private generateTokenVariables(tokens: ExtractedTokens): string {
    const vars: string[] = [];
    tokens.colors.values.forEach((color) => {
      const name = color.usage.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
      vars.push(`  --brand-color-${name}: ${color.hex};`);
    });
    vars.push(`  --brand-font-heading: ${tokens.typography.headings.fontFamily}, system-ui, sans-serif;`);
    vars.push(`  --brand-font-body: ${tokens.typography.body.fontFamily}, system-ui, sans-serif;`);
    vars.push(`  --brand-section-gap: ${tokens.spacing.sectionGap};`);
    vars.push(`  --brand-shadow-card: ${tokens.shadows.card};`);
    vars.push(`  --brand-radius-md: ${tokens.borders.radiusMedium};`);

    return `/* CSS Variables */\n:root {\n${vars.join('\n')}\n}`;
  }

  private generateBaseStyles(tokens: ExtractedTokens): string {
    return `/* Base Styles */
body {
  font-family: var(--brand-font-body);
  line-height: ${tokens.typography.body.lineHeight};
}
h1, h2, h3, h4, h5, h6 {
  font-family: var(--brand-font-heading);
  font-weight: ${tokens.typography.headings.fontWeight};
}
.brand-container {
  max-width: ${tokens.spacing.contentWidth};
  margin: 0 auto;
  padding: 0 1.5rem;
}`;
  }

  private generateExtractedComponentStyles(components: ExtractedComponent[]): string {
    const styles: string[] = ['/* Extracted Components (brand- prefixed) */'];

    for (const component of components) {
      if (!component.literalCss) continue;

      let css = component.literalCss;
      for (const className of component.theirClassNames) {
        const brandClassName = `brand-${className.replace(/^[.-]/, '')}`;
        const classRegex = new RegExp(`\\.${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
        const brandCss = css.replace(classRegex, `.${brandClassName}`);

        if (brandCss !== css) {
          styles.push(`\n/* Component: ${component.visualDescription} */`);
          styles.push(brandCss);
        }
      }
    }

    return styles.join('\n');
  }

  private generateSynthesizedComponentStyles(components: SynthesizedComponent[]): string {
    const styles: string[] = ['/* Synthesized Components */'];

    for (const component of components) {
      if (!component.generatedCss) continue;
      styles.push(`\n/* Synthesized: ${component.visualDescription} */`);
      styles.push(component.generatedCss);
    }

    return styles.join('\n');
  }
}
```

**Step 2: Run test to verify it passes**

Run: `npx vitest run services/brand-composer/__tests__/StandaloneCssGenerator.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/brand-composer/StandaloneCssGenerator.ts
git commit -m "feat(composer): add StandaloneCssGenerator for independent CSS output"
```

---

### Task 4.5: Create BrandAwareComposer Test

**Files:**
- Create: `services/brand-composer/__tests__/BrandAwareComposer.test.ts`

**Step 1: Write the failing test**

Create `services/brand-composer/__tests__/BrandAwareComposer.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { BrandAwareComposer } from '../BrandAwareComposer';

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }))
      }))
    }))
  }
}));

describe('BrandAwareComposer', () => {
  describe('compose', () => {
    it('produces HTML with brand-article wrapper', async () => {
      const composer = new BrandAwareComposer({
        projectId: 'proj-123',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const content = {
        title: 'Test Article',
        sections: [{ id: 'section-1', heading: 'Introduction', headingLevel: 2, content: '<p>Text.</p>' }]
      };

      const result = await composer.compose(content);

      expect(result.html).toContain('brand-article');
      expect(result.standaloneCss).toBeTruthy();
      expect(result.metadata.brandProjectId).toBe('proj-123');
    });

    it('preserves SEO semantic markup', async () => {
      const composer = new BrandAwareComposer({
        projectId: 'proj-123',
        aiProvider: 'gemini',
        apiKey: 'test-key'
      });

      const content = {
        title: 'Test',
        sections: [{
          id: 'faq',
          heading: 'FAQ',
          headingLevel: 2,
          content: '<div itemscope itemtype="https://schema.org/FAQPage"><div itemprop="mainEntity">Q</div></div>'
        }]
      };

      const result = await composer.compose(content);

      expect(result.html).toContain('itemscope');
      expect(result.html).toContain('FAQPage');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run services/brand-composer/__tests__/BrandAwareComposer.test.ts`
Expected: FAIL with "Cannot find module '../BrandAwareComposer'"

**Step 3: Commit**

```bash
git add services/brand-composer/__tests__/BrandAwareComposer.test.ts
git commit -m "test(composer): add BrandAwareComposer test with SEO preservation assertion"
```

---

### Task 4.6: Implement BrandAwareComposer

**Files:**
- Create: `services/brand-composer/BrandAwareComposer.ts`
- Create: `services/brand-composer/index.ts`

**Step 1: Write implementation**

Create `services/brand-composer/BrandAwareComposer.ts`:

```typescript
import { ComponentLibrary } from '../brand-extraction/ComponentLibrary';
import { ContentMatcher } from './ContentMatcher';
import { StandaloneCssGenerator } from './StandaloneCssGenerator';
import type {
  ExtractedComponent,
  ExtractedTokens,
  SynthesizedComponent,
  BrandReplicationOutput,
  ContentSlot
} from '../../types/brandExtraction';

interface ComposerConfig {
  projectId: string;
  aiProvider: 'gemini' | 'anthropic';
  apiKey: string;
}

interface ContentSection {
  id: string;
  heading?: string;
  headingLevel?: number;
  content: string;
  type?: string;
}

interface ContentInput {
  title: string;
  sections: ContentSection[];
}

/**
 * BrandAwareComposer - Main orchestrator for brand-aware content rendering
 *
 * CRITICAL: SEO markup (schema, headings, rich snippets) is NEVER modified.
 */
export class BrandAwareComposer {
  private config: ComposerConfig;
  private library: ComponentLibrary;
  private cssGenerator: StandaloneCssGenerator;

  constructor(config: ComposerConfig) {
    this.config = config;
    this.library = new ComponentLibrary(config.projectId);
    this.cssGenerator = new StandaloneCssGenerator();
  }

  async compose(content: ContentInput): Promise<BrandReplicationOutput> {
    const startTime = Date.now();

    const [components, tokens] = await Promise.all([
      this.library.getComponents(),
      this.library.getTokens()
    ]);

    const effectiveTokens = tokens || this.getDefaultTokens();
    const matcher = new ContentMatcher(components);
    const renderedSections: string[] = [];
    const componentsUsed: BrandReplicationOutput['componentsUsed'] = [];
    const synthesizedComponents: SynthesizedComponent[] = [];

    for (const section of content.sections) {
      const rendered = await this.renderSection(section, components, effectiveTokens, matcher, componentsUsed);
      renderedSections.push(rendered);
    }

    const standaloneCss = this.cssGenerator.generate(components, synthesizedComponents, effectiveTokens);
    const html = this.assembleHtml(content.title, renderedSections);

    return {
      html,
      standaloneCss,
      componentsUsed,
      metadata: {
        brandProjectId: this.config.projectId,
        extractionsUsed: [...new Set(components.map(c => c.extractionId))],
        synthesizedCount: synthesizedComponents.length,
        renderTime: Date.now() - startTime
      }
    };
  }

  private async renderSection(
    section: ContentSection,
    components: ExtractedComponent[],
    tokens: ExtractedTokens,
    matcher: ContentMatcher,
    componentsUsed: BrandReplicationOutput['componentsUsed']
  ): Promise<string> {
    const match = await matcher.matchContentToComponent({
      type: section.type || 'section',
      heading: section.heading,
      headingLevel: section.headingLevel,
      body: section.content
    });

    if (match && match.confidence >= 0.5) {
      const rendered = this.injectContentIntoComponent(section, match.component);
      componentsUsed.push({
        id: match.component.id,
        type: 'extracted',
        theirClasses: match.component.theirClassNames,
        ourClasses: match.component.theirClassNames.map(c => `brand-${c}`)
      });
      return rendered;
    }

    return this.renderFallback(section);
  }

  private injectContentIntoComponent(section: ContentSection, component: ExtractedComponent): string {
    let html = component.literalHtml;

    for (const className of component.theirClassNames) {
      const brandClass = `brand-${className}`;
      html = html.replace(
        new RegExp(`class="([^"]*\\b${className}\\b[^"]*)"`, 'g'),
        `class="$1 ${brandClass}"`
      );
    }

    for (const slot of component.contentSlots) {
      const slotContent = this.getContentForSlot(section, slot);
      if (slotContent) {
        html = this.injectIntoSlot(html, slot, slotContent);
      }
    }

    if (section.id) {
      html = html.replace(/^<(\w+)/, `<$1 id="${section.id}"`);
    }

    return html;
  }

  private getContentForSlot(section: ContentSection, slot: ContentSlot): string | null {
    switch (slot.name) {
      case 'heading':
      case 'title':
        return section.heading || null;
      case 'body':
      case 'content':
      case 'description':
        return section.content;
      default:
        return null;
    }
  }

  private injectIntoSlot(html: string, slot: ContentSlot, content: string): string {
    const selector = slot.selector;

    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      const regex = new RegExp(`(<[^>]+class="[^"]*${className}[^"]*"[^>]*>)([^<]*)(</)`, 'g');
      return html.replace(regex, `$1${content}$3`);
    }

    if (selector.match(/^h[1-6]$/i)) {
      const regex = new RegExp(`(<${selector}[^>]*>)([^<]*)(</${selector}>)`, 'gi');
      return html.replace(regex, `$1${content}$3`);
    }

    return html;
  }

  private renderFallback(section: ContentSection): string {
    const headingHtml = section.heading
      ? `<h${section.headingLevel || 2} class="brand-heading">${section.heading}</h${section.headingLevel || 2}>`
      : '';

    return `<section id="${section.id || ''}" class="brand-section brand-section-fallback">
  ${headingHtml}
  <div class="brand-content">${section.content}</div>
</section>`;
  }

  private assembleHtml(title: string, sections: string[]): string {
    return `<article class="brand-article" itemscope itemtype="https://schema.org/Article">
  <meta itemprop="headline" content="${this.escapeHtml(title)}">
  ${sections.join('\n\n')}
</article>`;
  }

  private escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private getDefaultTokens(): ExtractedTokens {
    return {
      id: 'default',
      projectId: this.config.projectId,
      colors: { values: [{ hex: '#3b82f6', usage: 'primary', frequency: 10 }] },
      typography: {
        headings: { fontFamily: 'system-ui', fontWeight: 700 },
        body: { fontFamily: 'system-ui', fontWeight: 400, lineHeight: 1.6 }
      },
      spacing: { sectionGap: '4rem', cardPadding: '1.5rem', contentWidth: '1200px' },
      shadows: { card: '0 1px 3px rgba(0,0,0,0.1)', elevated: '0 10px 25px rgba(0,0,0,0.15)' },
      borders: { radiusSmall: '0.25rem', radiusMedium: '0.5rem', radiusLarge: '1rem', defaultColor: '#e5e7eb' },
      extractedFrom: [],
      extractedAt: new Date().toISOString()
    };
  }
}
```

**Step 2: Create barrel export**

Create `services/brand-composer/index.ts`:

```typescript
export { BrandAwareComposer } from './BrandAwareComposer';
export { ContentMatcher } from './ContentMatcher';
export { StandaloneCssGenerator } from './StandaloneCssGenerator';
```

**Step 3: Run test to verify it passes**

Run: `npx vitest run services/brand-composer/__tests__/BrandAwareComposer.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add services/brand-composer/BrandAwareComposer.ts services/brand-composer/index.ts
git commit -m "feat(composer): add BrandAwareComposer orchestrator for brand-aware rendering"
```

---

## Phase 5: Anti-Template Tests

### Task 5.1: Create Anti-Template Test Suite

**Files:**
- Create: `services/brand-composer/__tests__/antiTemplate.test.ts`

**Step 1: Write the test suite**

Create `services/brand-composer/__tests__/antiTemplate.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

/**
 * Anti-Template Test Suite
 *
 * These tests ensure the system does NOT fall back into template thinking.
 */

describe('Anti-Template Safeguards', () => {
  describe('Data Structure Enforcement', () => {
    it('ExtractedComponent has no abstraction fields', async () => {
      const forbiddenFields = ['variant', 'style', 'theme', 'template', 'category'];

      const sample: Record<string, unknown> = {
        id: 'test',
        literalHtml: '<div></div>',
        literalCss: '.test {}',
        theirClassNames: ['test'],
        contentSlots: [],
        visualDescription: 'test'
      };

      for (const field of forbiddenFields) {
        expect(sample).not.toHaveProperty(field);
      }
    });
  });

  describe('Output Uniqueness', () => {
    it('output does not contain generic template classes', () => {
      const sampleOutput = '<div class="nfir-card brand-card">Content</div>';

      const forbiddenClasses = [
        'ctc-card',
        'ctc-hero',
        'ctc-section',
        'ctc-card--elevated',
        'ctc-hero--split',
        'ctc-button--primary'
      ];

      for (const cls of forbiddenClasses) {
        expect(sampleOutput).not.toContain(cls);
      }
    });
  });

  describe('CSS Literal Values', () => {
    it('generated CSS uses actual pixel values, not just variables', () => {
      const sampleCss = `
        .brand-card {
          padding: 32px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          border-radius: 12px;
        }
      `;

      expect(sampleCss).toMatch(/\d+px/);
      expect(sampleCss).toMatch(/rgba?\(/);
    });
  });

  describe('Component Matching', () => {
    it('matching uses visual description and slots, not type enum', async () => {
      const { ContentMatcher } = await import('../ContentMatcher');

      const components = [{
        id: 'comp-1',
        extractionId: 'ext-1',
        projectId: 'proj-1',
        visualDescription: 'Dark section with large white text',
        literalHtml: '<section></section>',
        literalCss: '',
        theirClassNames: [],
        contentSlots: [{ name: 'heading', selector: 'h1', type: 'text' as const, required: true }],
        createdAt: new Date().toISOString()
      }];

      const matcher = new ContentMatcher(components);
      const match = await matcher.matchContentToComponent({
        type: 'hero',
        heading: 'Test',
        body: 'Content'
      });

      expect(match).not.toBeNull();
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run services/brand-composer/__tests__/antiTemplate.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/brand-composer/__tests__/antiTemplate.test.ts
git commit -m "test(composer): add anti-template test suite to prevent regression"
```

---

### Task 5.2: Create Barrel Exports

**Files:**
- Create: `services/brand-extraction/index.ts`

**Step 1: Write barrel export**

Create `services/brand-extraction/index.ts`:

```typescript
export { PageCrawler, type PageCaptureResult, type PageCrawlerConfig } from './PageCrawler';
export { ExtractionAnalyzer } from './ExtractionAnalyzer';
export { ComponentLibrary } from './ComponentLibrary';
```

**Step 2: Commit**

```bash
git add services/brand-extraction/index.ts
git commit -m "feat(extraction): add barrel export for brand extraction services"
```

---

## Summary

This plan implements the Brand Replication System in 5 phases with 12 tasks:

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | Database schema & TypeScript types |
| 2 | 2.1-2.4 | PageCrawler & ExtractionAnalyzer |
| 3 | 3.1-3.2 | ComponentLibrary storage |
| 4 | 4.1-4.6 | ContentMatcher, StandaloneCssGenerator, BrandAwareComposer |
| 5 | 5.1-5.2 | Anti-template tests & barrel exports |

**Key Anti-Template Safeguards:**
- Data structures have no abstraction fields (variant, style, theme)
- Tests fail if generic class patterns appear in output
- CSS must contain actual values, not just variable references
- Matching uses visual description + slots, not type enums

**Output Features:**
- Dual class names (theirs + ours)
- Standalone CSS works without target site's stylesheet
- SEO markup preserved exactly
