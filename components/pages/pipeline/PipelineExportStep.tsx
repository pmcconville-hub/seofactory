import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';

// TODO: Create packageExportService.ts

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

function DownloadCard({ name, description, format, primary = false }: {
  name: string;
  description: string;
  format: string;
  primary?: boolean;
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
        disabled
        className={`w-full text-sm font-medium px-4 py-2 rounded-md transition-colors ${
          primary
            ? 'bg-blue-600 text-white cursor-not-allowed opacity-50'
            : 'bg-gray-700 text-gray-400 border border-gray-600 cursor-not-allowed'
        }`}
      >
        Download
      </button>
    </div>
  );
}

// ──── Content Calendar ────

function ContentCalendar() {
  // Placeholder: 4 weeks, 5 slots per week
  const weeks = [1, 2, 3, 4];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Content Calendar</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-gray-400 font-medium">Week</th>
              {days.map((day) => (
                <th key={day} className="text-center px-3 py-2 text-gray-400 font-medium">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week} className="border-t border-gray-700/50">
                <td className="px-3 py-3 text-gray-300 font-medium">Week {week}</td>
                {days.map((day) => (
                  <td key={day} className="px-3 py-3 text-center">
                    <div className="w-full h-8 bg-gray-900 border border-gray-700 rounded flex items-center justify-center">
                      <span className="text-gray-600">--</span>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Calendar will populate with wave pages once content generation is complete
      </p>
    </div>
  );
}

// ──── Open Items by Role ────

function OpenItemsByRole() {
  const roles = [
    {
      name: 'Business Actions',
      icon: (
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
      count: 0,
      color: 'border-purple-500/30 bg-purple-900/10',
    },
    {
      name: 'Developer Actions',
      icon: (
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
        </svg>
      ),
      count: 0,
      color: 'border-blue-500/30 bg-blue-900/10',
    },
    {
      name: 'Content Actions',
      icon: (
        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
      count: 0,
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
          <p className="text-2xl font-semibold text-gray-400">{role.count}</p>
          <p className="text-xs text-gray-500 mt-1">open items</p>
        </div>
      ))}
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-gray-400">Complete all previous pipeline steps to unlock export</p>
        <p className="text-xs text-gray-500 mt-1">
          Steps 1-7 must be approved before the final package can be generated
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-green-300 mb-1">Pipeline Complete!</h3>
      <p className="text-sm text-gray-400">
        All steps have been completed and approved. Download the complete package below.
      </p>
    </div>
  );
}

// ──── Main Component ────

const PipelineExportStep: React.FC = () => {
  const {
    completedSteps,
    steps,
  } = usePipeline();

  const [activeTab, setActiveTab] = useState('SEO');

  // Check if all previous steps (excluding export) are completed
  const previousSteps = steps.filter(s => s.step !== 'export');
  const allPreviousDone = previousSteps.every(s => s.status === 'completed');

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
        <MetricCard label="Pages Created" value={0} color="gray" />
        <MetricCard label="Words Written" value={0} color="gray" />
        <MetricCard label="Compliance" value="--%" color="gray" />
        <MetricCard label="Publishing Plan" value="-- weeks" color="gray" />
      </div>

      {/* Pipeline Complete / Pending Banner */}
      <PipelineCompleteBanner allDone={allPreviousDone} />

      {/* Download Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Downloads</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <DownloadCard
            name="Complete Package"
            description="All deliverables in a single download"
            format="ZIP"
            primary
          />
          <DownloadCard
            name="Content Files"
            description="Generated articles and HTML files"
            format="HTML"
          />
          <DownloadCard
            name="Content Briefs"
            description="All briefs with heading hierarchy"
            format="JSON"
          />
          <DownloadCard
            name="Technical Spec"
            description="URLs, redirects, sitemaps, robots.txt"
            format="ZIP"
          />
          <DownloadCard
            name="Audit Report"
            description="Full audit results with action items"
            format="HTML"
          />
          <DownloadCard
            name="Strategy & EAV"
            description="Pillars, EAV inventory, semantic map"
            format="JSON"
          />
        </div>
      </div>

      {/* Content Calendar */}
      <ContentCalendar />

      {/* Role-Based View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Open Items by Role</h3>
          <RoleViewTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        <OpenItemsByRole />
      </div>
    </div>
  );
};

export default PipelineExportStep;
