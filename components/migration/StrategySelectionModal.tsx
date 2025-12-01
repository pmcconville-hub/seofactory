
import React, { useEffect, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { ActionType, SiteInventoryItem, EnrichedTopic, BusinessInfo, MigrationDecision, SEOPillars } from '../../types';
import { generateDecisionMatrix } from '../../services/ai/migration';
import { useAppState } from '../../state/appState';

interface StrategySelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (action: ActionType) => void;
    sourceItem: SiteInventoryItem | null;
    targetTopic: EnrichedTopic | null;
    businessInfo: BusinessInfo;
    // New optional props for topical map context
    pillars?: SEOPillars;
    allTopics?: EnrichedTopic[];
}

export const StrategySelectionModal: React.FC<StrategySelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    sourceItem,
    targetTopic,
    businessInfo,
    pillars,
    allTopics = []
}) => {
    const { state, dispatch } = useAppState();
    const [decision, setDecision] = useState<MigrationDecision | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Use provided pillars/topics or fall back to state (topics are stored in the active topical map)
    const activeMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const effectivePillars = pillars || activeMap?.pillars || { centralEntity: '', sourceContext: '', centralSearchIntent: '' };
    const effectiveTopics = allTopics.length > 0 ? allTopics : (activeMap?.topics || []);

    useEffect(() => {
        const fetchAnalysis = async () => {
            if (isOpen && sourceItem && targetTopic) {
                setIsLoading(true);
                setDecision(null);
                try {
                    const topicalMap = { pillars: effectivePillars, topics: effectiveTopics };
                    const result = await generateDecisionMatrix(sourceItem, topicalMap, businessInfo, dispatch);
                    setDecision(result);
                } catch (error) {
                    console.error("Failed to generate decision matrix:", error);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        fetchAnalysis();
    }, [isOpen, sourceItem, targetTopic, businessInfo, dispatch, effectivePillars, effectiveTopics]);

    if (!isOpen || !sourceItem || !targetTopic) return null;

    const recommendedAction = decision?.recommendation || 'REDIRECT_301';

    const getHighlightClass = (action: ActionType) => {
        if (!decision) return 'border-gray-600 bg-gray-800';
        return recommendedAction === action 
            ? 'border-green-500 bg-green-900/20 ring-1 ring-green-500' 
            : 'border-gray-600 bg-gray-800 opacity-70 hover:opacity-100';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[80] flex justify-center items-center p-4" onClick={onClose}>
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 overflow-y-auto">
                    <h2 className="text-xl font-bold text-white mb-4">Migration Strategy Decision</h2>
                    
                    {/* Context Header */}
                    <div className="mb-6 grid grid-cols-[1fr,auto,1fr] gap-4 items-center bg-gray-900/50 p-4 rounded border border-gray-700">
                        <div>
                            <span className="text-xs uppercase text-gray-500 font-bold block mb-1">Source (Old)</span>
                            <p className="text-sm text-gray-300 truncate" title={sourceItem.url}>{sourceItem.url}</p>
                            <div className="flex gap-2 mt-1 text-[10px]">
                                <span className="bg-gray-800 px-1.5 rounded text-gray-400">{sourceItem.gsc_clicks} clicks</span>
                                <span className="bg-gray-800 px-1.5 rounded text-gray-400">CoR: {sourceItem.cor_score}</span>
                            </div>
                        </div>
                        <div className="text-gray-600">➔</div>
                        <div>
                            <span className="text-xs uppercase text-gray-500 font-bold block mb-1">Target (New)</span>
                            <p className="text-green-400 font-medium truncate" title={targetTopic.title}>{targetTopic.title}</p>
                            <span className="text-[10px] bg-green-900/30 text-green-300 px-1.5 rounded border border-green-800 mt-1 inline-block">
                                {targetTopic.type.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    
                    {/* AI Analysis Panel */}
                    {isLoading ? (
                        <div className="py-8 text-center space-y-3 bg-gray-800/30 rounded-lg border border-gray-700 border-dashed">
                            <Loader className="mx-auto" />
                            <p className="text-sm text-blue-300 animate-pulse">Consulting Migration Matrix...</p>
                        </div>
                    ) : decision ? (
                        <div className="mb-6 space-y-4">
                            {/* Recommendation Badge */}
                            <div className="flex items-start gap-3 bg-blue-900/20 p-4 rounded-lg border border-blue-800">
                                <div className="text-2xl">🤖</div>
                                <div>
                                    <h4 className="font-bold text-blue-300 text-sm uppercase tracking-wide">AI Recommendation</h4>
                                    <p className="text-white text-lg font-bold mt-1">
                                        {decision.recommendation.replace('_', ' ')}
                                    </p>
                                    <p className="text-sm text-gray-300 mt-2 italic">"{decision.reasoning}"</p>
                                    <div className="mt-2 text-xs text-blue-400 font-mono">Confidence: {decision.confidence}%</div>
                                </div>
                            </div>

                            {/* Pros & Cons */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-green-900/10 border border-green-800/50 rounded">
                                    <span className="text-xs font-bold text-green-400 uppercase mb-2 block">Strategic Gains</span>
                                    <ul className="space-y-1">
                                        {decision.pros.map((pro, i) => (
                                            <li key={i} className="text-xs text-gray-300 flex gap-2">
                                                <span className="text-green-500">✓</span> {pro}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-3 bg-red-900/10 border border-red-800/50 rounded">
                                    <span className="text-xs font-bold text-red-400 uppercase mb-2 block">Risks & Costs</span>
                                    <ul className="space-y-1">
                                        {decision.cons.map((con, i) => (
                                            <li key={i} className="text-xs text-gray-300 flex gap-2">
                                                <span className="text-red-500">⚠</span> {con}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-center text-gray-500 italic border border-gray-700 rounded">Analysis unavailable.</div>
                    )}

                    <p className="text-sm text-gray-400 mb-3 font-medium">Confirm Strategy:</p>

                    <div className="space-y-3">
                        <button 
                            className={`w-full p-3 text-left rounded-lg transition-all ${getHighlightClass('REDIRECT_301')}`}
                            onClick={() => onConfirm('REDIRECT_301')}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white">301 Redirect</span>
                                {recommendedAction === 'REDIRECT_301' && !isLoading && <span className="text-[10px] bg-green-500 text-black px-2 rounded font-bold">BEST MATCH</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Pass link equity. Remove old page.</p>
                        </button>

                        <button 
                            className={`w-full p-3 text-left rounded-lg transition-all ${getHighlightClass('REWRITE')}`}
                            onClick={() => onConfirm('REWRITE')}
                        >
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-white">Rewrite / Merge Content</span>
                                {recommendedAction === 'REWRITE' && !isLoading && <span className="text-[10px] bg-green-500 text-black px-2 rounded font-bold">BEST MATCH</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Harvest content into the new brief. 301 old URL.</p>
                        </button>

                        <button 
                            className={`w-full p-3 text-left rounded-lg transition-all ${getHighlightClass('CANONICALIZE')}`}
                            onClick={() => onConfirm('CANONICALIZE')}
                        >
                            <span className="font-bold text-white">Canonicalize (Keep Both)</span>
                            <p className="text-xs text-gray-400 mt-1">Old page stays live but points authority to new topic.</p>
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-gray-800 border-t border-gray-700 flex justify-end">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                </div>
            </Card>
        </div>
    );
};
