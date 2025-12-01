// components/site-analysis/BatchSuggestionReviewModal.tsx
// Modal for batch generating and reviewing AI suggestions for all tasks on a page

import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { AuditTask, AISuggestion, SitePageRecord, SiteAnalysisProject, BusinessInfo } from '../../types';
import { AppAction } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  generateSuggestionsForTasks,
  getPendingSuggestionsForPage,
  getAllSuggestionsForTasks,
  approveSuggestion,
  rejectSuggestion,
  applySuggestionToTask,
} from '../../services/aiSuggestionService';

interface BatchSuggestionReviewModalProps {
  isOpen: boolean;
  tasks: AuditTask[];
  page: SitePageRecord;
  project: SiteAnalysisProject;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
  onTasksUpdated?: () => void;
}

type ModalState = 'selecting' | 'idle' | 'generating' | 'reviewing' | 'saving' | 'error';

interface SuggestionWithTask {
  task: AuditTask;
  suggestion: AISuggestion | null;
  editedValue: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
}

// Track existing suggestion status for each task
interface TaskSuggestionStatus {
  taskId: string;
  hasSuggestion: boolean;
  suggestionStatus: 'pending' | 'approved' | 'rejected' | 'applied' | null;
  suggestion: AISuggestion | null;
}

const BatchSuggestionReviewModal: React.FC<BatchSuggestionReviewModalProps> = ({
  isOpen,
  tasks,
  page,
  project,
  businessInfo,
  dispatch,
  onClose,
  onTasksUpdated,
}) => {
  const [modalState, setModalState] = useState<ModalState>('selecting');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [suggestionItems, setSuggestionItems] = useState<SuggestionWithTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Task selection state
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Track existing suggestions for each task
  const [taskSuggestionStatuses, setTaskSuggestionStatuses] = useState<Map<string, TaskSuggestionStatus>>(new Map());
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Track if we're in a working state (don't reload during these states)
  const isWorkingRef = useRef(false);
  const previousTasksRef = useRef<string>('');

  // Reset on modal open/close
  useEffect(() => {
    if (isOpen) {
      // Only reload if not currently working (generating/saving) and tasks have changed
      const taskIds = tasks.map(t => t.id).sort().join(',');
      const tasksChanged = taskIds !== previousTasksRef.current;

      if (!isWorkingRef.current && (tasksChanged || previousTasksRef.current === '')) {
        previousTasksRef.current = taskIds;
        loadTaskSuggestionStatuses();
      }
    } else {
      // Reset state when modal closes
      isWorkingRef.current = false;
      previousTasksRef.current = '';
      setSuggestionItems([]);
      setProgress({ current: 0, total: 0 });
      setError(null);
      setModalState('selecting');
      setExpandedIndex(null);
      setSelectedTaskIds(new Set());
      setTaskSuggestionStatuses(new Map());
      setIsLoadingStatus(true);
    }
  }, [isOpen, tasks]);

  // Load suggestion status for all tasks
  const loadTaskSuggestionStatuses = async () => {
    setIsLoadingStatus(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Get ALL suggestions for tasks using the service function
      const suggestionsMap = await getAllSuggestionsForTasks(supabase, tasks.map(t => t.id));

      // Build status map
      const statusMap = new Map<string, TaskSuggestionStatus>();

      for (const task of tasks) {
        const suggestion = suggestionsMap.get(task.id);
        statusMap.set(task.id, {
          taskId: task.id,
          hasSuggestion: !!suggestion,
          suggestionStatus: suggestion?.status || null,
          suggestion: suggestion || null,
        });
      }

      setTaskSuggestionStatuses(statusMap);

      // Check if there are pending suggestions to review
      const pendingSuggestions = Array.from(statusMap.values()).filter(
        s => s.suggestionStatus === 'pending'
      );

      if (pendingSuggestions.length > 0) {
        // Go directly to review mode for pending suggestions
        const items: SuggestionWithTask[] = tasks.map(task => {
          const status = statusMap.get(task.id);
          const suggestion = status?.suggestionStatus === 'pending' ? status.suggestion : null;
          return {
            task,
            suggestion,
            editedValue: suggestion?.suggestedValue || '',
            status: suggestion ? 'pending' : 'skipped',
          };
        });
        setSuggestionItems(items);
        setModalState('reviewing');
      } else {
        // Go to selection mode - by default select only tasks WITHOUT existing suggestions
        const tasksWithoutSuggestions = tasks.filter(t => {
          const status = statusMap.get(t.id);
          return !status?.hasSuggestion;
        });
        setSelectedTaskIds(new Set(tasksWithoutSuggestions.map(t => t.id)));
        setModalState('selecting');
      }
    } catch (err) {
      console.error('Failed to load suggestion statuses:', err);
      // Default to selecting all tasks
      setSelectedTaskIds(new Set(tasks.map(t => t.id)));
      setModalState('selecting');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const checkExistingSuggestions = async () => {
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const existingSuggestions = await getPendingSuggestionsForPage(supabase, page.id);

      if (existingSuggestions.length > 0) {
        // Map existing suggestions to tasks
        const items: SuggestionWithTask[] = tasks.map(task => {
          const suggestion = existingSuggestions.find(s => s.taskId === task.id) || null;
          return {
            task,
            suggestion,
            editedValue: suggestion?.suggestedValue || '',
            status: suggestion ? 'pending' : 'skipped',
          };
        });
        setSuggestionItems(items);
        setModalState('reviewing');
      } else {
        // No existing suggestions - go to selection state
        setModalState('selecting');
      }
    } catch (err) {
      // No existing suggestions, go to selection state
      setModalState('selecting');
    }
  };

  // Task selection handlers
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const selectAllTasks = () => {
    setSelectedTaskIds(new Set(tasks.map(t => t.id)));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIds(new Set());
  };

  const selectByPhase = (phase: string) => {
    const phaseTasks = tasks.filter(t => t.phase === phase).map(t => t.id);
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      phaseTasks.forEach(id => next.add(id));
      return next;
    });
  };

  const getSelectedTasks = () => tasks.filter(t => selectedTaskIds.has(t.id));

  const handleGenerateSelected = async () => {
    const selectedTasks = getSelectedTasks();
    if (selectedTasks.length === 0) {
      setError('Please select at least one task to process.');
      return;
    }

    // Mark as working to prevent useEffect from resetting state
    isWorkingRef.current = true;
    setModalState('generating');
    setError(null);
    setProgress({ current: 0, total: selectedTasks.length });

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Create pages map for batch function
      const pagesMap = new Map<string, SitePageRecord>();
      pagesMap.set(page.id, page);

      const result = await generateSuggestionsForTasks(
        supabase,
        selectedTasks, // Only process selected tasks
        pagesMap,
        project,
        businessInfo,
        dispatch,
        (current, total) => setProgress({ current, total })
      );

      // Map results to suggestion items (only selected tasks)
      const items: SuggestionWithTask[] = selectedTasks.map(task => {
        const suggestion = result.suggestions.find(s => s.taskId === task.id) || null;
        const taskError = result.errors.find(e => e.taskId === task.id);
        return {
          task,
          suggestion,
          editedValue: suggestion?.suggestedValue || '',
          status: taskError ? 'skipped' : 'pending',
        };
      });

      setSuggestionItems(items);

      if (result.errors.length > 0) {
        setError(`${result.errors.length} task(s) failed to generate suggestions.`);
      }

      setModalState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      setModalState('error');
    }
  };

  const handleUpdateEditedValue = (index: number, value: string) => {
    setSuggestionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], editedValue: value };
      return updated;
    });
  };

  const handleApproveItem = (index: number) => {
    setSuggestionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'approved' };
      return updated;
    });
  };

  const handleRejectItem = (index: number) => {
    setSuggestionItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], status: 'rejected' };
      return updated;
    });
  };

  const handleApproveAll = () => {
    setSuggestionItems(prev =>
      prev.map(item =>
        item.suggestion && item.status === 'pending'
          ? { ...item, status: 'approved' }
          : item
      )
    );
  };

  const handleRejectAll = () => {
    setSuggestionItems(prev =>
      prev.map(item =>
        item.suggestion && item.status === 'pending'
          ? { ...item, status: 'rejected' }
          : item
      )
    );
  };

  const handleSubmitDecisions = async () => {
    // Mark as working to prevent useEffect from resetting state
    isWorkingRef.current = true;
    setModalState('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      let approvedCount = 0;
      let rejectedCount = 0;

      for (const item of suggestionItems) {
        if (!item.suggestion) continue;

        if (item.status === 'approved') {
          const wasModified = item.editedValue !== item.suggestion.suggestedValue;
          await approveSuggestion(supabase, item.suggestion.id, wasModified ? item.editedValue : undefined);
          await applySuggestionToTask(supabase, item.suggestion.id);
          approvedCount++;
        } else if (item.status === 'rejected') {
          await rejectSuggestion(supabase, item.suggestion.id, 'Rejected during batch review');
          rejectedCount++;
        }
      }

      dispatch({
        type: 'SET_NOTIFICATION',
        payload: `Batch review complete: ${approvedCount} approved, ${rejectedCount} rejected.`,
      });

      isWorkingRef.current = false;
      onTasksUpdated?.();
      onClose();
    } catch (err) {
      isWorkingRef.current = false;
      setError(err instanceof Error ? err.message : 'Failed to save decisions');
      setModalState('reviewing');
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/50">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/50">Rejected</span>;
      case 'skipped':
        return <span className="px-2 py-0.5 text-xs rounded bg-gray-500/20 text-gray-400 border border-gray-500/50">Skipped</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/50">Pending</span>;
    }
  };

  const pendingCount = suggestionItems.filter(i => i.status === 'pending' && i.suggestion).length;
  const approvedCount = suggestionItems.filter(i => i.status === 'approved').length;
  const rejectedCount = suggestionItems.filter(i => i.status === 'rejected').length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Batch AI Suggestions</h2>
            <p className="text-sm text-gray-400 truncate max-w-lg">
              {page.url} - {tasks.length} tasks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 text-2xl leading-none hover:text-white"
            disabled={modalState === 'saving' || modalState === 'generating'}
          >
            &times;
          </button>
        </header>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Loading Status State */}
          {isLoadingStatus && modalState === 'selecting' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="mt-4 text-gray-400">Loading existing suggestion statuses...</p>
            </div>
          )}

          {/* Selecting State - Task selection before generation */}
          {modalState === 'selecting' && !isLoadingStatus && (
            <div className="space-y-4">
              {/* Info Banner */}
              <div className="p-4 bg-purple-900/20 border border-purple-500/30 rounded">
                <p className="text-sm text-purple-300">
                  <strong>Context-Aware Processing:</strong> Select the tasks you want to process.
                  Suggestions are generated sequentially, with each new suggestion informed by previous ones.
                  Deselect irrelevant tasks to save AI tokens.
                </p>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-4 p-3 bg-gray-900/30 rounded text-xs">
                <span className="text-gray-500">Status Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                  <span className="text-gray-400">No suggestion</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span className="text-purple-400">Pending review</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-green-400">Approved/Applied</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-red-400">Rejected</span>
                </span>
              </div>

              {/* Selection Controls */}
              <div className="flex flex-wrap items-center justify-between p-3 bg-gray-900/50 rounded gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    <span className="text-purple-400 font-semibold">{selectedTaskIds.size}</span> of {tasks.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={selectAllTasks} variant="secondary" className="text-xs px-3 py-1">
                    Select All
                  </Button>
                  <Button onClick={deselectAllTasks} variant="secondary" className="text-xs px-3 py-1">
                    Deselect All
                  </Button>
                  <span className="text-gray-600">|</span>
                  {/* Status filter buttons */}
                  <Button
                    onClick={() => {
                      const tasksWithoutSuggestions = tasks.filter(t => !taskSuggestionStatuses.get(t.id)?.hasSuggestion);
                      setSelectedTaskIds(new Set(tasksWithoutSuggestions.map(t => t.id)));
                    }}
                    variant="secondary"
                    className="text-xs px-3 py-1"
                    title="Select only tasks without any AI suggestions"
                  >
                    Only New
                  </Button>
                  <Button
                    onClick={() => {
                      const tasksNeedingReview = tasks.filter(t => {
                        const status = taskSuggestionStatuses.get(t.id);
                        return !status?.hasSuggestion || status.suggestionStatus === 'rejected';
                      });
                      setSelectedTaskIds(new Set(tasksNeedingReview.map(t => t.id)));
                    }}
                    variant="secondary"
                    className="text-xs px-3 py-1"
                    title="Select tasks without suggestions or with rejected suggestions"
                  >
                    New + Rejected
                  </Button>
                  <span className="text-gray-600">|</span>
                  {/* Phase buttons */}
                  {Array.from(new Set(tasks.map(t => t.phase).filter(Boolean))).map(phase => (
                    <Button
                      key={phase}
                      onClick={() => selectByPhase(phase!)}
                      variant="secondary"
                      className="text-xs px-3 py-1"
                    >
                      + {phase}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Task List with Checkboxes and Status Indicators */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {tasks.map((task) => {
                  const suggestionStatus = taskSuggestionStatuses.get(task.id);
                  const hasExistingSuggestion = suggestionStatus?.hasSuggestion || false;
                  const existingStatus = suggestionStatus?.suggestionStatus;

                  // Determine status badge styling
                  const getExistingStatusBadge = () => {
                    if (!hasExistingSuggestion) {
                      return (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-600/30 text-gray-400 border border-gray-600/50">
                          No AI suggestion
                        </span>
                      );
                    }
                    switch (existingStatus) {
                      case 'pending':
                        return (
                          <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400 border border-purple-500/50">
                            Pending review
                          </span>
                        );
                      case 'approved':
                        return (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/50">
                            Approved
                          </span>
                        );
                      case 'applied':
                        return (
                          <span className="px-2 py-0.5 text-xs rounded bg-green-500/20 text-green-400 border border-green-500/50">
                            Applied
                          </span>
                        );
                      case 'rejected':
                        return (
                          <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400 border border-red-500/50">
                            Rejected
                          </span>
                        );
                      default:
                        return null;
                    }
                  };

                  // Row styling based on existing status
                  const getRowStyling = () => {
                    if (selectedTaskIds.has(task.id)) {
                      return 'border-purple-500/50 bg-purple-500/10';
                    }
                    if (existingStatus === 'approved' || existingStatus === 'applied') {
                      return 'border-green-900/30 bg-green-900/10 hover:border-green-800/50';
                    }
                    if (existingStatus === 'pending') {
                      return 'border-purple-900/30 bg-purple-900/10 hover:border-purple-800/50';
                    }
                    return 'border-gray-700 bg-gray-800/50 hover:border-gray-600';
                  };

                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleTaskSelection(task.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${getRowStyling()}`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.has(task.id)}
                          onChange={() => toggleTaskSelection(task.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500"
                        />
                        <span className={`px-2 py-0.5 text-xs rounded border ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        {task.phase && (
                          <span className="px-2 py-0.5 text-xs rounded bg-gray-700 text-gray-300">
                            {task.phase}
                          </span>
                        )}
                        {getExistingStatusBadge()}
                        <span className="text-white font-medium flex-1 truncate">{task.title}</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1 ml-7 line-clamp-1">{task.description}</p>
                      {/* Show preview of existing suggestion if approved/applied */}
                      {(existingStatus === 'approved' || existingStatus === 'applied') && suggestionStatus?.suggestion && (
                        <div className="mt-2 ml-7 p-2 bg-green-900/10 rounded text-xs border border-green-900/30">
                          <span className="text-green-500 font-medium block mb-1">Current AI suggestion:</span>
                          <div className="text-green-300 prose prose-xs max-w-none line-clamp-3">
                            <ReactMarkdown>{suggestionStatus.suggestion.suggestedValue}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary of existing suggestions */}
              <div className="p-3 bg-gray-900/30 rounded text-sm">
                <div className="flex flex-wrap gap-4">
                  <span className="text-gray-400">
                    <span className="text-gray-300 font-semibold">
                      {Array.from(taskSuggestionStatuses.values()).filter(s => !s.hasSuggestion).length}
                    </span> without suggestions
                  </span>
                  <span className="text-gray-400">
                    <span className="text-purple-400 font-semibold">
                      {Array.from(taskSuggestionStatuses.values()).filter(s => s.suggestionStatus === 'pending').length}
                    </span> pending review
                  </span>
                  <span className="text-gray-400">
                    <span className="text-green-400 font-semibold">
                      {Array.from(taskSuggestionStatuses.values()).filter(s => s.suggestionStatus === 'approved' || s.suggestionStatus === 'applied').length}
                    </span> approved/applied
                  </span>
                  <span className="text-gray-400">
                    <span className="text-red-400 font-semibold">
                      {Array.from(taskSuggestionStatuses.values()).filter(s => s.suggestionStatus === 'rejected').length}
                    </span> rejected
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Generating State */}
          {modalState === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="mt-4 text-gray-400">
                Generating context-aware suggestions...
              </p>
              <p className="mt-2 text-lg text-white font-semibold">
                {progress.current} / {progress.total}
              </p>
              <div className="w-64 h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Each suggestion is informed by previous ones for consistency
              </p>
            </div>
          )}

          {/* Reviewing State */}
          {modalState === 'reviewing' && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-400">
                    <span className="text-purple-400 font-semibold">{pendingCount}</span> pending
                  </span>
                  <span className="text-gray-400">
                    <span className="text-green-400 font-semibold">{approvedCount}</span> approved
                  </span>
                  <span className="text-gray-400">
                    <span className="text-red-400 font-semibold">{rejectedCount}</span> rejected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleApproveAll}
                    variant="secondary"
                    className="text-xs px-3 py-1"
                    disabled={pendingCount === 0}
                  >
                    Approve All Pending
                  </Button>
                  <Button
                    onClick={handleRejectAll}
                    variant="secondary"
                    className="text-xs px-3 py-1 text-red-400"
                    disabled={pendingCount === 0}
                  >
                    Reject All Pending
                  </Button>
                </div>
              </div>

              {/* Suggestion List */}
              {suggestionItems.map((item, index) => (
                <Card
                  key={item.task.id}
                  className={`p-3 ${
                    item.status === 'approved' ? 'border-green-500/30' :
                    item.status === 'rejected' ? 'border-red-500/30 opacity-60' :
                    'border-gray-700'
                  }`}
                >
                  {/* Task Header - Collapsible */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-gray-500 text-sm w-5 flex-shrink-0">{index + 1}.</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded border flex-shrink-0 ${getPriorityColor(item.task.priority)}`}>
                        {item.task.priority.charAt(0).toUpperCase()}
                      </span>
                      <span className="text-white font-medium truncate text-sm">{item.task.title}</span>
                      {getStatusBadge(item.status)}
                      {item.suggestion && (
                        <span className={`text-xs flex-shrink-0 ${getConfidenceColor(item.suggestion.confidence)}`}>
                          {item.suggestion.confidence}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Quick approve/reject buttons when collapsed */}
                      {expandedIndex !== index && item.status === 'pending' && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleApproveItem(index); }}
                            className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                            title="Approve"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRejectItem(index); }}
                            className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                            title="Reject"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      <span className="text-gray-400 text-lg w-6 text-center">
                        {expandedIndex === index ? '▼' : '▶'}
                      </span>
                    </div>
                  </div>

                  {/* Collapsed Preview - Shows brief suggestion preview */}
                  {expandedIndex !== index && item.suggestion && (
                    <div className="mt-2 pl-7 text-xs text-gray-400 line-clamp-2">
                      <span className="text-purple-400">AI: </span>
                      {item.editedValue.substring(0, 150)}{item.editedValue.length > 150 ? '...' : ''}
                    </div>
                  )}

                  {/* Expanded Content */}
                  {expandedIndex === index && item.suggestion && (
                    <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                      {/* Current vs Suggested */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-2">Current (Rule-Based)</p>
                          <div className="p-3 bg-gray-800 rounded text-gray-300 text-sm prose prose-compact max-w-none">
                            <ReactMarkdown>{item.suggestion.originalValue}</ReactMarkdown>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-purple-400 uppercase mb-2">AI Suggestion {item.status !== 'pending' && '(Read-only)'}</p>
                          {item.status === 'pending' ? (
                            <textarea
                              value={item.editedValue}
                              onChange={(e) => handleUpdateEditedValue(index, e.target.value)}
                              className="w-full h-40 bg-gray-800 border border-purple-500/30 rounded p-3 text-gray-100 text-sm resize-y focus:border-purple-500 focus:outline-none font-mono"
                              placeholder="Edit the AI suggestion..."
                            />
                          ) : (
                            <div className="p-3 bg-gray-800 rounded text-gray-300 text-sm prose prose-compact max-w-none border border-purple-500/20">
                              <ReactMarkdown>{item.editedValue}</ReactMarkdown>
                            </div>
                          )}
                          {item.editedValue !== item.suggestion.suggestedValue && (
                            <p className="text-xs text-yellow-400 mt-1">Modified from original suggestion</p>
                          )}
                        </div>
                      </div>

                      {/* Preview of formatted suggestion when editing */}
                      {item.status === 'pending' && item.editedValue && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase mb-2">Preview (Formatted)</p>
                          <div className="p-3 bg-gray-900/50 rounded text-gray-300 text-sm prose prose-compact max-w-none border border-gray-700">
                            <ReactMarkdown>{item.editedValue}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      {/* Reasoning */}
                      <div className="p-3 bg-gray-900/50 rounded">
                        <p className="text-xs text-gray-500 uppercase mb-2">AI Reasoning</p>
                        <div className="text-gray-300 text-sm prose prose-compact max-w-none">
                          <ReactMarkdown>{item.suggestion.reasoning}</ReactMarkdown>
                        </div>
                      </div>

                      {/* Actions */}
                      {item.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            onClick={() => handleRejectItem(index)}
                            variant="secondary"
                            className="text-red-400"
                          >
                            Reject
                          </Button>
                          <Button
                            onClick={() => handleApproveItem(index)}
                            variant="primary"
                          >
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* No suggestion message */}
                  {expandedIndex === index && !item.suggestion && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-gray-500 text-sm italic">
                        No suggestion was generated for this task.
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-400">
            {modalState === 'selecting' && (
              <>
                {selectedTaskIds.size} task{selectedTaskIds.size !== 1 ? 's' : ''} selected
              </>
            )}
            {modalState === 'reviewing' && (
              <>
                {approvedCount + rejectedCount} of {suggestionItems.filter(i => i.suggestion).length} reviewed
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="secondary" disabled={modalState === 'saving' || modalState === 'generating'}>
              {modalState === 'reviewing' ? 'Cancel' : 'Close'}
            </Button>
            {/* Generate button for selecting state */}
            {modalState === 'selecting' && (
              <Button
                onClick={handleGenerateSelected}
                variant="primary"
                disabled={selectedTaskIds.size === 0}
              >
                Generate {selectedTaskIds.size} Suggestion{selectedTaskIds.size !== 1 ? 's' : ''}
              </Button>
            )}
            {(modalState === 'reviewing' || modalState === 'saving') && (approvedCount > 0 || rejectedCount > 0) && (
              <Button
                onClick={handleSubmitDecisions}
                variant="primary"
                disabled={modalState === 'saving'}
              >
                {modalState === 'saving' ? (
                  <><Loader className="w-4 h-4 mr-2" /> Saving...</>
                ) : (
                  `Apply ${approvedCount} Approved`
                )}
              </Button>
            )}
          </div>
        </footer>
      </Card>
    </div>
  );
};

export default BatchSuggestionReviewModal;
