export interface DiscoveredPage {
  id: string;
  url: string;
  detectedCE?: string;
  detectedSC?: string;
  detectedCSI?: string;
  auditScore?: number;
  gscClicks?: number;
  pageTitle?: string;
  pageH1?: string;
}

export interface DiscoveredCluster {
  suggestedTopicTitle: string;
  pages: DiscoveredPage[];
  coreOrOuter: 'core' | 'outer';
  detectedCE: string;
  avgAlignmentScore: number;
  totalTraffic: number;
}

export interface DiscoveredSiteStructure {
  clusters: DiscoveredCluster[];
  orphans: DiscoveredPage[];
  suggestedHierarchy: {
    parentCluster: string;
    childClusters: string[];
  }[];
}

export class SiteStructureDiscoveryService {
  discoverStructure(pages: DiscoveredPage[]): DiscoveredSiteStructure {
    const ceGroups = new Map<string, DiscoveredPage[]>();
    const orphans: DiscoveredPage[] = [];

    for (const page of pages) {
      if (page.detectedCE) {
        const existing = ceGroups.get(page.detectedCE) || [];
        existing.push(page);
        ceGroups.set(page.detectedCE, existing);
      } else {
        orphans.push(page);
      }
    }

    const clusters: DiscoveredCluster[] = [];
    for (const [ce, groupPages] of ceGroups) {
      const totalTraffic = groupPages.reduce((sum, p) => sum + (p.gscClicks || 0), 0);
      const avgScore = groupPages.reduce((sum, p) => sum + (p.auditScore || 50), 0) / groupPages.length;
      const isCore = groupPages.length >= 2 && totalTraffic >= 50;

      clusters.push({
        suggestedTopicTitle: ce,
        pages: groupPages,
        coreOrOuter: isCore ? 'core' : 'outer',
        detectedCE: ce,
        avgAlignmentScore: Math.round(avgScore),
        totalTraffic,
      });
    }

    clusters.sort((a, b) => b.totalTraffic - a.totalTraffic);

    const hierarchy = this.detectHierarchy(clusters);

    return { clusters, orphans, suggestedHierarchy: hierarchy };
  }

  private detectHierarchy(clusters: DiscoveredCluster[]): DiscoveredSiteStructure['suggestedHierarchy'] {
    const hierarchy: DiscoveredSiteStructure['suggestedHierarchy'] = [];

    for (const parent of clusters) {
      const children = clusters.filter(child =>
        child.detectedCE !== parent.detectedCE &&
        child.detectedCE.toLowerCase().includes(parent.detectedCE.toLowerCase()) &&
        child.totalTraffic < parent.totalTraffic
      );

      if (children.length > 0) {
        hierarchy.push({
          parentCluster: parent.detectedCE,
          childClusters: children.map(c => c.detectedCE),
        });
      }
    }

    return hierarchy;
  }
}
