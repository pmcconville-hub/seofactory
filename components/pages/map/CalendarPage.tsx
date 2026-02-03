import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppState } from '../../../state/appState';
import { ContentCalendar } from '../../wordpress/ContentCalendar';

/**
 * CalendarPage - Route wrapper for the Content Calendar.
 */
const CalendarPage: React.FC = () => {
    const { state } = useAppState();
    const navigate = useNavigate();
    const { projectId, mapId } = useParams<{ projectId: string; mapId: string }>();
    const currentMap = state.topicalMaps.find(m => m.id === state.activeMapId);

    if (!currentMap) {
        return (
            <div className="text-center py-12 text-gray-400">
                No map selected. Please select a topical map first.
            </div>
        );
    }

    const topics = currentMap.topics || [];

    const handleTopicClick = (topicId: string) => {
        navigate(`/p/${projectId}/m/${mapId}/topics/${topicId}`);
    };

    return (
        <ContentCalendar
            projectId={projectId || ''}
            topics={topics}
            onTopicClick={handleTopicClick}
        />
    );
};

export default CalendarPage;
