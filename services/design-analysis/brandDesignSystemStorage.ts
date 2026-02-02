// services/design-analysis/brandDesignSystemStorage.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabaseClient';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../../types/designDna';

let supabase: SupabaseClient | null = null;

export function initBrandDesignSystemStorage(url: string, key: string) {
  supabase = getSupabaseClient(url, key);
}

/**
 * Save Design DNA extraction result
 */
export async function saveDesignDNA(
  projectId: string,
  result: DesignDNAExtractionResult
): Promise<string | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] saveDesignDNA called:', {
    projectId,
    sourceUrl: result.sourceUrl,
    hasScreenshot: !!result.screenshotBase64,
    screenshotLength: result.screenshotBase64?.length || 0,
    hasDesignDna: !!result.designDna,
    aiModel: result.aiModel,
    confidence: result.designDna?.confidence?.overall,
  });

  try {
    // Use direct REST (RLS delegation to projects table handles access control)
    const { data, error } = await supabase
      .from('brand_design_dna')
      .insert({
        project_id: projectId,
        source_url: result.sourceUrl,
        screenshot_base64: result.screenshotBase64 || null,
        design_dna: result.designDna,
        ai_model: result.aiModel || null,
        confidence_score: result.designDna.confidence.overall,
        processing_time_ms: result.processingTimeMs || null,
      })
      .select('id')
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('[BrandDesignStorage] saveDesignDNA: Table not found, skipping persistence');
        return null;
      }
      console.warn('[BrandDesignStorage] saveDesignDNA error:', error.message, error);
      return null;
    }

    const resultId = data?.id as string;
    console.log('[BrandDesignStorage] saveDesignDNA SUCCESS - id:', resultId);
    return resultId;
  } catch (err) {
    console.warn('[BrandDesignStorage] saveDesignDNA exception:', err);
    return null;
  }
}

/**
 * Check if an error indicates a missing table (graceful degradation)
 */
function isTableMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string; status?: number; details?: string };
  // 42P01 = relation does not exist (PostgreSQL)
  // PGRST204 = table not found in schema cache (PostgREST)
  // 404 = not found
  if (err.code === '42P01' || err.code === 'PGRST204' || err.status === 404) return true;
  // 406 can mean table not in schema cache OR just "no rows" with .single() — check message
  if (err.status === 406 && err.message && !err.message.includes('0 rows')) return true;
  return false;
}

/**
 * Get Design DNA for a project
 */
export async function getDesignDNA(projectId: string): Promise<DesignDNAExtractionResult | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] getDesignDNA called for projectId:', projectId);

  try {
    const { data, error } = await supabase
      .from('brand_design_dna')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isTableMissingError(error)) {
        console.log('[BrandDesignStorage] getDesignDNA: Table not found - graceful degradation');
        return null;
      }
      console.warn('[BrandDesignStorage] getDesignDNA error:', error.message, error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log('[BrandDesignStorage] getDesignDNA SUCCESS:', {
      id: data.id,
      sourceUrl: data.source_url,
      hasScreenshot: !!data.screenshot_base64,
      hasDesignDna: !!data.design_dna,
      createdAt: data.created_at,
    });

    return {
      designDna: data.design_dna as DesignDNA,
      screenshotBase64: data.screenshot_base64,
      sourceUrl: data.source_url,
      extractedAt: data.created_at,
      aiModel: data.ai_model,
      processingTimeMs: data.processing_time_ms
    };
  } catch (err) {
    console.warn('[BrandDesignStorage] getDesignDNA exception:', err);
    return null;
  }
}

/**
 * Save Brand Design System
 */
export async function saveBrandDesignSystem(
  projectId: string,
  designDnaId: string | null,
  system: BrandDesignSystem
): Promise<string | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] saveBrandDesignSystem called:', {
    projectId,
    designDnaId,
    brandName: system.brandName,
    designDnaHash: system.designDnaHash,
    hasCompiledCss: !!system.compiledCss,
    compiledCssLength: system.compiledCss?.length || 0,
    hasTokens: !!system.tokens,
    hasComponentStyles: !!system.componentStyles,
  });

  try {
    // Use direct REST with upsert (RLS delegation to projects table handles access control)
    const { data, error } = await supabase
      .from('brand_design_systems')
      .upsert({
        project_id: projectId,
        design_dna_id: designDnaId || null,
        brand_name: system.brandName || null,
        design_dna_hash: system.designDnaHash || null,
        tokens: system.tokens || null,
        component_styles: system.componentStyles || null,
        decorative_elements: system.decorative || null,
        interactions: system.interactions || null,
        typography_treatments: system.typographyTreatments || null,
        image_treatments: system.imageTreatments || null,
        compiled_css: system.compiledCss || '',
        variant_mappings: system.variantMappings || null,
      }, { onConflict: 'project_id,design_dna_hash' })
      .select('id')
      .single();

    if (error) {
      if (isTableMissingError(error)) {
        console.warn('[BrandDesignStorage] saveBrandDesignSystem: Table not found, skipping persistence');
        return null;
      }
      console.warn('[BrandDesignStorage] saveBrandDesignSystem error:', error.message, error);
      return null;
    }

    const resultId = data?.id as string;
    console.log('[BrandDesignStorage] saveBrandDesignSystem SUCCESS - id:', resultId);
    return resultId;
  } catch (err) {
    console.warn('[BrandDesignStorage] saveBrandDesignSystem exception:', err);
    return null;
  }
}

/**
 * Get Brand Design System for a project
 */
export async function getBrandDesignSystem(projectId: string): Promise<BrandDesignSystem | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] getBrandDesignSystem called for projectId:', projectId);

  try {
    const { data, error } = await supabase
      .from('brand_design_systems')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (isTableMissingError(error)) {
        console.log('[BrandDesignStorage] getBrandDesignSystem: Table not found - graceful degradation');
        return null;
      }
      console.warn('[BrandDesignStorage] getBrandDesignSystem error:', error.message, error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log('[BrandDesignStorage] getBrandDesignSystem SUCCESS:', {
      id: data.id,
      brandName: data.brand_name,
      hasCompiledCss: !!data.compiled_css,
      compiledCssLength: data.compiled_css?.length || 0,
      designDnaHash: data.design_dna_hash,
      createdAt: data.created_at,
    });

    return {
      id: data.id,
      brandName: data.brand_name,
      sourceUrl: '',
      generatedAt: data.created_at,
      designDnaHash: data.design_dna_hash,
      tokens: data.tokens,
      componentStyles: data.component_styles,
      decorative: data.decorative_elements,
      interactions: data.interactions,
      typographyTreatments: data.typography_treatments,
      imageTreatments: data.image_treatments,
      compiledCss: data.compiled_css,
      variantMappings: data.variant_mappings
    };
  } catch (err) {
    console.warn('[BrandDesignStorage] getBrandDesignSystem exception:', err);
    return null;
  }
}

/**
 * Check if design system exists for hash (for caching)
 */
export async function hasDesignSystemForHash(
  projectId: string,
  hash: string
): Promise<boolean> {
  if (!supabase) throw new Error('Storage not initialized');

  try {
    const { count, error } = await supabase
      .from('brand_design_systems')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('design_dna_hash', hash);

    if (error) {
      if (isTableMissingError(error)) {
        return false;
      }
      console.warn('[BrandDesignStorage] hasDesignSystemForHash error:', error.message);
      return false;
    }

    return (count || 0) > 0;
  } catch (err) {
    console.warn('[BrandDesignStorage] hasDesignSystemForHash exception:', err);
    return false;
  }
}
