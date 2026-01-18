/**
 * TemplateSelectionPanel Component
 *
 * Panel for viewing and selecting content templates within the BriefEditModal.
 * Shows current template, available alternatives, and allows changing the template.
 *
 * Created: 2026-01-18 - Content Template Routing Phase 3 Task 21
 *
 * @module components/brief/TemplateSelectionPanel
 */

import React, { useState, useMemo } from 'react';
import { ContentBrief, BusinessInfo } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import {
  TemplateName,
  TemplateConfig,
  DepthMode,
} from '../../types/contentTemplates';
import { selectTemplate } from '../../services/ai/contentGeneration/templateRouter';
import { getTemplateByName, CONTENT_TEMPLATES } from '../../config/contentTemplates';

interface TemplateSelectionPanelProps {
  /** The content brief being edited */
  brief: ContentBrief;
  /** Business info for context */
  businessInfo?: BusinessInfo;
  /** Callback when template is changed */
  onTemplateChange: (templateName: TemplateName, confidence: number) => void;
  /** Callback when depth mode is changed */
  onDepthChange?: (depthMode: DepthMode) => void;
}

/**
 * Panel for template selection in brief editing
 */
export const TemplateSelectionPanel: React.FC<TemplateSelectionPanelProps> = ({
  brief,
  businessInfo,
  onTemplateChange,
  onDepthChange,
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAllTemplates, setShowAllTemplates] = useState(false);

  // Get current template config
  const currentTemplate = useMemo(() => {
    if (brief.selectedTemplate) {
      return getTemplateByName(brief.selectedTemplate);
    }
    return null;
  }, [brief.selectedTemplate]);

  // Get AI recommendation
  const aiRecommendation = useMemo(() => {
    const topicType = (brief as any).topicType || 'core';
    const input = {
      websiteType: (businessInfo?.websiteType || 'INFORMATIONAL') as any,
      queryIntent: (brief.searchIntent || 'informational') as any,
      queryType: brief.query_type_format || 'definitional',
      topicType: topicType as 'core' | 'outer' | 'child',
      topicClass: (brief as any).topic_class || 'informational',
    };
    return selectTemplate(input);
  }, [brief, businessInfo]);

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400 bg-green-900/30 border-green-600/50';
    if (confidence >= 60) return 'text-yellow-400 bg-yellow-900/30 border-yellow-600/50';
    return 'text-orange-400 bg-orange-900/30 border-orange-600/50';
  };

  // Handle template selection
  const handleSelectTemplate = (templateName: TemplateName, confidence: number = 85) => {
    onTemplateChange(templateName, confidence);
  };

  // Handle running AI analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    // Small delay to show the analysis animation
    await new Promise(resolve => setTimeout(resolve, 500));
    handleSelectTemplate(aiRecommendation.template.templateName, aiRecommendation.confidence);
    setIsAnalyzing(false);
  };

  // All available templates
  const allTemplates = Object.values(CONTENT_TEMPLATES) as TemplateConfig[];

  return (
    <div className="space-y-6">
      {/* Current Template */}
      <div>
        <h3 className="text-lg font-medium text-white mb-3">Current Template</h3>
        {currentTemplate ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-white font-semibold">{currentTemplate.templateName}</span>
                <span className="text-slate-400 text-sm">{currentTemplate.label}</span>
              </div>
              {brief.templateConfidence && (
                <span className={`text-xs px-2 py-1 rounded border ${getConfidenceColor(brief.templateConfidence)}`}>
                  {brief.templateConfidence}% match
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mb-3">{currentTemplate.description}</p>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {currentTemplate.minSections}-{currentTemplate.maxSections} sections
              </span>
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {currentTemplate.stylometry.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-dashed border-slate-600 rounded-lg p-4 text-center">
            <p className="text-slate-400 mb-3">No template selected</p>
            <Button variant="secondary" onClick={handleRunAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <SmartLoader context="analyzing" size="sm" showText={false} />
                  <span className="ml-2">Analyzing...</span>
                </>
              ) : (
                'Get AI Recommendation'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* AI Recommendation */}
      {currentTemplate?.templateName !== aiRecommendation.template.templateName && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">AI Recommendation</h3>
          <button
            onClick={() => handleSelectTemplate(aiRecommendation.template.templateName, aiRecommendation.confidence)}
            className="w-full text-left bg-cyan-900/20 border border-cyan-600/30 rounded-lg p-4 hover:bg-cyan-900/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 font-semibold">{aiRecommendation.template.templateName}</span>
                <span className="text-slate-400 text-sm">{aiRecommendation.template.label}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded border ${getConfidenceColor(aiRecommendation.confidence)}`}>
                {aiRecommendation.confidence}% match
              </span>
            </div>
            <ul className="space-y-1 mb-2">
              {aiRecommendation.reasoning.slice(0, 2).map((reason, i) => (
                <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  {reason}
                </li>
              ))}
            </ul>
            <span className="text-xs text-cyan-400">Click to apply</span>
          </button>
        </div>
      )}

      {/* Template Structure Preview */}
      {currentTemplate && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Template Structure</h3>
          <div className="bg-slate-900/50 rounded-lg p-3 max-h-40 overflow-y-auto">
            {currentTemplate.sectionStructure.map((section, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 py-1 text-sm ${
                  section.required ? 'text-white' : 'text-slate-500'
                }`}
              >
                <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {section.formatCode}
                </span>
                <span>{section.headingPattern}</span>
                {section.required && (
                  <span className="text-xs text-cyan-400">(required)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Templates Toggle */}
      <div>
        <button
          onClick={() => setShowAllTemplates(!showAllTemplates)}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-2"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllTemplates ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showAllTemplates ? 'Hide' : 'Show'} All Templates ({allTemplates.length})
        </button>

        {showAllTemplates && (
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {allTemplates.map((template) => (
              <button
                key={template.templateName}
                onClick={() => handleSelectTemplate(template.templateName, 80)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  currentTemplate?.templateName === template.templateName
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-slate-700 bg-slate-900/30 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium">{template.templateName}</span>
                    <span className="ml-2 text-slate-500 text-sm">{template.label}</span>
                  </div>
                  {currentTemplate?.templateName === template.templateName && (
                    <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <p className="text-slate-500 text-xs mt-1">{template.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Depth Mode Selector */}
      {onDepthChange && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">Content Depth</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['high-quality', 'moderate', 'quick-publish'] as DepthMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => onDepthChange(mode)}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  brief.depthMode === mode
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-700 bg-slate-900/30 text-slate-400 hover:border-slate-600'
                }`}
              >
                <span className="text-lg block mb-1">
                  {mode === 'high-quality' ? '🏆' : mode === 'moderate' ? '⚖️' : '⚡'}
                </span>
                <span className="text-xs capitalize">{mode.replace('-', ' ')}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelectionPanel;
