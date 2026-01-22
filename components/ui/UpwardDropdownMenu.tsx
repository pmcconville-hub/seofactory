import React, { useRef, useEffect, useState } from 'react';
import { Button } from './Button';

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string | number;
  divider?: boolean;
}

interface UpwardDropdownMenuProps {
  trigger: {
    label: string;
    icon?: string;
    disabled?: boolean;
    title?: string;
    className?: string;
  };
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
}

const UpwardDropdownMenu: React.FC<UpwardDropdownMenuProps> = ({
  trigger,
  items,
  align = 'left'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        disabled={trigger.disabled}
        variant="secondary"
        className={trigger.className || "text-xs py-0.5 px-2"}
        title={trigger.title}
      >
        {trigger.icon && <span className="mr-1">{trigger.icon}</span>}
        {trigger.label} ▾
      </Button>

      {isOpen && (
        <div
          className={`absolute bottom-full mb-2 ${align === 'right' ? 'right-0' : 'left-0'} bg-gray-800 border border-gray-600 rounded shadow-xl z-50 min-w-[180px]`}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.divider && index > 0 && (
                <div className="border-t border-gray-700" />
              )}
              <button
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 ${
                  item.disabled
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-gray-200 hover:bg-gray-700'
                }`}
              >
                {item.icon && <span>{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-gray-600 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpwardDropdownMenu;
