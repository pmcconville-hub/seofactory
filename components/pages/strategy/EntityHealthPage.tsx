import React from 'react';
import { useAppState } from '../../../state/appState';
import { EntityHealthDashboard } from '../../dashboard/EntityHealthDashboard';
import { BusinessInfo } from '../../../types';

/**
 * EntityHealthPage - Route wrapper for the Entity Health Dashboard.
 */
const EntityHealthPage: React.FC = () => {
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
    const centralEntity = mapBusinessInfo.seedKeyword || mapBusinessInfo.projectName || 'Entity';

    return (
        <EntityHealthDashboard
            eavs={eavs}
            centralEntity={centralEntity}
            knowledgeGraph={state.knowledgeGraph}
            onClose={() => window.history.back()}
        />
    );
};

export default EntityHealthPage;
