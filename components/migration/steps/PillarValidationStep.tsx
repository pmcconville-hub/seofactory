import React, { useState, useEffect } from 'react';
import type { PillarSuggestion } from '../../../services/ai/pillarDetection';
import type { SEOPillars } from '../../../types';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Label } from '../../ui/Label';
import { Loader } from '../../ui/Loader';

// ── Props ──────────────────────────────────────────────────────────────────

interface PillarValidationStepProps {
  suggestion: PillarSuggestion | null;
  isLoading: boolean;
  onConfirm: (pillars: SEOPillars, language: string, region: string) => void;
  onRegenerate: () => void;
}

// ── Confidence bar helper ─────────────────────────────────────────────────

function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return 'bg-green-500';
  if (confidence >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 70) return 'High';
  if (confidence >= 40) return 'Medium';
  return 'Low';
}

// ── PillarField sub-component ─────────────────────────────────────────────

interface PillarFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  confidence: number;
  alternatives: string[];
  evidence?: string[];
}

const PillarField: React.FC<PillarFieldProps> = ({
  label,
  value,
  onChange,
  confidence,
  alternatives,
  evidence,
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* Label and Input */}
      <div>
        <Label>{label}</Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}...`}
        />
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Confidence</span>
          <span className={confidence >= 70 ? 'text-green-400' : confidence >= 40 ? 'text-yellow-400' : 'text-red-400'}>
            {confidence}% &mdash; {getConfidenceLabel(confidence)}
          </span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${getConfidenceColor(confidence)}`}
            style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
          />
        </div>
      </div>

      {/* Alternative Suggestions */}
      {alternatives.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-gray-400">Alternatives:</span>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt) => (
              <button
                key={alt}
                type="button"
                onClick={() => onChange(alt)}
                className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded-full
                           hover:bg-blue-600 hover:text-white transition-colors
                           border border-gray-600 hover:border-blue-500 cursor-pointer"
                title={`Use "${alt}" instead`}
              >
                {alt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Evidence URLs (expandable) */}
      {evidence && evidence.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showEvidence ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {evidence.length} evidence URL{evidence.length !== 1 ? 's' : ''}
          </button>
          {showEvidence && (
            <ul className="space-y-1 pl-4 text-xs text-gray-400 max-h-40 overflow-y-auto">
              {evidence.map((url, i) => (
                <li key={i} className="truncate" title={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────

export const PillarValidationStep: React.FC<PillarValidationStepProps> = ({
  suggestion,
  isLoading,
  onConfirm,
  onRegenerate,
}) => {
  const [centralEntity, setCentralEntity] = useState('');
  const [sourceContext, setSourceContext] = useState('');
  const [centralSearchIntent, setCentralSearchIntent] = useState('');
  const [language, setLanguage] = useState('en');
  const [region, setRegion] = useState('US');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when suggestion arrives or changes
  useEffect(() => {
    if (suggestion) {
      setCentralEntity(suggestion.centralEntity);
      setSourceContext(suggestion.sourceContext);
      setCentralSearchIntent(suggestion.centralSearchIntent);
      setLanguage(suggestion.detectedLanguage || 'en');
      setRegion(suggestion.detectedRegion || 'US');
      setValidationError(null);
    }
  }, [suggestion]);

  const handleConfirm = () => {
    const trimmedCE = centralEntity.trim();
    const trimmedSC = sourceContext.trim();
    const trimmedCSI = centralSearchIntent.trim();
    const trimmedLang = language.trim();
    const trimmedRegion = region.trim();

    if (!trimmedCE || !trimmedSC || !trimmedCSI) {
      setValidationError(
        'All pillar fields (Central Entity, Source Context, Central Search Intent) are required.'
      );
      return;
    }

    if (!trimmedLang) {
      setValidationError('Language is required.');
      return;
    }

    if (!trimmedRegion) {
      setValidationError('Region is required.');
      return;
    }

    setValidationError(null);
    onConfirm(
      {
        centralEntity: trimmedCE,
        sourceContext: trimmedSC,
        centralSearchIntent: trimmedCSI,
      },
      trimmedLang,
      trimmedRegion
    );
  };

  // ── Loading State ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Loader size="lg" />
        <p className="text-gray-400 text-sm">
          Analyzing your site to detect SEO pillars...
        </p>
        <p className="text-gray-500 text-xs">
          This examines page content to identify your Central Entity, Source Context, and
          Central Search Intent.
        </p>
      </div>
    );
  }

  // ── No Suggestion Yet ─────────────────────────────────────────────────
  if (!suggestion) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <p className="text-gray-300 text-sm font-medium">
          No pillar suggestions yet
        </p>
        <p className="text-gray-500 text-xs text-center max-w-md">
          Click the button below to analyze your imported pages and automatically detect
          your site&apos;s Central Entity, Source Context, and Central Search Intent.
        </p>
        <Button variant="primary" onClick={onRegenerate}>
          Detect Pillars from Site
        </Button>
      </div>
    );
  }

  // ── Suggestion Available ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">SEO Pillar Validation</h3>
          <p className="text-sm text-gray-400 mt-1">
            Review and edit the detected pillars. Click alternative suggestions to swap values.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          Re-detect
        </Button>
      </div>

      {/* Pillar Fields */}
      <div className="space-y-4">
        <PillarField
          label="Central Entity (CE)"
          value={centralEntity}
          onChange={(v) => {
            setCentralEntity(v);
            setValidationError(null);
          }}
          confidence={suggestion.centralEntityConfidence}
          alternatives={suggestion.alternativeSuggestions.centralEntity}
          evidence={suggestion.centralEntityEvidence}
        />

        <PillarField
          label="Source Context (SC)"
          value={sourceContext}
          onChange={(v) => {
            setSourceContext(v);
            setValidationError(null);
          }}
          confidence={suggestion.sourceContextConfidence}
          alternatives={suggestion.alternativeSuggestions.sourceContext}
        />

        <PillarField
          label="Central Search Intent (CSI)"
          value={centralSearchIntent}
          onChange={(v) => {
            setCentralSearchIntent(v);
            setValidationError(null);
          }}
          confidence={suggestion.centralSearchIntentConfidence}
          alternatives={suggestion.alternativeSuggestions.centralSearchIntent}
        />
      </div>

      {/* Language and Region */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Language</Label>
          <Input
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setValidationError(null);
            }}
            placeholder="e.g. en, nl, de"
          />
        </div>
        <div>
          <Label>Region</Label>
          <Input
            value={region}
            onChange={(e) => {
              setRegion(e.target.value);
              setValidationError(null);
            }}
            placeholder="e.g. US, NL, DE"
          />
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
          {validationError}
        </div>
      )}

      {/* Confirm Button */}
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleConfirm}>
          Confirm Pillars
        </Button>
      </div>
    </div>
  );
};
