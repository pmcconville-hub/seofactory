/**
 * Wave Types Module
 *
 * Contains types for wave-based content orchestration in the pipeline.
 * Waves group topics into sequential publishing phases based on strategy
 * (monetization-first, authority-first, or custom ordering).
 *
 * Created: 2026-02-19 - Pipeline wave orchestration
 *
 * @module types/wave
 */

// ============================================================================
// WAVE CONFIGURATION
// ============================================================================

/**
 * Top-level wave configuration for a topical map's publishing plan.
 * The strategy determines how topics are distributed across waves.
 */
export interface WaveConfiguration {
  /** Strategy used to assign topics to waves */
  strategy: 'monetization_first' | 'authority_first' | 'custom';
  /** The ordered list of waves */
  waves: Wave[];
}

// ============================================================================
// WAVE
// ============================================================================

/**
 * A single wave in the publishing plan. Each wave groups related topics
 * that should be published together to maximize topical authority signals.
 */
export interface Wave {
  /** Unique identifier for the wave (e.g., 'wave-1') */
  id: string;
  /** Wave number (1-4) */
  number: 1 | 2 | 3 | 4;
  /** Human-readable wave name (e.g., 'Monetization Hubs') */
  name: string;
  /** Description of the wave's strategic purpose */
  description: string;
  /** IDs of topics assigned to this wave */
  topicIds: string[];
  /** Start week number in the publishing plan */
  weekStart: number;
  /** End week number in the publishing plan */
  weekEnd: number;
  /** Current status of this wave */
  status: 'planning' | 'briefing' | 'drafting' | 'auditing' | 'ready' | 'published';
}

// ============================================================================
// WAVE ASSIGNMENT RESULT
// ============================================================================

/**
 * Result of running the wave assignment algorithm on a set of topics.
 */
export interface WaveAssignmentResult {
  /** The assigned waves with topic IDs populated */
  waves: Wave[];
  /** Topic IDs that could not be assigned to any wave */
  unassigned: string[];
  /** The strategy that was used for assignment */
  strategy: WaveConfiguration['strategy'];
}

// ============================================================================
// WAVE PROGRESS
// ============================================================================

/**
 * Progress tracking for a single wave, used for dashboard display.
 */
export interface WaveProgress {
  /** The wave's unique identifier */
  waveId: string;
  /** Wave number (1-4) */
  waveNumber: number;
  /** Total number of pages/topics in this wave */
  totalPages: number;
  /** Number of pages that have completed all pipeline steps */
  completedPages: number;
  /** Average quality/audit score across completed pages (0-100) */
  averageQualityScore: number;
  /** Current status of this wave */
  status: Wave['status'];
}
