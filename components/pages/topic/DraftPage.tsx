import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import DraftingModal from '../../modals/DraftingModal';
import { ContentBrief } from '../../../types';

/**
 * DraftPage - Route wrapper for the Drafting workspace.
 * Renders the existing DraftingModal as a full page.
 * The DraftingModal reads activeBriefTopic from state.
 */
const DraftPage: React.FC = () => {
    const { state } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();

    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);
    const topic = currentMap?.topics?.find(t => t.id === topicId);
    const brief = topic ? currentMap?.briefs?.[topic.id] || null : null;

    const handleClose = () => {
        navigate(`/p/${projectId}/m/${mapId}/topics/${topicId}`);
    };

    const handleAudit = (auditBrief: ContentBrief, draft: string) => {
        // Audit is handled within the DraftingModal itself
    };

    const handleGenerateSchema = (schemaBrief: ContentBrief) => {
        // Schema generation is handled within the DraftingModal itself
    };

    const handleAnalyzeFlow = (draft: string) => {
        // Flow analysis is handled within the DraftingModal itself
    };

    return (
        <DraftingModal
            isOpen={true}
            onClose={handleClose}
            brief={brief}
            onAudit={handleAudit}
            onGenerateSchema={handleGenerateSchema}
            isLoading={!!state.isLoading.draft}
            businessInfo={state.businessInfo}
            onAnalyzeFlow={handleAnalyzeFlow}
            asPage={true}
        />
    );
};

export default DraftPage;
