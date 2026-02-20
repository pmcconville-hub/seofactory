import React, { useState, useEffect, useCallback } from 'react';
import { usePipeline } from '../../../hooks/usePipeline';
import { useAppState } from '../../../state/appState';
import ApprovalGate from '../../pipeline/ApprovalGate';
import * as migrationService from '../../../services/migrationService';
import { getSupabaseClient } from '../../../services/supabaseClient';

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
          <input
            type="text"
            value={seedKeyword}
            onChange={(e) => setSeedKeyword(e.target.value)}
            placeholder="e.g., electric bikes"
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => canSubmit && onSubmit({ seedKeyword, businessType, language, description, domainUrl })}
          disabled={!canSubmit}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
}

// ──── Business Context Form (for existing site, shown after crawl) ────

interface BusinessContextData {
  seedKeyword: string;
  industry: string;
  language: string;
  description: string;
}

function BusinessContextForm({
  initialData,
  onSave,
  isSaving,
}: {
  initialData?: Partial<BusinessContextData>;
  onSave: (data: BusinessContextData) => void;
  isSaving: boolean;
}) {
  const [seedKeyword, setSeedKeyword] = useState(initialData?.seedKeyword ?? '');
  const [industry, setIndustry] = useState(initialData?.industry ?? '');
  const [language, setLanguage] = useState(initialData?.language ?? 'nl');
  const [description, setDescription] = useState(initialData?.description ?? '');

  const canSave = seedKeyword.trim() && industry && description.trim();

  return (
    <div className="bg-gray-800 border border-blue-700/50 rounded-lg p-6 space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <span className="bg-blue-600 text-xs font-bold text-white px-2 py-0.5 rounded">
          REQUIRED
        </span>
        <h3 className="text-sm font-semibold text-gray-200">Business Context</h3>
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        This information is needed for gap analysis and all subsequent steps.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Primary Topic / Seed Keyword <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={seedKeyword}
          onChange={(e) => setSeedKeyword(e.target.value)}
          placeholder="e.g., property management, dental implants"
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">This becomes the Central Entity for your SEO strategy</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Industry <span className="text-red-400">*</span>
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Business Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this business do? Who are the customers? What makes it unique?"
          rows={3}
          className="w-full bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => canSave && onSave({ seedKeyword, industry, language, description })}
          disabled={!canSave || isSaving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-md font-medium transition-colors flex items-center gap-2"
        >
          {isSaving && (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSaving ? 'Saving...' : 'Save Business Context & Submit for Review'}
        </button>
      </div>
    </div>
  );
}

// ──── Existing Site Mode ────

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
    pagesFound: 0,
    urlsCrawled: 0,
    totalUrls: 0,
    statusMessage: 'Waiting to start...',
  });
  const [crawlError, setCrawlError] = useState('');

  // ──── Business context state (for existing site) ────
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [contextSaved, setContextSaved] = useState(false);

  // ──── Restore previous state on mount ────
  useEffect(() => {
    // Check if we already have data from a previous crawl
    const bizInfo = activeMap?.business_info;
    const hasExistingData = bizInfo?.seedKeyword && bizInfo?.industry;

    if (!isGreenfield && stepState?.status !== 'locked' && stepState?.status !== 'available') {
      // Step was already worked on — restore what we can
      if (hasExistingData) {
        setContextSaved(true);
      }
      // If step was completed or pending_approval, show done state
      if (stepState?.status === 'completed' || stepState?.status === 'pending_approval') {
        setCrawlPhase('done');
        // Try to get count from business_info or show a generic message
        const pageCount = (bizInfo as any)?.pagesFound ?? 0;
        if (pageCount > 0) {
          setCrawlResults({
            pagesFound: pageCount,
            urlsCrawled: pageCount,
            totalUrls: pageCount,
            statusMessage: `Previously crawled: ${pageCount} pages found.`,
          });
        }
      }
    }
  }, [activeMap?.id]);

  // ──── Crawl handler ────
  const handleStartCrawl = useCallback(async () => {
    if (!url.trim() || !state.activeProjectId) return;

    setCrawlPhase('discovering');
    setCrawlError('');
    setCrawlResults(r => ({ ...r, statusMessage: 'Discovering sitemap...' }));

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
        ...r,
        pagesFound: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Found ${discoveredUrls.length} pages. Saving to inventory...`,
      }));

      setCrawlPhase('crawling');
      await migrationService.initializeInventory(
        state.activeProjectId,
        discoveredUrls,
        state.businessInfo.supabaseUrl,
        state.businessInfo.supabaseAnonKey,
        (current, total) => {
          setCrawlResults(r => ({
            ...r,
            urlsCrawled: current,
            statusMessage: `Saving pages... ${current}/${total}`,
          }));
        },
      );

      const finalResults: CrawlResults = {
        pagesFound: discoveredUrls.length,
        urlsCrawled: discoveredUrls.length,
        totalUrls: discoveredUrls.length,
        statusMessage: `Discovery complete. ${discoveredUrls.length} pages found.`,
      };
      setCrawlResults(finalResults);
      setCrawlPhase('done');
      setStepStatus('crawl', 'in_progress');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Crawl failed';
      setCrawlError(msg);
      setCrawlPhase('error');
    }
  }, [url, state.activeProjectId, state.businessInfo, setStepStatus]);

  // ──── Save business context (existing site) ────
  const handleSaveBusinessContext = useCallback(async (data: BusinessContextData) => {
    setIsSavingContext(true);

    const domain = url.trim().replace(/\/+$/, '').replace(/^https?:\/\//, '');

    // Save to global state
    const updatedBusinessInfo = {
      ...state.businessInfo,
      seedKeyword: data.seedKeyword,
      industry: data.industry,
      language: data.language,
      valueProp: data.description,
      domain,
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    // Save to map's business_info (survives navigation)
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

      // Persist to Supabase
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
    seedKeyword: string;
    businessType: string;
    language: string;
    description: string;
    domainUrl: string;
  }) => {
    const updatedBusinessInfo = {
      ...state.businessInfo,
      seedKeyword: data.seedKeyword,
      industry: data.businessType,
      language: data.language,
      valueProp: data.description,
      domain: data.domainUrl,
    };
    dispatch({ type: 'SET_BUSINESS_INFO', payload: updatedBusinessInfo });

    if (state.activeMapId) {
      dispatch({
        type: 'UPDATE_MAP_DATA',
        payload: {
          mapId: state.activeMapId,
          data: {
            business_info: {
              ...activeMap?.business_info,
              seedKeyword: data.seedKeyword,
              industry: data.businessType,
              language: data.language,
              valueProp: data.description,
              domain: data.domainUrl,
            },
          },
        },
      });

      try {
        const supabase = getSupabaseClient(
          state.businessInfo.supabaseUrl,
          state.businessInfo.supabaseAnonKey
        );
        await supabase
          .from('topical_maps')
          .update({
            business_info: {
              ...activeMap?.business_info,
              seedKeyword: data.seedKeyword,
              industry: data.businessType,
              language: data.language,
              valueProp: data.description,
              domain: data.domainUrl,
            },
          } as any)
          .eq('id', state.activeMapId);
      } catch {
        // Non-fatal
      }
    }

    setStepStatus('crawl', 'completed');
    advanceStep('crawl');
  }, [state, activeMap, dispatch, setStepStatus, advanceStep]);

  // ──── Derived state ────
  const crawlDone = crawlPhase === 'done' && crawlResults.pagesFound > 0;
  const phaseIndex = crawlPhase === 'input' ? 0 : crawlPhase === 'discovering' || crawlPhase === 'crawling' ? 1 : 2;
  const progressPercent = crawlResults.totalUrls > 0
    ? Math.round((crawlResults.urlsCrawled / crawlResults.totalUrls) * 100)
    : 0;

  // Existing business data from map (for pre-populating form)
  const existingBizInfo = activeMap?.business_info;

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
            : 'Crawl your existing website and provide business context'}
        </p>
      </div>

      {/* ──── Greenfield Mode ──── */}
      {isGreenfield ? (
        <GreenfieldForm onSubmit={handleGreenfieldSubmit} />
      ) : (
        <>
          {/* Phase indicator for existing site */}
          <PhaseIndicator
            currentPhase={contextSaved ? 2 : crawlDone ? 1 : phaseIndex}
            phases={['Crawl Site', 'Business Context', 'Review']}
          />

          {/* ──── Section 1: Crawl ──── */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-200 mb-4">
              {crawlDone ? 'Crawl Results' : 'Website URL'}
            </h3>

            {/* URL Input + Button */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              />
              <button
                type="button"
                onClick={handleStartCrawl}
                disabled={!url.trim() || crawlPhase === 'discovering' || crawlPhase === 'crawling'}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
              >
                {crawlPhase === 'discovering' || crawlPhase === 'crawling'
                  ? 'Crawling...'
                  : crawlDone
                    ? 'Re-Crawl'
                    : 'Start Crawl'}
              </button>
            </div>

            {/* Crawl metrics */}
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

            {/* Crawl error */}
            {crawlError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mt-4">
                <p className="text-sm text-red-300">{crawlError}</p>
                <button
                  type="button"
                  onClick={() => { setCrawlPhase('input'); setCrawlError(''); }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </div>

          {/* ──── Section 2: Business Context (only after crawl completes) ──── */}
          {crawlDone && !contextSaved && (
            <BusinessContextForm
              initialData={{
                seedKeyword: existingBizInfo?.seedKeyword ?? '',
                industry: existingBizInfo?.industry ?? '',
                language: existingBizInfo?.language ?? 'nl',
                description: existingBizInfo?.valueProp ?? '',
              }}
              onSave={handleSaveBusinessContext}
              isSaving={isSavingContext}
            />
          )}

          {/* ──── Business context saved confirmation ──── */}
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
                { label: 'Saved to Inventory', value: crawlResults.urlsCrawled, color: crawlResults.urlsCrawled > 0 ? 'blue' : 'gray' },
                { label: 'Business Info', value: contextSaved ? 'Complete' : 'Missing', color: contextSaved ? 'green' : 'red' },
              ]}
            />
          )}
        </>
      )}
    </div>
  );
};

export default PipelineCrawlStep;
