
import React, { useState } from 'react';
import { FoundationPage, FoundationPageType } from '../../types';
import { Card } from './Card';
import { Button } from './Button';

interface FoundationPageCardProps {
  page: FoundationPage;
  onEdit: (page: FoundationPage) => void;
  onDelete: (pageId: string) => void;
  onRestore?: (pageId: string) => void;
  isDeleted?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

// Icons for each page type
const PAGE_ICONS: Record<FoundationPageType, string> = {
  homepage: '🏠',
  about: '👥',
  contact: '📧',
  privacy: '🔒',
  terms: '📜',
  author: '✍️'
};

// Labels for each page type
const PAGE_LABELS: Record<FoundationPageType, string> = {
  homepage: 'Homepage',
  about: 'About Us',
  contact: 'Contact',
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  author: 'Author Page'
};

// Status badge component
const StatusBadge: React.FC<{ status: 'complete' | 'incomplete' | 'deleted' }> = ({ status }) => {
  const styles = {
    complete: 'bg-green-500/20 text-green-400 border-green-500/30',
    incomplete: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    deleted: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  const labels = {
    complete: 'Complete',
    incomplete: 'Needs Attention',
    deleted: 'Deleted'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const FoundationPageCard: React.FC<FoundationPageCardProps> = ({
  page,
  onEdit,
  onDelete,
  onRestore,
  isDeleted = false,
  isExpanded = false,
  onToggleExpand
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Determine page completeness
  const getStatus = (): 'complete' | 'incomplete' | 'deleted' => {
    if (isDeleted || page.deleted_at) return 'deleted';

    const hasTitle = Boolean(page.title);
    const hasSlug = Boolean(page.slug);
    const hasMetaDescription = Boolean(page.meta_description);
    const hasH1 = Boolean(page.h1_template);
    const hasSections = page.sections && page.sections.length > 0;

    const isComplete = hasTitle && hasSlug && hasMetaDescription && hasH1 && hasSections;
    return isComplete ? 'complete' : 'incomplete';
  };

  const status = getStatus();
  const icon = PAGE_ICONS[page.page_type];
  const label = PAGE_LABELS[page.page_type];

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(page.id);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  return (
    <Card className={`p-4 ${status === 'deleted' ? 'opacity-60' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">{label}</h3>
            <p className="text-sm text-gray-400">{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-1 text-gray-400 hover:text-white transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
            <p className="text-gray-200">{page.title || <span className="text-gray-500 italic">Not set</span>}</p>
          </div>

          {/* Meta Description */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Meta Description</label>
            <p className="text-gray-200 text-sm">
              {page.meta_description || <span className="text-gray-500 italic">Not set</span>}
            </p>
          </div>

          {/* H1 Template */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">H1 Template</label>
            <p className="text-gray-200">
              {page.h1_template || <span className="text-gray-500 italic">Not set</span>}
            </p>
          </div>

          {/* Schema Type */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Schema Type</label>
            <p className="text-gray-200">
              {page.schema_type || <span className="text-gray-500 italic">Not set</span>}
            </p>
          </div>

          {/* Sections */}
          {page.sections && page.sections.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Sections</label>
              <ul className="mt-1 space-y-1">
                {page.sections.map((section, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className={section.required ? 'text-blue-400' : 'text-gray-400'}>
                      {section.required ? '●' : '○'}
                    </span>
                    <span className="text-gray-200">{section.heading}</span>
                    <span className="text-gray-500 text-xs">- {section.purpose}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-2">
        {status === 'deleted' && onRestore ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRestore(page.id)}
          >
            Restore
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onEdit(page)}
            >
              Edit
            </Button>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-400">Delete?</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <button
                  className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  onClick={handleDelete}
                >
                  Confirm
                </button>
              </div>
            ) : (
              <button
                className="px-3 py-1.5 text-sm font-semibold rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
