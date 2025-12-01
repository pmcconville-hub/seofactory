

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop
}) => {
  return (
    <div
      className={`bg-gray-800/50 border border-gray-700 rounded-xl shadow-lg backdrop-blur-sm ${className}`}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
};