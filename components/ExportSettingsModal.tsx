// components/ExportSettingsModal.tsx
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

export interface ExportSettings {
  // Content inclusion
  includeBriefJsonFiles: boolean;      // Full brief data as JSON
  includeArticleDrafts: boolean;       // Markdown draft files
  includeSchemas: boolean;             // Generated JSON-LD schemas
  includeAuditResults: boolean;        // Audit scores and details

  // Display options
  compactBriefsView: boolean;          // Metadata only vs full
  includeEavMatrix: boolean;           // Semantic triples matrix

  // Export type
  exportFormat: 'xlsx' | 'zip';        // Excel only or full ZIP
}

interface ExportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (settings: ExportSettings) => void;
  hasSchemas: boolean;
  hasAuditResults: boolean;
}

export const ExportSettingsModal: React.FC<ExportSettingsModalProps> = ({
  isOpen,
  onClose,
  onExport,
  hasSchemas,
  hasAuditResults
}) => {
  const [settings, setSettings] = useState<ExportSettings>({
    includeBriefJsonFiles: true,
    includeArticleDrafts: true,
    includeSchemas: false,
    includeAuditResults: false,
    compactBriefsView: false,
    includeEavMatrix: true,
    exportFormat: 'zip'
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <header className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white">Export Settings</h2>
        </header>

        <div className="p-4 space-y-6">
          {/* Content to Include */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              CONTENT TO INCLUDE
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeBriefJsonFiles}
                  onChange={(e) => setSettings(s => ({ ...s, includeBriefJsonFiles: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include full brief JSON files
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeArticleDrafts}
                  onChange={(e) => setSettings(s => ({ ...s, includeArticleDrafts: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include article drafts (Markdown)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeSchemas}
                  onChange={(e) => setSettings(s => ({ ...s, includeSchemas: e.target.checked }))}
                  disabled={!hasSchemas}
                  className="rounded border-gray-600 disabled:opacity-50"
                />
                Include generated schemas
                {!hasSchemas && <span className="text-gray-600">(none available)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeAuditResults}
                  onChange={(e) => setSettings(s => ({ ...s, includeAuditResults: e.target.checked }))}
                  disabled={!hasAuditResults}
                  className="rounded border-gray-600 disabled:opacity-50"
                />
                Include audit results
                {!hasAuditResults && <span className="text-gray-600">(none available)</span>}
              </label>
            </div>
          </div>

          {/* Display Options */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              DISPLAY OPTIONS
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.compactBriefsView}
                  onChange={(e) => setSettings(s => ({ ...s, compactBriefsView: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Compact briefs view (metadata only)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="checkbox"
                  checked={settings.includeEavMatrix}
                  onChange={(e) => setSettings(s => ({ ...s, includeEavMatrix: e.target.checked }))}
                  className="rounded border-gray-600"
                />
                Include EAV/Semantic triples matrix
              </label>
            </div>
          </div>

          {/* Export Format */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              EXPORT FORMAT
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="radio"
                  name="format"
                  checked={settings.exportFormat === 'xlsx'}
                  onChange={() => setSettings(s => ({ ...s, exportFormat: 'xlsx' }))}
                  className="border-gray-600"
                />
                Excel Workbook (.xlsx)
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-400">
                <input
                  type="radio"
                  name="format"
                  checked={settings.exportFormat === 'zip'}
                  onChange={() => setSettings(s => ({ ...s, exportFormat: 'zip' }))}
                  className="border-gray-600"
                />
                Full Package (.zip) - includes separate files for large content
              </label>
            </div>
          </div>
        </div>

        <footer className="p-4 border-t border-gray-700 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onExport(settings)}>Export</Button>
        </footer>
      </Card>
    </div>
  );
};
