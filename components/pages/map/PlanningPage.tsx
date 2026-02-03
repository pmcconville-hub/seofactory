import React from 'react';
import { useAppState } from '../../../state/appState';
import PlanningDashboard from '../../planning/PlanningDashboard';

/**
 * PlanningPage - Route wrapper for the Publication Planning Dashboard.
 */
const PlanningPage: React.FC = () => {
    const { state } = useAppState();
    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    if (!currentMap) {
        return (
            <div className="text-center py-12 text-gray-400">
                No map selected. Please select a topical map first.
            </div>
        );
    }

    const topics = currentMap.topics || [];

    return (
        <PlanningDashboard topics={topics} />
    );
};

export default PlanningPage;
