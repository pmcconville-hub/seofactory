/**
 * useBrandReplicationPipeline Hook
 *
 * Manages the Brand Replication Pipeline state within the StylePublishModal.
 * Provides methods to run individual phases and access outputs.
 * Includes abort/cancel functionality and actionable error messages.
 *
 * @module hooks/useBrandReplicationPipeline
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  BrandReplicationPipeline,
  type PipelineConfig,
  type PipelineStatus,
  type DiscoveryInput,
  type DiscoveryOutput,
  type CodeGenInput,
  type CodeGenOutput,
  type IntelligenceInput,
  type IntelligenceOutput,
  type ValidationInput,
  type ValidationOutput,
} from '../services/brand-replication';
import type { DesignDNA } from '../types/designDna';

// ============================================================================
// Types
// ============================================================================

export interface PipelineState {
  // Phase outputs
  discoveryOutput: DiscoveryOutput | null;
  codeGenOutput: CodeGenOutput | null;
  intelligenceOutput: IntelligenceOutput | null;
  validationOutput: ValidationOutput | null;
  // Status
  status: PipelineStatus;
  isRunning: boolean;
  isCancelling: boolean;
  currentPhase: string | null;
  error: PipelineError | null;
  // Timing
  startTime: Date | null;
}

export interface PipelineError {
  message: string;
  phase: string;
  code: ErrorCode;
  suggestion: string;
  details?: string;
  recoverable: boolean;
}

export type ErrorCode =
  | 'PIPELINE_NOT_INITIALIZED'
  | 'MISSING_API_KEY'
  | 'PREVIOUS_PHASE_REQUIRED'
  | 'NETWORK_ERROR'
  | 'AI_RESPONSE_ERROR'
  | 'TIMEOUT_ERROR'
  | 'CANCELLED'
  | 'VALIDATION_FAILED'
  | 'SCREENSHOT_ERROR'
  | 'UNKNOWN_ERROR';

export interface UseBrandReplicationPipelineProps {
  aiProvider: 'anthropic' | 'gemini';
  apiKey: string;
  model?: string;
  enabled?: boolean;
}

export interface UseBrandReplicationPipelineReturn {
  // State
  state: PipelineState;
  pipeline: BrandReplicationPipeline | null;

  // Phase runners
  runDiscovery: (input: DiscoveryInput) => Promise<DiscoveryOutput | null>;
  runCodeGen: (discoveryOutput: DiscoveryOutput, designDna: DesignDNA) => Promise<CodeGenOutput | null>;
  runIntelligence: (input: Omit<IntelligenceInput, 'brandId' | 'componentLibrary'>) => Promise<IntelligenceOutput | null>;
  runValidation: (renderedHtml: string) => Promise<ValidationOutput | null>;

  // Full pipeline run
  runFullPipeline: (
    brandUrl: string,
    brandId: string,
    designDna: DesignDNA,
    contentContext: IntelligenceInput['contentContext'],
    renderedHtml: string
  ) => Promise<ValidationOutput | null>;

  // Utilities
  reset: () => void;
  cancel: () => void;
  getStatus: () => PipelineStatus;
  clearError: () => void;
}

// ============================================================================
// Error Helpers
// ============================================================================

const ERROR_MESSAGES: Record<ErrorCode, { message: string; suggestion: string }> = {
  PIPELINE_NOT_INITIALIZED: {
    message: 'Pipeline not initialized',
    suggestion: 'Check that an API key is configured in Settings > API Keys',
  },
  MISSING_API_KEY: {
    message: 'API key is missing or invalid',
    suggestion: 'Add a valid Anthropic or Gemini API key in Settings > API Keys',
  },
  PREVIOUS_PHASE_REQUIRED: {
    message: 'Previous phases must complete first',
    suggestion: 'Run the pipeline from the beginning or restart the current phase',
  },
  NETWORK_ERROR: {
    message: 'Network connection failed',
    suggestion: 'Check your internet connection and try again',
  },
  AI_RESPONSE_ERROR: {
    message: 'AI service returned an invalid response',
    suggestion: 'Try again. If the problem persists, try a different AI model',
  },
  TIMEOUT_ERROR: {
    message: 'Operation timed out',
    suggestion: 'The operation took too long. Try with a simpler brand URL or fewer pages',
  },
  CANCELLED: {
    message: 'Operation was cancelled',
    suggestion: 'Click "Retry" to start again',
  },
  VALIDATION_FAILED: {
    message: 'Output validation failed',
    suggestion: 'The generated content did not meet quality thresholds. Review and adjust settings',
  },
  SCREENSHOT_ERROR: {
    message: 'Failed to capture screenshots',
    suggestion: 'Ensure the brand URL is accessible and not blocking automated access',
  },
  UNKNOWN_ERROR: {
    message: 'An unexpected error occurred',
    suggestion: 'Try again. If the problem persists, please report this issue',
  },
};

function classifyError(error: unknown, phase: string): PipelineError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Classify based on error message patterns
  let code: ErrorCode = 'UNKNOWN_ERROR';
  let recoverable = true;

  if (lowerMessage.includes('cancelled') || lowerMessage.includes('aborted')) {
    code = 'CANCELLED';
    recoverable = true;
  } else if (lowerMessage.includes('network') || lowerMessage.includes('fetch') || lowerMessage.includes('connection')) {
    code = 'NETWORK_ERROR';
    recoverable = true;
  } else if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    code = 'TIMEOUT_ERROR';
    recoverable = true;
  } else if (lowerMessage.includes('api key') || lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    code = 'MISSING_API_KEY';
    recoverable = false;
  } else if (lowerMessage.includes('screenshot') || lowerMessage.includes('puppeteer') || lowerMessage.includes('playwright')) {
    code = 'SCREENSHOT_ERROR';
    recoverable = true;
  } else if (lowerMessage.includes('json') || lowerMessage.includes('parse') || lowerMessage.includes('invalid response')) {
    code = 'AI_RESPONSE_ERROR';
    recoverable = true;
  }

  const { message, suggestion } = ERROR_MESSAGES[code];

  return {
    message,
    phase,
    code,
    suggestion,
    details: errorMessage !== message ? errorMessage : undefined,
    recoverable,
  };
}

function createPhaseError(phase: string, code: ErrorCode, details?: string): PipelineError {
  const { message, suggestion } = ERROR_MESSAGES[code];
  return {
    message,
    phase,
    code,
    suggestion,
    details,
    recoverable: code !== 'MISSING_API_KEY',
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBrandReplicationPipeline({
  aiProvider,
  apiKey,
  model,
  enabled = true,
}: UseBrandReplicationPipelineProps): UseBrandReplicationPipelineReturn {
  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize pipeline instance
  const pipeline = useMemo(() => {
    if (!enabled || !apiKey) return null;

    const config: PipelineConfig = {
      aiProvider,
      apiKey,
      model,
    };

    return new BrandReplicationPipeline(config);
  }, [aiProvider, apiKey, model, enabled]);

  // State for outputs
  const [discoveryOutput, setDiscoveryOutput] = useState<DiscoveryOutput | null>(null);
  const [codeGenOutput, setCodeGenOutput] = useState<CodeGenOutput | null>(null);
  const [intelligenceOutput, setIntelligenceOutput] = useState<IntelligenceOutput | null>(null);
  const [validationOutput, setValidationOutput] = useState<ValidationOutput | null>(null);

  // State for status
  const [isRunning, setIsRunning] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [error, setError] = useState<PipelineError | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Check if operation was cancelled
  const checkCancelled = useCallback(() => {
    if (abortControllerRef.current?.signal.aborted) {
      throw new Error('Operation cancelled by user');
    }
  }, []);

  // Cancel current operation
  const cancel = useCallback(() => {
    if (abortControllerRef.current && isRunning) {
      setIsCancelling(true);
      abortControllerRef.current.abort();
    }
  }, [isRunning]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Run Phase 1: Discovery
  const runDiscovery = useCallback(async (input: DiscoveryInput): Promise<DiscoveryOutput | null> => {
    if (!pipeline) {
      const pipelineError = createPhaseError(
        'discovery',
        apiKey ? 'PIPELINE_NOT_INITIALIZED' : 'MISSING_API_KEY'
      );
      setError(pipelineError);
      return null;
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setIsRunning(true);
      setIsCancelling(false);
      setCurrentPhase('discovery');
      setError(null);
      setStartTime(new Date());

      checkCancelled();
      const output = await pipeline.runDiscovery(input);
      checkCancelled();

      setDiscoveryOutput(output);

      if (output.status === 'failed') {
        const pipelineError: PipelineError = {
          message: 'Brand discovery failed',
          phase: 'discovery',
          code: 'AI_RESPONSE_ERROR',
          suggestion: 'Check that the brand URL is accessible and try again',
          details: output.errors?.join('; '),
          recoverable: true,
        };
        setError(pipelineError);
      }

      return output;
    } catch (err) {
      const pipelineError = classifyError(err, 'discovery');
      setError(pipelineError);
      return null;
    } finally {
      setIsRunning(false);
      setIsCancelling(false);
      setCurrentPhase(null);
      abortControllerRef.current = null;
    }
  }, [pipeline, apiKey, checkCancelled]);

  // Run Phase 2: CodeGen
  const runCodeGen = useCallback(async (
    discovery: DiscoveryOutput,
    designDna: DesignDNA
  ): Promise<CodeGenOutput | null> => {
    if (!pipeline) {
      const pipelineError = createPhaseError(
        'codegen',
        apiKey ? 'PIPELINE_NOT_INITIALIZED' : 'MISSING_API_KEY'
      );
      setError(pipelineError);
      return null;
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsRunning(true);
      setIsCancelling(false);
      setCurrentPhase('codegen');
      setError(null);
      if (!startTime) setStartTime(new Date());

      checkCancelled();

      const input: CodeGenInput = {
        brandId: discovery.brandId,
        discoveryOutput: discovery,
        designDna,
        existingComponents: codeGenOutput?.components,
      };

      const output = await pipeline.runCodeGen(input);
      checkCancelled();

      setCodeGenOutput(output);

      if (output.status === 'failed') {
        const pipelineError: PipelineError = {
          message: 'Code generation failed',
          phase: 'codegen',
          code: 'AI_RESPONSE_ERROR',
          suggestion: 'The AI could not generate valid CSS/HTML. Try adjusting the design DNA settings',
          details: output.errors?.join('; '),
          recoverable: true,
        };
        setError(pipelineError);
      }

      return output;
    } catch (err) {
      const pipelineError = classifyError(err, 'codegen');
      setError(pipelineError);
      return null;
    } finally {
      setIsRunning(false);
      setIsCancelling(false);
      setCurrentPhase(null);
      abortControllerRef.current = null;
    }
  }, [pipeline, apiKey, codeGenOutput, startTime, checkCancelled]);

  // Run Phase 3: Intelligence
  const runIntelligence = useCallback(async (
    input: Omit<IntelligenceInput, 'brandId' | 'componentLibrary'>
  ): Promise<IntelligenceOutput | null> => {
    if (!pipeline) {
      const pipelineError = createPhaseError(
        'intelligence',
        apiKey ? 'PIPELINE_NOT_INITIALIZED' : 'MISSING_API_KEY'
      );
      setError(pipelineError);
      return null;
    }

    if (!discoveryOutput || !codeGenOutput) {
      const pipelineError = createPhaseError(
        'intelligence',
        'PREVIOUS_PHASE_REQUIRED',
        'Discovery and CodeGen phases must complete before running Intelligence'
      );
      setError(pipelineError);
      return null;
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsRunning(true);
      setIsCancelling(false);
      setCurrentPhase('intelligence');
      setError(null);
      if (!startTime) setStartTime(new Date());

      checkCancelled();

      const fullInput: IntelligenceInput = {
        ...input,
        brandId: discoveryOutput.brandId,
        componentLibrary: codeGenOutput.components,
      };

      const output = await pipeline.runIntelligence(fullInput);
      checkCancelled();

      setIntelligenceOutput(output);

      if (output.status === 'failed') {
        const pipelineError: PipelineError = {
          message: 'Section analysis failed',
          phase: 'intelligence',
          code: 'AI_RESPONSE_ERROR',
          suggestion: 'The AI could not match components to content. Check that the article has valid sections',
          details: output.errors?.join('; '),
          recoverable: true,
        };
        setError(pipelineError);
      }

      return output;
    } catch (err) {
      const pipelineError = classifyError(err, 'intelligence');
      setError(pipelineError);
      return null;
    } finally {
      setIsRunning(false);
      setIsCancelling(false);
      setCurrentPhase(null);
      abortControllerRef.current = null;
    }
  }, [pipeline, apiKey, discoveryOutput, codeGenOutput, startTime, checkCancelled]);

  // Run Phase 4: Validation
  const runValidation = useCallback(async (renderedHtml: string): Promise<ValidationOutput | null> => {
    if (!pipeline) {
      const pipelineError = createPhaseError(
        'validation',
        apiKey ? 'PIPELINE_NOT_INITIALIZED' : 'MISSING_API_KEY'
      );
      setError(pipelineError);
      return null;
    }

    if (!discoveryOutput || !codeGenOutput || !intelligenceOutput) {
      const pipelineError = createPhaseError(
        'validation',
        'PREVIOUS_PHASE_REQUIRED',
        'All previous phases must complete before running Validation'
      );
      setError(pipelineError);
      return null;
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsRunning(true);
      setIsCancelling(false);
      setCurrentPhase('validation');
      setError(null);
      if (!startTime) setStartTime(new Date());

      checkCancelled();

      const input: ValidationInput = {
        brandId: discoveryOutput.brandId,
        articleId: intelligenceOutput.articleId,
        renderedHtml,
        decisions: intelligenceOutput.decisions,
        componentLibrary: codeGenOutput.components,
        sourceScreenshots: discoveryOutput.screenshots.map(s => s.path),
      };

      const output = await pipeline.runValidation(input);
      checkCancelled();

      setValidationOutput(output);

      if (output.status === 'failed') {
        const pipelineError: PipelineError = {
          message: 'Quality validation failed',
          phase: 'validation',
          code: 'VALIDATION_FAILED',
          suggestion: 'The output did not meet quality thresholds. Review the suggestions and regenerate',
          details: output.errors?.join('; '),
          recoverable: true,
        };
        setError(pipelineError);
      }

      return output;
    } catch (err) {
      const pipelineError = classifyError(err, 'validation');
      setError(pipelineError);
      return null;
    } finally {
      setIsRunning(false);
      setIsCancelling(false);
      setCurrentPhase(null);
      abortControllerRef.current = null;
    }
  }, [pipeline, apiKey, discoveryOutput, codeGenOutput, intelligenceOutput, startTime, checkCancelled]);

  // Run full pipeline (all phases sequentially)
  const runFullPipeline = useCallback(async (
    brandUrl: string,
    brandId: string,
    designDna: DesignDNA,
    contentContext: IntelligenceInput['contentContext'],
    renderedHtml: string
  ): Promise<ValidationOutput | null> => {
    setStartTime(new Date());

    // Phase 1: Discovery
    const discovery = await runDiscovery({ brandUrl, brandId });
    if (!discovery || discovery.status === 'failed') return null;

    // Check for cancellation between phases
    if (abortControllerRef.current?.signal.aborted) {
      setError(createPhaseError('discovery', 'CANCELLED'));
      return null;
    }

    // Phase 2: CodeGen
    const codeGen = await runCodeGen(discovery, designDna);
    if (!codeGen || codeGen.status === 'failed') return null;

    if (abortControllerRef.current?.signal.aborted) {
      setError(createPhaseError('codegen', 'CANCELLED'));
      return null;
    }

    // Phase 3: Intelligence
    const intelligence = await runIntelligence({
      articleId: contentContext.article.id,
      contentContext,
    });
    if (!intelligence || intelligence.status === 'failed') return null;

    if (abortControllerRef.current?.signal.aborted) {
      setError(createPhaseError('intelligence', 'CANCELLED'));
      return null;
    }

    // Phase 4: Validation
    const validation = await runValidation(renderedHtml);
    return validation;
  }, [runDiscovery, runCodeGen, runIntelligence, runValidation]);

  // Reset all state
  const reset = useCallback(() => {
    // Cancel any running operation first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setDiscoveryOutput(null);
    setCodeGenOutput(null);
    setIntelligenceOutput(null);
    setValidationOutput(null);
    setIsRunning(false);
    setIsCancelling(false);
    setCurrentPhase(null);
    setError(null);
    setStartTime(null);
  }, []);

  // Get current status
  const getStatus = useCallback((): PipelineStatus => {
    if (!pipeline) {
      return {
        phase1: { phase: 'discovery', status: 'pending', progress: 0 },
        phase2: { phase: 'codegen', status: 'pending', progress: 0 },
        phase3: { phase: 'intelligence', status: 'pending', progress: 0 },
        phase4: { phase: 'validation', status: 'pending', progress: 0 },
        overall: 'idle',
      };
    }
    return pipeline.getStatus();
  }, [pipeline]);

  // Build state object
  const state: PipelineState = useMemo(() => ({
    discoveryOutput,
    codeGenOutput,
    intelligenceOutput,
    validationOutput,
    status: getStatus(),
    isRunning,
    isCancelling,
    currentPhase,
    error,
    startTime,
  }), [discoveryOutput, codeGenOutput, intelligenceOutput, validationOutput, getStatus, isRunning, isCancelling, currentPhase, error, startTime]);

  return {
    state,
    pipeline,
    runDiscovery,
    runCodeGen,
    runIntelligence,
    runValidation,
    runFullPipeline,
    reset,
    cancel,
    getStatus,
    clearError,
  };
}

export default useBrandReplicationPipeline;
