import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../state/appState';
import ProjectDashboardContainer from '../ProjectDashboardContainer';
import { TopicalMap } from '../../types';
import { getSupabaseClient } from '../../services/supabaseClient';
import { verifiedDelete, verifiedBulkDelete } from '../../services/verifiedDatabaseService';

/**
 * DashboardPage - Route wrapper for the main project dashboard.
 * Renders the existing ProjectDashboardContainer with navigation adapted to routing.
 */
const DashboardPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId } = useParams<{ projectId: string }>();

    const handleBackToProjects = () => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: null });
        navigate('/projects');
    };

    const handleInitiateDeleteMap = (map: TopicalMap) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Topical Map?',
                message: `Are you sure you want to permanently delete the map "${map.name}"? This action cannot be undone.`,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                        const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
                        const topicIds = (topics || []).map(t => t.id);

                        if (topicIds.length > 0) {
                            await verifiedBulkDelete(supabase, { table: 'content_briefs', operationDescription: `delete briefs for map ${map.id}` }, { column: 'topic_id', operator: 'in', value: topicIds });
                            await verifiedBulkDelete(supabase, { table: 'topics', operationDescription: `delete topics for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id }, topicIds.length);
                        }

                        await verifiedBulkDelete(supabase, { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });
                        await verifiedBulkDelete(supabase, { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });
                        await verifiedBulkDelete(supabase, { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${map.id}` }, { column: 'map_id', operator: 'eq', value: map.id });

                        const mapResult = await verifiedDelete(supabase, { table: 'topical_maps', operationDescription: `delete map "${map.name}"` }, { column: 'id', value: map.id });
                        if (!mapResult.success) throw new Error(mapResult.error || 'Map deletion verification failed');

                        dispatch({ type: 'DELETE_TOPICAL_MAP', payload: { mapId: map.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Map "${map.name}" deleted.` });
                        navigate(`/p/${projectId}`);
                    } catch (e) {
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete map.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    return (
        <ProjectDashboardContainer
            onInitiateDeleteMap={handleInitiateDeleteMap}
            onBackToProjects={handleBackToProjects}
        />
    );
};

export default DashboardPage;
