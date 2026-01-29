// services/brand-replication/config/qualityThresholds.ts

import type { ValidationConfig, WowFactorItem } from '../interfaces';

export const DEFAULT_THRESHOLDS: ValidationConfig['thresholds'] = {
  brandMatch: 85,
  designQuality: 80,
  userExperience: 80,
  overall: 82,
};

export const DEFAULT_WEIGHTS: ValidationConfig['weights'] = {
  brandMatch: 0.30,
  designQuality: 0.35,
  userExperience: 0.35,
};

export const DEFAULT_WOW_FACTOR_CHECKLIST: Omit<WowFactorItem, 'passed' | 'details'>[] = [
  {
    id: 'hero-section',
    label: 'Impactful hero section',
    description: 'Article starts with a visually striking hero or introduction section',
    required: true,
  },
  {
    id: 'multi-column',
    label: 'Multi-column layouts used',
    description: 'At least one section uses 2+ column grid layout for visual variety',
    required: true,
  },
  {
    id: 'attention-elements',
    label: 'Attention-grabbing elements',
    description: 'Contains callouts, statistics highlights, or featured quotes',
    required: false,
  },
  {
    id: 'clear-cta',
    label: 'Clear CTA at conclusion',
    description: 'Article ends with a clear call-to-action relevant to the content',
    required: true,
  },
  {
    id: 'visual-variety',
    label: 'Visual variety throughout',
    description: 'Uses at least 3 different component types across sections',
    required: true,
  },
  {
    id: 'professional-polish',
    label: 'Professional polish',
    description: 'Consistent spacing, transitions, hover states on interactive elements',
    required: true,
  },
];

export const DEFAULT_DISCOVERY_CONFIG = {
  minOccurrences: 2,
  confidenceThreshold: 0.7,
  maxPages: 10,
  viewport: { width: 1400, height: 900 },
  timeout: 30000,
};

export const DEFAULT_CODEGEN_CONFIG = {
  minMatchScore: 85,
  maxIterations: 3,
  cssStandards: {
    useCustomProperties: true,
    spacingScale: [4, 8, 12, 16, 24, 32, 48, 64],
    requireHoverStates: true,
    requireTransitions: true,
    requireResponsive: true,
  },
};

export const DEFAULT_INTELLIGENCE_CONFIG = {
  contextConfig: {
    includePillars: true,
    includeTopicalMap: true,
    includeFullArticle: true,
    includeSurroundingSections: true,
    maxContextTokens: 8000,
  },
};
