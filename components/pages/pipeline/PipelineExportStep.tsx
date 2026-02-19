import React, { useState, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import {
  generateExportPackage,
  type ExportPackageOptions,
  type ExportResult,
} from '../../../services/packageExportService';

// ──── Metric Card ────

function MetricCard({ label, value, color = 'gray' }: {
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'amber' | 'red' | 'gray';
}) {
  const colorMap: Record<string, string> = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    gray: 'text-gray-400',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Download Card ────

function DownloadCard({
  name,
  description,
  format,
  primary = false,
  enabled = false,
  onDownload,
}: {
  name: string;
  description: string;
  format: string;
  primary?: boolean;
  enabled?: boolean;
  onDownload?: () => void;
}) {
  return (
    <div
      className={`border rounded-lg p-5 ${
        primary
          ? 'bg-blue-900/20 border-blue-500/50'
          : 'bg-gray-800 border-gray-700'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className={`text-sm font-semibold ${primary ? 'text-blue-200' : 'text-gray-200'}`}>
            {name}
          </h4>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </div>
        <span className="text-[10px] text-gray-500 uppercase font-mono bg-gray-900 border border-gray-700 rounded px-1.5 py-0.5">
          {format}
        </span>
      </div>
      <button
        type="button"
        disabled={!enabled}
        onClick={onDownload}
        className={`w-full text-sm font-medium px-4 py-2 rounded-md transition-colors ${
          enabled
            ? primary
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              : 'bg-gray-600 hover:bg-gray-500 text-gray-200 border border-gray-500 cursor-pointer'
            : primary
              ? 'bg-blue-600 text-white cursor-not-allowed opacity-40'
              : 'bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed'
        }`}
      >
        Download
      </button>
    </div>
  );
}

// ──── Content Calendar ────

function ContentCalendar({ topics }: { topics: Array<{ title: string; topic_class?: string | null; type: string }> }) {
  const waves = [
    { label: 'Wave 1', class: 'monetization', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
    { label: 'Wave 2', class: 'informational', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
    { label: 'Wave 3', class: 'regional', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
    { label: 'Wave 4', class: 'authority', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  ];

  const topicsByWave = waves.map((wave) => ({
    ...wave,
    items: topics.filter((t) => {
      const cls = t.topic_class?.toLowerCase() ?? '';
      return cls === wave.class;
    }),
  }));

  const hasAny = topicsByWave.some((w) => w.items.length > 0);

  if (!hasAny) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Plan</h3>
        <p className="text-xs text-gray-500">
          Topics will appear here after Map Planning and Brief generation are complete.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Publishing Plan by Wave</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {topicsByWave.map((wave) => (
          <div key={wave.label} className={`border rounded-lg p-4 ${wave.color}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider">{wave.label}</h4>
              <span className="text-xs font-medium">{wave.items.length}</span>
            </div>
            <div className="space-y-1.5">
              {wave.items.slice(0, 5).map((t, i) => (
                <p key={i} className="text-[11px] text-current opacity-80 truncate">{t.title}</p>
              ))}
              {wave.items.length > 5 && (
                <p className="text-[11px] opacity-60">+{wave.items.length - 5} more</p>
              )}
              {wave.items.length === 0 && (
                <p className="text-[11px] opacity-50">No topics assigned</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Open Items by Role ────

function OpenItemsByRole({
  topicCount,
  briefCount,
  auditScore,
}: {
  topicCount: number;
  briefCount: number;
  auditScore?: number;
}) {
  const roles = [
    {
      name: 'Business Actions',
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
      value: topicCount,
      label: 'pages to publish',
      color: 'border-purple-500/30 bg-purple-900/10',
    },
    {
      name: 'Developer Actions',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      value: topicCount,
      label: 'URLs to implement',
      color: 'border-blue-500/30 bg-blue-900/10',
    },
    {
      name: 'Content Actions',
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
      value: briefCount,
      label: 'briefs ready',
      color: 'border-green-500/30 bg-green-900/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {roles.map((role) => (
        <div key={role.name} className={`border rounded-lg p-4 ${role.color}`}>
          <div className="flex items-center gap-3 mb-3">
            {role.icon}
            <h4 className="text-sm font-medium text-gray-200">{role.name}</h4>
          </div>
          <p className="text-2xl font-semibold text-gray-300">{role.value}</p>
          <p className="text-xs text-gray-500 mt-1">{role.label}</p>
        </div>
      ))}
    </div>
  );
}

// ──── Pipeline Complete Banner ────

function PipelineCompleteBanner({ allDone }: { allDone: boolean }) {
  if (!allDone) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
        <svg
          className="w-10 h-10 text-gray-600 mx-auto mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-gray-400">Complete all previous pipeline steps to unlock export</p>
        <p className="text-xs text-gray-500 mt-1">
          Steps 1–8 must be completed before the final package can be generated
        </p>
      </div>
    );
  }

  return (
    <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6 text-center">
      <svg
        className="w-12 h-12 text-green-400 mx-auto mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-green-300 mb-1">Pipeline Complete!</h3>
      <p className="text-sm text-gray-400">
        All steps completed. Generate and download your complete SEO package below.
      </p>
    </div>
  );
}

// ──── Role-Based View Tabs ────

function RoleViewTabs({ activeTab, onTabChange }: {
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const tabs = ['SEO', 'Business', 'Content', 'Developer'];

  return (
    <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab
              ? 'bg-gray-700 text-gray-200'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ──── Export Options ────

function ExportOptionsPanel({
  options,
  onChange,
}: {
  options: ExportPackageOptions;
  onChange: (opts: ExportPackageOptions) => void;
}) {
  const items: Array<{ key: keyof ExportPackageOptions; label: string; description: string }> = [
    { key: 'includeStrategy', label: 'Strategy & EAV Inventory', description: 'Five components, EAV triples CSV' },
    { key: 'includeBriefs', label: 'Content Briefs', description: 'All briefs as Markdown files' },
    { key: 'includeContent', label: 'Generated Content', description: 'Article HTML files per topic' },
    { key: 'includeAuditReport', label: 'Audit Report', description: 'Full audit results as JSON' },
    { key: 'includeTechSpec', label: 'Technical Spec', description: 'URLs, sitemap, robots.txt, meta tags' },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Package Contents</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item.key} className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={(e) => onChange({ ...options, [item.key]: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20"
            />
            <div>
              <p className="text-sm text-gray-200 group-hover:text-white transition-colors">{item.label}</p>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineExportStep: React.FC = () => {
  const {
    completedSteps,
    steps,
    activeMap,
  } = usePipeline();

  const { state } = useAppState();

  const [activeTab, setActiveTab] = useState('SEO');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [options, setOptions] = useState<ExportPackageOptions>({
    includeContent: true,
    includeBriefs: true,
    includeTechSpec: true,
    includeAuditReport: true,
    includeStrategy: true,
  });

  // Check if all previous steps (excluding export) are completed
  const previousSteps = steps.filter(s => s.step !== 'export');
  const allPreviousDone = previousSteps.every(s => s.status === 'completed');

  // Derived stats
  const topics = activeMap?.topics ?? [];
  const briefs = activeMap?.briefs ?? {};
  const briefCount = Object.keys(briefs).length;
  const wordCount = Object.values(briefs).reduce((sum, b) => {
    const draft = b.articleDraft ?? '';
    const words = draft.split(/\s+/).filter(Boolean).length;
    return sum + words;
  }, 0);

  // ──── Generate full ZIP package ────

  const handleGeneratePackage = useCallback(async () => {
    if (!activeMap) {
      setError('No active topical map found.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateExportPackage(activeMap, options);
      setExportResult(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Export generation failed: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  }, [activeMap, options]);

  // ──── Trigger browser download for ZIP ────

  const handleDownloadZip = useCallback(() => {
    if (!exportResult) return;
    const url = URL.createObjectURL(exportResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportResult]);

  // ──── Generate and download individual section as JSON/text ────

  const handleDownloadSection = useCallback(
    (section: keyof ExportPackageOptions, name: string) => {
      if (!activeMap) return;
      let content = '';
      let filename = name;

      if (section === 'includeStrategy') {
        const pillars = activeMap.pillars;
        const eavs = activeMap.eavs ?? [];
        content = JSON.stringify({ pillars, eavs }, null, 2);
        filename = 'strategy-eavs.json';
      } else if (section === 'includeBriefs') {
        content = JSON.stringify(briefs, null, 2);
        filename = 'content-briefs.json';
      } else if (section === 'includeAuditReport') {
        content = JSON.stringify(activeMap.analysis_state ?? {}, null, 2);
        filename = 'audit-report.json';
      }

      if (!content) return;
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [activeMap, briefs]
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Master Summary &amp; Export</h2>
        <p className="text-sm text-gray-400 mt-1">
          Complete package download, content calendar, and role-based action summaries
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pages Created"
          value={topics.length}
          color={topics.length > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Words Written"
          value={wordCount > 0 ? wordCount.toLocaleString() : '--'}
          color={wordCount > 0 ? 'blue' : 'gray'}
        />
        <MetricCard
          label="Briefs Ready"
          value={briefCount > 0 ? briefCount : '--'}
          color={briefCount > 0 ? 'green' : 'gray'}
        />
        <MetricCard
          label="Steps Complete"
          value={`${completedSteps.length}/${steps.length}`}
          color={allPreviousDone ? 'green' : 'amber'}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/40 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Pipeline Complete / Pending Banner */}
      <PipelineCompleteBanner allDone={allPreviousDone} />

      {/* Export Options */}
      <ExportOptionsPanel options={options} onChange={setOptions} />

      {/* Export Result Stats */}
      {exportResult && (
        <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-300">Package ready to download</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {exportResult.fileCount} files &bull; {formatBytes(exportResult.totalSize)} uncompressed
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadZip}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exportResult.filename}
          </button>
        </div>
      )}

      {/* Download Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Downloads</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DownloadCard
            name="Complete Package"
            description="All deliverables in a single ZIP download"
            format="ZIP"
            primary
            enabled={topics.length > 0}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
          <DownloadCard
            name="Content Briefs"
            description="All briefs with heading hierarchy"
            format="JSON"
            enabled={briefCount > 0}
            onDownload={() => handleDownloadSection('includeBriefs', 'content-briefs.json')}
          />
          <DownloadCard
            name="Strategy &amp; EAV"
            description="Pillars, EAV inventory, semantic map"
            format="JSON"
            enabled={!!(activeMap?.pillars?.centralEntity)}
            onDownload={() => handleDownloadSection('includeStrategy', 'strategy-eavs.json')}
          />
          <DownloadCard
            name="Content Files"
            description="Generated articles (requires content generation)"
            format="HTML"
            enabled={Object.values(briefs).some(b => !!b.articleDraft)}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
          <DownloadCard
            name="Audit Report"
            description="Full audit results with action items"
            format="JSON"
            enabled={!!(activeMap?.analysis_state)}
            onDownload={() => handleDownloadSection('includeAuditReport', 'audit-report.json')}
          />
          <DownloadCard
            name="Technical Spec"
            description="URLs, redirects, sitemaps, robots.txt"
            format="ZIP"
            enabled={topics.length > 0}
            onDownload={exportResult ? handleDownloadZip : handleGeneratePackage}
          />
        </div>
      </div>

      {/* Generate Package Button */}
      <div className="flex justify-center">
        <button
          type="button"
          disabled={isGenerating || topics.length === 0}
          onClick={handleGeneratePackage}
          className={`flex items-center gap-2 px-8 py-3 rounded-md font-medium text-base transition-colors ${
            isGenerating || topics.length === 0
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Building Package...
            </>
          ) : exportResult ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate Package
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Generate Full Package
            </>
          )}
        </button>
      </div>

      {/* Content Calendar */}
      <ContentCalendar topics={topics} />

      {/* Role-Based View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Summary by Role</h3>
          <RoleViewTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <OpenItemsByRole
          topicCount={topics.length}
          briefCount={briefCount}
        />
      </div>
    </div>
  );
};

export default PipelineExportStep;
