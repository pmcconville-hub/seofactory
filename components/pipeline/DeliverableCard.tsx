import React from 'react';

// ──── Types ────

export interface DeliverableCardProps {
  name: string;
  description: string;
  format: string; // 'ZIP' | 'CSV' | 'JSON' | 'XML' | 'HTML' | 'MD' | 'TXT'
  fileSize?: string; // e.g. "2.4 MB"
  isPrimary?: boolean;
  isReady: boolean;
  onDownload: () => void;
  onPreview?: () => void;
}

// ──── Format badge color mapping ────

const FORMAT_COLOR_MAP: Record<string, string> = {
  ZIP: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CSV: 'bg-green-500/20 text-green-400 border-green-500/30',
  JSON: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  XML: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  HTML: 'bg-red-500/20 text-red-400 border-red-500/30',
  MD: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  TXT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

// ──── Spinner icon ────

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ──── Download icon ────

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

// ──── Preview icon ────

function PreviewIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// ──── Component ────

const DeliverableCard: React.FC<DeliverableCardProps> = ({
  name,
  description,
  format,
  fileSize,
  isPrimary,
  isReady,
  onDownload,
  onPreview,
}) => {
  const formatUpper = format.toUpperCase();
  const badgeClasses = FORMAT_COLOR_MAP[formatUpper] ?? FORMAT_COLOR_MAP.TXT;

  const cardBorder = isPrimary
    ? 'border-blue-600/50 bg-blue-900/10'
    : 'border-gray-700 bg-gray-800/50';

  const hoverBorder = isPrimary
    ? 'hover:border-blue-500/70'
    : 'hover:border-gray-600';

  return (
    <div
      className={`relative rounded-lg p-4 border transition-colors ${cardBorder} ${hoverBorder}`}
    >
      {/* ── Format badge (top-right) ── */}
      <span
        className={`absolute top-3 right-3 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded border ${badgeClasses}`}
      >
        {formatUpper}
      </span>

      {/* ── Primary recommended badge ── */}
      {isPrimary && (
        <span className="inline-block mb-2 text-[10px] font-semibold tracking-wider text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded">
          RECOMMENDED
        </span>
      )}

      {/* ── Name ── */}
      <h4 className="text-sm font-medium text-white pr-16 leading-snug">{name}</h4>

      {/* ── Description ── */}
      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>

      {/* ── File size ── */}
      {fileSize && (
        <span className="inline-block mt-1.5 text-xs text-gray-600">{fileSize}</span>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2 mt-3">
        {isReady ? (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-500 transition-colors"
            >
              <DownloadIcon />
              Download
            </button>

            {onPreview && (
              <button
                type="button"
                onClick={onPreview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
              >
                <PreviewIcon />
                Preview
              </button>
            )}
          </>
        ) : (
          <span className="inline-flex items-center gap-2 text-xs text-gray-400">
            <Spinner />
            Generating...
          </span>
        )}
      </div>
    </div>
  );
};

export default DeliverableCard;
