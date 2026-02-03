import React from 'react';
import { useAppState } from '../../../state/appState';
import { PortfolioAnalytics } from '../../quality/PortfolioAnalytics';

/**
 * QualityPage - Route wrapper for Portfolio Analytics / Quality view.
 */
const QualityPage: React.FC = () => {
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
        <PortfolioAnalytics />
    );
};

export default QualityPage;
