import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import type { EnrichedTopic } from '../../types';
import type { MatchResult } from '../../services/migration/AutoMatchService';
import type { SiteInventoryItem } from '../../types';

// Re-use the EnrichedMatch shape from MatchStep
interface EnrichedMatch extends MatchResult {
  inv: SiteInventoryItem | undefined;
  topic: EnrichedTopic | null;
  pageTitle: string | null;
}

interface TopicAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orphan: EnrichedMatch | null;
  topics: EnrichedTopic[];
  similarOrphans: EnrichedMatch[];
  onAssign: (inventoryId: string, topicId: string) => Promise<void>;
  onBulkAssign: (assignments: { inventoryId: string; topicId: string }[]) => Promise<void>;
  onCreateTopic?: (data: Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>, placement: string) => Promise<EnrichedTopic | undefined>;
}

type Tab = 'existing' | 'create';

export const TopicAssignmentModal: React.FC<TopicAssignmentModalProps> = ({
  isOpen,
  onClose,
  orphan,
  topics,
  similarOrphans,
  onAssign,
  onBulkAssign,
  onCreateTopic,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('existing');
  const [search, setSearch] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Create topic form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<'core' | 'outer'>('outer');
  const [newParentId, setNewParentId] = useState<string>('');

  // Post-assignment state
  const [assignedTopicId, setAssignedTopicId] = useState<string | null>(null);
  const [showSimilarPrompt, setShowSimilarPrompt] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  // Reset state when orphan changes
  React.useEffect(() => {
    if (orphan) {
      const prefill = orphan.inv?.page_h1 || orphan.inv?.page_title || orphan.pageTitle || '';
      setSearch(prefill);
      setNewTitle(prefill);
      setNewDescription(orphan.inv?.meta_description || '');
      setNewType('outer');
      setNewParentId('');
      setSelectedTopicId(null);
      setAssignedTopicId(null);
      setShowSimilarPrompt(false);
      setActiveTab('existing');
    }
  }, [orphan]);

  const coreTopics = useMemo(
    () => topics.filter((t) => t.type === 'core'),
    [topics],
  );

  const outerTopics = useMemo(
    () => topics.filter((t) => t.type === 'outer'),
    [topics],
  );

  const filteredTopics = useMemo(() => {
    if (!search.trim()) return { core: coreTopics, outer: outerTopics };
    const q = search.toLowerCase().trim();
    return {
      core: coreTopics.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)),
      outer: outerTopics.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)),
    };
  }, [search, coreTopics, outerTopics]);

  const parentTopicMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of topics) {
      if (t.parent_topic_id) {
        const parent = topics.find((p) => p.id === t.parent_topic_id);
        if (parent) map.set(t.id, parent.title);
      }
    }
    return map;
  }, [topics]);

  const handleAssign = async () => {
    if (!orphan || !selectedTopicId) return;
    setIsAssigning(true);
    try {
      await onAssign(orphan.inventoryId, selectedTopicId);
      setAssignedTopicId(selectedTopicId);
      if (similarOrphans.length > 0) {
        setShowSimilarPrompt(true);
      } else {
        onClose();
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateAndAssign = async () => {
    if (!orphan || !onCreateTopic || !newTitle.trim()) return;
    setIsAssigning(true);
    try {
      const topicData = {
        title: newTitle.trim(),
        description: newDescription.trim(),
        type: newType,
        parent_topic_id: newType === 'outer' && newParentId ? newParentId : null,
      } as Omit<EnrichedTopic, 'id' | 'map_id' | 'slug'>;

      const placement = newType === 'outer' && newParentId ? newParentId : 'root';
      const created = await onCreateTopic(topicData, placement);
      if (created) {
        await onAssign(orphan.inventoryId, created.id);
        setAssignedTopicId(created.id);
        if (similarOrphans.length > 0) {
          setShowSimilarPrompt(true);
        } else {
          onClose();
        }
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!assignedTopicId || similarOrphans.length === 0) return;
    setIsBulkAssigning(true);
    try {
      const assignments = similarOrphans.map((o) => ({
        inventoryId: o.inventoryId,
        topicId: assignedTopicId,
      }));
      await onBulkAssign(assignments);
      onClose();
    } finally {
      setIsBulkAssigning(false);
    }
  };

  if (!orphan) return null;

  const pageLabel = orphan.inv?.page_h1 || orphan.inv?.page_title || orphan.pageTitle || getPathname(orphan.inv?.url ?? '');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Topic: ${truncate(pageLabel, 50)}`}
      maxWidth="max-w-2xl"
    >
      {/* Similar pages prompt (post-assignment) */}
      {showSimilarPrompt && (
        <div className="mb-4 p-3 rounded-lg bg-blue-900/30 border border-blue-700/50">
          <p className="text-sm text-blue-300 mb-2">
            Found {similarOrphans.length} similar page{similarOrphans.length > 1 ? 's' : ''}:
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {similarOrphans.slice(0, 8).map((o) => (
              <span key={o.inventoryId} className="text-xs bg-blue-900/40 text-blue-200 px-2 py-0.5 rounded">
                {truncate(getLastSlug(o.inv?.url ?? ''), 30)}
              </span>
            ))}
            {similarOrphans.length > 8 && (
              <span className="text-xs text-blue-400">+{similarOrphans.length - 8} more</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkAssign}
              disabled={isBulkAssigning}
              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              {isBulkAssigning ? 'Assigning...' : `Assign All ${similarOrphans.length} to Same Topic`}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Only show tabs/content when not in post-assignment state */}
      {!showSimilarPrompt && (
        <>
          {/* Page info */}
          <div className="mb-4 p-2.5 rounded bg-gray-800/60 border border-gray-700">
            <div className="text-xs text-gray-400">Assigning topic for:</div>
            <div className="text-sm text-gray-200 mt-0.5">{truncate(pageLabel, 80)}</div>
            <div className="text-xs text-gray-500 font-mono mt-0.5">{getPathname(orphan.inv?.url ?? '')}</div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700 mb-4">
            <button
              onClick={() => setActiveTab('existing')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'existing'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Select Existing Topic
            </button>
            {onCreateTopic && (
              <button
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                Create New Topic
              </button>
            )}
          </div>

          {/* Tab 1: Select Existing Topic */}
          {activeTab === 'existing' && (
            <div>
              {/* Search */}
              <div className="relative mb-3">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search topics..."
                  className="w-full pl-8 pr-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>

              {/* Topic list */}
              <div className="max-h-[320px] overflow-y-auto space-y-3">
                {/* Core topics */}
                {filteredTopics.core.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wide mb-1.5 px-1">
                      Core Topics ({filteredTopics.core.length})
                    </div>
                    <div className="space-y-0.5">
                      {filteredTopics.core.map((topic) => (
                        <TopicRow
                          key={topic.id}
                          topic={topic}
                          isSelected={selectedTopicId === topic.id}
                          parentName={parentTopicMap.get(topic.id)}
                          onClick={() => setSelectedTopicId(topic.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Outer topics */}
                {filteredTopics.outer.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 px-1">
                      Outer Topics ({filteredTopics.outer.length})
                    </div>
                    <div className="space-y-0.5">
                      {filteredTopics.outer.map((topic) => (
                        <TopicRow
                          key={topic.id}
                          topic={topic}
                          isSelected={selectedTopicId === topic.id}
                          parentName={parentTopicMap.get(topic.id)}
                          onClick={() => setSelectedTopicId(topic.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {filteredTopics.core.length === 0 && filteredTopics.outer.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-6">No topics match your search.</p>
                )}
              </div>

              {/* Assign button */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAssign}
                  disabled={!selectedTopicId || isAssigning}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssigning ? 'Assigning...' : 'Assign Topic'}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Create New Topic */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Topic title..."
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Topic description..."
                  rows={3}
                  className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="topicType"
                      value="core"
                      checked={newType === 'core'}
                      onChange={() => setNewType('core')}
                      className="accent-purple-500"
                    />
                    <span className="text-sm text-gray-200">Core (pillar)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="topicType"
                      value="outer"
                      checked={newType === 'outer'}
                      onChange={() => setNewType('outer')}
                      className="accent-blue-500"
                    />
                    <span className="text-sm text-gray-200">Outer (supporting)</span>
                  </label>
                </div>
              </div>

              {/* Parent topic (for outer) */}
              {newType === 'outer' && coreTopics.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Parent Topic</label>
                  <select
                    value={newParentId}
                    onChange={(e) => setNewParentId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">No parent (root)</option>
                    {coreTopics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Create & Assign button */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreateAndAssign}
                  disabled={!newTitle.trim() || isAssigning}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                >
                  {isAssigning ? 'Creating...' : 'Create & Assign'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

// --- Helpers ---

function TopicRow({
  topic,
  isSelected,
  parentName,
  onClick,
}: {
  topic: EnrichedTopic;
  isSelected: boolean;
  parentName?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded transition-colors ${
        isSelected
          ? 'bg-blue-900/40 border border-blue-600'
          : 'bg-gray-800/40 border border-transparent hover:bg-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-200 truncate flex-1">{topic.title}</span>
        <span
          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            topic.type === 'core'
              ? 'bg-purple-900/40 text-purple-300 border border-purple-700'
              : 'bg-gray-700 text-gray-400 border border-gray-600'
          }`}
        >
          {topic.type}
        </span>
      </div>
      {parentName && (
        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
          Parent: {parentName}
        </div>
      )}
    </button>
  );
}

function getPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function getLastSlug(url: string): string {
  const pathname = getPathname(url);
  const parts = pathname.split('/').filter(Boolean);
  return parts[parts.length - 1] || pathname;
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '\u2026';
}

export default TopicAssignmentModal;
