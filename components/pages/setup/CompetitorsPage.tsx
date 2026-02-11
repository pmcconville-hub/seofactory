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

    // Check if this is an ecommerce project to route through catalog step
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const mapBizInfo = activeMap?.business_info as Record<string, unknown> | undefined;
    const isEcommerce = (mapBizInfo?.websiteType || state.businessInfo.websiteType) === 'ECOMMERCE';

    const handleFinalize = async (competitors: string[]) => {
        if (!mapId) return;
        dispatch({ type: 'SET_COMPETITORS', payload: { mapId, competitors } });
        // Route to catalog step for ecommerce, otherwise skip to blueprint
        const nextStep = isEcommerce ? 'catalog' : 'blueprint';
        navigate(`/p/${projectId}/m/${mapId}/setup/${nextStep}`);
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
