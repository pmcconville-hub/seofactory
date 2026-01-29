// services/brand-replication/storage/types.ts

import type {
  DiscoveryOutput,
  BrandComponent,
  SectionDesignDecision,
  ValidationOutput,
} from '../interfaces';

export interface PipelineState {
  brandId: string;
  discovery?: DiscoveryOutput;
  components?: BrandComponent[];
  decisions?: Record<string, SectionDesignDecision[]>; // articleId -> decisions
  validations?: Record<string, ValidationOutput>; // articleId -> validation
  exportedAt: string;
}

export interface StorageAdapter {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class InMemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    return Array.from(this.store.keys()).filter(k => k.startsWith(prefix));
  }

  clear(): void {
    this.store.clear();
  }
}
