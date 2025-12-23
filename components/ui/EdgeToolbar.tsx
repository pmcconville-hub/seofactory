/**
 * EdgeToolbar
 *
 * Compact right-edge toolbar that slides out on hover.
 * Houses utility buttons (logs, help, settings) and Ask Strategist.
 * Minimizes interference with main content while remaining accessible.
 */

import React, { useState } from 'react';

interface ToolbarItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  highlight?: boolean; // For featured items like Ask Strategist
  badge?: string | number;
  disabled?: boolean;
}

interface EdgeToolbarProps {
  items: ToolbarItem[];
}

const EdgeToolbar: React.FC<EdgeToolbarProps> = ({ items }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className="fixed right-0 bottom-20 z-50 flex flex-col gap-2"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          disabled={item.disabled}
          className={`
            flex items-center gap-2 h-10 transition-all duration-200 ease-out
            rounded-l-lg shadow-lg border-l border-t border-b
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isExpanded ? 'w-40 px-3' : 'w-10 px-2'}
            ${item.highlight
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-blue-500/50'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700'
            }
          `}
          title={item.label}
        >
          <span className={`w-5 h-5 flex-shrink-0 ${item.highlight ? 'text-white' : 'text-gray-400'}`}>
            {item.icon}
          </span>
          <span
            className={`
              text-sm font-medium whitespace-nowrap overflow-hidden
              transition-all duration-200
              ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'}
            `}
          >
            {item.label}
          </span>
          {item.badge && isExpanded && (
            <span className="ml-auto px-1.5 py-0.5 text-xs rounded-full bg-blue-500/30 text-blue-300">
              {item.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

/**
 * Predefined icons for toolbar items
 */
export const ToolbarIcons = {
  logs: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  help: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  strategist: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
};

export default EdgeToolbar;
