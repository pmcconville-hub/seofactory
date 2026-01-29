// services/brand-replication/storage/index.ts

export * from './types';
export * from './DiscoveryStore';
export * from './ComponentStore';
export * from './DecisionStore';
export * from './ValidationStore';

import type { StorageAdapter } from './types';
import { DiscoveryStore } from './DiscoveryStore';
import { ComponentStore } from './ComponentStore';
import { DecisionStore } from './DecisionStore';
import { ValidationStore } from './ValidationStore';
import type { PipelineState } from './types';

export class PipelineStorage {
  public discovery: DiscoveryStore;
  public components: ComponentStore;
  public decisions: DecisionStore;
  public validation: ValidationStore;

  constructor(adapter: StorageAdapter) {
    this.discovery = new DiscoveryStore(adapter);
    this.components = new ComponentStore(adapter);
    this.decisions = new DecisionStore(adapter);
    this.validation = new ValidationStore(adapter);
  }

  async exportState(brandId: string): Promise<PipelineState> {
    const discovery = await this.discovery.get(brandId);
    const components = await this.components.getAll(brandId);
    const articleIds = await this.decisions.listArticles(brandId);

    const decisions: Record<string, any[]> = {};
    const validations: Record<string, any> = {};

    for (const articleId of articleIds) {
      const d = await this.decisions.get(brandId, articleId);
      if (d) decisions[articleId] = d.decisions;
      const v = await this.validation.get(brandId, articleId);
      if (v) validations[articleId] = v;
    }

    return {
      brandId,
      discovery: discovery ?? undefined,
      components: components.length > 0 ? components : undefined,
      decisions: Object.keys(decisions).length > 0 ? decisions : undefined,
      validations: Object.keys(validations).length > 0 ? validations : undefined,
      exportedAt: new Date().toISOString(),
    };
  }

  async importState(state: PipelineState): Promise<void> {
    if (state.discovery) {
      await this.discovery.save(state.discovery);
    }
    if (state.components) {
      await this.components.saveAll(state.brandId, state.components);
    }
    // Decisions and validations would need their full objects to import
  }
}
