
import React, { useMemo } from 'react';
import { SiteInventoryItem } from '../../types';
import { GraphVisualization, GraphNode, GraphEdge } from '../ui/GraphVisualization';

interface InventoryGraphViewProps {
    inventory: SiteInventoryItem[];
}

export const InventoryGraphView: React.FC<InventoryGraphViewProps> = ({ inventory }) => {
    const { nodes, edges } = useMemo(() => {
        const nodes: GraphNode[] = inventory.map(item => {
            // Visual Logic Mapping for CoR (Cost of Retrieval)
            // Low Score (<30) -> Efficient -> Green (Mapped to 'core' + 'hasBrief')
            // Medium Score (30-70) -> Average -> Purple (Mapped to 'outer' + 'hasBrief')
            // High Score (>70) -> Expensive -> Gray/Red Border (Mapped to 'outer' + 'isOrphan')
            
            const cor = item.cor_score || 0;
            let type: 'core' | 'outer' = 'outer';
            let hasBrief = false;
            let isOrphan = false;

            if (cor < 30) {
                type = 'core';
                hasBrief = true;
            } else if (cor < 70) {
                type = 'outer';
                hasBrief = true;
            } else {
                type = 'outer';
                hasBrief = false;
                isOrphan = true; // Red border effect
            }

            return {
                id: item.id,
                label: item.url.split('/').pop() || item.url, // Simple label
                type,
                hasBrief,
                isOrphan,
                x: Math.random() * 800,
                y: Math.random() * 600,
            };
        });
        
        // Future: If we scrape internal links, we can populate edges here.
        const edges: GraphEdge[] = []; 
        
        return { nodes, edges };
    }, [inventory]);

    return (
        <div className="h-full w-full bg-gray-900/30 border border-gray-700 rounded-lg overflow-hidden relative">
            <div className="absolute top-2 left-2 z-10 bg-gray-800/80 p-2 rounded border border-gray-700 text-xs text-gray-300">
                <div className="font-bold mb-1">CoR Visualization</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> Low Cost (Efficient)</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Medium Cost</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full border border-red-500 bg-gray-700"></span> High Cost (Expensive)</div>
            </div>
             <GraphVisualization 
                nodes={nodes} 
                edges={edges} 
            />
        </div>
    );
};
