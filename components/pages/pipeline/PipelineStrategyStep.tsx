import React, { useState } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import ApprovalGate from '../../pipeline/ApprovalGate';

// TODO: Integrate PillarDefinitionWizard.tsx

// ──── Tag Input ────

function TagInput({ tags, onAdd, onRemove, placeholder }: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput('');
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 text-xs"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-blue-400 hover:text-blue-200 ml-0.5"
          >
            &times;
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent text-sm text-gray-200 placeholder-gray-500 focus:outline-none"
      />
    </div>
  );
}

// ──── Section Allocation ────

function SectionAllocationPanel() {
  const [sections] = useState([
    { name: 'Core Section (CS)', active: true, description: 'Monetization and conversion-focused pages' },
    { name: 'Author Section (AS)', active: true, description: 'Authority and expertise-building pages' },
  ]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Section Allocation</h3>
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.name}
            className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-md px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-200">{section.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
            </div>
            <div className={`w-3 h-3 rounded-full ${section.active ? 'bg-green-500' : 'bg-gray-600'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineStrategyStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    rejectGate,
    toggleAutoApprove,
    getStepState,
  } = usePipeline();

  const stepState = getStepState('strategy');
  const gate = stepState?.gate;

  // Placeholder form state
  const [ceName, setCeName] = useState('');
  const [ceDefinition, setCeDefinition] = useState('');
  const [scType, setScType] = useState('');
  const [scPriorities, setScPriorities] = useState<string[]>([]);
  const [csiPredicates, setCsiPredicates] = useState<string[]>([]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200">Strategic Foundation</h2>
        <p className="text-sm text-gray-400 mt-1">
          Define the five core components: Central Entity, Source Context, and Central Search Intent
        </p>
      </div>

      {/* Three-card strategy layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Central Entity (CE) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CE
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Entity</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Entity Name
              </label>
              <input
                type="text"
                value={ceName}
                onChange={(e) => setCeName(e.target.value)}
                placeholder="e.g., Electric Bikes"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Definition
              </label>
              <textarea
                value={ceDefinition}
                onChange={(e) => setCeDefinition(e.target.value)}
                placeholder="Define what this entity encompasses..."
                rows={3}
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
            </div>
          </div>
        </div>

        {/* Source Context (SC) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              SC
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Source Context</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Source Type
              </label>
              <input
                type="text"
                value={scType}
                onChange={(e) => setScType(e.target.value)}
                placeholder="e.g., E-commerce retailer"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Attribute Priorities
              </label>
              <TagInput
                tags={scPriorities}
                onAdd={(tag) => setScPriorities([...scPriorities, tag])}
                onRemove={(i) => setScPriorities(scPriorities.filter((_, idx) => idx !== i))}
                placeholder="Type and press Enter..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Press Enter to add priority attributes
              </p>
            </div>
          </div>
        </div>

        {/* Central Search Intent (CSI) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-green-600/20 text-green-300 border border-green-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CSI
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Search Intent</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Predicates
              </label>
              <TagInput
                tags={csiPredicates}
                onAdd={(tag) => setCsiPredicates([...csiPredicates, tag])}
                onRemove={(i) => setCsiPredicates(csiPredicates.filter((_, idx) => idx !== i))}
                placeholder="e.g., buy, compare, reviews..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Define the primary search predicates users combine with the CE
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section Allocation */}
      <SectionAllocationPanel />

      {/* Approval Gate — G1, most critical */}
      {gate && (
        <ApprovalGate
          step="strategy"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => advanceStep('strategy')}
          onReject={(reason) => rejectGate('strategy', reason)}
          onToggleAutoApprove={toggleAutoApprove}
          summaryMetrics={[
            { label: 'Central Entity', value: ceName || '(not set)', color: ceName ? 'green' : 'amber' },
            { label: 'Source Context', value: scType || '(not set)', color: scType ? 'green' : 'amber' },
            { label: 'CSI Predicates', value: csiPredicates.length, color: csiPredicates.length > 0 ? 'green' : 'amber' },
          ]}
        />
      )}
    </div>
  );
};

export default PipelineStrategyStep;
