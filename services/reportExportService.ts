// services/reportExportService.ts
// Export SEO audit reports to XLSX and HTML formats

import * as XLSX from 'xlsx';
import {
  SEOAuditReport,
  ReportIssue,
  ReportAudience,
  PageReportSummary,
} from '../types';
import {
  PHASE_BUSINESS_NAMES,
  PRIORITY_LABELS,
  HEALTH_STATUS_LABELS,
} from '../config/businessLanguageMap';
import { groupIssuesByPriority, groupIssuesByPhase, getPhaseBusinessName } from './reportGenerationService';

/**
 * Export report to XLSX format
 */
export const exportToXLSX = (
  report: SEOAuditReport,
  audience: ReportAudience,
  projectName: string
): void => {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  addExecutiveSummarySheet(workbook, report);

  if (audience === 'business') {
    // Business-focused sheets
    addBusinessIssuesSheet(workbook, report.issues);
  } else {
    // Technical-focused sheets
    addTechnicalIssuesSheet(workbook, report.issues);
    addPhaseDetailsSheets(workbook, report);
  }

  // Sheet: Pages (for site reports)
  if (report.pages && report.pages.length > 0) {
    addPagesSheet(workbook, report.pages);
  }

  // Sheet: Progress
  addProgressSheet(workbook, report);

  // Generate filename and download
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${projectName}_SEO_Report_${audience}_${dateStr}.xlsx`;

  XLSX.writeFile(workbook, filename);
};

/**
 * Add Executive Summary sheet
 */
const addExecutiveSummarySheet = (workbook: XLSX.WorkBook, report: SEOAuditReport): void => {
  const { executiveSummary, phaseScores, pillarContext } = report;
  const healthLabel = HEALTH_STATUS_LABELS[executiveSummary.healthStatus];

  const data = [
    ['SEO AUDIT REPORT - EXECUTIVE SUMMARY'],
    [''],
    ['Generated', new Date(report.generatedAt).toLocaleString()],
    ['Report Type', report.scope === 'site' ? 'Full Site Audit' : 'Single Page Audit'],
    [''],
    ['OVERALL HEALTH'],
    ['Score', executiveSummary.overallScore],
    ['Status', healthLabel?.label || executiveSummary.healthStatus],
    ['Description', healthLabel?.description || ''],
    [''],
    ['PAGES ANALYZED', executiveSummary.pagesAnalyzed],
    [''],
    ['ISSUE SUMMARY'],
    ['Critical Issues', executiveSummary.issuesCritical],
    ['High Priority Issues', executiveSummary.issuesHigh],
    ['Medium Priority Issues', executiveSummary.issuesMedium],
    ['Low Priority Issues', executiveSummary.issuesLow],
    [''],
    ['PHASE SCORES'],
    ['Site Speed & Accessibility', phaseScores.technical.score, `${phaseScores.technical.passed}/${phaseScores.technical.total} checks passed`],
    ['Topic Relevance', phaseScores.semantic.score, `${phaseScores.semantic.passed}/${phaseScores.semantic.total} checks passed`],
    ['Page Connections', phaseScores.linkStructure.score, `${phaseScores.linkStructure.passed}/${phaseScores.linkStructure.total} checks passed`],
    ['Content Clarity', phaseScores.contentQuality.score, `${phaseScores.contentQuality.passed}/${phaseScores.contentQuality.total} checks passed`],
    ['Search Enhancements', phaseScores.visualSchema.score, `${phaseScores.visualSchema.passed}/${phaseScores.visualSchema.total} checks passed`],
    [''],
    ['KEY FINDINGS'],
    ...executiveSummary.keyFindings.map((finding, i) => [`${i + 1}.`, finding]),
  ];

  // Add pillar context if available
  if (pillarContext) {
    data.push(
      [''],
      ['SEO FOUNDATION'],
      ['Main Topic', pillarContext.centralEntity],
      ['Business Model', pillarContext.sourceContext],
      ['User Goal', pillarContext.centralSearchIntent],
    );
  }

  const sheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  sheet['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Executive Summary');
};

/**
 * Add Business-focused Issues sheet
 */
const addBusinessIssuesSheet = (workbook: XLSX.WorkBook, issues: ReportIssue[]): void => {
  const headers = ['Priority', 'Issue', 'Why It Matters', 'Business Impact', 'Suggested Action', 'Effort', 'Status'];

  const rows = issues.map(issue => [
    PRIORITY_LABELS[issue.priority]?.label || issue.priority,
    issue.headline,
    issue.whyItMatters,
    issue.businessImpact,
    issue.suggestedAction,
    issue.effortLevel,
    issue.status,
  ]);

  const data = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 35 },
    { wch: 40 },
    { wch: 35 },
    { wch: 50 },
    { wch: 12 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Issues');
};

/**
 * Add Technical-focused Issues sheet
 */
const addTechnicalIssuesSheet = (workbook: XLSX.WorkBook, issues: ReportIssue[]): void => {
  const headers = ['Rule ID', 'Phase', 'Priority', 'Issue', 'Remediation', 'AI Suggestion', 'Status'];

  const rows = issues.map(issue => [
    issue.ruleId,
    getPhaseBusinessName(issue.phase).name,
    issue.priority,
    issue.technicalDetails.ruleName,
    issue.technicalDetails.remediation,
    issue.technicalDetails.aiSuggestion || '',
    issue.status,
  ]);

  const data = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(data);

  sheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 35 },
    { wch: 50 },
    { wch: 50 },
    { wch: 12 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Issues (Technical)');
};

/**
 * Add Phase-specific detail sheets
 */
const addPhaseDetailsSheets = (workbook: XLSX.WorkBook, report: SEOAuditReport): void => {
  const phases = ['technical', 'semantic', 'linkStructure', 'contentQuality', 'visualSchema'] as const;
  const phaseNames = {
    technical: 'Technical',
    semantic: 'Semantic',
    linkStructure: 'Links',
    contentQuality: 'Content',
    visualSchema: 'Schema',
  };

  for (const phase of phases) {
    const phaseIssues = report.issues.filter(i => i.phase === phase);
    if (phaseIssues.length === 0) continue;

    const headers = ['Rule ID', 'Issue', 'Priority', 'Remediation', 'Status'];
    const rows = phaseIssues.map(issue => [
      issue.ruleId,
      issue.technicalDetails.ruleName,
      issue.priority,
      issue.technicalDetails.remediation,
      issue.status,
    ]);

    const data = [headers, ...rows];
    const sheet = XLSX.utils.aoa_to_sheet(data);

    sheet['!cols'] = [
      { wch: 20 },
      { wch: 35 },
      { wch: 10 },
      { wch: 60 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(workbook, sheet, phaseNames[phase]);
  }
};

/**
 * Add Pages sheet for site reports
 */
const addPagesSheet = (workbook: XLSX.WorkBook, pages: PageReportSummary[]): void => {
  const headers = ['URL', 'Title', 'Score', 'Issues', 'Top Issue'];

  const rows = pages.map(page => [
    page.url,
    page.title,
    page.overallScore,
    page.issueCount,
    page.topIssue || '',
  ]);

  const data = [headers, ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(data);

  sheet['!cols'] = [
    { wch: 50 },
    { wch: 40 },
    { wch: 10 },
    { wch: 10 },
    { wch: 40 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Pages');
};

/**
 * Add Progress sheet
 */
const addProgressSheet = (workbook: XLSX.WorkBook, report: SEOAuditReport): void => {
  const { progress } = report;
  const completionRate = progress.totalTasks > 0
    ? Math.round((progress.completed / progress.totalTasks) * 100)
    : 0;

  const data = [
    ['TASK PROGRESS'],
    [''],
    ['Total Tasks', progress.totalTasks],
    ['Completed', progress.completed],
    ['Pending', progress.pending],
    ['Dismissed', progress.dismissed],
    [''],
    ['Completion Rate', `${completionRate}%`],
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);

  sheet['!cols'] = [
    { wch: 20 },
    { wch: 15 },
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Progress');
};

/**
 * Export report to HTML (printable/PDF-ready)
 */
export const exportToHTML = (
  report: SEOAuditReport,
  audience: ReportAudience,
  projectName: string
): void => {
  const htmlContent = generateHTMLReport(report, audience, projectName);

  // Create blob and download
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  const dateStr = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `${projectName}_SEO_Report_${audience}_${dateStr}.html`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate HTML report content
 */
const generateHTMLReport = (
  report: SEOAuditReport,
  audience: ReportAudience,
  projectName: string
): string => {
  const { executiveSummary, phaseScores, pillarContext, issues, progress, pages } = report;
  const healthLabel = HEALTH_STATUS_LABELS[executiveSummary.healthStatus];

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#eab308';
      default: return '#6b7280';
    }
  };

  const issuesByPriority = groupIssuesByPriority(issues);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #fff; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
    h3 { font-size: 16px; margin: 16px 0 8px; }
    .header { text-align: center; margin-bottom: 40px; }
    .meta { color: #6b7280; font-size: 14px; }
    .score-card { display: flex; align-items: center; gap: 24px; padding: 24px; background: #f9fafb; border-radius: 12px; margin-bottom: 24px; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: white; }
    .score-details h3 { margin: 0 0 4px; font-size: 18px; }
    .score-details p { color: #6b7280; margin: 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .metric { padding: 16px; background: #f9fafb; border-radius: 8px; }
    .metric-value { font-size: 24px; font-weight: bold; }
    .metric-label { font-size: 14px; color: #6b7280; }
    .phase-scores { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .phase-score { padding: 12px; background: #f9fafb; border-radius: 8px; text-align: center; }
    .phase-score-value { font-size: 24px; font-weight: bold; }
    .phase-score-name { font-size: 14px; color: #6b7280; }
    .findings { padding: 16px; background: #fef3c7; border-radius: 8px; margin-bottom: 24px; }
    .findings li { margin: 8px 0; padding-left: 8px; }
    .pillar { padding: 12px 16px; background: #f3e8ff; border-radius: 8px; margin-bottom: 12px; }
    .pillar-label { font-size: 12px; color: #7c3aed; text-transform: uppercase; font-weight: 600; }
    .pillar-value { font-size: 16px; margin-top: 4px; }
    .issue-group { margin-bottom: 24px; }
    .issue-group-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .priority-badge { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; color: white; }
    .issue { padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid; }
    .issue-headline { font-weight: 600; margin-bottom: 8px; }
    .issue-detail { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
    .issue-action { font-size: 14px; color: #7c3aed; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
    .pages-table { width: 100%; border-collapse: collapse; }
    .pages-table th, .pages-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .pages-table th { background: #f9fafb; font-weight: 600; }
    .progress { padding: 24px; background: #f9fafb; border-radius: 12px; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 12px 0; }
    .progress-fill { height: 100%; background: #22c55e; }
    @media print {
      .container { padding: 20px; }
      h2 { page-break-after: avoid; }
      .issue { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SEO Audit Report</h1>
      <p class="meta">${projectName} &bull; Generated ${new Date(report.generatedAt).toLocaleDateString()}</p>
    </div>

    <div class="score-card">
      <div class="score-circle" style="background: ${getScoreColor(executiveSummary.overallScore)}">
        ${executiveSummary.overallScore}
      </div>
      <div class="score-details">
        <h3>${healthLabel?.label || 'Unknown'}</h3>
        <p>${healthLabel?.description || ''}</p>
      </div>
    </div>

    <div class="metrics-grid">
      <div class="metric">
        <div class="metric-value">${executiveSummary.pagesAnalyzed}</div>
        <div class="metric-label">Pages Analyzed</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #ef4444">${executiveSummary.issuesCritical}</div>
        <div class="metric-label">Critical Issues</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #f97316">${executiveSummary.issuesHigh}</div>
        <div class="metric-label">High Priority</div>
      </div>
      <div class="metric">
        <div class="metric-value" style="color: #eab308">${executiveSummary.issuesMedium + executiveSummary.issuesLow}</div>
        <div class="metric-label">Other Issues</div>
      </div>
    </div>

    ${executiveSummary.keyFindings.length > 0 ? `
    <div class="findings">
      <h3>Key Findings</h3>
      <ul>
        ${executiveSummary.keyFindings.map(f => `<li>${f}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <h2>Performance by Category</h2>
    <div class="phase-scores">
      ${Object.entries(phaseScores).map(([phase, data]) => `
        <div class="phase-score">
          <div class="phase-score-value" style="color: ${getScoreColor(data.score)}">${data.score}</div>
          <div class="phase-score-name">${getPhaseBusinessName(phase).name}</div>
        </div>
      `).join('')}
    </div>

    ${pillarContext ? `
    <h2>SEO Foundation</h2>
    <div class="pillar">
      <div class="pillar-label">Main Topic</div>
      <div class="pillar-value">${pillarContext.centralEntity}</div>
    </div>
    <div class="pillar">
      <div class="pillar-label">Business Model</div>
      <div class="pillar-value">${pillarContext.sourceContext}</div>
    </div>
    <div class="pillar">
      <div class="pillar-label">User Goal</div>
      <div class="pillar-value">${pillarContext.centralSearchIntent}</div>
    </div>
    ` : ''}

    <h2>Issues to Address</h2>
    ${['critical', 'high', 'medium', 'low'].map(priority => {
      const priorityIssues = issuesByPriority[priority];
      if (priorityIssues.length === 0) return '';
      return `
        <div class="issue-group">
          <div class="issue-group-header">
            <span class="priority-badge" style="background: ${getPriorityColor(priority)}">${PRIORITY_LABELS[priority]?.label || priority}</span>
            <span class="meta">${priorityIssues.length} issue${priorityIssues.length > 1 ? 's' : ''}</span>
          </div>
          ${priorityIssues.map(issue => `
            <div class="issue" style="border-color: ${getPriorityColor(priority)}">
              <div class="issue-headline">${audience === 'business' ? issue.headline : issue.technicalDetails.ruleName}</div>
              ${audience === 'business' ? `
                <div class="issue-detail">${issue.whyItMatters}</div>
                <div class="issue-detail"><strong>Impact:</strong> ${issue.businessImpact}</div>
              ` : `
                <div class="issue-detail"><strong>Rule:</strong> ${issue.ruleId}</div>
              `}
              <div class="issue-action"><strong>Action:</strong> ${issue.suggestedAction}</div>
            </div>
          `).join('')}
        </div>
      `;
    }).join('')}

    ${pages && pages.length > 0 ? `
    <h2>Pages Overview</h2>
    <table class="pages-table">
      <thead>
        <tr>
          <th>Page</th>
          <th>Score</th>
          <th>Issues</th>
        </tr>
      </thead>
      <tbody>
        ${pages.slice(0, 20).map(page => `
          <tr>
            <td>${page.title || page.url}</td>
            <td style="color: ${getScoreColor(page.overallScore)}">${page.overallScore}</td>
            <td>${page.issueCount}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ${pages.length > 20 ? `<p class="meta" style="margin-top: 8px">Showing 20 of ${pages.length} pages</p>` : ''}
    ` : ''}

    <h2>Progress</h2>
    <div class="progress">
      <div class="metrics-grid" style="margin-bottom: 0">
        <div class="metric">
          <div class="metric-value">${progress.completed}</div>
          <div class="metric-label">Completed</div>
        </div>
        <div class="metric">
          <div class="metric-value">${progress.pending}</div>
          <div class="metric-label">Pending</div>
        </div>
        <div class="metric">
          <div class="metric-value">${progress.totalTasks > 0 ? Math.round((progress.completed / progress.totalTasks) * 100) : 0}%</div>
          <div class="metric-label">Completion Rate</div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress.totalTasks > 0 ? (progress.completed / progress.totalTasks) * 100 : 0}%"></div>
      </div>
    </div>

    <p class="meta" style="margin-top: 40px; text-align: center">
      Report generated by Holistic SEO Audit Tool
    </p>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Open HTML report in new window for printing
 */
export const openHTMLReportForPrint = (
  report: SEOAuditReport,
  audience: ReportAudience,
  projectName: string
): void => {
  const htmlContent = generateHTMLReport(report, audience, projectName);
  const printWindow = window.open('', '_blank');

  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    // Trigger print dialog after content loads
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
