import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { CompetitorRefinementWizard } from '../../wizards';

/**
 * CompetitorsPage - Route wrapper for the Competitor Refinement wizard step.
 */
const CompetitorsPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();

    const handleFinalize = async (competitors: string[]) => {
        if (!mapId) return;
        dispatch({ type: 'SET_COMPETITORS', payload: { mapId, competitors } });
        navigate(`/p/${projectId}/m/${mapId}/setup/blueprint`);
    };

    const handleBack = () => {
        navigate(`/p/${projectId}/m/${mapId}/setup/eavs`);
    };

    return (
        <CompetitorRefinementWizard
            onFinalize={handleFinalize}
            onBack={handleBack}
        />
    );
};

export default CompetitorsPage;
