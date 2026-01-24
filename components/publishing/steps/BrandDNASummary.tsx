import React from 'react';
import type { DesignTokens } from '../../../types/publishing';

interface BrandDNASummaryProps {
    tokens: DesignTokens;
    confidence: number;
    sourceUrl: string;
}

export const BrandDNASummary: React.FC<BrandDNASummaryProps> = ({ tokens, confidence, sourceUrl }) => {
    return (
        <div className="mt-6 p-5 bg-zinc-900/50 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Extracted Brand DNA</h4>
                <div className="flex items-center gap-2 px-2 py-1 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-zinc-300">{confidence}% Match Quality</span>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Primary Swatch */}
                <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-medium">Primary</span>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl shadow-lg border border-white/10"
                            style={{ backgroundColor: tokens.colors.primary }}
                        />
                        <code className="text-xs text-zinc-400 capitalize">{tokens.colors.primary}</code>
                    </div>
                </div>

                {/* Secondary Swatch */}
                <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-medium">Accent</span>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl shadow-lg border border-white/10"
                            style={{ backgroundColor: tokens.colors.accent }}
                        />
                        <code className="text-xs text-zinc-400 capitalize">{tokens.colors.accent}</code>
                    </div>
                </div>

                {/* Typography */}
                <div className="col-span-2 space-y-2">
                    <span className="text-[10px] text-zinc-500 font-medium">Identified Vibe</span>
                    <div className="p-2.5 bg-zinc-800/50 rounded-xl border border-zinc-700/50 flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase tracking-tighter">
                            {tokens.fonts.heading.includes('serif') ? 'Elegant Serif' : 'Modern Sans'}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase tracking-tighter">
                            {tokens.borderRadius === 'rounded' ? 'Soft UI' : 'Sharp UI'}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold uppercase tracking-tighter">
                            Professional
                        </span>
                    </div>
                </div>
            </div>

            <p className="mt-4 text-[10px] text-zinc-500 italic">
                * Elements synchronized with {sourceUrl}. You can still refine these in the tabs below.
            </p>
        </div>
    );
};
