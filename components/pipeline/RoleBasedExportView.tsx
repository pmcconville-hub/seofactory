import React from 'react';
import DeliverableCard from './DeliverableCard';

// ──── Types ────

export type ExportRole = 'seo' | 'business' | 'content' | 'developer';

interface RoleBasedExportViewProps {
  activeRole: ExportRole;
  onRoleChange: (role: ExportRole) => void;
  onDownload: (deliverableId: string) => void;
  deliverables: Array<{
    id: string;
    name: string;
    description: string;
    format: string;
    roles: ExportRole[];
    isReady: boolean;
    isPrimary?: boolean;
    fileSize?: string;
    onPreview?: () => void;
  }>;
}

// ──── Role tab definitions ────

interface RoleTab {
  key: ExportRole;
  label: string;
  description: string;
}

const ROLE_TABS: RoleTab[] = [
  { key: 'seo', label: 'SEO', description: 'All deliverables' },
  { key: 'business', label: 'Business', description: 'Strategy & KPIs' },
  { key: 'content', label: 'Content', description: 'Briefs & Calendar' },
  { key: 'developer', label: 'Developer', description: 'Tech Spec & Schemas' },
];

// ──── Empty state ────

function EmptyState({ role }: { role: ExportRole }) {
  const roleLabel = ROLE_TABS.find((t) => t.key === role)?.label ?? role;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-10 h-10 text-gray-600 mb-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V7.5m0 0H9.75m2.25 0h2.25"
        />
      </svg>
      <p className="text-sm text-gray-500">
        No deliverables available for the{' '}
        <span className="text-gray-400 font-medium">{roleLabel}</span> role.
      </p>
    </div>
  );
}

// ──── Component ────

const RoleBasedExportView: React.FC<RoleBasedExportViewProps> = ({
  activeRole,
  onRoleChange,
  onDownload,
  deliverables,
}) => {
  // SEO role sees everything; other roles filter by inclusion in roles array
  const filtered =
    activeRole === 'seo'
      ? deliverables
      : deliverables.filter((d) => d.roles.includes(activeRole));

  return (
    <div>
      {/* ── Role tabs ── */}
      <div className="flex items-center gap-0 border-b border-gray-700 mb-5">
        {ROLE_TABS.map((tab) => {
          const isActive = tab.key === activeRole;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onRoleChange(tab.key)}
              className={`
                relative px-4 py-2.5 text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }
              `}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-[11px] font-normal ${
                  isActive ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {tab.description}
              </span>

              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-t" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Deliverable grid / empty state ── */}
      {filtered.length === 0 ? (
        <EmptyState role={activeRole} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <DeliverableCard
              key={d.id}
              name={d.name}
              description={d.description}
              format={d.format}
              fileSize={d.fileSize}
              isPrimary={d.isPrimary}
              isReady={d.isReady}
              onDownload={() => onDownload(d.id)}
              onPreview={d.onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RoleBasedExportView;
