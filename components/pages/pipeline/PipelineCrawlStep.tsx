import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

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
    gray: 'text-gray-300',
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ──── Phase Indicator ────

function PhaseIndicator({ currentPhase }: { currentPhase: number }) {
  const phases = ['URL Input', 'Crawl', 'Results'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {phases.map((phase, i) => (
        <React.Fragment key={phase}>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
            i === currentPhase
              ? 'bg-blue-600/30 text-blue-300 border border-blue-500/50'
              : i < currentPhase
                ? 'bg-green-600/20 text-green-400 border border-green-700/50'
                : 'bg-gray-800 text-gray-500 border border-gray-700'
          }`}>
            <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
              i === currentPhase
                ? 'bg-blue-600 text-white'
                : i < currentPhase
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-400'
            }`}>
              {i < currentPhase ? '\u2713' : i + 1}
            </span>
            {phase}
          </div>
          {i < phases.length - 1 && (
            <div className={`w-8 h-px ${i < currentPhase ? 'bg-green-600' : 'bg-gray-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ──── Greenfield Mode ────

function GreenfieldForm({ onSubmit }: { onSubmit: () => void }) {
  // TODO: Integrate BusinessInfoPage form fields
  const [seedKeyword, setSeedKeyword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [domainUrl, setDomainUrl] = useState('');

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
        {/* Seed Keyword */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Seed Keyword <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            placeholder="e.g., electric bikes"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Business Type / Industry */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Type / Industry <span className="text-red-400">*</span>
          </label>
          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select industry...</option>
            <option value="ecommerce">E-commerce</option>
            <option value="saas">SaaS</option>
            <option value="b2b">B2B Services</option>
            <option value="blog">Blog / Publisher</option>
            <option value="local">Local Business</option>
            <option value="education">Education</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Language <span className="text-red-400">*</span>
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="en">English</option>
            <option value="nl">Dutch</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>

        {/* Business Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your business in 2-3 sentences..."
            rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
        </div>

        {/* Domain URL (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Domain URL <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            value={domainUrl}
            onChange={(e) => setDomainUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!seedKeyword.trim() || !businessType || !description.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

// ──── Existing Site Mode ────

function ExistingSiteForm() {
  // TODO: Integrate SiteIngestionWizard.tsx crawl functionality
  const [url, setUrl] = useState('');
  const [crawlPhase] = useState(0); // 0 = URL Input, 1 = Crawl, 2 = Results

  return (
    <div className="space-y-6">
      <PhaseIndicator currentPhase={crawlPhase} />

      {/* URL Input */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Website URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            disabled={!url.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Start Crawl
          </button>
        </div>
      </div>

      {/* Crawl Progress (placeholder) */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Crawl Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Pages Found" value={0} />
          <MetricCard label="Internal Links" value={0} />
          <MetricCard label="Orphan Pages" value={0} />
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '0%' }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">Waiting to start...</p>
        </div>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineCrawlStep: React.FC = () => {
  const {
    isGreenfield,
    autoApprove,
    setStepStatus,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('crawl');
  const gate = stepState?.gate;

  const handleGreenfieldSubmit = () => {
    setStepStatus('crawl', 'completed');
    advanceStep('crawl');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">
          {isGreenfield ? 'Business Foundation' : 'Website Discovery'}
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          {isGreenfield
            ? 'Define your business context and seed keywords'
            : 'Crawl and analyze your existing website'}
        </p>
      </div>

      {/* Content */}
      {isGreenfield ? (
        <GreenfieldForm onSubmit={handleGreenfieldSubmit} />
      ) : (
        <ExistingSiteForm />
      )}

      {/* Approval Gate (existing site mode only) */}
      {!isGreenfield && gate && (
        <ApprovalGate
          step="crawl"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('crawl')}
          onReject={(reason) => rejectGate('crawl', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Pages Found', value: 0, color: 'gray' },
            { label: 'Internal Links', value: 0, color: 'gray' },
            { label: 'Orphan Pages', value: 0, color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineCrawlStep;
