/**
 * TemplateConfirmationFlow Component
 *
 * Multi-step wizard that guides users through template configuration before
 * content generation. Orchestrates template selection, depth configuration,
 * and conflict resolution steps.
 *
 * Flow: Loading → Template Selection → Depth Selection → Conflicts (if any) → Ready
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 19
 *
 * @module components/generation/TemplateConfirmationFlow
 */

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import TemplateSelectionModal from '../modals/TemplateSelectionModal';
import DepthSelectionModal from '../modals/DepthSelectionModal';
import ConflictResolutionModal from '../modals/ConflictResolutionModal';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { analyzeAndSuggestDepth } from '../../services/ai/contentGeneration/depthAnalyzer';
import { detectConflicts } from '../../services/ai/contentGeneration/conflictResolver';
import { getTemplateByName } from '../../config/contentTemplates';
import { BusinessInfo, ContentBrief } from '../../types';
import { ContentBrief as ContentBriefForConflicts } from '../../types/content';
import {
  TemplateName,
  TemplateSelectionResult,
  DepthSuggestion,
  ConflictDetectionResult,
  DepthMode,
} from '../../types/contentTemplates';

interface TemplateConfirmationFlowProps {
  /** Whether the modal flow is open */
  isOpen: boolean;
  /** Callback when flow is closed/cancelled */
  onClose: () => void;
  /** Callback when template is confirmed and ready to generate */
  onConfirm: (templateName: TemplateName, depthMode: DepthMode) => void;
  /** The content brief being configured */
  brief: ContentBrief;
  /** Business info for context */
  businessInfo: BusinessInfo;
}

/** Steps in the confirmation flow */
type FlowStep = 'loading' | 'template' | 'depth' | 'conflicts' | 'ready';

/**
 * Multi-step template confirmation wizard
 *
 * Guides users through:
 * 1. AI-recommended template selection with alternatives
 * 2. Content depth selection based on competitor analysis
 * 3. Conflict resolution (if brief settings differ from template)
 * 4. Final confirmation before generation starts
 */
const TemplateConfirmationFlow: React.FC<TemplateConfirmationFlowProps> = ({
  isOpen,
  onClose,
  onConfirm,
  brief,
  businessInfo,
}) => {
  // Flow state
  const [step, setStep] = useState<FlowStep>('loading');

  // Analysis results
  const [templateResult, setTemplateResult] = useState<TemplateSelectionResult | null>(null);
  const [depthSuggestion, setDepthSuggestion] = useState<DepthSuggestion | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictDetectionResult | null>(null);

  // User selections
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateName | null>(null);
  const [selectedDepth, setSelectedDepth] = useState<DepthMode>('moderate');

  // Run AI analysis on mount
  useEffect(() => {
    if (!isOpen) return;

    const analyze = async () => {
      setStep('loading');

      try {
        // 1. Get template recommendation
        // Determine topic type from brief's structured_outline or default to 'core'
        const topicType = (brief as any).topicType || 'core';
        const templateInput = {
          websiteType: (businessInfo.websiteType || 'INFORMATIONAL') as any,
          queryIntent: (brief.searchIntent || 'informational') as any,
          queryType: brief.query_type_format || 'definitional',
          topicType: topicType as 'core' | 'outer' | 'child',
          topicClass: (brief as any).topic_class || 'informational',
        };

        const result = selectTemplate(templateInput);
        setTemplateResult(result);
        setSelectedTemplate(result.template.templateName);

        // 2. Get depth suggestion
        // Build competitor word counts from competitorSpecs if available
        const competitorWordCounts = brief.competitorSpecs?.benchmarks
          ? [
              brief.competitorSpecs.benchmarks.avgCompetitorWordCount,
              brief.competitorSpecs.benchmarks.topCompetitorWordCount,
            ]
          : [1500, 2500]; // Default fallback

        // Map numeric difficulty to string difficulty level
        const serpDifficultyNum = (brief as any).serpDifficulty || 50;
        const serpDifficulty: 'low' | 'medium' | 'high' =
          serpDifficultyNum < 40 ? 'low' : serpDifficultyNum < 70 ? 'medium' : 'high';

        const depthInput = {
          competitorWordCounts,
          serpDifficulty,
          topicType: topicType as 'core' | 'outer' | 'child',
          existingTopicalAuthority: (businessInfo as any).authorityScore || 30,
          queryIntent: brief.searchIntent || 'informational',
        };

        const depth = analyzeAndSuggestDepth(depthInput);
        setDepthSuggestion(depth);
        setSelectedDepth(depth.recommended);

        // 3. Check for conflicts with recommended template
        const template = getTemplateByName(result.template.templateName);
        if (template) {
          // Cast brief to the conflict resolver's expected type
          const conflicts = detectConflicts(template, brief as unknown as ContentBriefForConflicts);
          setConflictResult(conflicts);
        }

        // Move to template selection step
        setStep('template');
      } catch (error) {
        console.error('[TemplateConfirmationFlow] Analysis failed:', error);
        // Fall back to template step anyway
        setStep('template');
      }
    };

    analyze();
  }, [isOpen, brief, businessInfo]);

  // Handle template selection
  const handleTemplateSelect = (templateName: TemplateName) => {
    setSelectedTemplate(templateName);

    // Re-check conflicts with newly selected template
    const template = getTemplateByName(templateName);
    if (template) {
      // Cast brief to the conflict resolver's expected type
      const conflicts = detectConflicts(template, brief as unknown as ContentBriefForConflicts);
      setConflictResult(conflicts);
    }

    // Move to depth selection
    setStep('depth');
  };

  // Handle depth selection
  const handleDepthSelect = (depth: DepthMode | 'custom') => {
    if (depth !== 'custom') {
      setSelectedDepth(depth);
    }

    // Check if we need conflict resolution
    if (conflictResult?.hasConflicts) {
      setStep('conflicts');
    } else {
      setStep('ready');
    }
  };

  // Handle conflict resolution
  const handleConflictResolve = (choice: 'template' | 'brief' | 'merge') => {
    // Resolution is applied - move to ready state
    // The actual resolution is handled by briefTemplateSync when generation starts
    setStep('ready');
  };

  // Handle final confirmation
  const handleConfirm = () => {
    if (selectedTemplate) {
      onConfirm(selectedTemplate, selectedDepth);
    }
  };

  // Render loading state
  if (step === 'loading') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Preparing Content Generation"
        maxWidth="max-w-md"
      >
        <div className="flex flex-col items-center justify-center py-12">
          <SmartLoader context="analyzing" size="lg" />
          <p className="mt-4 text-gray-400">Analyzing your content brief...</p>
          <p className="text-xs text-gray-500 mt-2">
            Finding the best template and depth settings
          </p>
        </div>
      </Modal>
    );
  }

  // Render template selection step
  if (step === 'template' && templateResult) {
    return (
      <TemplateSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleTemplateSelect}
        selectedTemplate={templateResult.template}
        alternatives={templateResult.alternatives}
        reasoning={templateResult.reasoning}
        confidence={templateResult.confidence}
      />
    );
  }

  // Render depth selection step
  if (step === 'depth' && depthSuggestion) {
    return (
      <DepthSelectionModal
        isOpen={isOpen}
        onClose={onClose}
        onSelect={handleDepthSelect}
        suggestion={depthSuggestion}
      />
    );
  }

  // Render conflict resolution step
  if (step === 'conflicts' && conflictResult) {
    return (
      <ConflictResolutionModal
        isOpen={isOpen}
        onClose={onClose}
        onResolve={handleConflictResolve}
        detection={conflictResult}
      />
    );
  }

  // Render ready state - final confirmation
  const templateConfig = selectedTemplate ? getTemplateByName(selectedTemplate) : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ready to Generate"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Start Generation
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Configuration Summary */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Configuration Summary
          </h3>
          <div className="space-y-3">
            {/* Template */}
            <div className="flex items-start justify-between">
              <span className="text-gray-500">Template:</span>
              <div className="text-right">
                <span className="text-white font-medium">{selectedTemplate}</span>
                {templateConfig && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {templateConfig.label}
                  </p>
                )}
              </div>
            </div>

            {/* Depth */}
            <div className="flex items-start justify-between">
              <span className="text-gray-500">Content Depth:</span>
              <div className="text-right">
                <span className="text-white font-medium capitalize">
                  {selectedDepth.replace('-', ' ')}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedDepth === 'high-quality'
                    ? 'Comprehensive coverage'
                    : selectedDepth === 'quick-publish'
                    ? 'Concise content'
                    : 'Balanced depth'}
                </p>
              </div>
            </div>

            {/* Template confidence */}
            {templateResult && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Match Confidence:</span>
                <span
                  className={`font-medium ${
                    templateResult.confidence >= 80
                      ? 'text-green-400'
                      : templateResult.confidence >= 60
                      ? 'text-yellow-400'
                      : 'text-orange-400'
                  }`}
                >
                  {templateResult.confidence}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Brief info */}
        <div className="text-sm text-gray-400">
          <p>
            Generating content for:{' '}
            <span className="text-white font-medium">{brief.title}</span>
          </p>
        </div>

        {/* Info note */}
        <p className="text-xs text-gray-500">
          Click "Start Generation" to begin the 10-pass content generation
          process. You can pause or cancel at any time.
        </p>
      </div>
    </Modal>
  );
};

export default TemplateConfirmationFlow;
