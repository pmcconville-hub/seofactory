import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import BusinessInfoForm from '../../BusinessInfoForm';
import { BusinessInfo } from '../../../types';

/**
 * BusinessInfoPage - Route wrapper for the Business Info wizard step.
 */
const BusinessInfoPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();

    const handleSave = async (formData: Partial<BusinessInfo>) => {
        if (!mapId) return;

        const strategicInfo: Partial<BusinessInfo> = {
            seedKeyword: formData.seedKeyword,
            industry: formData.industry,
            valueProp: formData.valueProp,
            audience: formData.audience,
            language: formData.language,
            targetMarket: formData.targetMarket,
            aiProvider: formData.aiProvider,
            aiModel: formData.aiModel,
            brandKit: formData.brandKit,
            authorProfile: formData.authorProfile,
            domain: formData.domain,
            projectName: formData.projectName,
        };

        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId, data: { business_info: strategicInfo } } });
        navigate(`/p/${projectId}/m/${mapId}/setup/pillars`);
    };

    const handleBack = () => {
        navigate(`/p/${projectId}/m/${mapId}`);
    };

    return (
        <BusinessInfoForm
            onSave={handleSave}
            onBack={handleBack}
            isLoading={!!state.isLoading.map}
        />
    );
};

export default BusinessInfoPage;
