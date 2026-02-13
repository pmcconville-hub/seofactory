import React from 'react';
import type { BrandComparisonData } from '../../hooks/useBrandComparison';

interface BrandComparisonViewProps {
  data: BrandComparisonData;
  onChooseBrand: (brandId: string) => void;
  onClose: () => void;
}

export const BrandComparisonView: React.FC<BrandComparisonViewProps> = ({
  data, onChooseBrand, onClose
}) => {
  const { brandA, brandB, comparison } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-200">Brand Comparison</h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded ${
            comparison.overallSimilarity > 70 ? 'bg-green-500/20 text-green-400' :
            comparison.overallSimilarity > 40 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {comparison.overallSimilarity}% similar
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 text-xs">Close</button>
        </div>
      </div>

      {/* Screenshots side by side */}
      <div className="grid grid-cols-2 gap-4">
        {[brandA, brandB].map((brand, i) => (
          <div key={brand.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-medium">Brand {i === 0 ? 'A' : 'B'}</span>
              <span className="text-[10px] text-zinc-500 truncate max-w-[200px]">{brand.sourceUrl}</span>
            </div>
            {brand.screenshotBase64 ? (
              <div className="border border-zinc-700 rounded-lg overflow-hidden bg-white">
                <img
                  src={`data:image/jpeg;base64,${brand.screenshotBase64}`}
                  alt={`Brand ${i === 0 ? 'A' : 'B'}`}
                  className="w-full h-auto max-h-[200px] object-cover object-top"
                />
              </div>
            ) : (
              <div className="border border-zinc-700 rounded-lg h-[200px] flex items-center justify-center bg-zinc-800/50">
                <span className="text-xs text-zinc-500">No screenshot</span>
              </div>
            )}
            <button
              onClick={() => onChooseBrand(brand.id)}
              className="w-full px-3 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 rounded-lg transition-colors"
            >
              Choose this brand
            </button>
          </div>
        ))}
      </div>

      {/* Color Palette Comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-zinc-300">Color Palette</h4>
          <span className="text-[10px] text-zinc-500">{comparison.colorDistance}% different</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[brandA, brandB].map((brand) => (
            <div key={brand.id} className="flex gap-1.5">
              {brand.designDna && [
                { label: 'Primary', hex: brand.designDna.colors.primary.hex },
                { label: 'Secondary', hex: brand.designDna.colors.secondary.hex },
                { label: 'Accent', hex: brand.designDna.colors.accent.hex },
              ].map(c => (
                <div key={c.label} className="text-center">
                  <div
                    className="w-10 h-10 rounded-md border border-zinc-600"
                    style={{ backgroundColor: c.hex }}
                    title={`${c.label}: ${c.hex}`}
                  />
                  <span className="text-[9px] text-zinc-500 block mt-0.5">{c.hex}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Typography Comparison */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-zinc-300">Typography</h4>
          <span className="text-[10px] text-zinc-500">{comparison.typographySimilarity}% similar</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[brandA, brandB].map((brand) => (
            <div key={brand.id} className="space-y-1 p-2 bg-zinc-800/50 rounded-lg">
              <div className="text-xs">
                <span className="text-zinc-500">Heading: </span>
                <span className="text-zinc-300">{brand.designDna?.typography?.headingFont?.family || 'Unknown'}</span>
              </div>
              <div className="text-xs">
                <span className="text-zinc-500">Body: </span>
                <span className="text-zinc-300">{brand.designDna?.typography?.bodyFont?.family || 'Unknown'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personality Comparison (simplified as bars) */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-zinc-300">Personality</h4>
        {(['formality', 'energy', 'warmth'] as const).map(dim => {
          const valA = (brandA.designDna?.personality?.[dim] as number) || 3;
          const valB = (brandB.designDna?.personality?.[dim] as number) || 3;
          return (
            <div key={dim} className="space-y-1">
              <div className="flex justify-between text-[10px] text-zinc-500">
                <span className="capitalize">{dim}</span>
                <span>A: {valA} / B: {valB}</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${valA * 20}%` }} />
                </div>
                <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${valB * 20}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BrandComparisonView;
