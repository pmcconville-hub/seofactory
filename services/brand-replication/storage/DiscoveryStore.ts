// services/brand-replication/storage/DiscoveryStore.ts

import type { DiscoveryOutput, DiscoveredComponent } from '../interfaces';
import type { StorageAdapter } from './types';

export class DiscoveryStore {
  private adapter: StorageAdapter;
  private prefix = 'discovery:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string): string {
    return `${this.prefix}${brandId}`;
  }

  async get(brandId: string): Promise<DiscoveryOutput | null> {
    return this.adapter.get<DiscoveryOutput>(this.key(brandId));
  }

  async save(output: DiscoveryOutput): Promise<void> {
    await this.adapter.set(this.key(output.brandId), output);
  }

  async update(brandId: string, changes: Partial<DiscoveryOutput>): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    await this.adapter.set(this.key(brandId), { ...existing, ...changes });
  }

  async updateComponent(
    brandId: string,
    componentId: string,
    changes: Partial<DiscoveredComponent>
  ): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);

    const componentIndex = existing.discoveredComponents.findIndex(c => c.id === componentId);
    if (componentIndex === -1) throw new Error(`Component not found: ${componentId}`);

    existing.discoveredComponents[componentIndex] = {
      ...existing.discoveredComponents[componentIndex],
      ...changes,
    };
    await this.adapter.set(this.key(brandId), existing);
  }

  async addComponent(brandId: string, component: DiscoveredComponent): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    existing.discoveredComponents.push(component);
    await this.adapter.set(this.key(brandId), existing);
  }

  async removeComponent(brandId: string, componentId: string): Promise<void> {
    const existing = await this.get(brandId);
    if (!existing) throw new Error(`Discovery not found for brand: ${brandId}`);
    existing.discoveredComponents = existing.discoveredComponents.filter(c => c.id !== componentId);
    await this.adapter.set(this.key(brandId), existing);
  }

  async delete(brandId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId));
  }

  async listBrands(): Promise<string[]> {
    const keys = await this.adapter.list(this.prefix);
    return keys.map(k => k.replace(this.prefix, ''));
  }
}
