// components/pipeline/TopicEditorControls.tsx
import React, { useState } from 'react';
import type { EnrichedTopic } from '../../types';

interface TopicEditorControlsProps {
  topic: EnrichedTopic;
  allTopics: EnrichedTopic[];
  onPromote: (topicId: string) => void;
  onDemote: (topicId: string, targetId: string) => void;
  onDelete: (topicId: string) => void;
  onOverrideVolume: (topicId: string, volume: number) => void;
}

export const TopicEditorControls: React.FC<TopicEditorControlsProps> = ({
  topic,
  allTopics,
  onPromote,
  onDemote,
  onDelete,
  onOverrideVolume,
}) => {
  const [showVolumeInput, setShowVolumeInput] = useState(false);
  const [volumeValue, setVolumeValue] = useState(String(topic.search_volume || ''));

  const isStandalone = topic.page_decision === 'standalone_page';
  const parentTopics = allTopics.filter(t => t.page_decision === 'standalone_page' && t.id !== topic.id);

  return (
    <div className="flex items-center gap-1.5">
      {!isStandalone && (
        <button
          onClick={() => onPromote(topic.id)}
          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
          title="Promote to standalone page"
        >
          &uarr; Page
        </button>
      )}
      {isStandalone && parentTopics.length > 0 && (
        <button
          onClick={() => {
            const parent = allTopics.find(t => t.id === topic.parent_topic_id && t.page_decision === 'standalone_page');
            if (parent) onDemote(topic.id, parent.id);
          }}
          className="px-2 py-1 text-xs bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded"
          title="Demote to section"
        >
          &darr; Section
        </button>
      )}
      <button
        onClick={() => onDelete(topic.id)}
        className="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded"
        title="Delete topic"
      >
        &times;
      </button>
      {showVolumeInput ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={volumeValue}
            onChange={(e) => setVolumeValue(e.target.value)}
            className="w-20 px-1.5 py-0.5 text-xs border rounded"
            placeholder="Volume"
          />
          <button
            onClick={() => {
              const v = parseInt(volumeValue, 10);
              if (!isNaN(v) && v >= 0) {
                onOverrideVolume(topic.id, v);
                setShowVolumeInput(false);
              }
            }}
            className="text-xs text-green-600 hover:text-green-800"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowVolumeInput(true)}
          className="px-2 py-1 text-xs bg-gray-50 text-gray-500 hover:bg-gray-100 rounded"
          title="Override volume"
        >
          Vol
        </button>
      )}
    </div>
  );
};

export default TopicEditorControls;
