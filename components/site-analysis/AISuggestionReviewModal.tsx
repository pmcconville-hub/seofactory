// components/site-analysis/AISuggestionReviewModal.tsx
// Modal for reviewing, editing, and approving AI-generated task suggestions

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Loader } from '../ui/Loader';
import { AuditTask, AISuggestion, SitePageRecord, SiteAnalysisProject, BusinessInfo } from '../../types';
import { AppAction } from '../../state/appState';
import { getSupabaseClient } from '../../services/supabaseClient';
import {
  generateSuggestionForTask,
  getSuggestionForTask,
  approveSuggestion,
  rejectSuggestion,
  applySuggestionToTask,
} from '../../services/aiSuggestionService';

interface AISuggestionReviewModalProps {
  isOpen: boolean;
  task: AuditTask | null;
  page: SitePageRecord | null;
  project: SiteAnalysisProject;
  businessInfo: BusinessInfo;
  dispatch: React.Dispatch<AppAction>;
  onClose: () => void;
  onTaskUpdated?: (taskId: string, newRemediation: string) => void;
}

type ModalState = 'idle' | 'loading' | 'generating' | 'reviewing' | 'saving' | 'error';

const AISuggestionReviewModal: React.FC<AISuggestionReviewModalProps> = ({
  isOpen,
  task,
  page,
  project,
  businessInfo,
  dispatch,
  onClose,
  onTaskUpdated,
}) => {
  const [modalState, setModalState] = useState<ModalState>('idle');
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [editedValue, setEditedValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Load existing suggestion or reset on modal open
  useEffect(() => {
    if (isOpen && task) {
      loadExistingSuggestion();
    } else {
      // Reset state when modal closes
      setSuggestion(null);
      setEditedValue('');
      setError(null);
      setModalState('idle');
      setShowRejectInput(false);
      setRejectReason('');
    }
  }, [isOpen, task?.id]);

  const loadExistingSuggestion = async () => {
    if (!task) return;

    setModalState('loading');
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const existing = await getSuggestionForTask(supabase, task.id);

      if (existing && existing.status === 'pending') {
        setSuggestion(existing);
        setEditedValue(existing.suggestedValue);
        setModalState('reviewing');
      } else {
        // No existing suggestion, go to idle state
        setModalState('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestion');
      setModalState('error');
    }
  };

  const handleGenerateSuggestion = async () => {
    if (!task) return;

    setModalState('generating');
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      const newSuggestion = await generateSuggestionForTask(
        supabase,
        task,
        page,
        project,
        businessInfo,
        dispatch
      );

      setSuggestion(newSuggestion);
      setEditedValue(newSuggestion.suggestedValue);
      setModalState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion');
      setModalState('error');
    }
  };

  const handleApprove = async () => {
    if (!suggestion || !task) return;

    setModalState('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);

      // Check if user modified the suggestion
      const wasModified = editedValue !== suggestion.suggestedValue;
      const finalValue = editedValue;

      // Approve the suggestion
      await approveSuggestion(supabase, suggestion.id, wasModified ? finalValue : undefined);

      // Apply to task
      await applySuggestionToTask(supabase, suggestion.id);

      // Notify parent
      onTaskUpdated?.(task.id, finalValue);

      dispatch({
        type: 'SET_NOTIFICATION',
        payload: 'AI suggestion approved and applied to task.',
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve suggestion');
      setModalState('reviewing');
    }
  };

  const handleReject = async () => {
    if (!suggestion) return;

    if (!showRejectInput) {
      setShowRejectInput(true);
      return;
    }

    setModalState('saving');
    setError(null);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      await rejectSuggestion(supabase, suggestion.id, rejectReason || undefined);

      dispatch({
        type: 'SET_NOTIFICATION',
        payload: 'AI suggestion rejected.',
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestion');
      setModalState('reviewing');
    }
  };

  const handleRegenerate = async () => {
    if (!suggestion) return;

    // Delete current and regenerate
    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      await rejectSuggestion(supabase, suggestion.id, 'User requested regeneration');
    } catch {
      // Ignore delete error, proceed with regeneration
    }

    await handleGenerateSuggestion();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 80) return 'High';
    if (confidence >= 50) return 'Medium';
    return 'Low';
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

  if (!isOpen || !task) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">AI Suggestion Review</h2>
            <p className="text-sm text-gray-400 truncate max-w-lg">{task.title}</p>
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
          {/* Task Info Bar */}
          <div className="flex items-center gap-3 mb-6">
            <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}>
              {task.priority.toUpperCase()}
            </span>
            {task.phase && (
              <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
                {task.phase}
              </span>
            )}
            {suggestion && (
              <span className={`px-2 py-1 text-xs rounded bg-gray-700 ${getConfidenceColor(suggestion.confidence)}`}>
                Confidence: {suggestion.confidence}% ({getConfidenceLabel(suggestion.confidence)})
              </span>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {(modalState === 'loading' || modalState === 'generating') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader />
              <p className="mt-4 text-gray-400">
                {modalState === 'generating' ? 'Generating AI suggestion...' : 'Loading...'}
              </p>
            </div>
          )}

          {/* Idle State - No suggestion yet */}
          {modalState === 'idle' && (
            <div className="space-y-6">
              <Card className="p-4 bg-gray-900/50">
                <h3 className="font-semibold text-lg text-blue-300 mb-2">Issue Details</h3>
                <p className="text-gray-300 mb-2">{task.description}</p>
                <div className="mt-3 p-3 bg-gray-800 rounded">
                  <p className="text-xs text-gray-500 uppercase mb-1">Current Remediation (Rule-Based)</p>
                  <p className="text-gray-200">{task.remediation}</p>
                </div>
              </Card>

              <div className="flex justify-center">
                <Button onClick={handleGenerateSuggestion} variant="primary" className="px-6 py-3">
                  🤖 Generate AI Suggestion
                </Button>
              </div>
            </div>
          )}

          {/* Review State - Suggestion available */}
          {modalState === 'reviewing' && suggestion && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Current State */}
              <div className="space-y-4">
                <Card className="p-4 bg-gray-900/50">
                  <h3 className="font-semibold text-lg text-gray-400 mb-2">Current (Rule-Based)</h3>
                  <p className="text-gray-200 whitespace-pre-wrap">{suggestion.originalValue}</p>
                </Card>

                <Card className="p-4 bg-gray-900/50">
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">Why This Failed</h3>
                  <p className="text-gray-300 text-sm">{task.description}</p>
                </Card>
              </div>

              {/* Right Column - AI Suggestion */}
              <div className="space-y-4">
                <Card className="p-4 bg-purple-900/20 border border-purple-500/30">
                  <h3 className="font-semibold text-lg text-purple-300 mb-2">AI Suggestion</h3>
                  <textarea
                    value={editedValue}
                    onChange={(e) => setEditedValue(e.target.value)}
                    className="w-full h-40 bg-gray-800 border border-gray-600 rounded p-3 text-gray-100 text-sm resize-none focus:border-purple-500 focus:outline-none"
                    placeholder="Edit the suggestion..."
                  />
                  {editedValue !== suggestion.suggestedValue && (
                    <p className="text-xs text-yellow-400 mt-1">
                      ✏️ You've modified this suggestion
                    </p>
                  )}
                </Card>

                <Card className="p-4 bg-gray-900/50">
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">AI Reasoning</h3>
                  <p className="text-gray-300 text-sm">{suggestion.reasoning}</p>
                </Card>
              </div>
            </div>
          )}

          {/* Reject Input */}
          {showRejectInput && (
            <div className="mt-4 p-4 bg-gray-900/50 rounded border border-gray-700">
              <label className="block text-sm text-gray-400 mb-2">
                Reason for rejection (optional)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-20 bg-gray-800 border border-gray-600 rounded p-2 text-gray-100 text-sm resize-none focus:border-red-500 focus:outline-none"
                placeholder="Why doesn't this suggestion work?"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-gray-800 p-4 border-t border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex gap-2">
            {(modalState === 'reviewing' || modalState === 'saving') && (
              <>
                <Button
                  onClick={handleRegenerate}
                  variant="secondary"
                  disabled={modalState === 'saving'}
                >
                  🔄 Regenerate
                </Button>
                <Button
                  onClick={handleReject}
                  variant="secondary"
                  className="text-red-400 hover:text-red-300"
                  disabled={modalState === 'saving'}
                >
                  ✗ Reject
                </Button>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={onClose} variant="secondary" disabled={modalState === 'saving'}>
              Cancel
            </Button>
            {(modalState === 'reviewing' || modalState === 'saving') && (
              <Button
                onClick={handleApprove}
                variant="primary"
                disabled={modalState === 'saving' || !editedValue.trim()}
              >
                {modalState === 'saving' ? (
                  <>
                    <Loader className="w-4 h-4 mr-2" /> Saving...
                  </>
                ) : (
                  '✓ Approve & Apply'
                )}
              </Button>
            )}
          </div>
        </footer>
      </Card>
    </div>
  );
};

export default AISuggestionReviewModal;
