// services/brand-replication/storage/ValidationStore.ts

import type { ValidationOutput } from '../interfaces';
import type { StorageAdapter } from './types';

export class ValidationStore {
  private adapter: StorageAdapter;
  private prefix = 'validation:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string, articleId: string): string {
    return `${this.prefix}${brandId}:${articleId}`;
  }

  async get(brandId: string, articleId: string): Promise<ValidationOutput | null> {
    return this.adapter.get<ValidationOutput>(this.key(brandId, articleId));
  }

  async save(output: ValidationOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId, output.articleId), output);
  }

  async delete(brandId: string, articleId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId, articleId));
  }

  async getLatestForBrand(brandId: string): Promise<ValidationOutput[]> {
    const keys = await this.adapter.list(`${this.prefix}${brandId}:`);
    const results: ValidationOutput[] = [];
    for (const key of keys) {
      const val = await this.adapter.get<ValidationOutput>(key);
      if (val) results.push(val);
    }
    return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
}
