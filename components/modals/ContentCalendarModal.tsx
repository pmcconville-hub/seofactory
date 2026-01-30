
import React, { useMemo } from 'react';
import { ContentCalendarEntry } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ContentCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    entries: ContentCalendarEntry[];
}

const getStatusBadgeColor = (status: ContentCalendarEntry['status']) => {
    switch (status) {
        case 'published':
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'scheduled':
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'draft':
        default:
            return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const ContentCalendarModal: React.FC<ContentCalendarModalProps> = ({ isOpen, onClose, entries }) => {
    // Sort entries by publish date
    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) =>
            new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
        );
    }, [entries]);

    // Group entries by status for summary
    const statusCounts = useMemo(() => {
        return entries.reduce((acc, entry) => {
            acc[entry.status] = (acc[entry.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }, [entries]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Content Calendar"
            description="View and manage your content publication schedule"
            maxWidth="max-w-4xl"
            footer={<Button onClick={onClose} variant="secondary">Close</Button>}
        >
            {entries.length === 0 ? (
                <div className="text-center py-10">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-400">No calendar entries available.</p>
                    <p className="text-gray-500 text-sm mt-2">
                        Generate content briefs and schedule them for publication to see them here.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {/* Status Summary */}
                    <div className="flex gap-4 pb-4 border-b border-gray-700">
                        {statusCounts.draft ? (
                            <span className="text-sm text-gray-400">
                                <span className="font-semibold text-white">{statusCounts.draft}</span> draft
                            </span>
                        ) : null}
                        {statusCounts.scheduled ? (
                            <span className="text-sm text-gray-400">
                                <span className="font-semibold text-blue-400">{statusCounts.scheduled}</span> scheduled
                            </span>
                        ) : null}
                        {statusCounts.published ? (
                            <span className="text-sm text-gray-400">
                                <span className="font-semibold text-green-400">{statusCounts.published}</span> published
                            </span>
                        ) : null}
                    </div>

                    {/* Entries Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-700">
                                    <th className="pb-3 font-medium">Title</th>
                                    <th className="pb-3 font-medium">Publish Date</th>
                                    <th className="pb-3 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {sortedEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 pr-4">
                                            <span className="text-white font-medium">{entry.title}</span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className="text-gray-400 text-sm">
                                                {formatDate(entry.publishDate)}
                                            </span>
                                        </td>
                                        <td className="py-3">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(entry.status)}`}>
                                                {entry.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default ContentCalendarModal;