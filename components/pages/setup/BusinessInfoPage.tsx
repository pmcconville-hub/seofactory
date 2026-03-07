import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import BusinessInfoForm from '../../BusinessInfoForm';
import { BusinessInfo } from '../../../types';
import { getSupabaseClient } from '../../../services/supabaseClient';

/**
 * BusinessInfoPage - Route wrapper for the Business Info wizard step.
 *
 * Supports `?from=migration` query param: after save, navigates back to the
 * map dashboard (where viewMode='MIGRATION' is still active) instead of
 * continuing the full setup wizard chain.
 */
const BusinessInfoPage: React.FC = () => {
    const { state, dispatch } = useAppState();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
    const fromMigration = searchParams.get('from') === 'migration';

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
            websiteType: formData.websiteType,
            region: formData.region,
            expertise: formData.expertise,
            conversionGoal: formData.conversionGoal,
            uniqueDataAssets: formData.uniqueDataAssets,
            authorName: formData.authorName,
            authorBio: formData.authorBio,
            authorCredentials: formData.authorCredentials,
        };

        dispatch({ type: 'UPDATE_MAP_DATA', payload: { mapId, data: { business_info: strategicInfo } } });

        // Persist to Supabase
        try {
            const supabase = getSupabaseClient(state.businessInfo.supabaseUrl, state.businessInfo.supabaseAnonKey);
            const { error } = await supabase.from('topical_maps').update({ business_info: strategicInfo } as any).eq('id', mapId);
            if (error) console.warn('[BusinessInfoPage] business_info save failed:', error.message);
        } catch (err) {
            console.warn('[BusinessInfoPage] business_info save error:', err);
        }

        if (fromMigration) {
            // Return to map dashboard — viewMode='MIGRATION' is still active in state
            navigate(`/p/${projectId}/m/${mapId}`);
        } else {
            navigate(`/p/${projectId}/m/${mapId}/setup/pillars`);
        }
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
