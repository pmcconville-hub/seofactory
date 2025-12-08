// components/brief/AIPreviewModal.tsx
// Modal to preview AI-generated changes before applying them

import React from 'react';
import { BriefSection, ContentBrief } from '../../types';
import { Button } from '../ui/Button';

interface AIPreviewModalProps {
    type: 'refine' | 'generate' | 'regenerate';
    original?: BriefSection | ContentBrief;
    preview: BriefSection | ContentBrief;
    onApply: () => void;
    onCancel: () => void;
}

export const AIPreviewModal: React.FC<AIPreviewModalProps> = ({
    type,
    original,
    preview,
    onApply,
    onCancel
}) => {
    const isSection = type === 'refine' || type === 'generate';
    const sectionPreview = preview as BriefSection;
    const sectionOriginal = original as BriefSection | undefined;
    const briefPreview = preview as ContentBrief;
    const briefOriginal = original as ContentBrief | undefined;

    const getTitle = () => {
        switch (type) {
            case 'refine': return 'AI Refined Section';
            case 'generate': return 'AI Generated Section';
            case 'regenerate': return 'AI Regenerated Brief';
        }
    };

    const renderSectionComparison = () => {
        if (!isSection) return null;

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                {sectionOriginal && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-slate-300 mb-3">Original</h4>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="text-slate-400">Heading:</span>
                                <span className="text-white ml-2">{sectionOriginal.heading}</span>
                            </div>
                            <div>
                                <span className="text-slate-400">Level:</span>
                                <span className="text-white ml-2">H{sectionOriginal.level}</span>
                            </div>
                            {sectionOriginal.format_code && (
                                <div>
                                    <span className="text-slate-400">Format:</span>
                                    <span className="text-white ml-2">{sectionOriginal.format_code}</span>
                                </div>
                            )}
                            {sectionOriginal.subordinate_text_hint && (
                                <div>
                                    <span className="text-slate-400">Hint:</span>
                                    <p className="text-slate-300 mt-1 text-xs">{sectionOriginal.subordinate_text_hint}</p>
                                </div>
                            )}
                            {sectionOriginal.methodology_note && (
                                <div>
                                    <span className="text-slate-400">Methodology:</span>
                                    <p className="text-slate-300 mt-1 text-xs">{sectionOriginal.methodology_note}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Preview */}
                <div className={`bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4 ${!sectionOriginal ? 'md:col-span-2' : ''}`}>
                    <h4 className="text-sm font-medium text-emerald-300 mb-3">
                        {type === 'generate' ? 'New Section' : 'Updated'}
                    </h4>
                    <div className="space-y-2 text-sm">
                        <div>
                            <span className="text-slate-400">Heading:</span>
                            <span className={`ml-2 ${sectionOriginal?.heading !== sectionPreview.heading ? 'text-emerald-300' : 'text-white'}`}>
                                {sectionPreview.heading}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">Level:</span>
                            <span className={`ml-2 ${sectionOriginal?.level !== sectionPreview.level ? 'text-emerald-300' : 'text-white'}`}>
                                H{sectionPreview.level}
                            </span>
                        </div>
                        {sectionPreview.format_code && (
                            <div>
                                <span className="text-slate-400">Format:</span>
                                <span className={`ml-2 ${sectionOriginal?.format_code !== sectionPreview.format_code ? 'text-emerald-300' : 'text-white'}`}>
                                    {sectionPreview.format_code}
                                </span>
                            </div>
                        )}
                        {sectionPreview.attribute_category && (
                            <div>
                                <span className="text-slate-400">Category:</span>
                                <span className={`ml-2 ${sectionOriginal?.attribute_category !== sectionPreview.attribute_category ? 'text-emerald-300' : 'text-white'}`}>
                                    {sectionPreview.attribute_category}
                                </span>
                            </div>
                        )}
                        {sectionPreview.subordinate_text_hint && (
                            <div>
                                <span className="text-slate-400">Hint:</span>
                                <p className={`mt-1 text-xs ${sectionOriginal?.subordinate_text_hint !== sectionPreview.subordinate_text_hint ? 'text-emerald-300' : 'text-slate-300'}`}>
                                    {sectionPreview.subordinate_text_hint}
                                </p>
                            </div>
                        )}
                        {sectionPreview.methodology_note && (
                            <div>
                                <span className="text-slate-400">Methodology:</span>
                                <p className={`mt-1 text-xs ${sectionOriginal?.methodology_note !== sectionPreview.methodology_note ? 'text-emerald-300' : 'text-slate-300'}`}>
                                    {sectionPreview.methodology_note}
                                </p>
                            </div>
                        )}
                        {sectionPreview.required_phrases && sectionPreview.required_phrases.length > 0 && (
                            <div>
                                <span className="text-slate-400">Required Phrases:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {sectionPreview.required_phrases.map((phrase, i) => (
                                        <span key={i} className="text-xs bg-slate-600 text-slate-200 px-1.5 py-0.5 rounded">
                                            {phrase}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderBriefComparison = () => {
        if (isSection) return null;

        return (
            <div className="space-y-4">
                <div className="bg-emerald-900/30 border border-emerald-600/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-emerald-300 mb-3">Regenerated Brief</h4>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-slate-400">Title:</span>
                            <span className="text-white ml-2">{briefPreview.title}</span>
                        </div>

                        {briefPreview.metaDescription && (
                            <div>
                                <span className="text-slate-400">Meta Description:</span>
                                <p className="text-slate-300 mt-1 text-xs">{briefPreview.metaDescription}</p>
                            </div>
                        )}

                        <div>
                            <span className="text-slate-400">Sections:</span>
                            <span className="text-emerald-300 ml-2">
                                {briefPreview.structured_outline?.length || 0} sections
                                {briefOriginal && (
                                    <span className="text-slate-400">
                                        {' '}(was {briefOriginal.structured_outline?.length || 0})
                                    </span>
                                )}
                            </span>
                        </div>

                        {/* Section outline preview */}
                        {briefPreview.structured_outline && briefPreview.structured_outline.length > 0 && (
                            <div className="mt-3 border-t border-slate-600 pt-3">
                                <span className="text-slate-400 text-xs">Section Outline:</span>
                                <div className="mt-2 space-y-1">
                                    {briefPreview.structured_outline.map((section, i) => (
                                        <div
                                            key={section.key || i}
                                            className="text-xs text-slate-300"
                                            style={{ paddingLeft: `${(section.level - 1) * 12}px` }}
                                        >
                                            <span className="text-slate-500">H{section.level}</span>
                                            <span className="ml-2">{section.heading}</span>
                                            {section.format_code && (
                                                <span className="ml-2 text-emerald-400/70">[{section.format_code}]</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <p className="text-xs text-amber-400">
                    Warning: This will replace your entire brief including all sections.
                </p>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex justify-center items-center p-4">
            <div
                className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-medium text-white">{getTitle()}</h3>
                    <button
                        className="text-slate-400 hover:text-white"
                        onClick={onCancel}
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {renderSectionComparison()}
                    {renderBriefComparison()}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-700">
                    <Button variant="secondary" onClick={onCancel} className="bg-transparent hover:bg-slate-700">
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={onApply}>
                        Apply Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};
