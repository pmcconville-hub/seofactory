// components/ui/PrioritySlider.tsx
import React from 'react';

interface PrioritySliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
  min?: number;
  max?: number;
}

export const PrioritySlider: React.FC<PrioritySliderProps> = ({
  label,
  description,
  value,
  onChange,
  color = 'blue',
  min = 0,
  max = 100
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'accent-blue-500',
    green: 'accent-green-500',
    purple: 'accent-purple-500',
    orange: 'accent-orange-500'
  };

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-gray-200">{label}</span>
        <span className="text-sm text-gray-400">{value}%</span>
      </div>
      <input
        type="range"
        role="slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className={`w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer ${colorClasses[color]}`}
      />
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
};

export default PrioritySlider;
