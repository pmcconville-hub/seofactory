import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { WebsiteBlueprintWizard } from '../../wizards';
import { useMapGeneration } from '../../../hooks/useMapGeneration';
import { BusinessInfo } from '../../../types';

/**
 * BlueprintPage - Route wrapper for the Website Blueprint wizard step.
 */
const BlueprintPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
    const { handleFinalizeBlueprint, handleSkipBlueprint } = useMapGeneration(state, dispatch);

    const currentMap = state.topicalMaps.find(m => m.id === mapId);
    const mapBusinessInfo = currentMap?.business_info as Partial<BusinessInfo> || {};
    const { aiProvider: _ap, aiModel: _am, geminiApiKey: _g, openAiApiKey: _o, anthropicApiKey: _a, perplexityApiKey: _p, openRouterApiKey: _or, ...mapBusinessContext } = mapBusinessInfo;
    const effectiveBusinessInfo = {
        ...state.businessInfo,
        ...mapBusinessContext,
        aiProvider: state.businessInfo.aiProvider,
        aiModel: state.businessInfo.aiModel,
    };

    const handleBack = () => {
        navigate(`/p/${projectId}/m/${mapId}/setup/competitors`);
    };

    const handleComplete = async (config: Parameters<typeof handleFinalizeBlueprint>[0]) => {
        await handleFinalizeBlueprint(config);
        navigate(`/p/${projectId}/m/${mapId}`);
    };

    const handleSkip = async () => {
        await handleSkipBlueprint();
        navigate(`/p/${projectId}/m/${mapId}`);
    };

    return (
        <WebsiteBlueprintWizard
            businessInfo={effectiveBusinessInfo}
            pillars={currentMap?.pillars}
            existingNAPData={state.websiteStructure?.napData}
            isLoading={!!state.isLoading.map}
            onComplete={handleComplete}
            onSkip={handleSkip}
            onBack={handleBack}
        />
    );
};

export default BlueprintPage;
