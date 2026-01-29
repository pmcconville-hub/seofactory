// services/brand-replication/storage/ComponentStore.ts

import type { BrandComponent, ComponentVariant } from '../interfaces';
import type { StorageAdapter } from './types';

export class ComponentStore {
  private adapter: StorageAdapter;
  private prefix = 'components:';

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter;
  }

  private key(brandId: string): string {
    return `${this.prefix}${brandId}`;
  }

  async getAll(brandId: string): Promise<BrandComponent[]> {
    return (await this.adapter.get<BrandComponent[]>(this.key(brandId))) ?? [];
  }

  async get(brandId: string, componentId: string): Promise<BrandComponent | null> {
    const components = await this.getAll(brandId);
    return components.find(c => c.id === componentId) ?? null;
  }

  async saveAll(brandId: string, components: BrandComponent[]): Promise<void> {
    await this.adapter.set(this.key(brandId), components);
  }

  async add(brandId: string, component: BrandComponent): Promise<void> {
    const components = await this.getAll(brandId);
    components.push(component);
    await this.adapter.set(this.key(brandId), components);
  }

  async update(
    brandId: string,
    componentId: string,
    changes: Partial<BrandComponent>
  ): Promise<void> {
    const components = await this.getAll(brandId);
    const index = components.findIndex(c => c.id === componentId);
    if (index === -1) throw new Error(`Component not found: ${componentId}`);

    components[index] = { ...components[index], ...changes, updatedAt: new Date().toISOString() };
    await this.adapter.set(this.key(brandId), components);
  }

  async updateCss(brandId: string, componentId: string, css: string): Promise<void> {
    await this.update(brandId, componentId, { css });
  }

  async updateHtml(brandId: string, componentId: string, htmlTemplate: string): Promise<void> {
    await this.update(brandId, componentId, { htmlTemplate });
  }

  async addVariant(brandId: string, componentId: string, variant: ComponentVariant): Promise<void> {
    const component = await this.get(brandId, componentId);
    if (!component) throw new Error(`Component not found: ${componentId}`);

    component.variants.push(variant);
    await this.update(brandId, componentId, { variants: component.variants });
  }

  async remove(brandId: string, componentId: string): Promise<void> {
    const components = await this.getAll(brandId);
    const filtered = components.filter(c => c.id !== componentId);
    await this.adapter.set(this.key(brandId), filtered);
  }

  async delete(brandId: string): Promise<void> {
    await this.adapter.delete(this.key(brandId));
  }
}
