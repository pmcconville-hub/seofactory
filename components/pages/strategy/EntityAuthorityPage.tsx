import React from 'react';
import { useAppState } from '../../../state/appState';
import EntityAuthorityPageComponent from '../../EntityAuthorityPage';

/**
 * EntityAuthorityPage - Route wrapper for the Entity Authority page.
 * Passes required isOpen/onClose props since the underlying component
 * was designed as a modal-style page.
 */
const EntityAuthorityPage: React.FC = () => {
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

    return (
        <EntityAuthorityPageComponent
            isOpen={true}
            onClose={() => window.history.back()}
            businessInfo={state.businessInfo}
            eavs={eavs}
        />
    );
};

export default EntityAuthorityPage;
