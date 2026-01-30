// components/modals/drafting/DraftingContext.tsx
// Shared context for DraftingModal modules

import { createContext, useContext, useRef, MutableRefObject } from 'react';
import { ContentBrief, BusinessInfo, EnrichedTopic, ImagePlaceholder, TopicalMap } from '../../../types';
import { AppAction } from '../../../state/appState';

// Database job info structure
export interface DatabaseJobInfo {
  updatedAt: string;
  auditScore: number | null;
  passesCompleted: number;
  sectionCount: number;
  jobStatus: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentPass: number;
  jobId: string;
  passesStatus: Record<string, string>;
  contentSource?: string;
  schemaData?: any;
  structuralSnapshots?: Record<string, any>;
  passQualityScores?: Record<string, number>;
  qualityWarning?: string | null;
  auditDetails?: { algorithmicResults?: Array<{ ruleName: string; isPassing: boolean; details: string }> };
  imagePlaceholders?: ImagePlaceholder[];
}

// Version history entry
export interface DraftVersion {
  version: number;
  content: string;
  saved_at: string;
  char_count: number;
}

// Override settings for AI model
export interface OverrideSettings {
  provider: string;
  model: string;
}

// Shared context value interface
export interface DraftingContextValue {
  // Brief and content
  brief: ContentBrief | null;
  draftContent: string;
  setDraftContent: (value: string) => void;
  draftContentRef: MutableRefObject<string>;

  // Unsaved changes tracking
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;

  // Loading states
  isLoadingDraft: boolean;
  setIsLoadingDraft: (value: boolean) => void;
  isSaving: boolean;
  setIsSaving: (value: boolean) => void;

  // Version history
  draftHistory: DraftVersion[];
  setDraftHistory: (value: DraftVersion[]) => void;

  // Database sync
  databaseDraft: string | null;
  setDatabaseDraft: (value: string | null) => void;
  databaseJobInfo: DatabaseJobInfo | null;
  setDatabaseJobInfo: (value: DatabaseJobInfo | null) => void;
  isSyncing: boolean;
  setIsSyncing: (value: boolean) => void;

  // Refs for tracking loaded content
  loadedBriefIdRef: MutableRefObject<string | null>;
  loadedDraftLengthRef: MutableRefObject<number>;
  loadedAtRef: MutableRefObject<string | null>;

  // Image placeholders
  imagePlaceholders: ImagePlaceholder[];

  // Business context
  businessInfo: BusinessInfo;
  activeMapId: string | null;
  activeMap: TopicalMap | undefined;
  activeBriefTopic: EnrichedTopic | null;
  userId: string | undefined;

  // Model override
  overrideSettings: OverrideSettings | null;
  setOverrideSettings: (value: OverrideSettings | null) => void;

  // Tab state
  activeTab: 'edit' | 'preview' | 'images' | 'quality' | 'debug';
  setActiveTab: (value: 'edit' | 'preview' | 'images' | 'quality' | 'debug') => void;

  // Dispatch for global state updates
  dispatch: React.Dispatch<AppAction>;

  // Feature gate
  canGenerateContent: boolean;
  featureReason: string | null;
}

// Create context with undefined default (must be used within provider)
const DraftingContext = createContext<DraftingContextValue | undefined>(undefined);

// Custom hook for consuming context
export function useDraftingContext(): DraftingContextValue {
  const context = useContext(DraftingContext);
  if (context === undefined) {
    throw new Error('useDraftingContext must be used within a DraftingProvider');
  }
  return context;
}

// Export provider component
export const DraftingProvider = DraftingContext.Provider;

export default DraftingContext;
