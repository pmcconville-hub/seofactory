import React, { useState, useEffect } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { suggestPillarsFromBusinessInfo } from '../../../services/ai/pillarSuggestion';

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

// ──── AI Badge ────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
      AI
    </span>
  );
}

// ──── Business Context Card ────

function BusinessContextCard({ businessInfo }: {
  businessInfo: {
    seedKeyword?: string;
    industry?: string;
    domain?: string;
    audience?: string;
    language?: string;
    targetMarket?: string;
  };
}) {
  const items = [
    { label: 'Seed Keyword', value: businessInfo.seedKeyword },
    { label: 'Industry', value: businessInfo.industry },
    { label: 'Domain', value: businessInfo.domain },
    { label: 'Audience', value: businessInfo.audience },
    { label: 'Language', value: businessInfo.language },
    { label: 'Market', value: businessInfo.targetMarket },
  ].filter(item => item.value);

  if (items.length === 0) return null;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
        Business Context (from Discover step)
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[10px] text-gray-500 uppercase">{item.label}</p>
            <p className="text-sm text-gray-300 truncate">{item.value}</p>
          </div>
        ))}
      </div>
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

// ──── Five Components Summary Card ────

function FiveComponentsSummaryCard({ ceName, scType, csiPredicates, csiText, businessInfo }: {
  ceName: string;
  scType: string;
  csiPredicates: string[];
  csiText: string;
  businessInfo: {
    authorProfile?: { name?: string; credentials?: string };
    valueProp?: string;
    industry?: string;
  };
}) {
  if (!ceName || !scType) return null;

  const hasAuthor = !!businessInfo.authorProfile?.name;
  const hasCredentials = !!businessInfo.authorProfile?.credentials;
  const hasValueProp = !!businessInfo.valueProp;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-200 mb-4">Five Components Summary</h3>

      <div className="space-y-4">
        {/* CE */}
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CE</span>
            <span className="text-sm font-medium text-gray-200">{ceName}</span>
          </div>
          <ul className="text-xs text-gray-400 space-y-0.5 mt-2 pl-4">
            <li>Must appear in every H1, meta title, meta description</li>
            <li>Use as first word/phrase in title tags where possible</li>
            <li>N-gram variations allowed for natural language</li>
          </ul>
        </div>

        {/* SC */}
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">SC</span>
            <span className="text-sm font-medium text-gray-200">{scType}</span>
          </div>
          {businessInfo.industry && (
            <p className="text-xs text-gray-500 mt-1">Industry: {businessInfo.industry}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className={hasAuthor ? 'text-green-400' : 'text-gray-600'}>
              {hasAuthor ? '\u2713' : '\u2717'} Author identity
            </span>
            <span className={hasCredentials ? 'text-green-400' : 'text-gray-600'}>
              {hasCredentials ? '\u2713' : '\u2717'} Credentials
            </span>
            <span className={hasValueProp ? 'text-green-400' : 'text-gray-600'}>
              {hasValueProp ? '\u2713' : '\u2717'} Value proposition
            </span>
          </div>
        </div>

        {/* CSI */}
        <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-green-600/20 text-green-300 border border-green-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold">CSI</span>
            <span className="text-sm font-medium text-gray-200">
              {csiText || csiPredicates.join(', ') || 'Not defined'}
            </span>
          </div>
          {csiPredicates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {csiPredicates.map((pred, i) => (
                <span
                  key={i}
                  className="bg-green-900/20 text-green-300 border border-green-700/30 rounded px-2 py-0.5 text-[10px]"
                >
                  {pred}{i === 0 ? ' (primary)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CS + AS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">CS</span>
            <p className="text-xs text-gray-300 mt-1">Monetization pages</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Revenue-driving, commercial intent</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-md px-4 py-3">
            <span className="text-[10px] font-semibold text-gray-500 uppercase">AS</span>
            <p className="text-xs text-gray-300 mt-1">Authority pages</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Expertise, E-A-T signals</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──── Main Component ────

const PipelineStrategyStep: React.FC = () => {
  const {
    autoApprove,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    setStepStatus,
    activeMap,
  } = usePipeline();
  const { state, dispatch } = useAppState();

  const stepState = getStepState('strategy');
  const gate = stepState?.gate;

  // Initialise form from existing map pillars if available
  const existingPillars = activeMap?.pillars;

  const [ceName, setCeName] = useState(existingPillars?.centralEntity ?? '');
  const [scType, setScType] = useState(existingPillars?.sourceContext ?? '');
  const [csiText, setCsiText] = useState(existingPillars?.centralSearchIntent ?? '');
  const [scPriorities, setScPriorities] = useState<string[]>(
    existingPillars?.primary_verb ? [existingPillars.primary_verb] : []
  );
  const [csiPredicates, setCsiPredicates] = useState<string[]>(
    existingPillars?.auxiliary_verb ? [existingPillars.auxiliary_verb] : []
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggested, setAiSuggested] = useState(false);
  const [suggestionReasoning, setSuggestionReasoning] = useState<string | null>(null);

  // Sync form if active map changes (e.g. after navigation)
  useEffect(() => {
    if (existingPillars) {
      setCeName(existingPillars.centralEntity ?? '');
      setScType(existingPillars.sourceContext ?? '');
      setCsiText(existingPillars.centralSearchIntent ?? '');
    }
  }, [activeMap?.id]);

  // Auto-suggest on mount when pillars are empty and business info is available
  const hasBusinessContext = !!state.businessInfo.seedKeyword;
  const hasExistingPillars = !!existingPillars?.centralEntity;
  const [autoSuggestAttempted, setAutoSuggestAttempted] = useState(false);

  useEffect(() => {
    if (!hasExistingPillars && hasBusinessContext && !autoSuggestAttempted && !isSuggesting) {
      setAutoSuggestAttempted(true);
      handleAiSuggest();
    }
  }, [hasExistingPillars, hasBusinessContext]);

  const handleAiSuggest = async () => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    setSaveError(null);

    try {
      const result = await suggestPillarsFromBusinessInfo(state.businessInfo, dispatch);

      setCeName(result.centralEntity);
      setScType(result.sourceContext);
      setCsiText(result.centralSearchIntent);
      if (result.csiPredicates.length > 0) {
        setCsiPredicates(result.csiPredicates);
      }
      if (result.scPriorities.length > 0) {
        setScPriorities(result.scPriorities);
      }
      setAiSuggested(true);
      setSuggestionReasoning(result.reasoning);

      // Apply detected language/region to businessInfo if not already set
      const currentLang = state.businessInfo.language;
      const currentMarket = state.businessInfo.targetMarket;
      const needsLangUpdate = (!currentLang || currentLang === 'en') && result.detectedLanguage && result.detectedLanguage !== 'en';
      const needsMarketUpdate = (!currentMarket || currentMarket === 'United States') && result.detectedRegion && result.detectedRegion !== 'Global';

      if (needsLangUpdate || needsMarketUpdate) {
        const updatedInfo = { ...state.businessInfo };
        if (needsLangUpdate) updatedInfo.language = result.detectedLanguage;
        if (needsMarketUpdate) updatedInfo.targetMarket = result.detectedRegion;
        dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedInfo });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI suggestion failed';
      setSaveError(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSaveStrategy = async () => {
    if (!ceName.trim()) {
      setSaveError('Central Entity name is required.');
      return;
    }
    if (!scType.trim()) {
      setSaveError('Source Context type is required.');
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    setStepStatus('strategy', 'in_progress');

    const pillars = {
      centralEntity: ceName.trim(),
      sourceContext: scType.trim(),
      centralSearchIntent: csiText.trim() || csiPredicates.join(', '),
      primary_verb: scPriorities[0] ?? '',
      auxiliary_verb: csiPredicates[0] ?? '',
    };

    // Dispatch to global state
    if (state.activeMapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { pillars } },
      });

      // Persist to Supabase
      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        const { error } = await supabase
          .from('topical_maps')
          .update({ pillars } as any)
          .eq('id', state.activeMapId);

        if (error) {
          console.warn('[Strategy] Supabase save error:', error.message);
          // Non-fatal — state is saved in memory
        }
      } catch (err) {
        console.warn('[Strategy] Supabase save failed:', err);
      }
    }

    setSavedSuccess(true);
    setIsSaving(false);
    setStepStatus('strategy', 'pending_approval');

    // Reset success flash after 3 seconds
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-200">Strategic Foundation</h2>
          <p className="text-sm text-gray-400 mt-1">
            Define the five core components: Central Entity, Source Context, and Central Search Intent
          </p>
        </div>
        <button
          type="button"
          onClick={handleAiSuggest}
          disabled={isSuggesting || !hasBusinessContext}
          className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSuggesting ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
          {isSuggesting ? 'Suggesting...' : 'AI Suggest'}
        </button>
      </div>

      {/* Business Context Card */}
      <BusinessContextCard businessInfo={state.businessInfo} />

      {/* AI Suggestion Banner */}
      {aiSuggested && !savedSuccess && (
        <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 flex items-start gap-3">
          <AiBadge />
          <div>
            <p className="text-sm text-purple-300">
              Pillars auto-suggested from your business context. Review and adjust before saving.
            </p>
            {suggestionReasoning && (
              <p className="text-xs text-purple-400/70 mt-1">{suggestionReasoning}</p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {saveError && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">{saveError}</p>
        </div>
      )}

      {/* Success */}
      {savedSuccess && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-300">Strategy saved successfully.</p>
        </div>
      )}

      {/* Three-card strategy layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Central Entity (CE) */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-2 py-0.5 text-xs font-semibold">
              CE
            </span>
            <h3 className="text-sm font-semibold text-gray-200">Central Entity</h3>
            {aiSuggested && ceName && <AiBadge />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Entity Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={ceName}
                onChange={(e) => setCeName(e.target.value)}
                placeholder="e.g., Electric Bikes"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            {aiSuggested && scType && <AiBadge />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Source Type <span className="text-red-400">*</span>
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
            {aiSuggested && (csiText || csiPredicates.length > 0) && <AiBadge />}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Intent Description
              </label>
              <input
                type="text"
                value={csiText}
                onChange={(e) => setCsiText(e.target.value)}
                placeholder="e.g., buy, compare, or learn about"
                className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
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

      {/* Save Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleSaveStrategy}
          disabled={isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? 'Saving...' : 'Save Strategy'}
        </button>
      </div>

      {/* Five Components Summary Card (visible after save or when pillars exist) */}
      <FiveComponentsSummaryCard
        ceName={ceName}
        scType={scType}
        csiPredicates={csiPredicates}
        csiText={csiText}
        businessInfo={state.businessInfo}
      />

      {/* Approval Gate — G1, most critical */}
      {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
        <ApprovalGate
          step="strategy"
          gate={gate}
          approval={stepState?.approval}
          autoApprove={autoApprove}
          onApprove={() => approveGate('strategy')}
          onReject={(reason) => rejectGate('strategy', reason)}
          onRevise={() => reviseStep('strategy')}
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
