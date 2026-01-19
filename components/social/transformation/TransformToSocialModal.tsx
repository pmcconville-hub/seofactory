/**
 * TransformToSocialModal Component
 *
 * Main modal for transforming article content into social media posts.
 * Guides users through platform selection, template configuration, and preview.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import type {
  SocialMediaPlatform,
  SocialPostTemplate,
  PlatformSelection,
  SocialCampaign,
  SocialPost,
  CampaignComplianceReport,
  ArticleTransformationSource,
  TransformationConfig
} from '../../../types/social';
import { SOCIAL_PLATFORM_CONFIG } from '../../../types/social';
import { PlatformSelector } from './PlatformSelector';
import { TemplateSelector } from './TemplateSelector';
import { CampaignPreview } from './CampaignPreview';

type ModalStep = 'select_platforms' | 'configure' | 'preview' | 'generating' | 'complete';

interface TransformToSocialModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: ArticleTransformationSource;
  templates?: Record<SocialMediaPlatform, SocialPostTemplate[]>;
  onTransform: (config: TransformationConfig) => Promise<{
    campaign: SocialCampaign;
    posts: SocialPost[];
    complianceReport: CampaignComplianceReport;
  }>;
  onComplete?: (campaign: SocialCampaign, posts: SocialPost[]) => void;
}

const STEP_TITLES: Record<ModalStep, string> = {
  select_platforms: 'Select Platforms',
  configure: 'Configure Templates',
  preview: 'Preview Campaign',
  generating: 'Generating Posts',
  complete: 'Campaign Ready'
};

const DEFAULT_TEMPLATES: Record<SocialMediaPlatform, SocialPostTemplate[]> = {
  linkedin: [],
  twitter: [],
  facebook: [],
  instagram: [],
  pinterest: []
};

export const TransformToSocialModal: React.FC<TransformToSocialModalProps> = ({
  isOpen,
  onClose,
  source,
  templates = DEFAULT_TEMPLATES,
  onTransform,
  onComplete
}) => {
  const [step, setStep] = useState<ModalStep>('select_platforms');
  const [selections, setSelections] = useState<PlatformSelection[]>([]);
  const [hubPlatform, setHubPlatform] = useState<SocialMediaPlatform>('linkedin');
  const [utmCampaign, setUtmCampaign] = useState(source.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50));
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [maxSpokePosts, setMaxSpokePosts] = useState(7);

  const [generatedCampaign, setGeneratedCampaign] = useState<SocialCampaign | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<SocialPost[]>([]);
  const [complianceReport, setComplianceReport] = useState<CampaignComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select_platforms');
      setSelections([]);
      setGeneratedCampaign(null);
      setGeneratedPosts([]);
      setComplianceReport(null);
      setError(null);
    }
  }, [isOpen]);

  const handleNext = useCallback(async () => {
    switch (step) {
      case 'select_platforms':
        if (selections.length === 0) {
          setError('Please select at least one platform');
          return;
        }
        setError(null);
        setStep('configure');
        break;

      case 'configure':
        setStep('generating');
        setIsGenerating(true);
        setError(null);

        try {
          const config: TransformationConfig = {
            platforms: selections,
            hub_platform: hubPlatform,
            utm_campaign: utmCampaign,
            include_hashtags: includeHashtags,
            max_spoke_posts: maxSpokePosts
          };

          const result = await onTransform(config);
          setGeneratedCampaign(result.campaign);
          setGeneratedPosts(result.posts);
          setComplianceReport(result.complianceReport);
          setStep('preview');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to generate posts');
          setStep('configure');
        } finally {
          setIsGenerating(false);
        }
        break;

      case 'preview':
        setStep('complete');
        if (generatedCampaign && onComplete) {
          onComplete(generatedCampaign, generatedPosts);
        }
        break;

      case 'complete':
        onClose();
        break;
    }
  }, [step, selections, hubPlatform, utmCampaign, includeHashtags, maxSpokePosts, onTransform, generatedCampaign, generatedPosts, onComplete, onClose]);

  const handleBack = useCallback(() => {
    switch (step) {
      case 'configure':
        setStep('select_platforms');
        break;
      case 'preview':
        setStep('configure');
        break;
      case 'complete':
        setStep('preview');
        break;
    }
  }, [step]);

  const canProceed = () => {
    switch (step) {
      case 'select_platforms':
        return selections.length > 0;
      case 'configure':
        return selections.every(s => s.template_type);
      case 'preview':
        return generatedPosts.length > 0;
      case 'generating':
        return false;
      case 'complete':
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'select_platforms':
        return (
          <div className="space-y-6">
            {/* Source info */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Source Content</h4>
              <p className="text-white font-medium">{source.title}</p>
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">{source.meta_description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>{source.key_takeaways.length} key takeaways</span>
                <span>{source.schema_entities.length} entities</span>
                <span>{source.contextual_vectors.length} EAVs</span>
              </div>
            </div>

            <PlatformSelector
              selections={selections}
              onChange={setSelections}
              hubPlatform={hubPlatform}
              onHubPlatformChange={setHubPlatform}
              maxSpokePosts={maxSpokePosts}
            />
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            <TemplateSelector
              selections={selections}
              templates={templates}
              onChange={setSelections}
              hubPlatform={hubPlatform}
            />

            {/* Additional options */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Campaign Settings</h4>

              {/* UTM Campaign */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">UTM Campaign Name</label>
                <input
                  type="text"
                  value={utmCampaign}
                  onChange={(e) => setUtmCampaign(e.target.value)}
                  placeholder="my-campaign-name"
                  className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Hashtags toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHashtags}
                  onChange={(e) => setIncludeHashtags(e.target.checked)}
                  className="rounded border-gray-600"
                />
                Include hashtags in posts
              </label>

              {/* Max spoke posts */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Spoke Posts</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="1"
                    max="7"
                    value={maxSpokePosts}
                    onChange={(e) => setMaxSpokePosts(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm text-white w-4">{maxSpokePosts}</span>
                </div>
              </div>
            </div>
          </div>
        );

      case 'generating':
        return (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
            <p className="text-white font-medium">Generating social posts...</p>
            <p className="text-sm text-gray-400 mt-2">
              Creating {selections.reduce((sum, s) => sum + s.post_count, 0)} posts across {selections.length} platforms
            </p>
          </div>
        );

      case 'preview':
        return (
          <div>
            {generatedCampaign && (
              <CampaignPreview
                campaign={generatedCampaign}
                posts={generatedPosts}
                complianceReport={complianceReport || undefined}
              />
            )}
          </div>
        );

      case 'complete':
        return (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Campaign Created!</h3>
            <p className="text-gray-400">
              Your social media campaign with {generatedPosts.length} posts is ready.
            </p>
            {complianceReport && (
              <p className={`mt-2 text-sm ${
                complianceReport.overall_score >= 85 ? 'text-green-400' : 'text-yellow-400'
              }`}>
                Compliance Score: {Math.round(complianceReport.overall_score)}%
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setStep('preview')}>
                Review Posts
              </Button>
              <Button onClick={onClose}>
                Go to Campaign
              </Button>
            </div>
          </div>
        );
    }
  };

  const renderFooter = () => {
    if (step === 'generating' || step === 'complete') {
      return null;
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div>
          {step !== 'select_platforms' && (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || isGenerating}
          >
            {step === 'preview' ? 'Finish' : 'Continue'}
          </Button>
        </div>
      </div>
    );
  };

  // Step indicator
  const steps: ModalStep[] = ['select_platforms', 'configure', 'preview'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={STEP_TITLES[step]}
      maxWidth="max-w-4xl"
      footer={renderFooter()}
    >
      {/* Step indicator */}
      {step !== 'complete' && (
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => {
            const isActive = i === currentStepIndex;
            const isComplete = i < currentStepIndex || step === 'complete';

            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 ${
                  isActive ? 'text-blue-400' : isComplete ? 'text-green-400' : 'text-gray-500'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-blue-400 bg-blue-400/20' :
                    isComplete ? 'border-green-400 bg-green-400/20' :
                    'border-gray-600'
                  }`}>
                    {isComplete ? (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-sm">{i + 1}</span>
                    )}
                  </div>
                  <span className="text-sm hidden sm:inline">{STEP_TITLES[s]}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-0.5 ${
                    i < currentStepIndex ? 'bg-green-400' : 'bg-gray-600'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Step content */}
      {renderStepContent()}
    </Modal>
  );
};

export default TransformToSocialModal;
