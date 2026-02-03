import React from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { useAppState } from '../../state/appState';

const Breadcrumb: React.FC = () => {
    const { projectId, mapId, topicId } = useParams<{ projectId: string; mapId: string; topicId: string }>();
    const { state } = useAppState();
    const location = useLocation();

    const activeProject = state.projects.find(p => p.id === projectId);
    const activeMap = state.topicalMaps.find(m => m.id === mapId);
    const activeTopic = activeMap?.topics?.find((t: any) => t.id === topicId);

    // Determine the current page name from the path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];

    const getPageName = (): string | null => {
        if (!mapId) return null;

        // Check for specific sub-routes
        const mapBasePath = `/p/${projectId}/m/${mapId}`;
        const relativePath = location.pathname.replace(mapBasePath, '');

        const routeNames: Record<string, string> = {
            '/setup': 'Map Settings',
            '/setup/business': 'Business Info',
            '/setup/pillars': 'SEO Pillars',
            '/setup/eavs': 'Semantic Triples',
            '/setup/competitors': 'Competitors',
            '/setup/blueprint': 'Website Blueprint',
            '/audit': 'Audit Dashboard',
            '/insights': 'Insights Hub',
            '/gap-analysis': 'Gap Analysis',
            '/quality': 'Quality Analytics',
            '/planning': 'Publication Plan',
            '/calendar': 'Content Calendar',
            '/strategy/kp': 'KP Strategy',
            '/strategy/entity-authority': 'Entity Authority',
            '/strategy/entity-health': 'Entity Health',
        };

        if (relativePath in routeNames) {
            return routeNames[relativePath];
        }

        // Topic sub-routes
        if (topicId) {
            const topicRelative = relativePath.replace(`/topics/${topicId}`, '');
            const topicRouteNames: Record<string, string> = {
                '': 'Topic Detail',
                '/brief': 'Brief Editor',
                '/draft': 'Drafting',
                '/style': 'Style & Publish',
            };
            if (topicRelative in topicRouteNames) {
                return topicRouteNames[topicRelative];
            }
        }

        return null;
    };

    const pageName = getPageName();

    // Build crumb items
    const crumbs: { label: string; to?: string }[] = [];

    if (projectId) {
        crumbs.push({ label: 'Projects', to: '/projects' });
        crumbs.push({
            label: activeProject?.project_name || 'Project',
            to: `/p/${projectId}`,
        });
    }

    if (mapId) {
        crumbs.push({
            label: activeMap?.name || 'Map',
            to: `/p/${projectId}/m/${mapId}`,
        });
    }

    if (topicId && activeTopic) {
        crumbs.push({
            label: activeTopic.title || 'Topic',
            to: `/p/${projectId}/m/${mapId}/topics/${topicId}`,
        });
    }

    if (pageName) {
        crumbs.push({ label: pageName });
    }

    if (crumbs.length === 0) return null;

    return (
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 px-1 py-2 min-h-[2rem]">
            {crumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                    {idx > 0 && (
                        <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    )}
                    {crumb.to && idx < crumbs.length - 1 ? (
                        <Link to={crumb.to} className="hover:text-gray-300 transition-colors truncate max-w-[160px]">
                            {crumb.label}
                        </Link>
                    ) : (
                        <span className="text-gray-300 truncate max-w-[200px]">{crumb.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumb;
