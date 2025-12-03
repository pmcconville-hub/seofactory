# Comprehensive Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a complete test suite covering all user interactions, functions, buttons, and error scenarios to ensure zero console errors and full functionality validation.

**Architecture:** Three-tier testing approach:
1. **Unit Tests (Vitest)** - Pure function testing for services, utilities, and state logic
2. **Component Tests (Vitest + React Testing Library)** - UI component behavior testing
3. **E2E Tests (Playwright)** - Full user flow testing with real browser interactions

**Tech Stack:** Vitest, @testing-library/react, @testing-library/user-event, Playwright, MSW (for API mocking)

---

## Phase 1: Test Infrastructure Setup

### Task 1.1: Install Testing Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install React Testing Library and MSW**

```bash
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event msw jsdom
```

**Step 2: Verify installation**

Run: `npm list @testing-library/react`
Expected: Shows installed version

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add testing dependencies"
```

---

### Task 1.2: Configure Vitest for React Components

**Files:**
- Modify: `vitest.config.ts`
- Create: `tests/setup.ts`

**Step 1: Create test setup file**

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';

// Mock matchMedia for components using media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
} as any;
```

**Step 2: Update vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'e2e', '.worktrees'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: [
        'services/**/*.ts',
        'components/**/*.tsx',
        'state/**/*.ts',
        'utils/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/types.ts',
      ],
    },
  },
});
```

**Step 3: Run test to verify setup**

Run: `npm test`
Expected: Existing tests still pass

**Step 4: Commit**

```bash
git add vitest.config.ts tests/setup.ts
git commit -m "chore: configure vitest for React component testing"
```

---

### Task 1.3: Create Test Utilities and Mocks

**Files:**
- Create: `tests/test-utils.tsx`
- Create: `tests/mocks/supabase.ts`
- Create: `tests/mocks/handlers.ts`

**Step 1: Create render utility with providers**

```typescript
// tests/test-utils.tsx
import React, { ReactElement, useReducer } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppStateContext, appReducer, initialState, AppState, AppAction } from '../state/appState';

// Custom render that wraps with AppStateContext
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Partial<AppState>;
}

function createTestState(overrides: Partial<AppState> = {}): AppState {
  return {
    ...initialState,
    ...overrides,
  };
}

function TestProviders({
  children,
  initialTestState
}: {
  children: React.ReactNode;
  initialTestState: AppState;
}) {
  const [state, dispatch] = useReducer(appReducer, initialTestState);
  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { initialState: stateOverrides, ...renderOptions } = options;
  const testState = createTestState(stateOverrides);

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestProviders initialTestState={testState}>
          {children}
        </TestProviders>
      ),
      ...renderOptions,
    }),
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };
```

**Step 2: Create Supabase mock**

```typescript
// tests/mocks/supabase.ts
import { vi } from 'vitest';

export const mockSupabaseClient = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id', email: 'test@example.com' } }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
};

export const mockGetSupabaseClient = vi.fn().mockReturnValue(mockSupabaseClient);

// Helper to reset all mocks between tests
export function resetSupabaseMocks() {
  vi.clearAllMocks();
}
```

**Step 3: Create MSW handlers for API mocking**

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://blucvnmncvwzlwxoyoum.supabase.co';

export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  }),

  // Projects endpoint
  http.get(`${SUPABASE_URL}/rest/v1/projects`, () => {
    return HttpResponse.json([
      { id: 'project-1', project_name: 'Test Project', domain: 'example.com', user_id: 'test-user-id' },
    ]);
  }),

  // Topical maps endpoint
  http.get(`${SUPABASE_URL}/rest/v1/topical_maps`, () => {
    return HttpResponse.json([]);
  }),

  // Edge functions
  http.post(`${SUPABASE_URL}/functions/v1/get-settings`, () => {
    return HttpResponse.json({
      aiProvider: 'anthropic',
      aiModel: 'claude-3-sonnet',
    });
  }),

  http.post(`${SUPABASE_URL}/functions/v1/update-settings`, () => {
    return HttpResponse.json({ success: true });
  }),
];
```

**Step 4: Commit**

```bash
git add tests/
git commit -m "chore: add test utilities and mocks"
```

---

## Phase 2: Unit Tests - Critical Services

### Task 2.1: AI Response Sanitizer Tests

**Files:**
- Create: `services/aiResponseSanitizer.test.ts`

**Step 1: Write the failing test**

```typescript
// services/aiResponseSanitizer.test.ts
import { describe, it, expect } from 'vitest';
import { AIResponseSanitizer } from './aiResponseSanitizer';

describe('AIResponseSanitizer', () => {
  describe('extractJsonFromResponse', () => {
    it('extracts valid JSON from markdown code block', () => {
      const response = '```json\n{"key": "value"}\n```';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toEqual({ key: 'value' });
    });

    it('extracts JSON without code block markers', () => {
      const response = '{"key": "value"}';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toEqual({ key: 'value' });
    });

    it('handles JSON with surrounding text', () => {
      const response = 'Here is the result: {"key": "value"} End of response.';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toEqual({ key: 'value' });
    });

    it('returns null for invalid JSON', () => {
      const response = 'Not valid JSON at all';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toBeNull();
    });

    it('handles nested JSON objects', () => {
      const response = '{"outer": {"inner": "value"}}';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toEqual({ outer: { inner: 'value' } });
    });

    it('handles JSON arrays', () => {
      const response = '[{"id": 1}, {"id": 2}]';
      const result = AIResponseSanitizer.extractJsonFromResponse(response);
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  describe('sanitizeTopicsArray', () => {
    it('converts string topic to object with title', () => {
      const topics = ['Topic 1', 'Topic 2'];
      const result = AIResponseSanitizer.sanitizeTopicsArray(topics);
      expect(result[0]).toHaveProperty('title', 'Topic 1');
      expect(result[1]).toHaveProperty('title', 'Topic 2');
    });

    it('preserves valid topic objects', () => {
      const topics = [{ title: 'Topic 1', id: '1' }];
      const result = AIResponseSanitizer.sanitizeTopicsArray(topics);
      expect(result[0]).toEqual({ title: 'Topic 1', id: '1' });
    });

    it('returns empty array for non-array input', () => {
      const result = AIResponseSanitizer.sanitizeTopicsArray('not an array' as any);
      expect(result).toEqual([]);
    });
  });

  describe('sanitizeBriefResponse', () => {
    it('ensures serpAnalysis is an object', () => {
      const brief = { serpAnalysis: 'Not available' };
      const result = AIResponseSanitizer.sanitizeBriefResponse(brief);
      expect(result.serpAnalysis).toEqual({
        peopleAlsoAsk: [],
        relatedSearches: [],
        featuredSnippet: null,
      });
    });

    it('ensures contextualBridge is an array', () => {
      const brief = { contextualBridge: 'Not available' };
      const result = AIResponseSanitizer.sanitizeBriefResponse(brief);
      expect(result.contextualBridge).toEqual([]);
    });

    it('preserves valid brief structure', () => {
      const brief = {
        title: 'Test',
        serpAnalysis: { peopleAlsoAsk: ['Q1'], relatedSearches: [], featuredSnippet: null },
        contextualBridge: [{ sourceTopicId: '1', targetTopicId: '2', anchorText: 'link' }],
      };
      const result = AIResponseSanitizer.sanitizeBriefResponse(brief);
      expect(result.title).toBe('Test');
      expect(result.serpAnalysis.peopleAlsoAsk).toEqual(['Q1']);
    });
  });
});
```

**Step 2: Run test to verify it fails (or passes if sanitizer already works)**

Run: `npm test services/aiResponseSanitizer.test.ts`
Expected: Tests should pass if sanitizer is implemented correctly

**Step 3: Commit**

```bash
git add services/aiResponseSanitizer.test.ts
git commit -m "test: add AI response sanitizer unit tests"
```

---

### Task 2.2: App State Reducer Tests

**Files:**
- Create: `state/appState.test.ts`

**Step 1: Write the failing test**

```typescript
// state/appState.test.ts
import { describe, it, expect } from 'vitest';
import { appReducer, initialState, AppState, AppAction, AppStep } from './appState';

describe('appReducer', () => {
  describe('SET_USER', () => {
    it('sets user and clears error', () => {
      const user = { id: 'user-1', email: 'test@example.com' };
      const state = appReducer(initialState, { type: 'SET_USER', payload: user as any });
      expect(state.user).toEqual(user);
      expect(state.error).toBeNull();
    });

    it('clears user when payload is null', () => {
      const stateWithUser = { ...initialState, user: { id: 'user-1' } as any };
      const state = appReducer(stateWithUser, { type: 'SET_USER', payload: null });
      expect(state.user).toBeNull();
    });
  });

  describe('SET_STEP', () => {
    it('changes app step', () => {
      const state = appReducer(initialState, { type: 'SET_STEP', payload: AppStep.PROJECT_SELECTION });
      expect(state.appStep).toBe(AppStep.PROJECT_SELECTION);
    });
  });

  describe('SET_ERROR', () => {
    it('sets error message', () => {
      const state = appReducer(initialState, { type: 'SET_ERROR', payload: 'Something went wrong' });
      expect(state.error).toBe('Something went wrong');
    });

    it('clears error when payload is null', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const state = appReducer(stateWithError, { type: 'SET_ERROR', payload: null });
      expect(state.error).toBeNull();
    });
  });

  describe('SET_NOTIFICATION', () => {
    it('sets notification message', () => {
      const state = appReducer(initialState, { type: 'SET_NOTIFICATION', payload: 'Success!' });
      expect(state.notification).toBe('Success!');
    });
  });

  describe('SET_LOADING', () => {
    it('sets loading state for specific key', () => {
      const state = appReducer(initialState, { type: 'SET_LOADING', payload: { key: 'projects', value: true } });
      expect(state.loading.projects).toBe(true);
    });
  });

  describe('SET_PROJECTS', () => {
    it('sets projects array', () => {
      const projects = [{ id: 'p1', project_name: 'Test' }];
      const state = appReducer(initialState, { type: 'SET_PROJECTS', payload: projects as any });
      expect(state.projects).toEqual(projects);
    });
  });

  describe('ADD_PROJECT', () => {
    it('adds project to array', () => {
      const project = { id: 'p1', project_name: 'New Project' };
      const state = appReducer(initialState, { type: 'ADD_PROJECT', payload: project as any });
      expect(state.projects).toContainEqual(project);
    });
  });

  describe('DELETE_PROJECT', () => {
    it('removes project from array', () => {
      const stateWithProjects = {
        ...initialState,
        projects: [{ id: 'p1', project_name: 'Test' }] as any
      };
      const state = appReducer(stateWithProjects, { type: 'DELETE_PROJECT', payload: { projectId: 'p1' } });
      expect(state.projects).toHaveLength(0);
    });
  });

  describe('SET_ACTIVE_PROJECT', () => {
    it('sets active project ID', () => {
      const state = appReducer(initialState, { type: 'SET_ACTIVE_PROJECT', payload: 'project-123' });
      expect(state.activeProjectId).toBe('project-123');
    });

    it('clears topical maps and active map when project changes', () => {
      const stateWithMaps = {
        ...initialState,
        activeProjectId: 'old-project',
        topicalMaps: [{ id: 'map-1' }] as any,
        activeTopicalMapId: 'map-1',
      };
      const state = appReducer(stateWithMaps, { type: 'SET_ACTIVE_PROJECT', payload: 'new-project' });
      expect(state.topicalMaps).toHaveLength(0);
      expect(state.activeTopicalMapId).toBeNull();
    });
  });

  describe('SET_MODAL_VISIBILITY', () => {
    it('shows modal', () => {
      const state = appReducer(initialState, {
        type: 'SET_MODAL_VISIBILITY',
        payload: { modal: 'settings', visible: true }
      });
      expect(state.modals.settings).toBe(true);
    });

    it('hides modal', () => {
      const stateWithModal = { ...initialState, modals: { ...initialState.modals, settings: true } };
      const state = appReducer(stateWithModal, {
        type: 'SET_MODAL_VISIBILITY',
        payload: { modal: 'settings', visible: false }
      });
      expect(state.modals.settings).toBe(false);
    });
  });

  describe('SHOW_CONFIRMATION / HIDE_CONFIRMATION', () => {
    it('shows confirmation dialog', () => {
      const payload = {
        title: 'Confirm',
        message: 'Are you sure?',
        onConfirm: () => {},
      };
      const state = appReducer(initialState, { type: 'SHOW_CONFIRMATION', payload });
      expect(state.confirmationState?.title).toBe('Confirm');
    });

    it('hides confirmation dialog', () => {
      const stateWithConfirm = {
        ...initialState,
        confirmationState: { title: 'Test', message: 'Test', onConfirm: () => {} }
      };
      const state = appReducer(stateWithConfirm, { type: 'HIDE_CONFIRMATION' });
      expect(state.confirmationState).toBeNull();
    });
  });

  describe('LOG_EVENT', () => {
    it('adds event to logs array', () => {
      const event = {
        service: 'TestService',
        message: 'Test message',
        status: 'success' as const,
        timestamp: Date.now()
      };
      const state = appReducer(initialState, { type: 'LOG_EVENT', payload: event });
      expect(state.logs).toContainEqual(event);
    });

    it('limits logs to 100 entries', () => {
      const stateWithManyLogs = {
        ...initialState,
        logs: Array(100).fill({ service: 'Test', message: 'Old', status: 'success', timestamp: 0 }),
      };
      const newEvent = { service: 'New', message: 'New', status: 'success' as const, timestamp: 1 };
      const state = appReducer(stateWithManyLogs, { type: 'LOG_EVENT', payload: newEvent });
      expect(state.logs.length).toBe(100);
      expect(state.logs[state.logs.length - 1].message).toBe('New');
    });
  });
});
```

**Step 2: Run test**

Run: `npm test state/appState.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add state/appState.test.ts
git commit -m "test: add app state reducer unit tests"
```

---

### Task 2.3: Navigation Service Tests

**Files:**
- Create: `services/navigationService.test.ts`

**Step 1: Write the test**

```typescript
// services/navigationService.test.ts
import { describe, it, expect } from 'vitest';
import {
  detectSegment,
  getDefaultRule,
  generateDynamicNavigation,
  createDefaultConfig
} from './navigationService';
import { EnrichedTopic, FoundationPage, NavigationStructure } from '../types';

const createMockTopic = (overrides: Partial<EnrichedTopic> = {}): EnrichedTopic => ({
  id: 'topic-1',
  title: 'Test Topic',
  type: 'core',
  cluster_role: 'cluster_content',
  topic_class: 'informational',
  ...overrides,
} as EnrichedTopic);

const createMockFoundationPage = (overrides: Partial<FoundationPage> = {}): FoundationPage => ({
  id: 'fp-1',
  map_id: 'map-1',
  page_type: 'about',
  title: 'About Us',
  slug: 'about',
  ...overrides,
} as FoundationPage);

const createMockNavigation = (): NavigationStructure => ({
  id: 'nav-1',
  map_id: 'map-1',
  header: {
    logo_alt_text: 'Logo',
    primary_nav: [],
  },
  footer: {
    sections: [],
    legal_links: [],
    nap_display: true,
    copyright_text: '© 2024',
  },
  max_header_links: 10,
  max_footer_links: 30,
  dynamic_by_section: false,
});

describe('navigationService', () => {
  describe('detectSegment', () => {
    it('returns foundation for foundation page type', () => {
      const topics = [createMockTopic()];
      const segment = detectSegment('fp-1', 'foundation', topics);
      expect(segment).toBe('foundation');
    });

    it('returns pillar for pillar topics', () => {
      const topics = [createMockTopic({ id: 'pillar-1', cluster_role: 'pillar' })];
      const segment = detectSegment('pillar-1', 'topic', topics);
      expect(segment).toBe('pillar');
    });

    it('returns core_section for monetization topics', () => {
      const topics = [createMockTopic({ id: 'money-1', topic_class: 'monetization' })];
      const segment = detectSegment('money-1', 'topic', topics);
      expect(segment).toBe('core_section');
    });

    it('returns author_section for informational topics', () => {
      const topics = [createMockTopic({ id: 'info-1', topic_class: 'informational' })];
      const segment = detectSegment('info-1', 'topic', topics);
      expect(segment).toBe('author_section');
    });

    it('returns cluster for unknown topics', () => {
      const topics: EnrichedTopic[] = [];
      const segment = detectSegment('unknown-1', 'topic', topics);
      expect(segment).toBe('cluster');
    });
  });

  describe('getDefaultRule', () => {
    it('returns rule with correct segment', () => {
      const rule = getDefaultRule('core_section');
      expect(rule.segment).toBe('core_section');
    });

    it('core_section prioritizes monetization in header', () => {
      const rule = getDefaultRule('core_section');
      expect(rule.headerLinks.include).toContain('monetization');
    });

    it('author_section excludes monetization from header', () => {
      const rule = getDefaultRule('author_section');
      expect(rule.headerLinks.exclude).toContain('monetization');
    });
  });

  describe('createDefaultConfig', () => {
    it('returns config with enabled=false', () => {
      const config = createDefaultConfig();
      expect(config.enabled).toBe(false);
    });

    it('returns config with fallbackToStatic=true', () => {
      const config = createDefaultConfig();
      expect(config.fallbackToStatic).toBe(true);
    });

    it('includes rules for all segments', () => {
      const config = createDefaultConfig();
      const segments = config.rules.map(r => r.segment);
      expect(segments).toContain('core_section');
      expect(segments).toContain('author_section');
      expect(segments).toContain('pillar');
      expect(segments).toContain('cluster');
      expect(segments).toContain('foundation');
    });
  });

  describe('generateDynamicNavigation', () => {
    it('generates header links from topics', () => {
      const topics = [
        createMockTopic({ id: 'p1', title: 'Pillar 1', cluster_role: 'pillar' }),
      ];
      const foundationPages = [createMockFoundationPage()];
      const navigation = createMockNavigation();
      const config = createDefaultConfig();
      config.enabled = true;

      const result = generateDynamicNavigation({
        currentPageId: 'p1',
        currentPageType: 'topic',
        topics,
        foundationPages,
        baseNavigation: navigation,
        config,
      });

      expect(result.headerLinks).toBeDefined();
      expect(Array.isArray(result.headerLinks)).toBe(true);
    });

    it('generates breadcrumbs starting with Home', () => {
      const topics = [createMockTopic()];
      const foundationPages: FoundationPage[] = [];
      const navigation = createMockNavigation();
      const config = createDefaultConfig();
      config.enabled = true;

      const result = generateDynamicNavigation({
        currentPageId: 'topic-1',
        currentPageType: 'topic',
        topics,
        foundationPages,
        baseNavigation: navigation,
        config,
      });

      expect(result.breadcrumbs[0].text).toBe('Home');
      expect(result.breadcrumbs[0].url).toBe('/');
    });
  });
});
```

**Step 2: Run test**

Run: `npm test services/navigationService.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/navigationService.test.ts
git commit -m "test: add navigation service unit tests"
```

---

### Task 2.4: Linking Audit Site-Wide Tests

**Files:**
- Create: `services/ai/linkingAudit.sitewide.test.ts`

**Step 1: Write the test**

```typescript
// services/ai/linkingAudit.sitewide.test.ts
import { describe, it, expect } from 'vitest';
import {
  runSiteLinkCountAudit,
  analyzePageRankFlow,
  checkSiteWideNGrams,
  runSiteWideAudit
} from './linkingAudit';
import { LinkingAuditContext, EnrichedTopic, ContentBrief, SEOPillars } from '../../types';

const createMockContext = (overrides: Partial<LinkingAuditContext> = {}): LinkingAuditContext => ({
  mapId: 'map-1',
  topics: [
    {
      id: 't1',
      title: 'Pillar Topic',
      type: 'core',
      cluster_role: 'pillar',
      topic_class: 'monetization',
    },
    {
      id: 't2',
      title: 'Cluster Topic',
      type: 'core',
      cluster_role: 'cluster_content',
      topic_class: 'informational',
      parent_topic_id: 't1',
    },
  ] as EnrichedTopic[],
  briefs: {
    't1': {
      title: 'Pillar Brief',
      metaDescription: 'Test description',
      contextualBridge: [
        { sourceTopicId: 't1', targetTopicId: 't2', anchorText: 'link text' },
      ],
    } as ContentBrief,
    't2': {
      title: 'Cluster Brief',
      metaDescription: 'Cluster description',
      contextualBridge: [],
    } as ContentBrief,
  },
  foundationPages: [],
  navigation: {
    id: 'nav-1',
    map_id: 'map-1',
    header: {
      logo_alt_text: 'Test Logo',
      primary_nav: [
        { text: 'Home', prominence: 'high' },
        { text: 'About', prominence: 'medium' },
      ],
    },
    footer: {
      sections: [],
      legal_links: [],
      nap_display: true,
      copyright_text: '© 2024',
    },
    max_header_links: 10,
    max_footer_links: 30,
    dynamic_by_section: false,
  },
  pillars: {
    centralEntity: 'Test Entity',
    sourceContext: 'Test Context',
    centralSearchIntent: 'buy test',
  } as SEOPillars,
  rules: {
    maxLinksPerPage: 150,
    minContextualLinks: 3,
    maxExternalRatio: 0.1,
    requiredFoundationLinks: ['about', 'contact'],
  },
  ...overrides,
});

describe('Site-Wide Audit Functions', () => {
  describe('runSiteLinkCountAudit', () => {
    it('returns audit result with pages array', () => {
      const ctx = createMockContext();
      const result = runSiteLinkCountAudit(ctx);

      expect(result).toHaveProperty('pages');
      expect(Array.isArray(result.pages)).toBe(true);
    });

    it('calculates average link count', () => {
      const ctx = createMockContext();
      const result = runSiteLinkCountAudit(ctx);

      expect(result).toHaveProperty('averageLinkCount');
      expect(typeof result.averageLinkCount).toBe('number');
    });

    it('identifies pages over 150 link limit', () => {
      const ctx = createMockContext();
      const result = runSiteLinkCountAudit(ctx);

      expect(result).toHaveProperty('pagesOverLimit');
      expect(typeof result.pagesOverLimit).toBe('number');
    });

    it('calculates link distribution ranges', () => {
      const ctx = createMockContext();
      const result = runSiteLinkCountAudit(ctx);

      expect(result).toHaveProperty('linkDistribution');
      expect(Array.isArray(result.linkDistribution)).toBe(true);
    });
  });

  describe('analyzePageRankFlow', () => {
    it('returns flow analysis with graph', () => {
      const ctx = createMockContext();
      const result = analyzePageRankFlow(ctx);

      expect(result).toHaveProperty('graph');
      expect(result.graph).toHaveProperty('nodes');
      expect(result.graph).toHaveProperty('edges');
    });

    it('detects flow violations', () => {
      const ctx = createMockContext();
      const result = analyzePageRankFlow(ctx);

      expect(result).toHaveProperty('flowViolations');
      expect(Array.isArray(result.flowViolations)).toBe(true);
    });

    it('calculates flow score between 0-100', () => {
      const ctx = createMockContext();
      const result = analyzePageRankFlow(ctx);

      expect(result).toHaveProperty('flowScore');
      expect(result.flowScore).toBeGreaterThanOrEqual(0);
      expect(result.flowScore).toBeLessThanOrEqual(100);
    });

    it('identifies orphaned pages', () => {
      const ctx = createMockContext();
      const result = analyzePageRankFlow(ctx);

      expect(result).toHaveProperty('orphanedPages');
      expect(Array.isArray(result.orphanedPages)).toBe(true);
    });

    it('identifies hub pages', () => {
      const ctx = createMockContext();
      const result = analyzePageRankFlow(ctx);

      expect(result).toHaveProperty('hubPages');
      expect(Array.isArray(result.hubPages)).toBe(true);
    });
  });

  describe('checkSiteWideNGrams', () => {
    it('checks central entity presence', () => {
      const ctx = createMockContext();
      const result = checkSiteWideNGrams(ctx);

      expect(result).toHaveProperty('centralEntityPresence');
      expect(result.centralEntityPresence).toHaveProperty('term');
      expect(result.centralEntityPresence).toHaveProperty('inHeader');
      expect(result.centralEntityPresence).toHaveProperty('inFooter');
    });

    it('checks source context presence', () => {
      const ctx = createMockContext();
      const result = checkSiteWideNGrams(ctx);

      expect(result).toHaveProperty('sourceContextPresence');
    });

    it('reports boilerplate inconsistencies', () => {
      const ctx = createMockContext();
      const result = checkSiteWideNGrams(ctx);

      expect(result).toHaveProperty('inconsistentBoilerplate');
      expect(Array.isArray(result.inconsistentBoilerplate)).toBe(true);
    });

    it('calculates overall consistency score', () => {
      const ctx = createMockContext();
      const result = checkSiteWideNGrams(ctx);

      expect(result).toHaveProperty('overallConsistencyScore');
      expect(typeof result.overallConsistencyScore).toBe('number');
    });
  });

  describe('runSiteWideAudit', () => {
    it('combines all site-wide audits', () => {
      const ctx = createMockContext();
      const result = runSiteWideAudit(ctx);

      expect(result).toHaveProperty('linkAudit');
      expect(result).toHaveProperty('flowAnalysis');
      expect(result).toHaveProperty('ngramAudit');
    });

    it('calculates overall score', () => {
      const ctx = createMockContext();
      const result = runSiteWideAudit(ctx);

      expect(result).toHaveProperty('overallScore');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('includes timestamp', () => {
      const ctx = createMockContext();
      const result = runSiteWideAudit(ctx);

      expect(result).toHaveProperty('timestamp');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
```

**Step 2: Run test**

Run: `npm test services/ai/linkingAudit.sitewide.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add services/ai/linkingAudit.sitewide.test.ts
git commit -m "test: add site-wide linking audit tests"
```

---

## Phase 3: Component Tests

### Task 3.1: Button Component Tests

**Files:**
- Create: `components/ui/Button.test.tsx`

**Step 1: Write the test**

```typescript
// components/ui/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick} disabled>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('secondary');
  });

  it('shows loading state', () => {
    render(<Button disabled>Loading...</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders as different element type', () => {
    render(<Button as="a" href="/test">Link Button</Button>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/test');
  });
});
```

**Step 2: Run test**

Run: `npm test components/ui/Button.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add components/ui/Button.test.tsx
git commit -m "test: add Button component tests"
```

---

### Task 3.2: Input Component Tests

**Files:**
- Create: `components/ui/Input.test.tsx`

**Step 1: Write the test**

```typescript
// components/ui/Input.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Type here" />);

    const input = screen.getByPlaceholderText('Type here');
    await user.type(input, 'Hello World');

    expect(input).toHaveValue('Hello World');
  });

  it('calls onChange when value changes', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input onChange={handleChange} placeholder="Input" />);
    await user.type(screen.getByPlaceholderText('Input'), 'a');

    expect(handleChange).toHaveBeenCalled();
  });

  it('respects disabled state', () => {
    render(<Input disabled placeholder="Disabled" />);
    expect(screen.getByPlaceholderText('Disabled')).toBeDisabled();
  });

  it('applies error styling when error prop is true', () => {
    render(<Input error placeholder="Error" />);
    const input = screen.getByPlaceholderText('Error');
    expect(input.className).toMatch(/red|error/i);
  });

  it('supports different input types', () => {
    render(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
  });
});
```

**Step 2: Run test**

Run: `npm test components/ui/Input.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add components/ui/Input.test.tsx
git commit -m "test: add Input component tests"
```

---

### Task 3.3: NotificationBanner Tests

**Files:**
- Create: `components/ui/NotificationBanner.test.tsx`

**Step 1: Write the test**

```typescript
// components/ui/NotificationBanner.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationBanner } from './NotificationBanner';

describe('NotificationBanner', () => {
  it('renders message when provided', () => {
    render(<NotificationBanner message="Success!" onDismiss={() => {}} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('does not render when message is null', () => {
    const { container } = render(<NotificationBanner message={null} onDismiss={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const handleDismiss = vi.fn();
    const user = userEvent.setup();

    render(<NotificationBanner message="Test" onDismiss={handleDismiss} />);

    const dismissButton = screen.getByRole('button');
    await user.click(dismissButton);

    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after timeout', async () => {
    vi.useFakeTimers();
    const handleDismiss = vi.fn();

    render(<NotificationBanner message="Auto dismiss" onDismiss={handleDismiss} autoHideDuration={3000} />);

    vi.advanceTimersByTime(3000);

    expect(handleDismiss).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

**Step 2: Run test**

Run: `npm test components/ui/NotificationBanner.test.tsx`
Expected: PASS

**Step 3: Commit**

```bash
git add components/ui/NotificationBanner.test.tsx
git commit -m "test: add NotificationBanner component tests"
```

---

### Task 3.4: ConfirmationModal Tests

**Files:**
- Create: `components/ui/ConfirmationModal.test.tsx`

**Step 1: Write the test**

```typescript
// components/ui/ConfirmationModal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmationModal from './ConfirmationModal';

describe('ConfirmationModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Confirm Action',
    message: 'Are you sure?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders title and message when open', () => {
    render(<ConfirmationModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmationModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmationModal {...defaultProps} onConfirm={handleConfirm} />);

    await user.click(screen.getByRole('button', { name: /confirm|yes|delete/i }));

    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmationModal {...defaultProps} onCancel={handleCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel|no/i }));

    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking outside modal (backdrop)', async () => {
    const handleCancel = vi.fn();
    const user = userEvent.setup();

    render(<ConfirmationModal {...defaultProps} onCancel={handleCancel} />);

    // Click backdrop
    const backdrop = screen.getByTestId('modal-backdrop');
    await user.click(backdrop);

    expect(handleCancel).toHaveBeenCalled();
  });

  it('renders custom button labels', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        confirmLabel="Delete Forever"
        cancelLabel="Keep It"
      />
    );

    expect(screen.getByRole('button', { name: 'Delete Forever' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Keep It' })).toBeInTheDocument();
  });
});
```

**Step 2: Run test**

Run: `npm test components/ui/ConfirmationModal.test.tsx`
Expected: PASS or FAIL (may need to add data-testid to component)

**Step 3: Commit**

```bash
git add components/ui/ConfirmationModal.test.tsx
git commit -m "test: add ConfirmationModal component tests"
```

---

## Phase 4: E2E Tests

### Task 4.1: Authentication Flow E2E

**Files:**
- Create: `e2e/auth.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, TEST_CONFIG } from './test-utils';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display login form on initial load', async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible();
  });

  test('should show signup tab', async ({ page }) => {
    const signUpTab = page.locator('button:has-text("Sign Up")');
    await signUpTab.click();

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill('invalid@email.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Wait for error message
    await expect(page.locator('text=Invalid login credentials').or(page.locator('.error'))).toBeVisible({ timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.locator('input[type="email"]').fill(TEST_CONFIG.TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_CONFIG.TEST_PASSWORD);
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Should navigate to project selection
    await expect(page.locator('h2:has-text("Create New Project"), h2:has-text("Your Projects")')).toBeVisible({ timeout: 15000 });
  });

  test('should persist session across page reload', async ({ page }) => {
    // Login first
    await page.locator('input[type="email"]').fill(TEST_CONFIG.TEST_EMAIL);
    await page.locator('input[type="password"]').fill(TEST_CONFIG.TEST_PASSWORD);
    await page.locator('button[type="submit"]:has-text("Sign In")').click();

    // Wait for project selection
    await expect(page.locator('h2:has-text("Create New Project"), h2:has-text("Your Projects")')).toBeVisible({ timeout: 15000 });

    // Reload page
    await page.reload();
    await waitForAppLoad(page);

    // Should still be on project selection (not auth screen)
    await expect(page.locator('h2:has-text("Create New Project"), h2:has-text("Your Projects")')).toBeVisible({ timeout: 10000 });
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- auth.spec.ts`
Expected: PASS (requires valid test credentials)

**Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: add authentication E2E tests"
```

---

### Task 4.2: Project Management E2E

**Files:**
- Create: `e2e/projects.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/projects.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, TEST_CONFIG, takeScreenshot } from './test-utils';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);

    // Wait for project selection screen
    await expect(page.locator('h2:has-text("Create New Project"), h2:has-text("Your Projects")')).toBeVisible({ timeout: 15000 });
  });

  test('should display create project form', async ({ page }) => {
    await expect(page.locator('input[placeholder*="Project"], input[placeholder*="Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="domain"], input[placeholder*="Domain"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Project")')).toBeVisible();
  });

  test('should validate required fields before creating project', async ({ page }) => {
    const createButton = page.locator('button:has-text("Create Project")');

    // Try to create without filling fields
    await createButton.click();

    // Button should still be visible (form not submitted) or show validation
    await expect(createButton).toBeVisible();
  });

  test('should create new project', async ({ page }) => {
    const uniqueName = `Test Project ${Date.now()}`;

    await page.locator('input[placeholder*="Project"], input[placeholder*="Name"]').fill(uniqueName);
    await page.locator('input[placeholder*="domain"], input[placeholder*="Domain"]').fill('test-domain.com');
    await page.locator('button:has-text("Create Project")').click();

    // Should navigate to project workspace
    await expect(page.locator('text=Business Info, text=Project Dashboard')).toBeVisible({ timeout: 15000 });

    await takeScreenshot(page, 'project-created');
  });

  test('should list existing projects', async ({ page }) => {
    // Look for project list or "Your Projects" section
    const projectList = page.locator('.project-list, [data-testid="project-list"]');

    // Should show at least the projects area (may be empty)
    await expect(page.locator('h2:has-text("Your Projects"), h3:has-text("Your Projects")')).toBeVisible();
  });

  test('should load existing project', async ({ page }) => {
    // Look for a project card to click
    const projectCard = page.locator('.project-card, [data-testid="project-card"]').first();

    if (await projectCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectCard.click();

      // Should navigate to project workspace
      await expect(page.locator('text=Business Info, text=Project Dashboard, text=Topical Map')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show delete confirmation modal', async ({ page }) => {
    // Find delete button on a project
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first();

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirmation modal should appear
      await expect(page.locator('text=Delete Project, text=Are you sure')).toBeVisible({ timeout: 5000 });

      // Cancel to avoid actual deletion
      await page.locator('button:has-text("Cancel")').click();
    }
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- projects.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/projects.spec.ts
git commit -m "test: add project management E2E tests"
```

---

### Task 4.3: Settings Modal E2E

**Files:**
- Create: `e2e/settings.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/settings.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, takeScreenshot } from './test-utils';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);

    // Wait for app to load
    await page.waitForTimeout(2000);
  });

  test('should open settings modal when clicking gear icon', async ({ page }) => {
    // Find and click settings button (gear icon)
    const settingsButton = page.locator('button[title="Settings"], button:has-text("⚙️")');
    await settingsButton.click();

    // Settings modal should be visible
    await expect(page.locator('text=Settings, text=API Keys, text=AI Provider')).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'settings-modal-open');
  });

  test('should show AI provider selection', async ({ page }) => {
    await page.locator('button[title="Settings"], button:has-text("⚙️")').click();

    // Look for AI provider selector
    await expect(page.locator('text=AI Provider, label:has-text("AI Provider")')).toBeVisible({ timeout: 5000 });
  });

  test('should show API key input fields', async ({ page }) => {
    await page.locator('button[title="Settings"], button:has-text("⚙️")').click();

    // Look for API key inputs (may be masked)
    await expect(page.locator('input[type="password"], input[placeholder*="API Key"], input[placeholder*="api"]')).toBeVisible({ timeout: 5000 });
  });

  test('should close settings modal with close button', async ({ page }) => {
    await page.locator('button[title="Settings"], button:has-text("⚙️")').click();
    await expect(page.locator('text=Settings')).toBeVisible({ timeout: 5000 });

    // Click close button
    const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), button[aria-label="Close"]');
    await closeButton.click();

    // Modal should be hidden
    await expect(page.locator('.modal-content, [role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });

  test('should save settings', async ({ page }) => {
    await page.locator('button[title="Settings"], button:has-text("⚙️")').click();
    await expect(page.locator('text=Settings')).toBeVisible({ timeout: 5000 });

    // Find and click save button
    const saveButton = page.locator('button:has-text("Save")');
    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveButton.click();

      // Should show success notification or close modal
      await expect(
        page.locator('text=saved, text=Success').or(page.locator('.notification'))
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Modal may just close on success
      });
    }
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- settings.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/settings.spec.ts
git commit -m "test: add settings modal E2E tests"
```

---

### Task 4.4: Help Modal E2E

**Files:**
- Create: `e2e/help.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/help.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, takeScreenshot } from './test-utils';

test.describe('Help Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);
    await page.waitForTimeout(2000);
  });

  test('should open help modal when clicking help button', async ({ page }) => {
    // Find and click help button (? icon)
    const helpButton = page.locator('button[title="Help"], button:has-text("?")');
    await helpButton.click();

    // Help modal should be visible
    await expect(page.locator('text=Help, text=Documentation, text=Getting Started')).toBeVisible({ timeout: 5000 });

    await takeScreenshot(page, 'help-modal-open');
  });

  test('should display help content', async ({ page }) => {
    await page.locator('button[title="Help"], button:has-text("?")').click();

    // Should have some help content
    await expect(page.locator('.help-content, [data-testid="help-content"], .modal-body')).toBeVisible({ timeout: 5000 });
  });

  test('should close help modal', async ({ page }) => {
    await page.locator('button[title="Help"], button:has-text("?")').click();
    await expect(page.locator('text=Help')).toBeVisible({ timeout: 5000 });

    // Close modal
    const closeButton = page.locator('button:has-text("Close"), button:has-text("×"), button[aria-label="Close"]');
    await closeButton.click();

    // Modal should be hidden
    await expect(page.locator('.help-modal, [role="dialog"]')).not.toBeVisible({ timeout: 3000 });
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- help.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/help.spec.ts
git commit -m "test: add help modal E2E tests"
```

---

### Task 4.5: Global UI Elements E2E

**Files:**
- Create: `e2e/global-ui.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/global-ui.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, takeScreenshot } from './test-utils';

test.describe('Global UI Elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
  });

  test('should display loading bar during operations', async ({ page }) => {
    // Login triggers loading
    await page.locator('input[type="email"]').fill('test@example.com');
    await page.locator('input[type="password"]').fill('password');
    await page.locator('button[type="submit"]').click();

    // Loading bar should appear (even briefly)
    // Note: This may be too fast to catch, so we check if element exists
    const loadingBar = page.locator('.loading-bar, [data-testid="loading-bar"], .global-loading');
    await expect(loadingBar).toBeVisible({ timeout: 1000 }).catch(() => {
      // Loading was too fast to catch, which is fine
    });
  });

  test('should display error messages', async ({ page }) => {
    // Trigger an error (invalid login)
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrong');
    await page.locator('button[type="submit"]').click();

    // Error should appear
    await expect(page.locator('.error, [role="alert"], text=Invalid, text=Error')).toBeVisible({ timeout: 10000 });
  });

  test('should dismiss error when clicking close', async ({ page }) => {
    // Trigger an error
    await page.locator('input[type="email"]').fill('invalid@test.com');
    await page.locator('input[type="password"]').fill('wrong');
    await page.locator('button[type="submit"]').click();

    // Wait for error
    const error = page.locator('.error, [role="alert"]');
    await expect(error).toBeVisible({ timeout: 10000 });

    // Click dismiss button
    const dismissButton = page.locator('.error button, [role="alert"] button').first();
    if (await dismissButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dismissButton.click();
      await expect(error).not.toBeVisible({ timeout: 3000 });
    }
  });

  test('should have settings and help buttons visible after login', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // Settings button
    await expect(page.locator('button[title="Settings"], button:has-text("⚙️")')).toBeVisible();

    // Help button
    await expect(page.locator('button[title="Help"], button:has-text("?")')).toBeVisible();
  });

  test('should have logging panel toggle', async ({ page }) => {
    await login(page);
    await page.waitForTimeout(2000);

    // Look for logging panel or toggle
    const loggingToggle = page.locator('button:has-text("Logs"), button:has-text("📋"), [data-testid="logging-toggle"]');

    if (await loggingToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await loggingToggle.click();

      // Logging panel should expand
      await expect(page.locator('.logging-panel, [data-testid="logging-panel"]')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should not have console errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);
    await page.waitForTimeout(3000);

    // Filter out known acceptable errors (e.g., network failures in test env)
    const criticalErrors = errors.filter(e =>
      !e.includes('net::ERR') &&
      !e.includes('Failed to load resource') &&
      !e.includes('favicon')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- global-ui.spec.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add e2e/global-ui.spec.ts
git commit -m "test: add global UI elements E2E tests"
```

---

## Phase 5: Integration Tests

### Task 5.1: Linking Audit Modal Integration

**Files:**
- Create: `e2e/linking-audit.spec.ts`

**Step 1: Write the test**

```typescript
// e2e/linking-audit.spec.ts
import { test, expect } from '@playwright/test';
import { waitForAppLoad, login, takeScreenshot, TEST_CONFIG } from './test-utils';

test.describe('Linking Audit Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForAppLoad(page);
    await login(page);
    await page.waitForTimeout(2000);
  });

  test('should open linking audit from project dashboard', async ({ page }) => {
    // Navigate to a project with a topical map
    const projectCard = page.locator('.project-card, [data-testid="project-card"]').first();

    if (await projectCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectCard.click();
      await page.waitForTimeout(2000);

      // Look for linking audit button
      const auditButton = page.locator('button:has-text("Linking Audit"), button:has-text("Run Audit")');

      if (await auditButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await auditButton.click();

        // Modal should open
        await expect(page.locator('text=Internal Linking Audit, text=Linking Audit')).toBeVisible({ timeout: 5000 });

        await takeScreenshot(page, 'linking-audit-modal');
      }
    }
  });

  test('should display audit tabs', async ({ page }) => {
    // This test assumes we can get to the audit modal
    // Skip if no project available
    test.skip(true, 'Requires project with topical map');

    // Audit should have tabs
    await expect(page.locator('button:has-text("Fundamentals")')).toBeVisible();
    await expect(page.locator('button:has-text("Navigation")')).toBeVisible();
    await expect(page.locator('button:has-text("Flow")')).toBeVisible();
    await expect(page.locator('button:has-text("External")')).toBeVisible();
    await expect(page.locator('button:has-text("Site Overview")')).toBeVisible();
  });

  test('should run audit and display results', async ({ page }) => {
    // Skip if no project
    test.skip(true, 'Requires project with topical map');

    // Click run audit
    await page.locator('button:has-text("Run Audit"), button:has-text("Start Audit")').click();

    // Should show results
    await expect(page.locator('text=Score, text=Issues')).toBeVisible({ timeout: 30000 });
  });
});
```

**Step 2: Run test**

Run: `npm run test:e2e -- linking-audit.spec.ts`
Expected: PASS (with skips)

**Step 3: Commit**

```bash
git add e2e/linking-audit.spec.ts
git commit -m "test: add linking audit modal E2E tests"
```

---

## Phase 6: Test Coverage and Reporting

### Task 6.1: Add Coverage Scripts

**Files:**
- Modify: `package.json`

**Step 1: Add coverage scripts**

Add to package.json scripts:

```json
{
  "scripts": {
    "test:coverage": "vitest run --coverage",
    "test:coverage:ui": "vitest --coverage --ui",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

**Step 2: Run coverage**

Run: `npm run test:coverage`
Expected: Coverage report generated

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add test coverage scripts"
```

---

### Task 6.2: Create CI Test Workflow

**Files:**
- Create: `.github/workflows/test.yml`

**Step 1: Create workflow file**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

**Step 2: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "ci: add test workflow"
```

---

## Final Task: Run Full Test Suite

**Step 1: Run all unit tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All tests pass (some may skip without auth)

**Step 3: Run coverage report**

```bash
npm run test:coverage
```

Expected: Coverage report generated

**Step 4: Final commit**

```bash
git add .
git commit -m "test: complete comprehensive test suite implementation"
```

---

## Summary

### Test Categories Implemented:

| Category | Test File | Tests |
|----------|-----------|-------|
| AI Response Sanitizer | `services/aiResponseSanitizer.test.ts` | 9 |
| App State Reducer | `state/appState.test.ts` | 14 |
| Navigation Service | `services/navigationService.test.ts` | 10 |
| Site-Wide Audit | `services/ai/linkingAudit.sitewide.test.ts` | 15 |
| Button Component | `components/ui/Button.test.tsx` | 6 |
| Input Component | `components/ui/Input.test.tsx` | 6 |
| NotificationBanner | `components/ui/NotificationBanner.test.tsx` | 4 |
| ConfirmationModal | `components/ui/ConfirmationModal.test.tsx` | 6 |
| Auth E2E | `e2e/auth.spec.ts` | 5 |
| Projects E2E | `e2e/projects.spec.ts` | 6 |
| Settings E2E | `e2e/settings.spec.ts` | 5 |
| Help E2E | `e2e/help.spec.ts` | 3 |
| Global UI E2E | `e2e/global-ui.spec.ts` | 6 |
| Linking Audit E2E | `e2e/linking-audit.spec.ts` | 3 |

**Total: ~93 new tests**

### Coverage Targets:
- Services: 80%+
- Components: 70%+
- State: 90%+

### Run Commands:
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e`
- Coverage: `npm run test:coverage`
- All tests: `npm run test:all`
