import React from 'react';
import { CoreEntities } from '../../types';

interface CoreEntityBoxesProps {
  entities: CoreEntities;
  className?: string;
}

export const CoreEntityBoxes: React.FC<CoreEntityBoxesProps> = ({ entities, className = '' }) => {
  const boxes = [
    { label: 'Central Entity (Subject)', value: entities.centralEntity },
    { label: 'Detected User Intent', value: entities.searchIntent },
    { label: 'Detected Source Context', value: entities.detectedSourceContext },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {boxes.map((box, index) => (
        <div
          key={index}
          className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-4"
        >
          <div className="text-xs text-sky-400 uppercase tracking-wide mb-1">
            {box.label}
          </div>
          <div className="font-semibold text-white text-lg">
            {box.value || 'Not detected'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CoreEntityBoxes;
