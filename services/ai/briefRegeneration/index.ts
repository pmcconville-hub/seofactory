// services/ai/briefRegeneration/index.ts
// Multi-pass content brief regeneration system
// Handles large briefs safely by processing in chunks with progress tracking

import { BusinessInfo, ContentBrief, EnrichedTopic, SEOPillars, BriefSection } from '../../../types';
import { AppAction } from '../../../state/appState';
import React from 'react';

export interface RegenerationProgress {
  currentPass: number;
  totalPasses: number;
  passName: string;
  passDescription: string;
  sectionsProcessed: number;
  totalSections: number;
  percentComplete: number;
}

export interface RegenerationResult {
  success: boolean;
  brief: ContentBrief | null;
  error?: string;
}

export type ProgressCallback = (progress: RegenerationProgress) => void;

export { regenerateBriefMultiPass } from './orchestrator';
