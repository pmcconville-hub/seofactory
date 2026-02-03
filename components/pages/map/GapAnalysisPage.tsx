import React from 'react';
import { useAppState } from '../../../state/appState';
import QueryNetworkAudit from '../../QueryNetworkAudit';

/**
 * GapAnalysisPage - Route wrapper for the Query Network Audit.
 * Previously shown as a modal, now rendered as a full page.
 */
const GapAnalysisPage: React.FC = () => {
    const { state } = useAppState();
    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    if (!currentMap) {
        return (
            <div className="text-center py-12 text-gray-400">
                No map selected. Please select a topical map first.
            </div>
        );
    }

    return (
        <QueryNetworkAudit />
    );
};

export default GapAnalysisPage;
