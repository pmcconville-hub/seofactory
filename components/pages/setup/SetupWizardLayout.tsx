import React from 'react';
import { Outlet, useParams, useLocation, NavLink } from 'react-router-dom';

const WIZARD_STEPS = [
    { label: 'Business Info', path: 'business' },
    { label: 'SEO Pillars', path: 'pillars' },
    { label: 'Semantic Triples', path: 'eavs' },
    { label: 'Competitors', path: 'competitors' },
    { label: 'Blueprint', path: 'blueprint' },
];

/**
 * SetupWizardLayout - Provides a progress indicator and layout wrapper
 * for the multi-step setup wizard. Uses <Outlet /> for step content.
 */
const SetupWizardLayout: React.FC = () => {
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
    const location = useLocation();
    const basePath = `/p/${projectId}/m/${mapId}/setup`;

    // Determine current step index
    const currentStepPath = location.pathname.replace(`${basePath}/`, '').replace(basePath, '');
    const currentStepIndex = WIZARD_STEPS.findIndex(s => s.path === currentStepPath);

    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress bar */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {WIZARD_STEPS.map((step, idx) => (
                        <React.Fragment key={step.path}>
                            <NavLink
                                to={`${basePath}/${step.path}`}
                                className={({ isActive }) => {
                                    const isCompleted = idx < currentStepIndex;
                                    const isCurrent = isActive || idx === currentStepIndex;
                                    return `flex items-center gap-2 text-sm ${
                                        isCurrent
                                            ? 'text-blue-400 font-medium'
                                            : isCompleted
                                                ? 'text-green-400'
                                                : 'text-gray-500'
                                    }`;
                                }}
                            >
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                    idx < currentStepIndex
                                        ? 'bg-green-600 border-green-600 text-white'
                                        : idx === currentStepIndex
                                            ? 'border-blue-400 text-blue-400'
                                            : 'border-gray-600 text-gray-600'
                                }`}>
                                    {idx < currentStepIndex ? (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                    ) : (
                                        idx + 1
                                    )}
                                </span>
                                <span className="hidden sm:inline">{step.label}</span>
                            </NavLink>
                            {idx < WIZARD_STEPS.length - 1 && (
                                <div className={`flex-1 h-px mx-2 ${
                                    idx < currentStepIndex ? 'bg-green-600' : 'bg-gray-700'
                                }`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Step content */}
            <Outlet />
        </div>
    );
};

export default SetupWizardLayout;
