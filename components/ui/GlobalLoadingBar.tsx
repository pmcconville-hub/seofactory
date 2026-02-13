import React from 'react';
import { useAppState } from '../../state/appState';

const GlobalLoadingBar: React.FC = () => {
  const { state } = useAppState();

  const isLoading = Object.values(state.isLoading).some(Boolean);

  if (!isLoading) return null;

  // Find the most recent active loading context
  const activeContext = Object.entries(state.loadingContext).find(
    ([key]) => state.isLoading[key]
  );
  const contextText = activeContext?.[1];

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-blue-500 animate-pulse"></div>
      {contextText && (
        <div className="bg-gray-900/90 backdrop-blur-sm text-gray-300 text-xs px-4 py-1 text-center">
          {contextText}
        </div>
      )}
    </div>
  );
};

export default GlobalLoadingBar;
