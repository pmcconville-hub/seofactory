import React, { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useAppState } from '../../state/appState';

/**
 * MapLoader - Reads :mapId from URL params and syncs it to app state.
 * The actual topic/brief data loading is handled by useMapData hook
 * which watches activeMapId. This component just bridges URL -> state.
 */
const MapLoader: React.FC = () => {
    const { mapId } = useParams<{ mapId: string }>();
    const { state, dispatch } = useAppState();

    // Sync mapId from URL to state
    useEffect(() => {
        if (mapId && state.activeMapId !== mapId) {
            dispatch({ type: 'SET_ACTIVE_MAP', payload: mapId });
        }
    }, [mapId, state.activeMapId, dispatch]);

    // Validate map exists in loaded maps
    if (mapId && state.topicalMaps.length > 0) {
        const mapExists = state.topicalMaps.some(m => m.id === mapId);
        if (!mapExists) {
            // Map not found - redirect to project page
            const projectId = state.activeProjectId;
            if (projectId) {
                return <Navigate to={`/p/${projectId}`} replace />;
            }
            return <Navigate to="/projects" replace />;
        }
    }

    return <Outlet />;
};

export default MapLoader;
