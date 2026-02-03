import React from 'react';
import { useAppState } from '../../../state/appState';
import { InsightsHub } from '../../insights/InsightsHub';

/**
 * InsightsPage - Route wrapper for the Insights Hub.
 * Previously shown as a modal, now rendered as a full page.
 */
const InsightsPage: React.FC = () => {
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
        <InsightsHub />
    );
};

export default InsightsPage;
