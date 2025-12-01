
import { useState, useCallback } from 'react';
import { ContentChunk, BusinessInfo } from '../types';
import { semanticChunking } from '../services/ai/migration';
import { useAppState } from '../state/appState';

export const useChunking = (businessInfo: BusinessInfo) => {
    const { dispatch } = useAppState();
    const [chunks, setChunks] = useState<ContentChunk[]>([]);
    const [isChunking, setIsChunking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const analyzeContent = useCallback(async (content: string) => {
        if (!content) return;
        
        setIsChunking(true);
        setError(null);
        
        try {
            const result = await semanticChunking(content, businessInfo, dispatch);
            setChunks(result);
        } catch (e) {
            console.error("Chunking failed:", e);
            setError(e instanceof Error ? e.message : "Failed to analyze content.");
        } finally {
            setIsChunking(false);
        }
    }, [businessInfo, dispatch]);

    return {
        chunks,
        isChunking,
        error,
        analyzeContent
    };
};
