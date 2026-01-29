// services/brand-replication/storage/__tests__/stores.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorageAdapter } from '../types';
import { DiscoveryStore } from '../DiscoveryStore';
import { ComponentStore } from '../ComponentStore';
import { DecisionStore } from '../DecisionStore';
import { ValidationStore } from '../ValidationStore';
import { PipelineStorage } from '../index';
import type {
  DiscoveryOutput,
  DiscoveredComponent,
  BrandComponent,
  ComponentVariant,
  IntelligenceOutput,
  SectionDesignDecision,
  ValidationOutput,
} from '../../interfaces';

// Test fixtures
const createDiscoveredComponent = (id: string): DiscoveredComponent => ({
  id,
  name: `Component ${id}`,
  purpose: 'Test purpose',
  visualDescription: 'Test visual description',
  usageContext: 'Test context',
  sourceScreenshots: ['screenshot1.png'],
  occurrences: 3,
  confidence: 0.85,
});

const createDiscoveryOutput = (brandId: string): DiscoveryOutput => ({
  brandId,
  brandUrl: 'https://example.com',
  analyzedPages: ['https://example.com/page1'],
  screenshots: [
    {
      url: 'https://example.com',
      path: '/screenshots/main.png',
      timestamp: new Date().toISOString(),
      viewport: { width: 1920, height: 1080 },
    },
  ],
  discoveredComponents: [
    createDiscoveredComponent('comp-1'),
    createDiscoveredComponent('comp-2'),
  ],
  rawAnalysis: 'Raw analysis text',
  timestamp: new Date().toISOString(),
  status: 'success',
});

const createBrandComponent = (id: string, brandId: string): BrandComponent => ({
  id,
  brandId,
  name: `Brand Component ${id}`,
  purpose: 'Test purpose',
  usageContext: 'Test context',
  css: '.test { color: red; }',
  htmlTemplate: '<div class="test">{{content}}</div>',
  previewHtml: '<div class="test">Preview</div>',
  sourceComponent: createDiscoveredComponent(`source-${id}`),
  matchScore: 0.9,
  variants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createSectionDesignDecision = (sectionId: string): SectionDesignDecision => ({
  sectionId,
  sectionHeading: `Section ${sectionId}`,
  component: 'TestComponent',
  componentId: 'comp-1',
  variant: 'default',
  layout: {
    columns: 1,
    width: 'medium',
    emphasis: 'standard',
  },
  reasoning: 'Test reasoning',
  semanticRole: 'content',
  contentMapping: {
    title: 'Test title',
  },
  confidence: 0.85,
});

const createIntelligenceOutput = (brandId: string, articleId: string): IntelligenceOutput => ({
  brandId,
  articleId,
  decisions: [
    createSectionDesignDecision('section-1'),
    createSectionDesignDecision('section-2'),
  ],
  overallStrategy: 'Test strategy',
  timestamp: new Date().toISOString(),
  status: 'success',
});

const createValidationOutput = (brandId: string, articleId: string): ValidationOutput => ({
  brandId,
  articleId,
  scores: {
    brandMatch: { score: 85, maxScore: 100, percentage: 85, details: [], suggestions: [] },
    designQuality: { score: 90, maxScore: 100, percentage: 90, details: [], suggestions: [] },
    userExperience: { score: 80, maxScore: 100, percentage: 80, details: [], suggestions: [] },
    overall: 85,
  },
  wowFactorChecklist: [
    {
      id: 'wow-1',
      label: 'Visual Impact',
      description: 'Strong visual hierarchy',
      required: true,
      passed: true,
    },
  ],
  passesThreshold: true,
  suggestions: ['Consider adding more whitespace'],
  timestamp: new Date().toISOString(),
  status: 'success',
});

describe('InMemoryStorageAdapter', () => {
  let adapter: InMemoryStorageAdapter;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
  });

  it('should get and set values', async () => {
    await adapter.set('key1', { value: 'test' });
    const result = await adapter.get<{ value: string }>('key1');
    expect(result).toEqual({ value: 'test' });
  });

  it('should return null for non-existent keys', async () => {
    const result = await adapter.get('non-existent');
    expect(result).toBeNull();
  });

  it('should delete values', async () => {
    await adapter.set('key1', { value: 'test' });
    await adapter.delete('key1');
    const result = await adapter.get('key1');
    expect(result).toBeNull();
  });

  it('should list keys with prefix', async () => {
    await adapter.set('prefix:key1', 'value1');
    await adapter.set('prefix:key2', 'value2');
    await adapter.set('other:key3', 'value3');

    const keys = await adapter.list('prefix:');
    expect(keys).toHaveLength(2);
    expect(keys).toContain('prefix:key1');
    expect(keys).toContain('prefix:key2');
  });

  it('should clear all values', async () => {
    await adapter.set('key1', 'value1');
    await adapter.set('key2', 'value2');
    adapter.clear();
    await expect(adapter.get('key1')).resolves.toBeNull();
    await expect(adapter.get('key2')).resolves.toBeNull();
  });
});

describe('DiscoveryStore', () => {
  let adapter: InMemoryStorageAdapter;
  let store: DiscoveryStore;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    store = new DiscoveryStore(adapter);
  });

  describe('save and get', () => {
    it('should save and retrieve discovery output', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      const result = await store.get('brand-1');
      expect(result).toEqual(discovery);
    });

    it('should return null for non-existent brand', async () => {
      const result = await store.get('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update discovery output', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      await store.update('brand-1', { status: 'partial' });

      const result = await store.get('brand-1');
      expect(result?.status).toBe('partial');
      expect(result?.brandUrl).toBe(discovery.brandUrl);
    });

    it('should throw error for non-existent brand', async () => {
      await expect(store.update('non-existent', { status: 'partial' })).rejects.toThrow(
        'Discovery not found for brand: non-existent'
      );
    });
  });

  describe('updateComponent', () => {
    it('should update a specific component', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      await store.updateComponent('brand-1', 'comp-1', { confidence: 0.95 });

      const result = await store.get('brand-1');
      const component = result?.discoveredComponents.find(c => c.id === 'comp-1');
      expect(component?.confidence).toBe(0.95);
    });

    it('should throw error for non-existent component', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      await expect(
        store.updateComponent('brand-1', 'non-existent', { confidence: 0.95 })
      ).rejects.toThrow('Component not found: non-existent');
    });
  });

  describe('addComponent', () => {
    it('should add a new component', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      const newComponent = createDiscoveredComponent('comp-3');
      await store.addComponent('brand-1', newComponent);

      const result = await store.get('brand-1');
      expect(result?.discoveredComponents).toHaveLength(3);
      expect(result?.discoveredComponents.find(c => c.id === 'comp-3')).toEqual(newComponent);
    });

    it('should throw error for non-existent brand', async () => {
      const newComponent = createDiscoveredComponent('comp-3');
      await expect(store.addComponent('non-existent', newComponent)).rejects.toThrow(
        'Discovery not found for brand: non-existent'
      );
    });
  });

  describe('removeComponent', () => {
    it('should remove a component', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      await store.removeComponent('brand-1', 'comp-1');

      const result = await store.get('brand-1');
      expect(result?.discoveredComponents).toHaveLength(1);
      expect(result?.discoveredComponents.find(c => c.id === 'comp-1')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete discovery output', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      await store.save(discovery);

      await store.delete('brand-1');

      const result = await store.get('brand-1');
      expect(result).toBeNull();
    });
  });

  describe('listBrands', () => {
    it('should list all brand IDs', async () => {
      await store.save(createDiscoveryOutput('brand-1'));
      await store.save(createDiscoveryOutput('brand-2'));

      const brands = await store.listBrands();
      expect(brands).toHaveLength(2);
      expect(brands).toContain('brand-1');
      expect(brands).toContain('brand-2');
    });
  });
});

describe('ComponentStore', () => {
  let adapter: InMemoryStorageAdapter;
  let store: ComponentStore;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    store = new ComponentStore(adapter);
  });

  describe('add and getAll', () => {
    it('should add and retrieve components', async () => {
      const component1 = createBrandComponent('comp-1', 'brand-1');
      const component2 = createBrandComponent('comp-2', 'brand-1');

      await store.add('brand-1', component1);
      await store.add('brand-1', component2);

      const result = await store.getAll('brand-1');
      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-existent brand', async () => {
      const result = await store.getAll('non-existent');
      expect(result).toEqual([]);
    });
  });

  describe('get', () => {
    it('should retrieve a specific component', async () => {
      const component = createBrandComponent('comp-1', 'brand-1');
      await store.add('brand-1', component);

      const result = await store.get('brand-1', 'comp-1');
      expect(result).toEqual(component);
    });

    it('should return null for non-existent component', async () => {
      const result = await store.get('brand-1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('saveAll', () => {
    it('should save all components at once', async () => {
      const components = [
        createBrandComponent('comp-1', 'brand-1'),
        createBrandComponent('comp-2', 'brand-1'),
      ];

      await store.saveAll('brand-1', components);

      const result = await store.getAll('brand-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update a component', async () => {
      const component = createBrandComponent('comp-1', 'brand-1');
      component.updatedAt = '2024-01-01T00:00:00Z'; // Use old timestamp to ensure update differs
      await store.add('brand-1', component);

      await store.update('brand-1', 'comp-1', { matchScore: 0.95 });

      const result = await store.get('brand-1', 'comp-1');
      expect(result?.matchScore).toBe(0.95);
      expect(result?.updatedAt).not.toBe('2024-01-01T00:00:00Z'); // Should be newer
    });

    it('should throw error for non-existent component', async () => {
      await expect(
        store.update('brand-1', 'non-existent', { matchScore: 0.95 })
      ).rejects.toThrow('Component not found: non-existent');
    });
  });

  describe('updateCss', () => {
    it('should update component CSS', async () => {
      const component = createBrandComponent('comp-1', 'brand-1');
      await store.add('brand-1', component);

      const newCss = '.updated { color: blue; }';
      await store.updateCss('brand-1', 'comp-1', newCss);

      const result = await store.get('brand-1', 'comp-1');
      expect(result?.css).toBe(newCss);
    });
  });

  describe('updateHtml', () => {
    it('should update component HTML template', async () => {
      const component = createBrandComponent('comp-1', 'brand-1');
      await store.add('brand-1', component);

      const newHtml = '<section class="updated">{{content}}</section>';
      await store.updateHtml('brand-1', 'comp-1', newHtml);

      const result = await store.get('brand-1', 'comp-1');
      expect(result?.htmlTemplate).toBe(newHtml);
    });
  });

  describe('addVariant', () => {
    it('should add a variant to a component', async () => {
      const component = createBrandComponent('comp-1', 'brand-1');
      await store.add('brand-1', component);

      const variant: ComponentVariant = {
        id: 'variant-1',
        name: 'Dark Mode',
        description: 'Dark mode variant',
        cssOverrides: '.dark { background: #000; }',
        htmlTemplate: '<div class="test dark">{{content}}</div>',
      };

      await store.addVariant('brand-1', 'comp-1', variant);

      const result = await store.get('brand-1', 'comp-1');
      expect(result?.variants).toHaveLength(1);
      expect(result?.variants[0]).toEqual(variant);
    });

    it('should throw error for non-existent component', async () => {
      const variant: ComponentVariant = {
        id: 'variant-1',
        name: 'Dark Mode',
        description: 'Dark mode variant',
        cssOverrides: '.dark { background: #000; }',
        htmlTemplate: '<div class="test dark">{{content}}</div>',
      };

      await expect(store.addVariant('brand-1', 'non-existent', variant)).rejects.toThrow(
        'Component not found: non-existent'
      );
    });
  });

  describe('remove', () => {
    it('should remove a component', async () => {
      const component1 = createBrandComponent('comp-1', 'brand-1');
      const component2 = createBrandComponent('comp-2', 'brand-1');
      await store.add('brand-1', component1);
      await store.add('brand-1', component2);

      await store.remove('brand-1', 'comp-1');

      const result = await store.getAll('brand-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('comp-2');
    });
  });

  describe('delete', () => {
    it('should delete all components for a brand', async () => {
      const component1 = createBrandComponent('comp-1', 'brand-1');
      const component2 = createBrandComponent('comp-2', 'brand-1');
      await store.add('brand-1', component1);
      await store.add('brand-1', component2);

      await store.delete('brand-1');

      const result = await store.getAll('brand-1');
      expect(result).toEqual([]);
    });
  });
});

describe('DecisionStore', () => {
  let adapter: InMemoryStorageAdapter;
  let store: DecisionStore;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    store = new DecisionStore(adapter);
  });

  describe('save and get', () => {
    it('should save and retrieve intelligence output', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      const result = await store.get('brand-1', 'article-1');
      expect(result).toEqual(output);
    });

    it('should return null for non-existent article', async () => {
      const result = await store.get('brand-1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('getDecisions', () => {
    it('should retrieve decisions for an article', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      const decisions = await store.getDecisions('brand-1', 'article-1');
      expect(decisions).toHaveLength(2);
    });

    it('should return empty array for non-existent article', async () => {
      const decisions = await store.getDecisions('brand-1', 'non-existent');
      expect(decisions).toEqual([]);
    });
  });

  describe('updateDecision', () => {
    it('should update a specific decision', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await store.updateDecision('brand-1', 'article-1', 'section-1', {
        confidence: 0.95,
      });

      const decisions = await store.getDecisions('brand-1', 'article-1');
      const updated = decisions.find(d => d.sectionId === 'section-1');
      expect(updated?.confidence).toBe(0.95);
    });

    it('should throw error for non-existent article', async () => {
      await expect(
        store.updateDecision('brand-1', 'non-existent', 'section-1', { confidence: 0.95 })
      ).rejects.toThrow('Decisions not found for article: non-existent');
    });

    it('should throw error for non-existent section', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await expect(
        store.updateDecision('brand-1', 'article-1', 'non-existent', { confidence: 0.95 })
      ).rejects.toThrow('Decision not found for section: non-existent');
    });
  });

  describe('overrideComponent', () => {
    it('should override the component selection', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await store.overrideComponent('brand-1', 'article-1', 'section-1', 'new-comp', 'NewComponent');

      const decisions = await store.getDecisions('brand-1', 'article-1');
      const updated = decisions.find(d => d.sectionId === 'section-1');
      expect(updated?.componentId).toBe('new-comp');
      expect(updated?.component).toBe('NewComponent');
      expect(updated?.reasoning).toContain('Manual override');
    });
  });

  describe('overrideLayout', () => {
    it('should override layout settings', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await store.overrideLayout('brand-1', 'article-1', 'section-1', {
        columns: 2,
        emphasis: 'hero',
      });

      const decisions = await store.getDecisions('brand-1', 'article-1');
      const updated = decisions.find(d => d.sectionId === 'section-1');
      expect(updated?.layout.columns).toBe(2);
      expect(updated?.layout.emphasis).toBe('hero');
      expect(updated?.layout.width).toBe('medium'); // Preserved from original
    });

    it('should throw error for non-existent section', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await expect(
        store.overrideLayout('brand-1', 'article-1', 'non-existent', { columns: 2 })
      ).rejects.toThrow('Decision not found for section: non-existent');
    });
  });

  describe('delete', () => {
    it('should delete decisions for an article', async () => {
      const output = createIntelligenceOutput('brand-1', 'article-1');
      await store.save(output);

      await store.delete('brand-1', 'article-1');

      const result = await store.get('brand-1', 'article-1');
      expect(result).toBeNull();
    });
  });

  describe('listArticles', () => {
    it('should list all article IDs for a brand', async () => {
      await store.save(createIntelligenceOutput('brand-1', 'article-1'));
      await store.save(createIntelligenceOutput('brand-1', 'article-2'));
      await store.save(createIntelligenceOutput('brand-2', 'article-3'));

      const articles = await store.listArticles('brand-1');
      expect(articles).toHaveLength(2);
      expect(articles).toContain('article-1');
      expect(articles).toContain('article-2');
    });
  });
});

describe('ValidationStore', () => {
  let adapter: InMemoryStorageAdapter;
  let store: ValidationStore;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    store = new ValidationStore(adapter);
  });

  describe('save and get', () => {
    it('should save and retrieve validation output', async () => {
      const output = createValidationOutput('brand-1', 'article-1');
      await store.save(output);

      const result = await store.get('brand-1', 'article-1');
      expect(result).toEqual(output);
    });

    it('should return null for non-existent article', async () => {
      const result = await store.get('brand-1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete validation output', async () => {
      const output = createValidationOutput('brand-1', 'article-1');
      await store.save(output);

      await store.delete('brand-1', 'article-1');

      const result = await store.get('brand-1', 'article-1');
      expect(result).toBeNull();
    });
  });

  describe('getLatestForBrand', () => {
    it('should return validations sorted by timestamp', async () => {
      const output1 = createValidationOutput('brand-1', 'article-1');
      output1.timestamp = '2024-01-01T10:00:00Z';

      const output2 = createValidationOutput('brand-1', 'article-2');
      output2.timestamp = '2024-01-02T10:00:00Z';

      const output3 = createValidationOutput('brand-1', 'article-3');
      output3.timestamp = '2024-01-01T15:00:00Z';

      await store.save(output1);
      await store.save(output2);
      await store.save(output3);

      const results = await store.getLatestForBrand('brand-1');
      expect(results).toHaveLength(3);
      expect(results[0].articleId).toBe('article-2'); // Most recent
      expect(results[1].articleId).toBe('article-3');
      expect(results[2].articleId).toBe('article-1');
    });

    it('should return empty array for brand with no validations', async () => {
      const results = await store.getLatestForBrand('non-existent');
      expect(results).toEqual([]);
    });
  });
});

describe('PipelineStorage', () => {
  let adapter: InMemoryStorageAdapter;
  let storage: PipelineStorage;

  beforeEach(() => {
    adapter = new InMemoryStorageAdapter();
    storage = new PipelineStorage(adapter);
  });

  describe('exportState', () => {
    it('should export complete pipeline state', async () => {
      // Save discovery
      const discovery = createDiscoveryOutput('brand-1');
      await storage.discovery.save(discovery);

      // Save components
      const component = createBrandComponent('comp-1', 'brand-1');
      await storage.components.add('brand-1', component);

      // Save decisions
      const decisions = createIntelligenceOutput('brand-1', 'article-1');
      await storage.decisions.save(decisions);

      // Save validation
      const validation = createValidationOutput('brand-1', 'article-1');
      await storage.validation.save(validation);

      const state = await storage.exportState('brand-1');

      expect(state.brandId).toBe('brand-1');
      expect(state.discovery).toEqual(discovery);
      expect(state.components).toHaveLength(1);
      expect(state.decisions).toHaveProperty('article-1');
      expect(state.validations).toHaveProperty('article-1');
      expect(state.exportedAt).toBeDefined();
    });

    it('should handle missing data gracefully', async () => {
      const state = await storage.exportState('brand-1');

      expect(state.brandId).toBe('brand-1');
      expect(state.discovery).toBeUndefined();
      expect(state.components).toBeUndefined();
      expect(state.decisions).toBeUndefined();
      expect(state.validations).toBeUndefined();
    });

    it('should export multiple articles', async () => {
      await storage.decisions.save(createIntelligenceOutput('brand-1', 'article-1'));
      await storage.decisions.save(createIntelligenceOutput('brand-1', 'article-2'));
      await storage.validation.save(createValidationOutput('brand-1', 'article-1'));

      const state = await storage.exportState('brand-1');

      expect(Object.keys(state.decisions!)).toHaveLength(2);
      expect(Object.keys(state.validations!)).toHaveLength(1);
    });
  });

  describe('importState', () => {
    it('should import pipeline state', async () => {
      const discovery = createDiscoveryOutput('brand-1');
      const components = [createBrandComponent('comp-1', 'brand-1')];

      await storage.importState({
        brandId: 'brand-1',
        discovery,
        components,
        exportedAt: new Date().toISOString(),
      });

      const importedDiscovery = await storage.discovery.get('brand-1');
      const importedComponents = await storage.components.getAll('brand-1');

      expect(importedDiscovery).toEqual(discovery);
      expect(importedComponents).toHaveLength(1);
    });

    it('should handle partial state import', async () => {
      await storage.importState({
        brandId: 'brand-1',
        exportedAt: new Date().toISOString(),
      });

      const discovery = await storage.discovery.get('brand-1');
      const components = await storage.components.getAll('brand-1');

      expect(discovery).toBeNull();
      expect(components).toEqual([]);
    });
  });

  describe('store access', () => {
    it('should expose all store instances', () => {
      expect(storage.discovery).toBeInstanceOf(DiscoveryStore);
      expect(storage.components).toBeInstanceOf(ComponentStore);
      expect(storage.decisions).toBeInstanceOf(DecisionStore);
      expect(storage.validation).toBeInstanceOf(ValidationStore);
    });
  });
});
