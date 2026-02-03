import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { StylePublishModal } from '../../publishing/StylePublishModal';
/**
 * StylePage - Route wrapper for the Style & Publish workspace.
 * Renders the existing StylePublishModal as a full page.
 */
const StylePage: React.FC = () => {
    const { state } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();

    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const topic = currentMap?.topics?.find(t => t.id === topicId);
    const brief = topic ? currentMap?.briefs?.[topic.id] || undefined : undefined;
    const articleDraft = brief?.articleDraft || '';

    if (!topic) {
        return (
            <div className="text-center py-12 text-gray-400">
                Topic not found. Please select a valid topic.
            </div>
        );
    }

    const handleClose = () => {
        navigate(`/p/${projectId}/m/${mapId}/topics/${topicId}/draft`);
    };

    return (
        <StylePublishModal
            isOpen={true}
            onClose={handleClose}
            topic={topic}
            articleDraft={articleDraft}
            brief={brief}
            brandKit={state.businessInfo.brandKit as any}
            topicalMap={currentMap}
            supabaseUrl={state.businessInfo.supabaseUrl}
            supabaseAnonKey={state.businessInfo.supabaseAnonKey}
            projectId={projectId}
            asPage={true}
        />
    );
};

export default StylePage;
