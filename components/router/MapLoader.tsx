import React, { useEffect } from 'react';
import { Outlet, useParams, useLocation, Navigate } from 'react-router-dom';
import { useAppState } from '../../state/appState';

/**
 * MapLoader - Reads :mapId from URL params and syncs it to app state.
 * The actual topic/brief data loading is handled by useMapData hook
 * which watches activeMapId. This component just bridges URL -> state.
 */
const MapLoader: React.FC = () => {
    const { mapId } = useParams<{ mapId: string }>();
    const { state, dispatch } = useAppState();
    const location = useLocation();

    // Sync mapId from URL to state
    useEffect(() => {
        if (mapId && state.activeMapId !== mapId) {
            dispatch({ type: 'SET_ACTIVE_MAP', payload: mapId });
        }
    }, [mapId, state.activeMapId, dispatch]);

    // Reset viewMode when navigating away from the index route (where Migration renders)
    // This prevents the migration view from being "stuck" when clicking sidebar links
    useEffect(() => {
        if (!mapId) return;
        const mapIndexPath = `/p/${state.activeProjectId}/m/${mapId}`;
        const isOnIndex = location.pathname === mapIndexPath || location.pathname === `${mapIndexPath}/`;
        if (!isOnIndex && state.viewMode === 'MIGRATION') {
            dispatch({ type: 'SET_VIEW_MODE', payload: 'CREATION' });
        }
    }, [location.pathname, mapId, state.activeProjectId, state.viewMode, dispatch]);

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
