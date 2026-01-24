/**
 * UrlInputStep - First step of quotation wizard
 *
 * Allows user to enter a URL for analysis.
 */

import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { AnalysisProgress } from '../../../services/quotation';

interface UrlInputStepProps {
  url: string;
  onUrlChange: (url: string) => void;
  onAnalyze: () => Promise<void>;
  onQuickAnalyze: () => void;
  isAnalyzing: boolean;
  progress: AnalysisProgress | null;
  error: string | null;
}

export const UrlInputStep: React.FC<UrlInputStepProps> = ({
  url,
  onUrlChange,
  onAnalyze,
  onQuickAnalyze,
  isAnalyzing,
  progress,
  error,
}) => {
  const [inputValue, setInputValue] = useState(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUrlChange(inputValue);
    onAnalyze();
  };

  const handleQuickAnalyze = () => {
    onUrlChange(inputValue);
    onQuickAnalyze();
  };

  const isValidUrl = inputValue.trim().length > 0;

  return (
    <Card className="p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Enter Website URL</h2>
        <p className="text-gray-400">
          We'll analyze the website to understand its SEO needs and create a customized quote
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-300 mb-2">
            Website URL
          </label>
          <div className="relative">
            <input
              type="text"
              id="url"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="example.com or https://example.com"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isAnalyzing}
            />
            {isAnalyzing && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader size="sm" />
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {isAnalyzing && progress && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{progress.message}</span>
              <span className="text-sm text-blue-400">{progress.progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={!isValidUrl || isAnalyzing}
            className="flex-1"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze Website'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isValidUrl || isAnalyzing}
            onClick={handleQuickAnalyze}
          >
            Quick Estimate
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          Quick Estimate provides instant results without API calls.
          Full analysis requires API keys configured in settings.
        </p>
      </form>
    </Card>
  );
};
