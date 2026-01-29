/**
 * useBrandReplicationPipeline Hook
 *
 * Manages the Brand Replication Pipeline state within the StylePublishModal.
 * Provides methods to run individual phases and access outputs.
 *
 * @module hooks/useBrandReplicationPipeline
 */

import { useState, useCallback, useMemo } from 'react';
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
  currentPhase: string | null;
  error: string | null;
}

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
  getStatus: () => PipelineStatus;
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
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run Phase 1: Discovery
  const runDiscovery = useCallback(async (input: DiscoveryInput): Promise<DiscoveryOutput | null> => {
    if (!pipeline) {
      setError('Pipeline not initialized. Check API key.');
      return null;
    }

    try {
      setIsRunning(true);
      setCurrentPhase('discovery');
      setError(null);

      const output = await pipeline.runDiscovery(input);
      setDiscoveryOutput(output);

      if (output.status === 'failed') {
        setError(output.errors?.join(', ') || 'Discovery failed');
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error in discovery phase';
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
      setCurrentPhase(null);
    }
  }, [pipeline]);

  // Run Phase 2: CodeGen
  const runCodeGen = useCallback(async (
    discovery: DiscoveryOutput,
    designDna: DesignDNA
  ): Promise<CodeGenOutput | null> => {
    if (!pipeline) {
      setError('Pipeline not initialized. Check API key.');
      return null;
    }

    try {
      setIsRunning(true);
      setCurrentPhase('codegen');
      setError(null);

      const input: CodeGenInput = {
        brandId: discovery.brandId,
        discoveryOutput: discovery,
        designDna,
        existingComponents: codeGenOutput?.components,
      };

      const output = await pipeline.runCodeGen(input);
      setCodeGenOutput(output);

      if (output.status === 'failed') {
        setError(output.errors?.join(', ') || 'Code generation failed');
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error in codegen phase';
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
      setCurrentPhase(null);
    }
  }, [pipeline, codeGenOutput]);

  // Run Phase 3: Intelligence
  const runIntelligence = useCallback(async (
    input: Omit<IntelligenceInput, 'brandId' | 'componentLibrary'>
  ): Promise<IntelligenceOutput | null> => {
    if (!pipeline) {
      setError('Pipeline not initialized. Check API key.');
      return null;
    }

    if (!discoveryOutput || !codeGenOutput) {
      setError('Must run discovery and codegen phases first');
      return null;
    }

    try {
      setIsRunning(true);
      setCurrentPhase('intelligence');
      setError(null);

      const fullInput: IntelligenceInput = {
        ...input,
        brandId: discoveryOutput.brandId,
        componentLibrary: codeGenOutput.components,
      };

      const output = await pipeline.runIntelligence(fullInput);
      setIntelligenceOutput(output);

      if (output.status === 'failed') {
        setError(output.errors?.join(', ') || 'Intelligence phase failed');
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error in intelligence phase';
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
      setCurrentPhase(null);
    }
  }, [pipeline, discoveryOutput, codeGenOutput]);

  // Run Phase 4: Validation
  const runValidation = useCallback(async (renderedHtml: string): Promise<ValidationOutput | null> => {
    if (!pipeline) {
      setError('Pipeline not initialized. Check API key.');
      return null;
    }

    if (!discoveryOutput || !codeGenOutput || !intelligenceOutput) {
      setError('Must run previous phases first');
      return null;
    }

    try {
      setIsRunning(true);
      setCurrentPhase('validation');
      setError(null);

      const input: ValidationInput = {
        brandId: discoveryOutput.brandId,
        articleId: intelligenceOutput.articleId,
        renderedHtml,
        decisions: intelligenceOutput.decisions,
        componentLibrary: codeGenOutput.components,
        sourceScreenshots: discoveryOutput.screenshots.map(s => s.path),
      };

      const output = await pipeline.runValidation(input);
      setValidationOutput(output);

      if (output.status === 'failed') {
        setError(output.errors?.join(', ') || 'Validation failed');
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error in validation phase';
      setError(message);
      return null;
    } finally {
      setIsRunning(false);
      setCurrentPhase(null);
    }
  }, [pipeline, discoveryOutput, codeGenOutput, intelligenceOutput]);

  // Run full pipeline (all phases sequentially)
  const runFullPipeline = useCallback(async (
    brandUrl: string,
    brandId: string,
    designDna: DesignDNA,
    contentContext: IntelligenceInput['contentContext'],
    renderedHtml: string
  ): Promise<ValidationOutput | null> => {
    // Phase 1: Discovery
    const discovery = await runDiscovery({ brandUrl, brandId });
    if (!discovery || discovery.status === 'failed') return null;

    // Phase 2: CodeGen
    const codeGen = await runCodeGen(discovery, designDna);
    if (!codeGen || codeGen.status === 'failed') return null;

    // Phase 3: Intelligence
    const intelligence = await runIntelligence({
      articleId: contentContext.article.id,
      contentContext,
    });
    if (!intelligence || intelligence.status === 'failed') return null;

    // Phase 4: Validation
    const validation = await runValidation(renderedHtml);
    return validation;
  }, [runDiscovery, runCodeGen, runIntelligence, runValidation]);

  // Reset all state
  const reset = useCallback(() => {
    setDiscoveryOutput(null);
    setCodeGenOutput(null);
    setIntelligenceOutput(null);
    setValidationOutput(null);
    setIsRunning(false);
    setCurrentPhase(null);
    setError(null);
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
    currentPhase,
    error,
  }), [discoveryOutput, codeGenOutput, intelligenceOutput, validationOutput, getStatus, isRunning, currentPhase, error]);

  return {
    state,
    pipeline,
    runDiscovery,
    runCodeGen,
    runIntelligence,
    runValidation,
    runFullPipeline,
    reset,
    getStatus,
  };
}

export default useBrandReplicationPipeline;
