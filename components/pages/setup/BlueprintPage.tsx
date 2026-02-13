import React, { useRef } from 'react';
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
    const isSubmittingRef = useRef(false);

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
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        try {
            await handleFinalizeBlueprint(config);
            navigate(`/p/${projectId}/m/${mapId}`);
        } finally {
            isSubmittingRef.current = false;
        }
    };

    const handleSkip = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        try {
            await handleSkipBlueprint();
            navigate(`/p/${projectId}/m/${mapId}`);
        } finally {
            isSubmittingRef.current = false;
        }
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
