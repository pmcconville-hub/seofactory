// components/screens/MapSelectionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { TopicalMap } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import MergeMapWizard from '../merge/MergeMapWizard';
import { useAppState } from '../../state/appState';

function getMapCompleteness(map: TopicalMap): { label: string; color: string; percent: number } {
    let steps = 0;
    let completed = 0;

    // 1. Has business info (language + industry)
    steps++;
    const biz = map.business_info as Record<string, unknown> | undefined;
    if (biz?.language && biz?.industry) completed++;

    // 2. Has pillars (CE + SC + CSI)
    steps++;
    const p = map.pillars as any;
    if (p?.centralEntity && p?.sourceContext && p?.centralSearchIntent) completed++;

    // 3. Has topics
    steps++;
    const topicCount = map.topics?.length || map.topicCounts?.total || 0;
    if (topicCount > 0) completed++;

    // 4. Has briefs (at least 1)
    steps++;
    const briefCount = map.briefs ? Object.keys(map.briefs).length : 0;
    if (briefCount > 0) completed++;

    const percent = Math.round((completed / steps) * 100);

    if (percent === 0) return { label: 'Empty', color: 'text-gray-500 bg-gray-800', percent };
    if (percent <= 25) return { label: 'Setup', color: 'text-yellow-400 bg-yellow-900/30', percent };
    if (percent <= 50) return { label: 'Building', color: 'text-blue-400 bg-blue-900/30', percent };
    if (percent <= 75) return { label: 'Active', color: 'text-green-400 bg-green-900/30', percent };
    return { label: 'Complete', color: 'text-emerald-400 bg-emerald-900/30', percent };
}

interface MapSelectionScreenProps {
  projectName: string;
  topicalMaps: TopicalMap[];
  onSelectMap: (mapId: string) => void;
  onCreateNewMap: () => void;
  onStartAnalysis: () => void;
  onBackToProjects: () => void;
  onInitiateDeleteMap: (map: TopicalMap) => void;
  onRenameMap: (mapId: string, newName: string) => void;
}

const MapSelectionScreen: React.FC<MapSelectionScreenProps> = ({
    projectName,
    topicalMaps,
    onSelectMap,
    onCreateNewMap,
    onStartAnalysis,
    onBackToProjects,
    onInitiateDeleteMap,
    onRenameMap
}) => {
    const { state } = useAppState();
    const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
    const [editingMapId, setEditingMapId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingMapId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingMapId]);

    const handleStartRename = (map: TopicalMap) => {
        setEditingMapId(map.id);
        setEditName(map.name);
    };

    const handleConfirmRename = (mapId: string) => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== topicalMaps.find(m => m.id === mapId)?.name) {
            onRenameMap(mapId, trimmed);
        }
        setEditingMapId(null);
    };

    const handleCancelRename = () => {
        setEditingMapId(null);
    };

    return (
        <div className="max-w-5xl mx-auto w-full space-y-8">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-bold text-white">{projectName}</h1>
                    <p className="text-lg text-gray-400 mt-1">Select a topical map or create a new one.</p>
                </div>
                <Button onClick={onBackToProjects} variant="secondary">Back to Projects</Button>
            </header>

            {/* Dual-Path Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Path A: New Strategy */}
                <div
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-600 transition-colors cursor-pointer group"
                    onClick={onCreateNewMap}
                >
                    <div className="w-12 h-12 rounded-lg bg-blue-900/30 border border-blue-700/50 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">New Strategy</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Build your content strategy from the ground up. Define your business context,
                        SEO pillars, and generate an ideal topical map.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">Best for: New websites, major pivots, greenfield content</p>
                    <Button variant="primary" className="w-full group-hover:bg-blue-500">
                        Start Fresh
                    </Button>
                </div>

                {/* Path B: Optimize Existing Site */}
                <div
                    className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-green-600 transition-colors cursor-pointer group"
                    onClick={onStartAnalysis}
                >
                    <div className="w-12 h-12 rounded-lg bg-green-900/30 border border-green-700/50 flex items-center justify-center mb-4">
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Optimize Existing Site</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Import your site, analyze what you have, discover your SEO pillars from
                        existing content, and build an optimized strategy around your reality.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">Best for: Existing websites, site optimization, content audits</p>
                    <Button onClick={onStartAnalysis} variant="secondary" className="w-full border-green-700 text-green-400 hover:bg-green-900/30">
                        Import Site
                    </Button>
                </div>
            </div>

            {/* Existing Maps & Tools */}
            {(topicalMaps.length > 0) && (
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Your Maps</h3>
                        {topicalMaps.length >= 2 && (
                            <Button
                                onClick={() => setIsMergeWizardOpen(true)}
                                variant="secondary"
                                size="sm"
                            >
                                Merge Maps
                            </Button>
                        )}
                    </div>
                    {state.isLoading.map ? (
                        <div className="flex justify-center py-8"><SmartLoader context="loading" size="lg" /></div>
                    ) : (
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                            {topicalMaps.map(map => {
                                const status = getMapCompleteness(map);
                                return (
                                    <div key={map.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex justify-between items-center hover:border-gray-600 transition-colors">
                                        <div className="min-w-0 flex-1 mr-3">
                                            <div className="flex items-center gap-2">
                                                {editingMapId === map.id ? (
                                                    <input
                                                        ref={editInputRef}
                                                        type="text"
                                                        value={editName}
                                                        onChange={e => setEditName(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') handleConfirmRename(map.id);
                                                            if (e.key === 'Escape') handleCancelRename();
                                                        }}
                                                        onBlur={() => handleConfirmRename(map.id)}
                                                        className="bg-gray-700 text-white font-semibold px-2 py-0.5 rounded border border-blue-500 outline-none text-sm w-full max-w-xs"
                                                    />
                                                ) : (
                                                    <p
                                                        className="font-semibold text-white truncate cursor-pointer group/name flex items-center gap-1.5"
                                                        onDoubleClick={() => handleStartRename(map)}
                                                        title="Double-click to rename"
                                                    >
                                                        <span className="truncate">{map.name}</span>
                                                        <button
                                                            onClick={e => { e.stopPropagation(); handleStartRename(map); }}
                                                            className="opacity-0 group-hover/name:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity flex-shrink-0"
                                                            title="Rename map"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                            </svg>
                                                        </button>
                                                    </p>
                                                )}
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                Created: {new Date(map.created_at).toLocaleDateString()} {new Date(map.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <div className="w-24 h-1 bg-gray-700 rounded-full mt-1">
                                                <div
                                                    className={`h-1 rounded-full ${status.percent === 0 ? 'bg-gray-600' : status.percent <= 25 ? 'bg-yellow-400' : status.percent <= 50 ? 'bg-blue-400' : status.percent <= 75 ? 'bg-green-400' : 'bg-emerald-400'}`}
                                                    style={{ width: `${status.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            <Button onClick={() => onInitiateDeleteMap(map)} variant="secondary" className="!p-2 !bg-red-900/50 hover:!bg-red-800/50" title="Delete Map">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-300" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                            </Button>
                                            <Button onClick={() => onSelectMap(map.id)} variant="secondary">Load Map</Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Merge Wizard Modal */}
            <MergeMapWizard
                isOpen={isMergeWizardOpen}
                onClose={() => setIsMergeWizardOpen(false)}
                availableMaps={topicalMaps}
            />
        </div>
    );
};

export default MapSelectionScreen;
