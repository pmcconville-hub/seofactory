import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../state/appState';
import { ProjectSelectionScreen } from '../screens';
import { getSupabaseClient } from '../../services/supabaseClient';
import { normalizeRpcData, parseProject } from '../../utils/parsers';
import { verifiedDelete, verifiedBulkDelete } from '../../services/verifiedDatabaseService';
import { AppStep, Project } from '../../types';

/**
 * ProjectsPage - Route wrapper for the project selection screen.
 * Adapts the existing ProjectSelectionScreen to work with URL routing.
 */
const ProjectsPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();

    const handleCreateProject = async (projectName: string, domain: string) => {
        if (!state.user) return;
        dispatch({ type: 'SET_LOADING', payload: { key: 'createProject', value: true } });
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { data, error } = await supabase.rpc('create_new_project', {
                p_project_data: { project_name: projectName, domain: domain, user_id: state.user.id }
            });
            if (error) throw error;

            const rawProject = normalizeRpcData(data);
            const newProject = parseProject(rawProject);

            dispatch({ type: 'ADD_PROJECT', payload: newProject });
            dispatch({ type: 'SET_ACTIVE_PROJECT', payload: newProject.id });
            navigate(`/p/${newProject.id}`);
        } catch (e) {
            dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to create project.' });
        } finally {
            dispatch({ type: 'SET_LOADING', payload: { key: 'createProject', value: false } });
        }
    };

    const handleLoadProject = async (projectId: string) => {
        dispatch({ type: 'SET_ACTIVE_PROJECT', payload: projectId });
        navigate(`/p/${projectId}`);
    };

    const handleInitiateDeleteProject = (project: Project) => {
        dispatch({
            type: 'SHOW_CONFIRMATION',
            payload: {
                title: 'Delete Project?',
                message: <>Are you sure you want to permanently delete the project <strong>"{project.project_name}"</strong>? This will delete all associated topical maps and content briefs. This action cannot be undone.</>,
                onConfirm: async () => {
                    try {
                        const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
                        const { data: maps } = await supabase.from('topical_maps').select('id').eq('project_id', project.id);
                        const mapIds = (maps || []).map(m => m.id);

                        for (const mapId of mapIds) {
                            const { data: topics } = await supabase.from('topics').select('id').eq('map_id', mapId);
                            const topicIds = (topics || []).map(t => t.id);

                            if (topicIds.length > 0) {
                                await verifiedBulkDelete(supabase, { table: 'content_briefs', operationDescription: `delete briefs for map ${mapId}` }, { column: 'topic_id', operator: 'in', value: topicIds });
                                await verifiedBulkDelete(supabase, { table: 'topics', operationDescription: `delete topics for map ${mapId}` }, { column: 'map_id', operator: 'eq', value: mapId }, topicIds.length);
                            }

                            await verifiedBulkDelete(supabase, { table: 'foundation_pages', operationDescription: `delete foundation pages for map ${mapId}` }, { column: 'map_id', operator: 'eq', value: mapId });
                            await verifiedBulkDelete(supabase, { table: 'navigation_structures', operationDescription: `delete navigation structures for map ${mapId}` }, { column: 'map_id', operator: 'eq', value: mapId });
                            await verifiedBulkDelete(supabase, { table: 'navigation_sync_status', operationDescription: `delete navigation sync status for map ${mapId}` }, { column: 'map_id', operator: 'eq', value: mapId });
                            await verifiedDelete(supabase, { table: 'topical_maps', operationDescription: `delete map ${mapId}` }, { column: 'id', value: mapId });
                        }

                        const projectResult = await verifiedDelete(supabase, { table: 'projects', operationDescription: `delete project "${project.project_name}"` }, { column: 'id', value: project.id });
                        if (!projectResult.success) throw new Error(projectResult.error || 'Project deletion verification failed');

                        dispatch({ type: 'DELETE_PROJECT', payload: { projectId: project.id } });
                        dispatch({ type: 'SET_NOTIFICATION', payload: `Project "${project.project_name}" deleted.` });
                    } catch (e) {
                        dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Failed to delete project.' });
                    } finally {
                        dispatch({ type: 'HIDE_CONFIRMATION' });
                    }
                }
            }
        });
    };

    return (
        <ProjectSelectionScreen
            onCreateProject={handleCreateProject}
            onLoadProject={handleLoadProject}
            onInitiateDeleteProject={handleInitiateDeleteProject}
        />
    );
};

export default ProjectsPage;
