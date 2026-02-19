import React from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Create techSpecGenerationService.ts

// ──── Deliverable Item ────

interface Deliverable {
  name: string;
  format: string;
  icon: React.ReactNode;
}

function DeliverableCard({ deliverable }: { deliverable: Deliverable }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-600 flex items-center justify-center flex-shrink-0">
        {deliverable.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{deliverable.name}</p>
        <p className="text-xs text-gray-500">{deliverable.format}</p>
      </div>
      <button
        type="button"
        disabled
        className="text-xs bg-gray-700 text-gray-500 border border-gray-600 rounded px-3 py-1.5 cursor-not-allowed"
      >
        Download
      </button>
    </div>
  );
}

// ──── Schema Preview Panel ────

function SchemaPreviewPanel() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Schema Preview</h3>
      <div className="bg-gray-900 border border-gray-700 rounded-md p-4 min-h-[300px]">
        <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap">
{`{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "...",
      "name": "...",
      "description": "..."
    }
  ]
}

// Schema templates will be generated here
// after running the tech spec generator.
// Includes: Organization, WebSite, WebPage,
// Article, BreadcrumbList, FAQPage, etc.`}
        </pre>
      </div>
    </div>
  );
}

// ──── Icon Components ────

function FileIcon({ type }: { type: 'csv' | 'json' | 'html' | 'xml' | 'txt' | 'md' }) {
  const colors: Record<string, string> = {
    csv: 'text-green-400',
    json: 'text-amber-400',
    html: 'text-blue-400',
    xml: 'text-purple-400',
    txt: 'text-gray-400',
    md: 'text-cyan-400',
  };

  return (
    <span className={`text-xs font-bold font-mono uppercase ${colors[type]}`}>
      {type}
    </span>
  );
}

// ──── Main Component ────

const PipelineTechSpecStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('tech_spec');
  const gate = stepState?.gate;

  const deliverables: Deliverable[] = [
    {
      name: 'URL List',
      format: 'CSV + JSON',
      icon: <FileIcon type="csv" />,
    },
    {
      name: 'Redirect Map',
      format: 'CSV',
      icon: <FileIcon type="csv" />,
    },
    {
      name: 'Schema Templates',
      format: 'JSON-LD',
      icon: <FileIcon type="json" />,
    },
    {
      name: 'HTML Template',
      format: 'HTML',
      icon: <FileIcon type="html" />,
    },
    {
      name: 'XML Sitemap',
      format: 'XML',
      icon: <FileIcon type="xml" />,
    },
    {
      name: 'robots.txt',
      format: 'TXT',
      icon: <FileIcon type="txt" />,
    },
    {
      name: 'Navigation Spec',
      format: 'Markdown',
      icon: <FileIcon type="md" />,
    },
    {
      name: 'Performance Targets',
      format: 'Markdown',
      icon: <FileIcon type="md" />,
    },
    {
      name: 'Image Spec + Alt Text',
      format: 'CSV',
      icon: <FileIcon type="csv" />,
    },
    {
      name: 'Meta Tag Templates',
      format: 'CSV',
      icon: <FileIcon type="csv" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Technical Implementation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Downloadable deliverables for developer handoff: URLs, redirects, schema, sitemaps, and more
        </p>
      </div>

      {/* Deliverable Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Deliverables</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {deliverables.map((deliverable) => (
            <DeliverableCard key={deliverable.name} deliverable={deliverable} />
          ))}
        </div>
      </div>

      {/* Schema Preview */}
      <SchemaPreviewPanel />

      {/* Generate Button */}
      <div className="flex justify-center">
        <button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Generate Tech Spec
        </button>
      </div>

      {/* Approval Gate */}
      {gate && (
        <ApprovalGate
          step="tech_spec"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('tech_spec')}
          onReject={(reason) => rejectGate('tech_spec', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Deliverables', value: `0/${deliverables.length}`, color: 'gray' },
            { label: 'Schema Types', value: 0, color: 'gray' },
            { label: 'URLs Mapped', value: 0, color: 'gray' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineTechSpecStep;
