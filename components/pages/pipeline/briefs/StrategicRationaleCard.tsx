import React from 'react';

interface StrategicRationaleCardProps {
  summary: string | undefined;
  isGenerating: boolean;
}

export function StrategicRationaleCard({ summary, isGenerating }: StrategicRationaleCardProps) {
  if (isGenerating) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse">
        <div className="h-3 bg-gray-700 rounded w-1/4 mb-3" />
        <div className="space-y-2">
          <div className="h-2 bg-gray-700 rounded w-full" />
          <div className="h-2 bg-gray-700 rounded w-5/6" />
          <div className="h-2 bg-gray-700 rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="bg-gray-800 border border-blue-500/20 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">Strategic Rationale</h4>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed">{summary}</p>
    </div>
  );
}
