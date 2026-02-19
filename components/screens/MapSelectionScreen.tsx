// components/screens/MapSelectionScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import { TopicalMap } from '../../types';
import { Button } from '../ui/Button';
import { SmartLoader } from '../ui/FunLoaders';
import MergeMapWizard from '../merge/MergeMapWizard';
import { useAppState } from '../../state/appState';
import { PipelineStep } from '../../state/slices/pipelineSlice';

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
  onStartPipeline: (isGreenfield: boolean, siteUrl?: string) => void;
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
    onStartPipeline,
    onBackToProjects,
    onInitiateDeleteMap,
    onRenameMap
}) => {
    const { state } = useAppState();
    const [isMergeWizardOpen, setIsMergeWizardOpen] = useState(false);
    const [editingMapId, setEditingMapId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);
    const [pipelineMode, setPipelineMode] = useState<'choose' | 'greenfield' | 'existing'>('choose');
    const [pipelineSiteUrl, setPipelineSiteUrl] = useState('');

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

            {/* PRIMARY: Pipeline Entry */}
            <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/20 border border-blue-700/50 rounded-xl p-6">
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-600/30 border border-blue-500/50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Start SEO Pipeline</h3>
                        <p className="text-gray-400 text-sm mt-1">From website URL to complete SEO action plan in 8 guided steps</p>
                    </div>
                </div>

                {/* 5-phase overview */}
                <div className="flex items-center gap-2 mb-6 text-xs overflow-x-auto pb-1">
                    {['Discover', 'Strategy', 'Plan', 'Create', 'Validate'].map((phase, i) => (
                        <React.Fragment key={phase}>
                            <span className="bg-blue-800/40 text-blue-300 px-2.5 py-1 rounded-full whitespace-nowrap font-medium">{phase}</span>
                            {i < 4 && <span className="text-gray-600">→</span>}
                        </React.Fragment>
                    ))}
                </div>

                {/* Mode selection */}
                <div className="space-y-4">
                    <div className="flex gap-3">
                        <button
                            onClick={() => setPipelineMode(pipelineMode === 'existing' ? 'choose' : 'existing')}
                            className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                                pipelineMode === 'existing'
                                    ? 'border-green-500 bg-green-900/20 text-green-300'
                                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <span className="text-sm font-medium block">Yes, I have a website</span>
                            <span className="text-xs opacity-70">Crawl, analyze gaps, then optimize</span>
                        </button>
                        <button
                            onClick={() => setPipelineMode(pipelineMode === 'greenfield' ? 'choose' : 'greenfield')}
                            className={`flex-1 p-3 rounded-lg border text-left transition-colors ${
                                pipelineMode === 'greenfield'
                                    ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                                    : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                            }`}
                        >
                            <span className="text-sm font-medium block">No, starting fresh</span>
                            <span className="text-xs opacity-70">Define business context, then build</span>
                        </button>
                    </div>

                    {pipelineMode === 'existing' && (
                        <div className="flex gap-2">
                            <input
                                type="url"
                                placeholder="https://www.example.com"
                                value={pipelineSiteUrl}
                                onChange={e => setPipelineSiteUrl(e.target.value)}
                                className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                            />
                            <Button
                                variant="primary"
                                onClick={() => onStartPipeline(false, pipelineSiteUrl || undefined)}
                                disabled={!pipelineSiteUrl.trim()}
                            >
                                Start Pipeline
                            </Button>
                        </div>
                    )}

                    {pipelineMode === 'greenfield' && (
                        <Button
                            variant="primary"
                            className="w-full"
                            onClick={() => onStartPipeline(true)}
                        >
                            Start Pipeline
                        </Button>
                    )}
                </div>
            </div>

            {/* SECONDARY: Quick Setup + Import (legacy paths) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Path A: Quick Setup */}
                <div
                    className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer group"
                    onClick={onCreateNewMap}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <h4 className="text-sm font-semibold text-gray-300">Quick Setup</h4>
                    </div>
                    <p className="text-xs text-gray-500">Manual wizard for power users</p>
                </div>

                {/* Path B: Advanced Import */}
                <div
                    className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer group"
                    onClick={onStartAnalysis}
                >
                    <div className="flex items-center gap-3 mb-2">
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <h4 className="text-sm font-semibold text-gray-300">Advanced Import</h4>
                    </div>
                    <p className="text-xs text-gray-500">Migration workbench for existing sites</p>
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
