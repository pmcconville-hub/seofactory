// services/brand-replication/storage/DecisionStore.ts

import type { SectionDesignDecision, IntelligenceOutput } from '../interfaces';
import type { StorageAdapter } from './types';

export class DecisionStore {
  private adapter: StorageAdapter;
  private prefix = 'decisions:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string, articleId: string): string {
    return `${this.prefix}${brandId}:${articleId}`;
  }

  async get(brandId: string, articleId: string): Promise<IntelligenceOutput | null> {
    return this.adapter.get<IntelligenceOutput>(this.key(brandId, articleId));
  }

  async save(output: IntelligenceOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId, output.articleId), output);
  }

  async getDecisions(brandId: string, articleId: string): Promise<SectionDesignDecision[]> {
    const output = await this.get(brandId, articleId);
    return output?.decisions ?? [];
  }

  async updateDecision(
    brandId: string,
    articleId: string,
    sectionId: string,
    changes: Partial<SectionDesignDecision>
  ): Promise<void> {
    const output = await this.get(brandId, articleId);
    if (!output) throw new Error(`Decisions not found for article: ${articleId}`);

    const index = output.decisions.findIndex(d => d.sectionId === sectionId);
    if (index === -1) throw new Error(`Decision not found for section: ${sectionId}`);

    output.decisions[index] = { ...output.decisions[index], ...changes };
    await this.adapter.set(this.key(brandId, articleId), output);
  }

  async overrideComponent(
    brandId: string,
    articleId: string,
    sectionId: string,
    componentId: string,
    componentName: string
  ): Promise<void> {
    await this.updateDecision(brandId, articleId, sectionId, {
      componentId,
      component: componentName,
      reasoning: `Manual override: User selected ${componentName}`,
    });
  }

  async overrideLayout(
    brandId: string,
    articleId: string,
    sectionId: string,
    layout: Partial<SectionDesignDecision['layout']>
  ): Promise<void> {
    const output = await this.get(brandId, articleId);
    if (!output) throw new Error(`Decisions not found for article: ${articleId}`);

    const decision = output.decisions.find(d => d.sectionId === sectionId);
    if (!decision) throw new Error(`Decision not found for section: ${sectionId}`);

    await this.updateDecision(brandId, articleId, sectionId, {
      layout: { ...decision.layout, ...layout },
    });
  }

  async delete(brandId: string, articleId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId, articleId));
  }

  async listArticles(brandId: string): Promise<string[]> {
    const keys = await this.adapter.list(`${this.prefix}${brandId}:`);
    return keys.map(k => k.split(':').pop()!);
  }
}
