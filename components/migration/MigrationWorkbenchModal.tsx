
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';
import { SiteInventoryItem, ContentBrief } from '../../types';
import { SimpleMarkdown } from '../ui/SimpleMarkdown';
import { getOriginalContent } from '../../services/migrationService';
import { useAppState } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import { safeString } from '../../utils/parsers';
import { useChunking } from '../../hooks/useChunking';
import { ChunkList } from './ChunkList';

interface MigrationWorkbenchModalProps {
    isOpen: boolean;
    onClose: () => void;
    inventoryItem: SiteInventoryItem | null;
    linkedBrief: ContentBrief | null; // The brief for the "New" topic if mapped
    onMarkOptimized: (itemId: string) => void;
}

export const MigrationWorkbenchModal: React.FC<MigrationWorkbenchModalProps> = ({ 
    isOpen, 
    onClose, 
    inventoryItem, 
    linkedBrief,
    onMarkOptimized
}) => {
    const { state, dispatch } = useAppState();
    const { businessInfo, activeProjectId } = state;

    const [originalContent, setOriginalContent] = useState<string>('');
    const [isLoadingOriginal, setIsLoadingOriginal] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    
    const [draftContent, setDraftContent] = useState<string>('');
    const [activeRightTab, setActiveRightTab] = useState<'edit' | 'preview'>('edit');
    const [activeLeftTab, setActiveLeftTab] = useState<'raw' | 'chunks'>('raw');
    const [isSaving, setIsSaving] = useState(false);

    // Ref for the textarea to handle cursor insertion
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Chunking Hook
    const { chunks, isChunking, error: chunkError, analyzeContent } = useChunking(businessInfo);

    const loadContent = useCallback(async () => {
        if (!inventoryItem) return;
        
        setIsLoadingOriginal(true);
        setLoadError(null);
        try {
            const content = await getOriginalContent(
                inventoryItem, 
                businessInfo, 
                businessInfo.supabaseUrl, 
                businessInfo.supabaseAnonKey
            );
            setOriginalContent(content);
            
            // Initialize Draft
            // If we have a linked brief with an existing draft, use it.
            // Otherwise, use the original content as the starting point.
            if (linkedBrief?.articleDraft) {
                setDraftContent(linkedBrief.articleDraft);
            } else if (!draftContent) { // Only set if draft is empty to avoid overwriting work
                setDraftContent(content); 
            }
        } catch (e) {
            console.error("Failed to load workbench content:", e);
            const message = e instanceof Error ? e.message : "Failed to fetch page content.";
            setLoadError(message);
        } finally {
            setIsLoadingOriginal(false);
        }
    }, [inventoryItem, linkedBrief, businessInfo, draftContent]);

    // Load Data on Open
    useEffect(() => {
        if (isOpen && inventoryItem) {
            // Reset states
            setLoadError(null);
            setManualInput('');
            setOriginalContent('');
            setDraftContent(''); // Will be populated by loadContent
            loadContent();
        }
    }, [isOpen, inventoryItem, loadContent]);

    // Lazy load chunks when tab is switched
    useEffect(() => {
        if (activeLeftTab === 'chunks' && chunks.length === 0 && originalContent) {
            analyzeContent(originalContent);
        }
    }, [activeLeftTab, chunks.length, originalContent, analyzeContent]);

    const handleManualContentSubmit = async () => {
        if (!manualInput.trim() || !inventoryItem) return;
        
        setOriginalContent(manualInput);
        if (!draftContent) setDraftContent(manualInput);
        setLoadError(null);
        
        // Persist as snapshot so it loads next time
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            await supabase.from('transition_snapshots').insert({
                inventory_id: inventoryItem.id,
                content_markdown: manualInput,
                snapshot_type: 'ORIGINAL_IMPORT', // Treat manual paste as the source of truth
                created_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to save manual snapshot", e);
        }
        
        // If user immediately switches to chunks tab, this ensures analysis works
        if (activeLeftTab === 'chunks') {
            analyzeContent(manualInput);
        }
    };

    const handleSaveDraft = async () => {
        if (!inventoryItem || !activeProjectId) return;
        setIsSaving(true);
        try {
            const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
            
            // If mapped to a topic/brief, save to content_briefs
            if (linkedBrief) {
                await supabase
                    .from('content_briefs')
                    .update({ article_draft: draftContent })
                    .eq('id', linkedBrief.id);
            }

            // Save a snapshot for history
            await supabase.from('transition_snapshots').insert({
                inventory_id: inventoryItem.id,
                content_markdown: draftContent,
                snapshot_type: 'IN_PROGRESS_SAVE',
                created_at: new Date().toISOString()
            });

            dispatch({ type: 'SET_NOTIFICATION', payload: "Draft saved." });
        } catch (e) {
             dispatch({ type: 'SET_ERROR', payload: "Failed to save draft." });
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!inventoryItem) return;
        await handleSaveDraft(); // Ensure saved
        onMarkOptimized(inventoryItem.id);
        onClose();
    };

    // Drag & Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const text = e.dataTransfer.getData('text/plain');
        
        if (text && textareaRef.current) {
            const textarea = textareaRef.current;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            
            // Insert text at cursor position
            const newText = draftContent.substring(0, start) + text + "\n" + draftContent.substring(end);
            setDraftContent(newText);
            
            // Restore focus and update cursor position
            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + text.length + 1, start + text.length + 1);
            }, 0);
        } else if (text) {
            // Fallback if ref is missing
            setDraftContent(prev => prev + "\n\n" + text);
        }
    };

    if (!isOpen || !inventoryItem) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-[90] flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white">Migration Workbench</h2>
                    <p className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="bg-gray-800 px-2 py-0.5 rounded">Source: {inventoryItem.url}</span>
                        <span>→</span>
                        <span className="text-green-400">{linkedBrief ? safeString(linkedBrief.title) : 'Unmapped (Standalone Optimization)'}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={handleSaveDraft} disabled={isSaving}>
                        {isSaving ? <Loader className="w-4 h-4"/> : 'Save Draft'}
                    </Button>
                    <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700">
                        Mark as Optimized
                    </Button>
                    <button onClick={onClose} className="ml-4 text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
            </header>

            {/* Main Workspace (Split View) */}
            <div className="flex-grow flex overflow-hidden">
                
                {/* LEFT: Original Content (Reference) */}
                <div className="w-1/2 border-r border-gray-700 flex flex-col bg-gray-900">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 font-semibold text-gray-300 text-sm flex justify-between items-center">
                        <div className="flex bg-gray-700 rounded p-0.5">
                             <button 
                                onClick={() => setActiveLeftTab('raw')}
                                className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'raw' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                                disabled={!!loadError}
                             >
                                Raw Content
                             </button>
                             <button 
                                onClick={() => setActiveLeftTab('chunks')}
                                className={`px-3 py-1 text-xs rounded ${activeLeftTab === 'chunks' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                                disabled={!!loadError}
                             >
                                Semantic Chunks
                             </button>
                         </div>
                        {isLoadingOriginal && <Loader className="w-4 h-4" />}
                    </div>
                    <div className="flex-grow overflow-y-auto p-6 text-gray-400 bg-gray-900/50">
                        {loadError ? (
                            <div className="flex flex-col gap-4 h-full max-w-lg mx-auto mt-10">
                                <div className="bg-red-900/20 border border-red-700/50 p-4 rounded text-red-200 text-center">
                                    <p className="font-bold mb-1">Extraction Failed</p>
                                    <p className="text-sm mb-3">{loadError}</p>
                                    <Button variant="secondary" onClick={loadContent} className="text-xs !py-1">Retry Scrape</Button>
                                </div>
                                
                                <div className="flex-grow flex flex-col gap-2">
                                    <Label>Manual Content Fallback</Label>
                                    <p className="text-xs text-gray-500 mb-1">
                                        If the automated scraper is blocked (e.g., Cloudflare), copy and paste the page text/markdown here manually to continue.
                                    </p>
                                    <Textarea 
                                        value={manualInput} 
                                        onChange={e => setManualInput(e.target.value)} 
                                        className="flex-grow font-mono text-xs bg-gray-800 border-gray-700 min-h-[200px]" 
                                        placeholder="# Paste content here..."
                                    />
                                    <Button onClick={handleManualContentSubmit} disabled={!manualInput.trim()} className="w-full">
                                        Use Pasted Content
                                    </Button>
                                </div>
                            </div>
                        ) : (
                             activeLeftTab === 'raw' ? (
                                 originalContent ? (
                                     <SimpleMarkdown content={originalContent} />
                                 ) : (
                                     !isLoadingOriginal && <p className="text-center mt-20">No content found.</p>
                                 )
                             ) : (
                                 <div className="h-full">
                                     {isChunking ? (
                                         <div className="flex flex-col items-center justify-center h-full">
                                             <Loader />
                                             <p className="text-xs text-gray-500 mt-2">Analyzing semantic structure...</p>
                                         </div>
                                     ) : chunkError ? (
                                         <div className="text-red-400 p-4 text-center">{chunkError}</div>
                                     ) : (
                                         <ChunkList chunks={chunks} />
                                     )}
                                 </div>
                             )
                        )}
                    </div>
                </div>

                {/* RIGHT: New Draft (Editor) */}
                <div className="w-1/2 flex flex-col bg-gray-900">
                    <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
                         <span className="font-semibold text-white text-sm">New Content (Editor)</span>
                         <div className="flex bg-gray-700 rounded p-0.5">
                             <button 
                                onClick={() => setActiveRightTab('edit')}
                                className={`px-3 py-1 text-xs rounded ${activeRightTab === 'edit' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                             >
                                Edit
                             </button>
                             <button 
                                onClick={() => setActiveRightTab('preview')}
                                className={`px-3 py-1 text-xs rounded ${activeRightTab === 'preview' ? 'bg-gray-600 text-white' : 'text-gray-400'}`}
                             >
                                Preview
                             </button>
                         </div>
                    </div>
                    
                    <div className="flex-grow overflow-y-auto relative">
                        {activeRightTab === 'edit' ? (
                            <div className="relative w-full h-full">
                                {/* Add explicit id for easier targeting if needed */}
                                <textarea 
                                    ref={textareaRef as any}
                                    value={draftContent}
                                    onChange={(e) => setDraftContent(e.target.value)}
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    className="w-full h-full min-h-full resize-none bg-gray-900 text-gray-200 border-none p-6 focus:ring-0 font-mono text-sm leading-relaxed absolute inset-0"
                                    placeholder="Start rewriting here... Drag & Drop chunks from the left to assemble content."
                                />
                                {activeLeftTab === 'chunks' && chunks.length > 0 && !draftContent && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <p className="text-gray-600 bg-gray-900/80 p-2 rounded border border-gray-700 border-dashed">
                                            Drag semantic chunks here to start
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 text-gray-200">
                                <SimpleMarkdown content={draftContent} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
