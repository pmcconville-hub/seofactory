import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { EavDiscoveryWizard } from '../../wizards';
import { SemanticTriple } from '../../../types';

/**
 * EavsPage - Route wrapper for the EAV Discovery wizard step.
 */
const EavsPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();

    const handleFinalize = (eavs: SemanticTriple[]) => {
        if (!mapId) return;
        dispatch({ type: 'SET_EAVS', payload: { mapId, eavs } });
        navigate(`/p/${projectId}/m/${mapId}/setup/competitors`);
    };

    const handleBack = () => {
        navigate(`/p/${projectId}/m/${mapId}/setup/pillars`);
    };

    return (
        <EavDiscoveryWizard
            onFinalize={handleFinalize}
            onBack={handleBack}
        />
    );
};

export default EavsPage;
