// services/reportGenerationService.ts
// Generates SEO audit reports from project data

import {
  SEOAuditReport,
  ReportIssue,
  ReportScope,
  PageReportSummary,
  SiteAnalysisProject,
  SitePageRecord,
  AuditTask,
  AISuggestion,
  HealthStatus,
  EffortLevel,
} from '../types';
import {
  ISSUE_TRANSLATIONS,
  PHASE_BUSINESS_NAMES,
  PILLAR_EXPLANATIONS,
  getBusinessTranslation,
  getHealthStatus,
} from '../config/businessLanguageMap';

/**
 * Generate a complete SEO audit report
 */
export const generateReport = (
  project: SiteAnalysisProject,
  pages: SitePageRecord[],
  tasks: AuditTask[],
  suggestions: AISuggestion[],
  scope: ReportScope,
  pageId?: string
): SEOAuditReport => {
  // Filter data based on scope
  const relevantPages = scope === 'page' && pageId
    ? pages.filter(p => p.id === pageId)
    : pages;

  const relevantTasks = scope === 'page' && pageId
    ? tasks.filter(t => t.pageId === pageId)
    : tasks;

  // Calculate aggregate scores
  const phaseScores = calculatePhaseScores(relevantPages);
  const overallScore = calculateOverallScore(phaseScores);
  const healthStatus = getHealthStatus(overallScore);

  // Transform tasks to report issues
  const issues = relevantTasks
    .filter(t => t.status !== 'completed' && t.status !== 'dismissed')
    .map(task => transformTaskToReportIssue(task, suggestions.find(s => s.taskId === task.id)));

  // Calculate progress
  const progress = calculateProgress(relevantTasks);

  // Generate key findings (top 3 critical/high issues)
  const keyFindings = generateKeyFindings(issues);

  // Build pillar context if project has pillars
  const pillarContext = buildPillarContext(project);

  // Generate page summaries for site-wide reports
  const pageSummaries = scope === 'site'
    ? generatePageSummaries(relevantPages, tasks)
    : undefined;

  return {
    id: generateReportId(),
    projectId: project.id,
    pageId: scope === 'page' ? pageId : undefined,
    scope,
    generatedAt: new Date().toISOString(),

    executiveSummary: {
      overallScore,
      healthStatus,
      keyFindings,
      pagesAnalyzed: relevantPages.length,
      issuesCritical: issues.filter(i => i.priority === 'critical').length,
      issuesHigh: issues.filter(i => i.priority === 'high').length,
      issuesMedium: issues.filter(i => i.priority === 'medium').length,
      issuesLow: issues.filter(i => i.priority === 'low').length,
    },

    phaseScores,
    pillarContext,
    issues,
    progress,
    pages: pageSummaries,
  };
};

/**
 * Transform an audit task to a report issue with business language
 */
export const transformTaskToReportIssue = (
  task: AuditTask,
  aiSuggestion?: AISuggestion
): ReportIssue => {
  const translation = getBusinessTranslation(task.ruleId, task.title, task.description);

  return {
    id: task.id,
    ruleId: task.ruleId,
    phase: task.phase || 'technical',
    priority: task.priority,

    // Business view fields
    headline: translation.headline,
    whyItMatters: translation.whyItMatters,
    businessImpact: translation.businessImpact,
    suggestedAction: aiSuggestion?.suggestedValue || task.remediation,
    effortLevel: translation.effortLevel,

    // Technical view fields
    technicalDetails: {
      ruleName: task.title,
      remediation: task.remediation,
      aiSuggestion: aiSuggestion?.suggestedValue,
    },

    affectedPages: task.pageId ? [task.pageId] : [],
    status: task.status,
  };
};

/**
 * Calculate phase scores from page audits
 */
const calculatePhaseScores = (pages: SitePageRecord[]): SEOAuditReport['phaseScores'] => {
  const pagesWithAudits = pages.filter(p => p.auditResult);

  if (pagesWithAudits.length === 0) {
    return {
      technical: { score: 0, passed: 0, total: 0 },
      semantic: { score: 0, passed: 0, total: 0 },
      linkStructure: { score: 0, passed: 0, total: 0 },
      contentQuality: { score: 0, passed: 0, total: 0 },
      visualSchema: { score: 0, passed: 0, total: 0 },
    };
  }

  const phases = ['technical', 'semantic', 'linkStructure', 'contentQuality', 'visualSchema'] as const;
  const phaseMapping: Record<string, string> = {
    'technical': 'technical',
    'semantic': 'semantic',
    'linkStructure': 'linkStructure',
    'contentQuality': 'contentQuality',
    'visualSchema': 'visualSchema',
  };

  const result: SEOAuditReport['phaseScores'] = {
    technical: { score: 0, passed: 0, total: 0 },
    semantic: { score: 0, passed: 0, total: 0 },
    linkStructure: { score: 0, passed: 0, total: 0 },
    contentQuality: { score: 0, passed: 0, total: 0 },
    visualSchema: { score: 0, passed: 0, total: 0 },
  };

  for (const phase of phases) {
    let totalScore = 0;
    let totalPassed = 0;
    let totalChecks = 0;

    for (const page of pagesWithAudits) {
      const audit = page.auditResult;
      if (!audit?.phases) continue;

      const phaseKey = phase === 'linkStructure' ? 'linkStructure'
        : phase === 'contentQuality' ? 'contentQuality'
          : phase === 'visualSchema' ? 'visualSchema'
            : phase;

      const phaseData = (audit.phases as any)[phaseKey];
      if (phaseData) {
        totalScore += phaseData.score || 0;
        totalPassed += phaseData.passedCount || 0;
        totalChecks += phaseData.totalCount || 0;
      }
    }

    result[phase] = {
      score: pagesWithAudits.length > 0 ? Math.round(totalScore / pagesWithAudits.length) : 0,
      passed: totalPassed,
      total: totalChecks,
    };
  }

  return result;
};

/**
 * Calculate overall score from phase scores (weighted)
 */
const calculateOverallScore = (phaseScores: SEOAuditReport['phaseScores']): number => {
  const weights = {
    technical: 0.20,
    semantic: 0.25,
    linkStructure: 0.20,
    contentQuality: 0.25,
    visualSchema: 0.10,
  };

  let totalScore = 0;
  for (const [phase, weight] of Object.entries(weights)) {
    totalScore += (phaseScores[phase as keyof typeof phaseScores]?.score || 0) * weight;
  }

  return Math.round(totalScore);
};

/**
 * Calculate task progress
 */
const calculateProgress = (tasks: AuditTask[]): SEOAuditReport['progress'] => {
  return {
    totalTasks: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    dismissed: tasks.filter(t => t.status === 'dismissed').length,
  };
};

/**
 * Generate key findings (top 3 most important issues)
 */
const generateKeyFindings = (issues: ReportIssue[]): string[] => {
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  const sorted = [...issues]
    .filter(i => i.status !== 'completed' && i.status !== 'dismissed')
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return sorted.slice(0, 3).map(issue => {
    const priorityLabel = issue.priority === 'critical' ? 'Critical: '
      : issue.priority === 'high' ? 'Important: '
        : '';
    return `${priorityLabel}${issue.headline}`;
  });
};

/**
 * Build pillar context with business explanations
 */
const buildPillarContext = (project: SiteAnalysisProject): SEOAuditReport['pillarContext'] | undefined => {
  if (!project.centralEntity && !project.sourceContext && !project.centralSearchIntent) {
    return undefined;
  }

  return {
    centralEntity: project.centralEntity || 'Not defined',
    centralEntityExplanation: PILLAR_EXPLANATIONS.centralEntity.explanation,
    sourceContext: project.sourceContext || 'Not defined',
    sourceContextExplanation: PILLAR_EXPLANATIONS.sourceContext.explanation,
    centralSearchIntent: project.centralSearchIntent || 'Not defined',
  };
};

/**
 * Generate page summaries for site-wide reports
 */
const generatePageSummaries = (
  pages: SitePageRecord[],
  tasks: AuditTask[]
): PageReportSummary[] => {
  return pages
    .filter(p => p.auditResult)
    .map(page => {
      const pageTasks = tasks.filter(t => t.pageId === page.id && t.status !== 'completed' && t.status !== 'dismissed');
      const topTask = pageTasks.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })[0];

      return {
        url: page.url,
        title: page.title || page.path || page.url,
        overallScore: page.auditResult?.overallScore || 0,
        issueCount: pageTasks.length,
        topIssue: topTask ? getBusinessTranslation(topTask.ruleId, topTask.title, topTask.description).headline : undefined,
      };
    })
    .sort((a, b) => a.overallScore - b.overallScore); // Lowest scores first
};

/**
 * Generate unique report ID
 */
const generateReportId = (): string => {
  return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get phase business name
 */
export const getPhaseBusinessName = (phase: string): { name: string; explanation: string } => {
  return PHASE_BUSINESS_NAMES[phase] || { name: phase, explanation: '' };
};

/**
 * Group issues by priority for business view
 */
export const groupIssuesByPriority = (issues: ReportIssue[]): Record<string, ReportIssue[]> => {
  return {
    critical: issues.filter(i => i.priority === 'critical'),
    high: issues.filter(i => i.priority === 'high'),
    medium: issues.filter(i => i.priority === 'medium'),
    low: issues.filter(i => i.priority === 'low'),
  };
};

/**
 * Group issues by phase for technical view
 */
export const groupIssuesByPhase = (issues: ReportIssue[]): Record<string, ReportIssue[]> => {
  return {
    technical: issues.filter(i => i.phase === 'technical'),
    semantic: issues.filter(i => i.phase === 'semantic'),
    linkStructure: issues.filter(i => i.phase === 'linkStructure'),
    contentQuality: issues.filter(i => i.phase === 'contentQuality'),
    visualSchema: issues.filter(i => i.phase === 'visualSchema'),
  };
};
