import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import ContentBriefModal from '../../modals/ContentBriefModal';
import { SchemaModal } from '../../modals';

/**
 * BriefPage - Route wrapper for the Content Brief editor.
 * Renders the existing ContentBriefModal as a full page (not in a modal).
 * The ContentBriefModal component reads activeBriefTopic from state,
 * which is set by the TopicLoader parent route.
 */
const BriefPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();

    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const allTopics = currentMap?.topics || [];

    const handleGenerateDraft = () => {
        navigate(`/p/${projectId}/m/${mapId}/topics/${topicId}/draft`);
    };

    return (
        <>
            <ContentBriefModal
                allTopics={allTopics}
                onGenerateDraft={handleGenerateDraft}
                asPage={true}
            />
            {/* SchemaModal - needed here because ProjectDashboard (which normally renders it) is not mounted on topic-level routes */}
            <SchemaModal
                isOpen={!!state.modals.schema}
                onClose={() => dispatch({ type: 'SET_MODAL_VISIBILITY', payload: { modal: 'schema', visible: false } })}
                result={state.schemaResult}
            />
        </>
    );
};

export default BriefPage;
