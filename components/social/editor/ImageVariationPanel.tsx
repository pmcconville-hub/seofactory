/**
 * ImageVariationPanel Component
 *
 * Shows image status for a social post and allows on-demand
 * generation of platform-optimized image variations.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { SocialMediaPlatform, ImageInstructions } from '../../../types/social';
import {
  generatePlatformVariation,
  analyzeImageForPlatform,
  getPlatformImageSummary,
  type VariationResult
} from '../../../services/social/transformation/imageVariationService';
import { PLATFORM_IMAGE_REQUIREMENTS } from '../../../services/social/transformation/imageSelector';

interface ImageVariationPanelProps {
  platform: SocialMediaPlatform;
  imageInstructions?: ImageInstructions;
  onVariationGenerated?: (result: VariationResult) => void;
}

type GenerationStatus = 'idle' | 'generating' | 'success' | 'error';

export const ImageVariationPanel: React.FC<ImageVariationPanelProps> = ({
  platform,
  imageInstructions,
  onVariationGenerated
}) => {
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedVariation, setGeneratedVariation] = useState<VariationResult | null>(null);
  const [cropMode, setCropMode] = useState<'fit' | 'fill' | 'center'>('fill');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const requirements = PLATFORM_IMAGE_REQUIREMENTS[platform];
  const platformSummary = getPlatformImageSummary(platform);

  // Analyze current image
  const analysis = useMemo(() => {
    const specs = imageInstructions?.source_placeholder_id
      ? { width: imageInstructions.dimensions.width, height: imageInstructions.dimensions.height }
      : undefined;

    return analyzeImageForPlatform(
      imageInstructions?.image_url,
      specs,
      platform
    );
  }, [imageInstructions, platform]);

  // Generate platform variation
  const handleGenerateVariation = useCallback(async () => {
    if (!imageInstructions?.image_url) {
      setError('No source image available. Please generate or upload an image first.');
      return;
    }

    setStatus('generating');
    setError(null);

    try {
      const result = await generatePlatformVariation({
        sourceUrl: imageInstructions.image_url,
        platform,
        cropMode,
        quality: 90
      });

      if (result.success) {
        setGeneratedVariation(result);
        setStatus('success');
        onVariationGenerated?.(result);
      } else {
        setError(result.error || 'Failed to generate variation');
        setStatus('error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setStatus('error');
    }
  }, [imageInstructions?.image_url, platform, cropMode, onVariationGenerated]);

  // Download generated variation
  const handleDownload = useCallback(() => {
    if (!generatedVariation?.dataUrl) return;

    const link = document.createElement('a');
    link.href = generatedVariation.dataUrl;
    link.download = `${platform}-variation-${generatedVariation.dimensions.width}x${generatedVariation.dimensions.height}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedVariation, platform]);

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Image for {platform}</span>
        </div>

        {/* Status indicator */}
        {analysis.hasImage && !analysis.needsResize && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Optimal
          </span>
        )}
        {analysis.hasImage && analysis.needsResize && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Resize recommended
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Current image preview */}
        {imageInstructions?.image_url ? (
          <div className="flex gap-4">
            {/* Source image */}
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1">Source</p>
              <div className="w-24 h-24 rounded border border-gray-600 overflow-hidden bg-gray-900">
                <img
                  src={imageInstructions.image_url}
                  alt={imageInstructions.alt_text}
                  className="w-full h-full object-cover"
                />
              </div>
              {analysis.currentRatio && (
                <p className="text-[10px] text-gray-500 mt-1 text-center">
                  {analysis.currentRatio}
                </p>
              )}
            </div>

            {/* Arrow */}
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>

            {/* Target / Generated */}
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500 mb-1">
                {generatedVariation ? 'Generated' : 'Target'}
              </p>
              <div
                className="w-24 h-24 rounded border overflow-hidden flex items-center justify-center"
                style={{
                  borderColor: generatedVariation ? '#22c55e' : '#4b5563',
                  backgroundColor: generatedVariation ? '#000' : '#1f2937'
                }}
              >
                {generatedVariation?.dataUrl ? (
                  <img
                    src={generatedVariation.dataUrl}
                    alt={`${platform} variation`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-2">
                    <p className="text-[10px] text-gray-500">
                      {requirements.optimal_dimensions.width}×{requirements.optimal_dimensions.height}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {analysis.targetRatio}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1 text-center">
                {platformSummary.aspectRatio}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <svg className="w-10 h-10 text-gray-600 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className="text-sm text-gray-500">No image available</p>
            <p className="text-xs text-gray-600 mt-1">Generate or upload an image in the article first</p>
          </div>
        )}

        {/* Recommendation */}
        <div className="text-xs text-gray-400 bg-gray-900/50 rounded p-2">
          {analysis.recommendation}
        </div>

        {/* Platform specs */}
        <div className="flex flex-wrap gap-2">
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {platformSummary.dimensions}
          </span>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {platformSummary.orientation}
          </span>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {platformSummary.aspectRatio}
          </span>
        </div>

        {/* Advanced options */}
        {imageInstructions?.image_url && (
          <>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-3 pl-4 border-l border-gray-700">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Crop Mode</label>
                  <div className="flex gap-2">
                    {(['fill', 'fit', 'center'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCropMode(mode)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          cropMode === mode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                        }`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">
                    {cropMode === 'fill' && 'Fill canvas, crop edges if needed'}
                    {cropMode === 'fit' && 'Fit entire image, may add letterboxing'}
                    {cropMode === 'center' && 'Center crop to target dimensions'}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded p-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {imageInstructions?.image_url && analysis.needsResize && (
            <button
              type="button"
              onClick={handleGenerateVariation}
              disabled={status === 'generating'}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors ${
                status === 'generating'
                  ? 'bg-gray-700 text-gray-400 cursor-wait'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {status === 'generating' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Generate {platform} Variation
                </>
              )}
            </button>
          )}

          {generatedVariation?.dataUrl && (
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download
            </button>
          )}
        </div>

        {/* Tips */}
        {platformSummary.tips.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-1">Tips for {platform}:</p>
            <ul className="space-y-1">
              {platformSummary.tips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-400 flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageVariationPanel;
