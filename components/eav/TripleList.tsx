
import React from 'react';
import { SemanticTriple } from '../../types';
import { TripleEditRow } from './TripleEditRow';

interface TripleListProps {
    triples: SemanticTriple[];
    onChange: (updatedTriples: SemanticTriple[]) => void;
}

export const TripleList: React.FC<TripleListProps> = ({ triples, onChange }) => {
    
    const handleRowChange = (index: number, updatedTriple: SemanticTriple) => {
        const newTriples = [...triples];
        newTriples[index] = updatedTriple;
        onChange(newTriples);
    };

    const handleDelete = (index: number) => {
        const newTriples = triples.filter((_, i) => i !== index);
        onChange(newTriples);
    };

    // Optional: Sort by Category or Importance?
    // For now, keep original order to prevent UI jumping.

    return (
        <div className="space-y-2">
            {triples.length === 0 ? (
                 <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg text-gray-500">
                    No Semantic Triples defined yet. <br/>
                    Use the "Add New" form or "Expand with AI" to get started.
                </div>
            ) : (
                triples.map((triple, index) => (
                    <TripleEditRow 
                        key={index} // Ideally use a stable ID if available, index is fallback
                        triple={triple}
                        onChange={(updated) => handleRowChange(index, updated)}
                        onDelete={() => handleDelete(index)}
                    />
                ))
            )}
        </div>
    );
};
