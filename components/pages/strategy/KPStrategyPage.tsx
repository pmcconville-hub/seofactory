import React from 'react';
import { useAppState } from '../../../state/appState';
import KPStrategyPageComponent from '../../KPStrategyPage';
import { BusinessInfo } from '../../../types';

/**
 * KPStrategyPage - Route wrapper for the KP Strategy page.
 * Passes required isOpen/onClose props since the underlying component
 * was designed as a modal-style page.
 */
const KPStrategyPage: React.FC = () => {
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
    const mapBusinessInfo = currentMap.business_info as Partial<BusinessInfo> || {};

    return (
        <KPStrategyPageComponent
            isOpen={true}
            onClose={() => window.history.back()}
            businessInfo={state.businessInfo}
            eavs={eavs}
        />
    );
};

export default KPStrategyPage;
