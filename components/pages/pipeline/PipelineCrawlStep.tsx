import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import * as migrationService from '../../../services/migrationService';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { researchBusiness, type BusinessResearchResult } from '../../../services/ai/businessResearch';

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

function PhaseIndicator({ currentPhase, phases }: { currentPhase: number; phases: string[] }) {
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

// ──── AI Suggestion Badge ────

function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-1.5 py-0.5 text-[10px] font-semibold ml-2">
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
      AI
    </span>
  );
}

// ──── Greenfield Mode ────

function GreenfieldForm({ onSubmit }: { onSubmit: (data: {
  seedKeyword: string;
  businessType: string;
  language: string;
  description: string;
  domainUrl: string;
}) => void }) {
  const [seedKeyword, setSeedKeyword] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [domainUrl, setDomainUrl] = useState('');

  const canSubmit = seedKeyword.trim() && businessType && description.trim();

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Seed Keyword <span className="text-red-400">*</span>
          </label>
          <input type="text" value={seedKeyword} onChange={(e) => setSeedKeyword(e.target.value)}
            placeholder="e.g., electric bikes"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Type / Industry <span className="text-red-400">*</span>
          </label>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Language <span className="text-red-400">*</span>
          </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="en">English</option>
            <option value="nl">Dutch</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Business Description <span className="text-red-400">*</span>
          </label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your business in 2-3 sentences..." rows={3}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Domain URL <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input type="text" value={domainUrl} onChange={(e) => setDomainUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button"
          onClick={() => canSubmit && onSubmit({ seedKeyword, businessType, language, description, domainUrl })}
          disabled={!canSubmit}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors">
          Save & Continue
        </button>
      </div>
    </div>
  );
}

// ──── Business Context Form (AI-prefilled, user reviews) ────

interface BusinessContextData {
  seedKeyword: string;
  industry: string;
  language: string;
  description: string;
}

function BusinessContextForm({
  initialData,
  aiResult,
  isAnalyzing,
  analyzeError,
  onRetryAnalysis,
  onSave,
  isSaving,
}: {
  initialData?: Partial<BusinessContextData>;
  aiResult: BusinessResearchResult | null;
  isAnalyzing: boolean;
  analyzeError: string | null;
  onRetryAnalysis: () => void;
  onSave: (data: BusinessContextData) => void;
  isSaving: boolean;
}) {
  const [seedKeyword, setSeedKeyword] = useState(initialData?.seedKeyword ?? '');
  const [industry, setIndustry] = useState(initialData?.industry ?? '');
  const [language, setLanguage] = useState(initialData?.language ?? 'nl');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [appliedAi, setAppliedAi] = useState(false);

  // Apply AI suggestions when they arrive
  useEffect(() => {
    if (aiResult?.suggestions && !appliedAi) {
      const s = aiResult.suggestions;
      if (s.seedKeyword && !seedKeyword) setSeedKeyword(s.seedKeyword);
      if (s.industry && !industry) setIndustry(s.industry);
      if (s.language && !language) setLanguage(s.language);
      if (s.valueProp && !description) setDescription(s.valueProp);
      setAppliedAi(true);
    }
  }, [aiResult]);

  const canSave = seedKeyword.trim() && industry && description.trim();

  // While AI is analyzing
  if (isAnalyzing) {
    return (
      <div className="bg-gray-800 border border-purple-700/50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <svg className="animate-spin w-5 h-5 text-purple-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-purple-300">AI is analyzing your website...</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Scraping content, detecting industry, language, and business context
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {['Scraping website content...', 'Detecting business topic...', 'Analyzing industry & language...'].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              {step}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-200">Business Context</h3>
          {aiResult && aiResult.confidence !== 'low' && (
            <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded px-2 py-0.5 text-xs">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              AI-detected ({aiResult.confidence} confidence)
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">Review and adjust if needed</p>
      </div>

      {/* AI error / warning */}
      {analyzeError && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-md p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="flex-1">
            <p className="text-xs text-amber-300">{analyzeError}</p>
            <button type="button" onClick={onRetryAnalysis}
              className="text-xs text-amber-400 hover:text-amber-300 underline mt-1">
              Retry AI analysis
            </button>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Primary Topic / Seed Keyword <span className="text-red-400">*</span>
          {appliedAi && aiResult?.suggestions?.seedKeyword && <AiBadge />}
        </label>
        <input type="text" value={seedKeyword} onChange={(e) => setSeedKeyword(e.target.value)}
          placeholder="e.g., property management, dental implants"
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        <p className="text-xs text-gray-500 mt-1">This becomes the Central Entity for your SEO strategy</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Industry <span className="text-red-400">*</span>
            {appliedAi && aiResult?.suggestions?.industry && <AiBadge />}
          </label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">Select...</option>
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Language <span className="text-red-400">*</span>
            {appliedAi && aiResult?.suggestions?.language && <AiBadge />}
          </label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="en">English</option>
            <option value="nl">Dutch</option>
            <option value="de">German</option>
            <option value="fr">French</option>
            <option value="es">Spanish</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Business Description <span className="text-red-400">*</span>
          {appliedAi && aiResult?.suggestions?.valueProp && <AiBadge />}
        </label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this business do? Who are the customers?"
          rows={3}
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y" />
      </div>

      <div className="flex justify-end">
        <button type="button"
          onClick={() => canSave && onSave({ seedKeyword, industry, language, description })}
          disabled={!canSave || isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2">
          {isSaving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? 'Saving...' : 'Confirm & Submit for Review'}
        </button>
      </div>
    </div>
  );
}

// ──── Types ────

type CrawlPhase = 'input' | 'discovering' | 'crawling' | 'done' | 'error';

interface CrawlResults {
  pagesFound: number;
  urlsCrawled: number;
  totalUrls: number;
  statusMessage: string;
}

// ──── Main Component ────

const PipelineCrawlStep: React.FC = () => {
  const {
    pipeline,
    isGreenfield,
    autoApprove,
    setStepStatus,
    advanceStep,
    approveGate,
    rejectGate,
    reviseStep,
    toggleAutoApprove,
    getStepState,
    activeMap,
  } = usePipeline();

  const { state, dispatch } = useAppState();
  const stepState = getStepState('crawl');
  const gate = stepState?.gate;

  // ──── Crawl state ────
  const [url, setUrl] = useState(pipeline.siteUrl || '');
  const [crawlPhase, setCrawlPhase] = useState<CrawlPhase>('input');
  const [crawlResults, setCrawlResults] = useState<CrawlResults>({
    pagesFound: 0, urlsCrawled: 0, totalUrls: 0, statusMessage: 'Waiting to start...',
  });
  const [crawlError, setCrawlError] = useState('');

  // ──── AI analysis state ────
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<BusinessResearchResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const aiTriggeredRef = useRef(false);

  // ──── Business context state ────
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

  // ──── Restore previous state on mount ────
  useEffect(() => {
    const bizInfo = activeMap?.business_info;
    const hasExistingData = bizInfo?.seedKeyword && bizInfo?.industry;

    if (!isGreenfield && stepState?.status !== 'locked' && stepState?.status !== 'available') {
      if (hasExistingData) {
        setContextSaved(true);
      }
      if (stepState?.status === 'completed' || stepState?.status === 'pending_approval') {
        setCrawlPhase('done');
        const pageCount = (bizInfo as any)?.pagesFound ?? 0;
        if (pageCount > 0) {
          setCrawlResults({
            pagesFound: pageCount, urlsCrawled: pageCount, totalUrls: pageCount,
            statusMessage: `Previously crawled: ${pageCount} pages found.`,
          });
        }
      }
    }
  }, [activeMap?.id]);

  // ──── AI analysis: auto-trigger after crawl completes ────
  const runAiAnalysis = useCallback(async (siteUrl: string) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const result = await researchBusiness(siteUrl, state.businessInfo, dispatch);
      setAiResult(result);

      if (result.warnings.length > 0 && result.confidence === 'low') {
        setAnalyzeError(result.warnings.join(' '));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI analysis failed';
      setAnalyzeError(message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [state.businessInfo, dispatch]);

  // ──── Crawl handler ────
  const handleStartCrawl = useCallback(async () => {
    if (!url.trim() || !state.activeProjectId) return;

    setCrawlPhase('discovering');
    setCrawlError('');
    setCrawlResults(r => ({ ...r, statusMessage: 'Discovering sitemap...' }));
    aiTriggeredRef.current = false;

    try {
      let sitemapUrl = url.trim();
      if (!sitemapUrl.endsWith('/sitemap.xml') && !sitemapUrl.includes('sitemap')) {
        sitemapUrl = sitemapUrl.replace(/\/+$/, '') + '/sitemap.xml';
      }

      const proxyConfig = {
        supabaseUrl: state.businessInfo.supabaseUrl,
        supabaseAnonKey: state.businessInfo.supabaseAnonKey,
      };

      const discoveredUrls = await migrationService.fetchAndParseSitemap(
        sitemapUrl,
        (msg) => setCrawlResults(r => ({ ...r, statusMessage: msg })),
        proxyConfig,
      );

      if (discoveredUrls.length === 0) {
        setCrawlError('No URLs found in sitemap. Check that your sitemap.xml is accessible.');
        setCrawlPhase('error');
        return;
      }

      setCrawlResults(r => ({
        ...r, pagesFound: discoveredUrls.length, totalUrls: discoveredUrls.length,
        statusMessage: `Found ${discoveredUrls.length} pages. Saving to inventory...`,
      }));

      setCrawlPhase('crawling');
      await migrationService.initializeInventory(
        state.activeProjectId, discoveredUrls,
        state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey,
        (current, total) => {
          setCrawlResults(r => ({
            ...r, urlsCrawled: current,
            statusMessage: `Saving pages... ${current}/${total}`,
          }));
        },
      );

      const finalResults: CrawlResults = {
        pagesFound: discoveredUrls.length, urlsCrawled: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Discovery complete. ${discoveredUrls.length} pages found.`,
      };
      setCrawlResults(finalResults);
      setCrawlPhase('done');
      setStepStatus('crawl', 'in_progress');

      // Auto-trigger AI analysis
      if (!aiTriggeredRef.current) {
        aiTriggeredRef.current = true;
        runAiAnalysis(url.trim());
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl failed';
      setCrawlError(msg);
      setCrawlPhase('error');
    }
  }, [url, state.activeProjectId, state.businessInfo, setStepStatus, runAiAnalysis]);

  // ──── Save business context ────
  const handleSaveBusinessContext = useCallback(async (data: BusinessContextData) => {
    setIsSavingContext(true);

    const domain = url.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');

    const updatedBusinessInfo = {
      ...state.businessInfo,
      seedKeyword: data.seedKeyword,
      industry: data.industry,
      language: data.language,
      valueProp: data.description,
      domain,
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    if (state.activeMapId) {
      const mapBizInfo = {
        ...activeMap?.business_info,
        seedKeyword: data.seedKeyword,
        industry: data.industry,
        language: data.language,
        valueProp: data.description,
        domain,
        pagesFound: crawlResults.pagesFound,
      };

      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { business_info: mapBizInfo } },
      });

      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({ business_info: mapBizInfo } as any)
          .eq('id', state.activeMapId);
      } catch {
        // Non-fatal
      }
    }

    setContextSaved(true);
    setIsSavingContext(false);
    setStepStatus('crawl', 'pending_approval');
  }, [url, state, activeMap, crawlResults.pagesFound, dispatch, setStepStatus]);

  // ──── Greenfield submit ────
  const handleGreenfieldSubmit = useCallback(async (data: {
    seedKeyword: string; businessType: string; language: string;
    description: string; domainUrl: string;
  }) => {
    const updatedBusinessInfo = {
      ...state.businessInfo,
      seedKeyword: data.seedKeyword, industry: data.businessType,
      language: data.language, valueProp: data.description, domain: data.domainUrl,
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    if (state.activeMapId) {
      const mapBizInfo = {
        ...activeMap?.business_info,
        seedKeyword: data.seedKeyword, industry: data.businessType,
        language: data.language, valueProp: data.description, domain: data.domainUrl,
      };
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: { mapId: state.activeMapId, data: { business_info: mapBizInfo } },
      });

      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({ business_info: mapBizInfo } as any)
          .eq('id', state.activeMapId);
      } catch { /* Non-fatal */ }
    }

    setStepStatus('crawl', 'completed');
    advanceStep('crawl');
  }, [state, activeMap, dispatch, setStepStatus, advanceStep]);

  // ──── Derived state ────
  const crawlDone = crawlPhase === 'done' && crawlResults.pagesFound > 0;
  const existingBizInfo = activeMap?.business_info;
  const progressPercent = crawlResults.totalUrls > 0
    ? Math.round((crawlResults.urlsCrawled / crawlResults.totalUrls) * 100)
    : 0;

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
            : 'Crawl your website — AI will analyze and extract business context automatically'}
        </p>
      </div>

      {/* ──── Greenfield Mode ──── */}
      {isGreenfield ? (
        <GreenfieldForm onSubmit={handleGreenfieldSubmit} />
      ) : (
        <>
          {/* Phase indicator */}
          <PhaseIndicator
            currentPhase={contextSaved ? 2 : crawlDone ? 1 : crawlPhase === 'input' ? 0 : crawlPhase === 'error' ? 0 : 0}
            phases={['Crawl Site', 'AI Analysis & Review', 'Approval']}
          />

          {/* ──── Section 1: Crawl ──── */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              {crawlDone ? 'Crawl Results' : 'Website URL'}
            </h3>

            <div className="flex gap-3 mb-4">
              <input type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50" />
              <button type="button" onClick={handleStartCrawl}
                disabled={!url.trim() || crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap">
                {crawlPhase === 'discovering' || crawlPhase === 'crawling'
                  ? 'Crawling...'
                  : crawlDone ? 'Re-Crawl' : 'Start Crawl'}
              </button>
            </div>

            {(crawlResults.pagesFound > 0 || crawlPhase !== 'input') && (
              <>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <MetricCard label="Pages Found" value={crawlResults.pagesFound} color={crawlResults.pagesFound > 0 ? 'green' : 'gray'} />
                  <MetricCard label="Saved" value={crawlResults.urlsCrawled} color={crawlResults.urlsCrawled > 0 ? 'blue' : 'gray'} />
                  <MetricCard label="Total" value={crawlResults.totalUrls} />
                </div>
                <div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${crawlDone ? 'bg-green-500' : 'bg-blue-600'}`}
                      style={{ width: `${crawlDone ? 100 : progressPercent}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${crawlDone ? 'text-green-400' : 'text-gray-500'}`}>
                    {crawlResults.statusMessage}
                  </p>
                </div>
              </>
            )}

            {crawlError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-300">{crawlError}</p>
                <button type="button"
                  onClick={() => { setCrawlPhase('input'); setCrawlError(''); }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* ──── Section 2: Business Context (AI-prefilled, shown after crawl) ──── */}
          {(crawlDone || isAnalyzing) && !contextSaved && (
            <BusinessContextForm
              initialData={{
                seedKeyword: existingBizInfo?.seedKeyword ?? '',
                industry: existingBizInfo?.industry ?? '',
                language: existingBizInfo?.language ?? 'nl',
                description: existingBizInfo?.valueProp ?? '',
              }}
              aiResult={aiResult}
              isAnalyzing={isAnalyzing}
              analyzeError={analyzeError}
              onRetryAnalysis={() => runAiAnalysis(url.trim())}
              onSave={handleSaveBusinessContext}
              isSaving={isSavingContext}
            />
          )}

          {/* ──── Context saved confirmation ──── */}
          {contextSaved && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm text-green-300 font-medium">Business context saved</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {existingBizInfo?.seedKeyword && `Topic: ${existingBizInfo.seedKeyword}`}
                  {existingBizInfo?.industry && ` | Industry: ${existingBizInfo.industry}`}
                  {existingBizInfo?.language && ` | Language: ${existingBizInfo.language}`}
                </p>
              </div>
            </div>
          )}

          {/* ──── Approval Gate ──── */}
          {gate && (stepState?.status === 'pending_approval' || stepState?.approval?.status === 'rejected') && (
            <ApprovalGate
              step="crawl"
              gate={gate}
              approval={stepState?.approval}
              autoApprove={autoApprove}
              onApprove={() => approveGate('crawl')}
              onReject={(reason) => rejectGate('crawl', reason)}
              onRevise={() => reviseStep('crawl')}
              onToggleAutoApprove={toggleAutoApprove}
              summaryMetrics={[
                { label: 'Pages Found', value: crawlResults.pagesFound, color: crawlResults.pagesFound > 0 ? 'green' : 'gray' },
                { label: 'Business Info', value: contextSaved ? 'Complete' : 'Missing', color: contextSaved ? 'green' : 'red' },
                { label: 'AI Confidence', value: aiResult?.confidence ?? '--', color: aiResult?.confidence === 'high' ? 'green' : aiResult?.confidence === 'medium' ? 'amber' : 'gray' },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineCrawlStep;
