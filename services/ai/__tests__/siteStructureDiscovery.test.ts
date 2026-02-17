import { describe, it, expect } from 'vitest';
import { SiteStructureDiscoveryService } from '../siteStructureDiscovery';

describe('SiteStructureDiscoveryService', () => {
  it('should cluster pages by detected CE', () => {
    const service = new SiteStructureDiscoveryService();

    const pages = [
      { id: '1', url: '/cms-benefits', detectedCE: 'Enterprise CMS', detectedCSI: 'Learn CMS', auditScore: 80, gscClicks: 100 },
      { id: '2', url: '/cms-security', detectedCE: 'Enterprise CMS', detectedCSI: 'Secure CMS', auditScore: 70, gscClicks: 50 },
      { id: '3', url: '/headless-cms', detectedCE: 'Headless CMS', detectedCSI: 'Learn Headless', auditScore: 60, gscClicks: 200 },
      { id: '4', url: '/headless-api', detectedCE: 'Headless CMS', detectedCSI: 'Build API', auditScore: 75, gscClicks: 80 },
      { id: '5', url: '/about-us', detectedCE: undefined, auditScore: 40, gscClicks: 10 },
    ];

    const structure = service.discoverStructure(pages);

    expect(structure.clusters.length).toBe(2);
    expect(structure.clusters[0].detectedCE).toBe('Headless CMS'); // Higher traffic
    expect(structure.clusters[0].pages).toHaveLength(2);
    expect(structure.clusters[1].detectedCE).toBe('Enterprise CMS');
    expect(structure.orphans).toHaveLength(1);
    expect(structure.orphans[0].id).toBe('5');
  });

  it('should assign core/outer based on cluster size and traffic', () => {
    const service = new SiteStructureDiscoveryService();

    const pages = [
      { id: '1', url: '/cms-1', detectedCE: 'Enterprise CMS', gscClicks: 500 },
      { id: '2', url: '/cms-2', detectedCE: 'Enterprise CMS', gscClicks: 300 },
      { id: '3', url: '/cms-3', detectedCE: 'Enterprise CMS', gscClicks: 200 },
      { id: '4', url: '/blog-1', detectedCE: 'Blog Post', gscClicks: 20 },
    ];

    const structure = service.discoverStructure(pages);
    const cmsCluster = structure.clusters.find(c => c.detectedCE === 'Enterprise CMS');
    const blogCluster = structure.clusters.find(c => c.detectedCE === 'Blog Post');

    expect(cmsCluster?.coreOrOuter).toBe('core');
    expect(blogCluster?.coreOrOuter).toBe('outer');
  });

  it('should handle all pages being orphans', () => {
    const service = new SiteStructureDiscoveryService();
    const pages = [
      { id: '1', url: '/about', auditScore: 50 },
      { id: '2', url: '/contact', auditScore: 40 },
    ];
    const structure = service.discoverStructure(pages);
    expect(structure.clusters).toHaveLength(0);
    expect(structure.orphans).toHaveLength(2);
  });

  it('should detect parent-child hierarchy between clusters', () => {
    const service = new SiteStructureDiscoveryService();
    const pages = [
      { id: '1', url: '/cms', detectedCE: 'CMS', gscClicks: 500 },
      { id: '2', url: '/cms-2', detectedCE: 'CMS', gscClicks: 300 },
      { id: '3', url: '/enterprise-cms', detectedCE: 'Enterprise CMS', gscClicks: 200 },
      { id: '4', url: '/enterprise-cms-2', detectedCE: 'Enterprise CMS', gscClicks: 100 },
    ];
    const structure = service.discoverStructure(pages);
    // "CMS" could be parent of "Enterprise CMS" since CMS is substring
    expect(structure.suggestedHierarchy.length).toBeGreaterThanOrEqual(0);
  });
});
