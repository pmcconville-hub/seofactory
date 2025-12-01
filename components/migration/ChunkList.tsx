
import React from 'react';
import { ContentChunk } from '../../types';
import { Card } from '../ui/Card';

interface ChunkListProps {
    chunks: ContentChunk[];
}

export const ChunkList: React.FC<ChunkListProps> = ({ chunks }) => {
    
    const handleDragStart = (e: React.DragEvent, chunk: ContentChunk) => {
        // Set plain text for dropping into standard textareas
        e.dataTransfer.setData('text/plain', chunk.content);
        // Set custom data for advanced drops
        e.dataTransfer.setData('application/x-chunk-id', chunk.id);
        e.dataTransfer.effectAllowed = 'copy';
    };

    if (chunks.length === 0) {
        return (
            <div className="p-8 text-center text-gray-500 border-2 border-dashed border-gray-800 rounded-lg">
                No chunks generated.
            </div>
        );
    }

    return (
        <div className="space-y-3 p-1">
            {chunks.map(chunk => (
                <Card 
                    key={chunk.id} 
                    className="p-3 bg-gray-800 border border-gray-700 cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors"
                    draggable
                    onDragStart={(e) => handleDragStart(e, chunk)}
                >
                    <div className="flex justify-between items-start mb-1">
                        {chunk.heading && <h4 className="font-bold text-sm text-white">{chunk.heading}</h4>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${chunk.quality_score > 70 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                            QS: {chunk.quality_score}
                        </span>
                    </div>
                    
                    <p className="text-xs text-gray-400 mb-2 italic line-clamp-2">
                        {chunk.summary}
                    </p>
                    
                    <div className="bg-gray-900/50 p-2 rounded text-xs text-gray-300 font-mono line-clamp-3 border border-gray-800">
                        {chunk.content}
                    </div>

                    {chunk.tags && chunk.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {chunk.tags.map(tag => (
                                <span key={tag} className="text-[9px] bg-blue-900/30 text-blue-300 px-1 rounded">
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </Card>
            ))}
        </div>
    );
};
