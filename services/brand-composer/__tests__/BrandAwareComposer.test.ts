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
