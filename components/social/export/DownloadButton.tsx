/**
 * DownloadButton Component
 *
 * Button to download social post or campaign as file.
 */

import React, { useState, useCallback } from 'react';
import type { ExportFormat } from '../../../types/social';

interface DownloadButtonProps {
  content: string | Blob;
  filename: string;
  mimeType?: string;
  format?: ExportFormat;
  variant?: 'button' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  onDownload?: () => void;
}

const FORMAT_ICONS: Record<ExportFormat, string> = {
  clipboard: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2',
  json: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  txt: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  zip: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'
};

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  content,
  filename,
  mimeType = 'text/plain',
  format,
  variant = 'button',
  size = 'md',
  label,
  onDownload
}) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = useCallback(() => {
    setDownloading(true);

    try {
      const blob = content instanceof Blob
        ? content
        : new Blob([content], { type: mimeType });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onDownload?.();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setTimeout(() => setDownloading(false), 500);
    }
  }, [content, filename, mimeType, onDownload]);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const icon = format ? FORMAT_ICONS[format] : FORMAT_ICONS.txt;
  const displayLabel = label || `Download .${filename.split('.').pop()}`;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className={`p-1.5 rounded transition-colors ${
          downloading
            ? 'text-blue-400 bg-blue-500/10'
            : 'text-gray-400 hover:text-white hover:bg-gray-700'
        }`}
        title={displayLabel}
      >
        {downloading ? (
          <svg className={`${iconSizes[size]} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={downloading}
      className={`inline-flex items-center ${sizeClasses[size]} rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50`}
    >
      {downloading ? (
        <>
          <svg className={`${iconSizes[size]} animate-spin`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Downloading...
        </>
      ) : (
        <>
          <svg className={iconSizes[size]} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {displayLabel}
        </>
      )}
    </button>
  );
};

/**
 * Format selector for downloads
 */
interface DownloadFormatSelectorProps {
  availableFormats: ExportFormat[];
  selectedFormat: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

export const DownloadFormatSelector: React.FC<DownloadFormatSelectorProps> = ({
  availableFormats,
  selectedFormat,
  onChange
}) => {
  const formatLabels: Record<ExportFormat, string> = {
    clipboard: 'Clipboard',
    json: 'JSON',
    txt: 'Text/Markdown',
    zip: 'ZIP Package'
  };

  return (
    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
      {availableFormats.map(format => (
        <button
          key={format}
          type="button"
          onClick={() => onChange(format)}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            selectedFormat === format
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
        >
          {formatLabels[format]}
        </button>
      ))}
    </div>
  );
};

export default DownloadButton;
