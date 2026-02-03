import React from 'react';
import { useAppState } from '../../../state/appState';
import { ComprehensiveAuditDashboard } from '../../dashboard/ComprehensiveAuditDashboard';

/**
 * AuditPage - Route wrapper for the Comprehensive Audit Dashboard.
 * Previously shown as a modal, now rendered as a full page.
 */
const AuditPage: React.FC = () => {
    const { state } = useAppState();
    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    if (!currentMap) {
        return (
            <div className="text-center py-12 text-gray-400">
                No map selected. Please select a topical map first.
            </div>
        );
    }

    const eavs = currentMap.eavs || [];
    const topicCount = currentMap.topics?.length || currentMap.topicCounts?.total || 0;
    const activeProject = state.projects.find(p => p.id === state.activeProjectId);

    return (
        <ComprehensiveAuditDashboard
            eavs={eavs}
            topicCount={topicCount}
            mapId={state.activeMapId || undefined}
            projectName={activeProject?.project_name}
            mapName={currentMap.name}
        />
    );
};

export default AuditPage;
