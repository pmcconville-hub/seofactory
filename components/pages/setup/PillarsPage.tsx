import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { PillarDefinitionWizard } from '../../wizards';
import { SEOPillars } from '../../../types';

/**
 * PillarsPage - Route wrapper for the SEO Pillars wizard step.
 */
const PillarsPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();

    const handleFinalize = (pillars: SEOPillars) => {
        if (!mapId) return;
        dispatch({ type: 'SET_PILLARS', payload: { mapId, pillars } });
        navigate(`/p/${projectId}/m/${mapId}/setup/eavs`);
    };

    const handleBack = () => {
        navigate(`/p/${projectId}/m/${mapId}/setup/business`);
    };

    return (
        <PillarDefinitionWizard
            onFinalize={handleFinalize}
            onBack={handleBack}
        />
    );
};

export default PillarsPage;
