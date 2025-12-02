
import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { AuditProgress } from '../../services/ai/unifiedAudit';

interface AnalysisToolsPanelProps {
    isLoading: { [key: string]: boolean | undefined };
    onValidateMap: () => void;
    onFindMergeOpportunities: () => void;
    onAnalyzeSemanticRelationships: () => void;
    onAnalyzeContextualCoverage: () => void;
    onAuditInternalLinking: () => void;
    onCalculateTopicalAuthority: () => void;
    onGeneratePublicationPlan: () => void;
    onRunUnifiedAudit: () => void;
    auditProgress?: AuditProgress | null;
}

const AnalysisToolsPanel: React.FC<AnalysisToolsPanelProps> = ({
    isLoading,
    onValidateMap,
    onFindMergeOpportunities,
    onAnalyzeSemanticRelationships,
    onAnalyzeContextualCoverage,
    onAuditInternalLinking,
    onCalculateTopicalAuthority,
    onGeneratePublicationPlan,
    onRunUnifiedAudit,
    auditProgress
}) => {
    const renderAuditButton = () => {
        if (!isLoading.unifiedAudit) {
            return 'Health Check';
        }

        if (auditProgress) {
            const { phase, currentCategory, percentComplete, issuesFound } = auditProgress;
            if (phase === 'preparing') {
                return (
                    <span className="flex items-center gap-2">
                        <Loader className="w-4 h-4" /> Preparing...
                    </span>
                );
            }
            if (phase === 'checking' && currentCategory) {
                return (
                    <span className="flex flex-col items-center text-xs">
                        <span className="flex items-center gap-1">
                            <Loader className="w-3 h-3" /> {percentComplete}%
                        </span>
                        <span className="truncate max-w-[80px]">{currentCategory}</span>
                    </span>
                );
            }
            if (phase === 'calculating') {
                return (
                    <span className="flex items-center gap-2">
                        <Loader className="w-4 h-4" /> {issuesFound} issues
                    </span>
                );
            }
        }

        return <Loader />;
    };

    return (
        <Card className="p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Advanced Analysis & Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <Button onClick={onValidateMap} disabled={isLoading.validation} variant="secondary">{isLoading.validation ? <Loader /> : 'Validate Map'}</Button>
                <Button onClick={onFindMergeOpportunities} disabled={isLoading.merge} variant="secondary">{isLoading.merge ? <Loader /> : 'Find Merges'}</Button>
                <Button onClick={onAnalyzeSemanticRelationships} disabled={isLoading.semantic} variant="secondary">{isLoading.semantic ? <Loader /> : 'Semantics'}</Button>
                <Button onClick={onAnalyzeContextualCoverage} disabled={isLoading.coverage} variant="secondary">{isLoading.coverage ? <Loader /> : 'Coverage'}</Button>
                <Button onClick={onAuditInternalLinking} disabled={isLoading.linkingAudit} variant="secondary">{isLoading.linkingAudit ? <Loader /> : 'Link Audit'}</Button>
                <Button onClick={onCalculateTopicalAuthority} disabled={isLoading.authority} variant="secondary">{isLoading.authority ? <Loader /> : 'Authority'}</Button>
                <Button onClick={onGeneratePublicationPlan} disabled={isLoading.plan} variant="secondary">{isLoading.plan ? <Loader /> : 'Plan'}</Button>
                <Button onClick={onRunUnifiedAudit} disabled={isLoading.unifiedAudit} className="bg-purple-700 hover:bg-purple-600">{renderAuditButton()}</Button>
            </div>

            {/* Progress bar when audit is running */}
            {isLoading.unifiedAudit && auditProgress && (
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                        <span>Auditing: {auditProgress.currentCategory || auditProgress.phase}</span>
                        <span>{auditProgress.percentComplete}% • {auditProgress.issuesFound} issues found</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${auditProgress.percentComplete}%` }}
                        />
                    </div>
                </div>
            )}
        </Card>
    );
};

export default AnalysisToolsPanel;
