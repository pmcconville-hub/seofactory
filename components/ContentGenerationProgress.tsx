// components/ContentGenerationProgress.tsx
import React, { useState } from 'react';
import { ContentGenerationJob, ContentGenerationSection, PASS_NAMES, PassesStatus } from '../types';
import { SimpleMarkdown } from './ui/SimpleMarkdown';

interface ContentGenerationProgressProps {
  job: ContentGenerationJob;
  sections: ContentGenerationSection[];
  progress: number;
  currentPassName: string;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const CheckIcon = () => (
  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" strokeWidth="2" />
  </svg>
);

const getPassStatus = (job: ContentGenerationJob, passNum: number): 'completed' | 'in_progress' | 'pending' | 'failed' => {
  const passKeys: (keyof PassesStatus)[] = [
    'pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_visuals',
    'pass_5_microsemantics', 'pass_6_discourse', 'pass_7_intro', 'pass_8_audit'
  ];
  const key = passKeys[passNum - 1];
  return job.passes_status[key] || 'pending';
};

export const ContentGenerationProgress: React.FC<ContentGenerationProgressProps> = ({
  job,
  sections,
  progress,
  currentPassName,
  onPause,
  onResume,
  onCancel
}) => {
  const [showLivePreview, setShowLivePreview] = useState(false);

  // Get completed sections with content for preview
  const completedSections = sections
    .filter(s => s.status === 'completed' && s.current_content)
    .sort((a, b) => a.section_order - b.section_order);

  // Calculate word count of generated content
  const totalWords = completedSections.reduce((sum, s) => {
    const words = s.current_content?.split(/\s+/).length || 0;
    return sum + words;
  }, 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-white">
          Generating Article Draft
        </h3>
        {completedSections.length > 0 && (
          <button
            onClick={() => setShowLivePreview(!showLivePreview)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              showLivePreview
                ? 'bg-blue-900/50 border-blue-600 text-blue-200'
                : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showLivePreview ? '▲ Hide Preview' : '▼ Live Preview'} ({totalWords} words)
          </button>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 text-gray-300">
          <span>Pass {job.current_pass} of 8: {currentPassName}</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pass 1 Section Progress */}
      {job.current_pass === 1 && sections.length > 0 && (
        <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-2">
            Section {job.completed_sections || 0} of {job.total_sections || '?'}
          </p>
          {sections.map((section, idx) => (
            <div key={`${section.section_key}-${section.id || idx}`} className="flex items-center gap-2 text-sm">
              {section.status === 'completed' ? (
                <CheckIcon />
              ) : section.section_key === job.current_section_key ? (
                <SpinnerIcon />
              ) : (
                <CircleIcon />
              )}
              <span className={section.status === 'completed' ? 'text-gray-400' : 'text-gray-200'}>
                {section.section_heading || section.section_key}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pass List */}
      <div className="space-y-1 mb-4">
        {Object.entries(PASS_NAMES).map(([num, name]) => {
          const passNum = parseInt(num);
          const status = getPassStatus(job, passNum);
          return (
            <div key={num} className="flex items-center gap-2 text-sm">
              {status === 'completed' ? (
                <CheckIcon />
              ) : status === 'in_progress' ? (
                <SpinnerIcon />
              ) : (
                <CircleIcon />
              )}
              <span className={status === 'completed' ? 'text-gray-400' : 'text-gray-200'}>
                Pass {num}: {name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {job.last_error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded text-sm text-red-300">
          {job.last_error}
        </div>
      )}

      {/* Audit Score */}
      {job.status === 'completed' && job.final_audit_score !== null && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded">
          <p className="text-green-300 font-semibold">
            Audit Score: {job.final_audit_score}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {job.status === 'in_progress' && (
          <button
            onClick={onPause}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm"
          >
            Pause
          </button>
        )}
        {job.status === 'paused' && (
          <button
            onClick={onResume}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Resume
          </button>
        )}
        {(job.status === 'in_progress' || job.status === 'paused') && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Live Preview Panel */}
      {showLivePreview && completedSections.length > 0 && (
        <div className="mt-4 border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-gray-300">
              Live Preview ({completedSections.length} sections generated)
            </h4>
            <span className="text-xs text-gray-500">
              Content will be refined in subsequent passes
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto bg-gray-900/50 rounded-lg p-4 border border-gray-700">
            <div className="prose prose-invert prose-sm max-w-none">
              {completedSections.map((section, idx) => (
                <div key={`preview-${section.section_key}-${idx}`} className="mb-4 pb-4 border-b border-gray-800 last:border-b-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                      {section.section_order + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      {section.section_heading}
                    </span>
                  </div>
                  <SimpleMarkdown content={section.current_content || ''} />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-amber-400/70 mt-2 italic">
            ⚠️ This is draft content. If you see issues, you can Pause or Cancel and adjust the brief before continuing.
          </p>
        </div>
      )}
    </div>
  );
};

export default ContentGenerationProgress;
