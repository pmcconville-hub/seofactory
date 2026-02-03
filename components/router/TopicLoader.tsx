import React, { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useAppState } from '../../state/appState';

/**
 * TopicLoader - Reads :topicId from URL params and syncs to activeBriefTopic.
 * Resolves the topic from the already-loaded map data in state.
 */
const TopicLoader: React.FC = () => {
    const { topicId, projectId, mapId } = useParams<{ topicId: string; projectId: string; mapId: string }>();
    const { state, dispatch } = useAppState();

    // Resolve topic from state
    useEffect(() => {
        if (!topicId) return;

        const currentMap = state.topicalMaps.find(m => m.id === (mapId || state.activeMapId));
        if (!currentMap?.topics) return;

        const topic = currentMap.topics.find(t => t.id === topicId);
        if (topic && state.activeBriefTopic?.id !== topicId) {
            dispatch({ type: 'SET_ACTIVE_BRIEF_TOPIC', payload: topic });
        }
    }, [topicId, mapId, state.activeMapId, state.topicalMaps, state.activeBriefTopic?.id, dispatch]);

    // If map data is loaded but topic doesn't exist, redirect to dashboard
    const currentMap = state.topicalMaps.find(m => m.id === (mapId || state.activeMapId));
    if (topicId && currentMap?.topics && currentMap.topics.length > 0) {
        const topicExists = currentMap.topics.some(t => t.id === topicId);
        if (!topicExists) {
            const pid = projectId || state.activeProjectId;
            const mid = mapId || state.activeMapId;
            if (pid && mid) {
                return <Navigate to={`/p/${pid}/m/${mid}`} replace />;
            }
            return <Navigate to="/projects" replace />;
        }
    }

    return <Outlet />;
};

export default TopicLoader;
