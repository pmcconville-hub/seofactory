import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../state/appState';
import { AppStep } from '../types';

/**
 * useNavigationSync - Temporary bridge hook that synchronizes
 * AppStep state changes with React Router navigation.
 *
 * During the migration period (Phases 1-5), both systems coexist.
 * This hook listens for SET_STEP dispatches and calls navigate()
 * to keep the URL in sync. Once Phase 6 removes AppStep, this
 * hook is also removed.
 *
 * IMPORTANT: This is one-directional: State -> URL.
 * The URL -> State direction is handled by Loader components.
 */
export function useNavigationSync() {
    const { state } = useAppState();
    const navigate = useNavigate();
    const location = useLocation();
    const prevStepRef = useRef(state.appStep);

    useEffect(() => {
        const currentStep = state.appStep;
        const prevStep = prevStepRef.current;
        prevStepRef.current = currentStep;

        // Only react to actual step changes
        if (currentStep === prevStep) return;

        // Map AppStep values to URL paths
        // Only redirect if we're not already on a path-based route
        // (i.e., if the URL is still on the old hash/root path)
        const isOnLegacyPath = location.pathname === '/' || location.pathname === '';

        switch (currentStep) {
            case AppStep.AUTH:
                navigate('/login', { replace: true });
                break;
            case AppStep.PROJECT_SELECTION:
                navigate('/projects', { replace: true });
                break;
            case AppStep.ADMIN:
                navigate('/admin', { replace: true });
                break;
            case AppStep.PROJECT_WORKSPACE:
            case AppStep.PROJECT_DASHBOARD:
                // These are handled by ProjectLoader/MapLoader
                // Only navigate if we have the IDs and aren't already on a proper route
                if (state.activeProjectId && state.activeMapId) {
                    if (isOnLegacyPath || location.pathname === '/projects') {
                        navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}`, { replace: true });
                    }
                } else if (state.activeProjectId) {
                    if (isOnLegacyPath || location.pathname === '/projects') {
                        navigate(`/p/${state.activeProjectId}`, { replace: true });
                    }
                }
                break;
            case AppStep.BUSINESS_INFO:
                if (state.activeProjectId && state.activeMapId) {
                    navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}/setup/business`, { replace: true });
                }
                break;
            case AppStep.PILLAR_WIZARD:
                if (state.activeProjectId && state.activeMapId) {
                    navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}/setup/pillars`, { replace: true });
                }
                break;
            case AppStep.EAV_WIZARD:
                if (state.activeProjectId && state.activeMapId) {
                    navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}/setup/eavs`, { replace: true });
                }
                break;
            case AppStep.COMPETITOR_WIZARD:
                if (state.activeProjectId && state.activeMapId) {
                    navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}/setup/competitors`, { replace: true });
                }
                break;
            case AppStep.BLUEPRINT_WIZARD:
                if (state.activeProjectId && state.activeMapId) {
                    navigate(`/p/${state.activeProjectId}/m/${state.activeMapId}/setup/blueprint`, { replace: true });
                }
                break;
            case AppStep.SITE_ANALYSIS:
                // Site analysis doesn't have a dedicated route yet
                break;
            case AppStep.QUOTATION:
                navigate('/tools/quotation', { replace: true });
                break;
            default:
                break;
        }
    }, [state.appStep, state.activeProjectId, state.activeMapId, navigate, location.pathname]);
}
