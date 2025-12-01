import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { SiteInventoryItem, EnrichedTopic } from '../../types';
import { generateRedirectMap, generatePruneList } from '../../utils/migrationExportUtils';

interface ExportPanelProps {
    inventory: SiteInventoryItem[];
    topics: EnrichedTopic[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ inventory, topics }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleExport = (type: 'csv' | 'htaccess' | 'nginx' | 'prune') => {
        if (type === 'prune') {
            generatePruneList(inventory);
        } else {
            generateRedirectMap(inventory, topics, type);
        }
        setIsOpen(false);
    };

    return (
        <div className="relative inline-block text-left">
            <Button 
                variant="secondary" 
                onClick={() => setIsOpen(!isOpen)}
                className="text-xs py-2 flex items-center gap-2"
            >
                <span>📤 Export Plan</span>
            </Button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 border border-gray-700 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu">
                        <button
                            onClick={() => handleExport('csv')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirect Map (CSV)
                        </button>
                        <button
                            onClick={() => handleExport('htaccess')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirects (.htaccess)
                        </button>
                        <button
                            onClick={() => handleExport('nginx')}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                            role="menuitem"
                        >
                            Redirects (Nginx)
                        </button>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                            onClick={() => handleExport('prune')}
                            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
                            role="menuitem"
                        >
                            Prune List (410)
                        </button>
                    </div>
                </div>
            )}
             {/* Click outside to close overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                ></div>
            )}
        </div>
    );
};