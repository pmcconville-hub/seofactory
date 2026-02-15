import type { SiteInventoryItem, EnrichedTopic, ActionType } from '../../types';
import type { AutoMatchResult, MatchResult, GapTopic } from './AutoMatchService';

// ── Result interfaces ──────────────────────────────────────────────────────

export interface PlanInput {
  inventory: SiteInventoryItem[];
  topics: EnrichedTopic[];
  matchResult: AutoMatchResult;
}

export interface PlanDataPoint {
  label: string;
  value: string;
  impact: string;
}

export interface PlannedAction {
  inventoryId: string;
  url: string;
  action: ActionType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  effort: 'none' | 'low' | 'medium' | 'high';
  reasoning: string;
  dataPoints: PlanDataPoint[];
  topicId?: string;
  mergeTargetUrl?: string;
  redirectTargetUrl?: string;
}

// ── Priority ordering for sort ─────────────────────────────────────────────

const PRIORITY_ORDER: Record<PlannedAction['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function getClicks(item: SiteInventoryItem): number {
  return item.gsc_clicks ?? 0;
}

function getAuditScore(item: SiteInventoryItem): number {
  return item.audit_score ?? 0;
}

function buildInventoryLookup(inventory: SiteInventoryItem[]): Map<string, SiteInventoryItem> {
  const map = new Map<string, SiteInventoryItem>();
  for (const item of inventory) {
    map.set(item.id, item);
  }
  return map;
}

// ── Engine ─────────────────────────────────────────────────────────────────

export class MigrationPlanEngine {
  /**
   * Generate a deterministic, prioritized migration plan based on audit scores,
   * GSC performance, and auto-match results.
   *
   * Pure synchronous function -- no network calls, no AI, no side effects.
   */
  generatePlan(input: PlanInput): PlannedAction[] {
    const { inventory, topics, matchResult } = input;
    const inventoryLookup = buildInventoryLookup(inventory);
    const actions: PlannedAction[] = [];

    // Index matches by inventoryId for fast lookup
    const matchByInventoryId = new Map<string, MatchResult>();
    for (const match of matchResult.matches) {
      matchByInventoryId.set(match.inventoryId, match);
    }

    // Group cannibalization matches by topicId
    const cannibalizationGroups = new Map<string, MatchResult[]>();
    for (const match of matchResult.matches) {
      if (match.category === 'cannibalization' && match.topicId) {
        const existing = cannibalizationGroups.get(match.topicId) || [];
        existing.push(match);
        cannibalizationGroups.set(match.topicId, existing);
      }
    }

    // Track which cannibalization inventoryIds we already handled
    const handledCannibalizationIds = new Set<string>();

    // ── Process each match ─────────────────────────────────────────────
    for (const match of matchResult.matches) {
      const item = inventoryLookup.get(match.inventoryId);
      if (!item) continue;

      if (match.category === 'matched') {
        actions.push(this.planMatched(item, match));
      } else if (match.category === 'cannibalization') {
        // Process cannibalization as a group (once per topicId)
        if (!handledCannibalizationIds.has(match.inventoryId) && match.topicId) {
          const group = cannibalizationGroups.get(match.topicId);
          if (group) {
            const groupActions = this.planCannibalization(group, inventoryLookup, topics);
            actions.push(...groupActions);
            for (const m of group) {
              handledCannibalizationIds.add(m.inventoryId);
            }
          }
        }
      } else if (match.category === 'orphan') {
        actions.push(this.planOrphan(item, match));
      }
    }

    // ── Gap topics (CREATE_NEW) ────────────────────────────────────────
    for (const gap of matchResult.gaps) {
      actions.push(this.planGap(gap, topics));
    }

    // ── Sort: priority tier first, then clicks descending ──────────────
    actions.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by clicks descending
      const aClicks = this.extractClicksFromDataPoints(a);
      const bClicks = this.extractClicksFromDataPoints(b);
      return bClicks - aClicks;
    });

    return actions;
  }

  // ── Matched URL rules ────────────────────────────────────────────────

  private planMatched(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const score = getAuditScore(item);
    const clicks = getClicks(item);

    // High quality + traffic
    if (score >= 70 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: `Page scores ${score}/100 and drives ${clicks} clicks/month. No changes needed.`,
        dataPoints: [
          { label: 'Audit Score', value: `${score}/100`, impact: 'Above quality threshold' },
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Active traffic' },
        ],
      });
    }

    // High quality + no traffic
    if (score >= 70 && clicks === 0) {
      return this.buildAction(item, match, {
        action: 'KEEP',
        priority: 'low',
        effort: 'none',
        reasoning: 'Content quality is good. Monitor for indexing/ranking improvements.',
        dataPoints: [
          { label: 'Audit Score', value: `${score}/100`, impact: 'Above quality threshold' },
          { label: 'Monthly Clicks', value: '0', impact: 'No traffic yet' },
        ],
      });
    }

    // Medium quality + traffic
    if (score >= 40 && score < 70 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'OPTIMIZE',
        priority: 'high',
        effort: 'medium',
        reasoning: `This page drives ${clicks} clicks but scores only ${score}/100. Optimization protects existing traffic.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'High traffic at risk' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low quality + traffic
    if (score < 40 && clicks > 0) {
      return this.buildAction(item, match, {
        action: 'REWRITE',
        priority: 'critical',
        effort: 'high',
        reasoning: `Low quality (${score}/100) but ${clicks} monthly clicks. Rewrite urgently to prevent ranking loss.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'High traffic at risk' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low quality + no traffic (score < 40 && clicks === 0)
    // Also covers medium quality + no traffic (score 40-69 && clicks === 0) as fallback
    return this.buildAction(item, match, {
      action: 'REWRITE',
      priority: 'medium',
      effort: 'high',
      reasoning: "Content doesn't serve the target topic. Needs fundamental rework.",
      dataPoints: [
        { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        { label: 'Monthly Clicks', value: '0', impact: 'No traffic' },
      ],
    });
  }

  // ── Cannibalization rules ────────────────────────────────────────────

  private planCannibalization(
    group: MatchResult[],
    inventoryLookup: Map<string, SiteInventoryItem>,
    topics: EnrichedTopic[],
  ): PlannedAction[] {
    const actions: PlannedAction[] = [];

    // Resolve inventory items for the group
    const groupItems = group
      .map((m) => ({
        match: m,
        item: inventoryLookup.get(m.inventoryId),
      }))
      .filter((entry): entry is { match: MatchResult; item: SiteInventoryItem } => !!entry.item);

    if (groupItems.length < 2) return actions;

    // Find the topic title for the reasoning string
    const topicId = group[0].topicId!;
    const topic = topics.find((t) => t.id === topicId);
    const topicTitle = topic?.title ?? 'unknown topic';

    // Sort by clicks descending -- the URL with the most clicks becomes the merge target
    groupItems.sort((a, b) => getClicks(b.item) - getClicks(a.item));

    const mergeTarget = groupItems[0];
    const competingUrlList = groupItems.map((g) => g.item.url);

    for (let i = 0; i < groupItems.length; i++) {
      const { item, match } = groupItems[i];
      const isMergeTarget = i === 0;

      actions.push({
        inventoryId: item.id,
        url: item.url,
        action: 'MERGE',
        priority: 'high',
        effort: 'medium',
        reasoning: isMergeTarget
          ? `Pages ${competingUrlList.join(' and ')} compete for '${topicTitle}'. This page has the most traffic -- merge content here and redirect others.`
          : `Pages ${competingUrlList.join(' and ')} compete for '${topicTitle}'. Merge into stronger page, redirect the weaker.`,
        dataPoints: [
          { label: 'Competing URLs', value: `${groupItems.length} pages`, impact: 'Diluting ranking signals' },
          { label: 'Monthly Clicks', value: String(getClicks(item)), impact: isMergeTarget ? 'Strongest page' : 'Weaker page' },
          { label: 'Topic', value: topicTitle, impact: 'Keyword cannibalization' },
        ],
        topicId,
        mergeTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
        redirectTargetUrl: isMergeTarget ? undefined : mergeTarget.item.url,
      });
    }

    return actions;
  }

  // ── Orphan URL rules ─────────────────────────────────────────────────

  private planOrphan(item: SiteInventoryItem, match: MatchResult): PlannedAction {
    const clicks = getClicks(item);
    const score = getAuditScore(item);

    // Check canonical mismatch first (highest specificity)
    if (item.google_canonical && item.google_canonical !== item.url) {
      return this.buildAction(item, match, {
        action: 'CANONICALIZE',
        priority: 'high',
        effort: 'low',
        reasoning: `Google selected a different canonical (${item.google_canonical}). Fix to consolidate ranking signals.`,
        dataPoints: [
          { label: 'Google Canonical', value: item.google_canonical, impact: 'Ranking signal dilution' },
          { label: 'Current URL', value: item.url, impact: 'Non-canonical' },
        ],
      });
    }

    // Orphan with significant traffic
    if (clicks > 10) {
      return this.buildAction(item, match, {
        action: 'REDIRECT_301',
        priority: 'high',
        effort: 'low',
        reasoning: `Gets ${clicks} clicks but doesn't match any target topic. Redirect to preserve link equity.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Traffic to preserve' },
          { label: 'Match Status', value: 'No matching topic', impact: 'Orphaned content' },
        ],
      });
    }

    // Low traffic + low quality
    if (clicks <= 10 && score < 30) {
      return this.buildAction(item, match, {
        action: 'PRUNE_410',
        priority: 'medium',
        effort: 'low',
        reasoning: `No traffic, low quality (${score}/100). Removing reduces crawl budget waste.`,
        dataPoints: [
          { label: 'Monthly Clicks', value: String(clicks), impact: 'Negligible traffic' },
          { label: 'Audit Score', value: `${score}/100`, impact: 'Below quality threshold' },
        ],
      });
    }

    // Low traffic + decent quality
    return this.buildAction(item, match, {
      action: 'KEEP',
      priority: 'low',
      effort: 'none',
      reasoning: 'Decent content but no matching topic. Consider adding to topical map or redirecting.',
      dataPoints: [
        { label: 'Monthly Clicks', value: String(clicks), impact: 'Low traffic' },
        { label: 'Audit Score', value: `${score}/100`, impact: 'Acceptable quality' },
      ],
    });
  }

  // ── Gap topic rules ──────────────────────────────────────────────────

  private planGap(gap: GapTopic, topics: EnrichedTopic[]): PlannedAction {
    const topic = topics.find((t) => t.id === gap.topicId);
    const isPillar = gap.importance === 'pillar';

    return {
      inventoryId: '', // No existing inventory item
      url: '',
      action: 'CREATE_NEW',
      priority: isPillar ? 'critical' : 'medium',
      effort: 'high',
      reasoning: isPillar
        ? 'Core pillar topic with no existing page. Essential for topical authority.'
        : 'Supporting topic needed for complete coverage of parent cluster.',
      dataPoints: [
        { label: 'Topic', value: gap.topicTitle, impact: isPillar ? 'Pillar gap' : 'Coverage gap' },
        { label: 'Importance', value: gap.importance, impact: isPillar ? 'Critical for authority' : 'Supports cluster depth' },
        ...(topic?.parent_topic_id
          ? [{ label: 'Parent Topic', value: topic.parent_topic_id, impact: 'Part of topic cluster' }]
          : []),
      ],
      topicId: gap.topicId,
    };
  }

  // ── Utility methods ──────────────────────────────────────────────────

  private buildAction(
    item: SiteInventoryItem,
    match: MatchResult,
    overrides: {
      action: ActionType;
      priority: PlannedAction['priority'];
      effort: PlannedAction['effort'];
      reasoning: string;
      dataPoints: PlanDataPoint[];
    },
  ): PlannedAction {
    return {
      inventoryId: item.id,
      url: item.url,
      action: overrides.action,
      priority: overrides.priority,
      effort: overrides.effort,
      reasoning: overrides.reasoning,
      dataPoints: overrides.dataPoints,
      topicId: match.topicId ?? undefined,
    };
  }

  /**
   * Extract the clicks value from a PlannedAction's dataPoints for sorting.
   * Returns 0 if no "Monthly Clicks" data point is found.
   */
  private extractClicksFromDataPoints(action: PlannedAction): number {
    const clicksPoint = action.dataPoints.find((dp) => dp.label === 'Monthly Clicks');
    if (!clicksPoint) return 0;
    const parsed = parseInt(clicksPoint.value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
}
