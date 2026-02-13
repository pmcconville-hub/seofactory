// services/design-analysis/brandDesignSystemStorage.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../supabaseClient';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../../types/designDna';
import { uploadScreenshot, getScreenshotUrl } from './screenshotStorage';

let supabase: SupabaseClient | null = null;

export function initBrandDesignSystemStorage(url: string, key: string) {
  supabase = getSupabaseClient(url, key);
}

/**
 * Save Design DNA extraction result
 */
export async function saveDesignDNA(
  projectId: string,
  result: DesignDNAExtractionResult,
  topicalMapId?: string
): Promise<string | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] saveDesignDNA called:', {
    projectId,
    topicalMapId,
    sourceUrl: result.sourceUrl,
    hasScreenshot: !!result.screenshotBase64,
    screenshotLength: result.screenshotBase64?.length || 0,
    hasDesignDna: !!result.designDna,
    aiModel: result.aiModel,
    confidence: result.designDna?.confidence?.overall,
  });

  try {
    // Use direct REST (RLS delegation to projects table handles access control)
    const insertData: Record<string, unknown> = {
      project_id: projectId,
      source_url: result.sourceUrl,
      screenshot_base64: result.screenshotBase64 || null,
      design_dna: result.designDna,
      ai_model: result.aiModel || null,
      confidence_score: result.designDna.confidence.overall,
      processing_time_ms: result.processingTimeMs || null,
      is_active: true,
    };
    if (topicalMapId) {
      insertData.topical_map_id = topicalMapId;
    }

    const { data, error } = await supabase
      .from('brand_design_dna')
      .insert(insertData)
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

    // Upload screenshot to Storage and clear inline base64 if successful
    if (result.screenshotBase64 && supabase) {
      try {
        const uploadResult = await uploadScreenshot(
          supabase,
          projectId,
          'brand-dna',
          result.screenshotBase64
        );
        if (uploadResult) {
          await supabase
            .from('brand_design_dna')
            .update({
              screenshot_storage_path: uploadResult.storagePath,
              screenshot_base64: null,
            })
            .eq('id', resultId);
          console.log('[BrandDesignStorage] Screenshot uploaded to Storage:', uploadResult.storagePath);
        }
      } catch (uploadErr) {
        // Non-fatal: base64 is still in the row as fallback
        console.warn('[BrandDesignStorage] Screenshot upload to Storage failed (base64 retained):', uploadErr);
      }
    }

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
 * Get Design DNA for a project (optionally scoped to a topical map)
 */
export async function getDesignDNA(
  projectId: string,
  topicalMapId?: string
): Promise<DesignDNAExtractionResult | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] getDesignDNA called for projectId:', projectId, 'topicalMapId:', topicalMapId);

  try {
    let query = supabase
      .from('brand_design_dna')
      .select('*')
      .eq('project_id', projectId);

    // If topicalMapId provided, filter by it AND is_active=true
    if (topicalMapId) {
      query = query.eq('topical_map_id', topicalMapId).eq('is_active', true);
    }

    const { data, error } = await query
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

    // Resolve screenshot: prefer Storage path over inline base64
    const hasStoragePath = !!data.screenshot_storage_path;
    let screenshotUrl: string | undefined;
    if (hasStoragePath && supabase) {
      screenshotUrl = getScreenshotUrl(supabase, data.screenshot_storage_path);
    }

    console.log('[BrandDesignStorage] getDesignDNA SUCCESS:', {
      id: data.id,
      sourceUrl: data.source_url,
      hasScreenshot: hasStoragePath || !!data.screenshot_base64,
      hasStoragePath,
      hasDesignDna: !!data.design_dna,
      createdAt: data.created_at,
    });

    return {
      designDna: data.design_dna as DesignDNA,
      // Don't load base64 from DB if a Storage path is available
      screenshotBase64: hasStoragePath ? undefined : data.screenshot_base64,
      screenshotUrl,
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
  system: BrandDesignSystem,
  topicalMapId?: string
): Promise<string | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] saveBrandDesignSystem called:', {
    projectId,
    topicalMapId,
    designDnaId,
    brandName: system.brandName,
    designDnaHash: system.designDnaHash,
    hasCompiledCss: !!system.compiledCss,
    compiledCssLength: system.compiledCss?.length || 0,
    hasTokens: !!system.tokens,
    hasComponentStyles: !!system.componentStyles,
  });

  try {
    const upsertData: Record<string, unknown> = {
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
    };
    if (topicalMapId) {
      upsertData.topical_map_id = topicalMapId;
    }

    // Use direct REST with upsert (RLS delegation to projects table handles access control)
    const { data, error } = await supabase
      .from('brand_design_systems')
      .upsert(upsertData, { onConflict: 'project_id,design_dna_hash' })
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
 * Get Brand Design System for a project (optionally scoped to a topical map)
 */
export async function getBrandDesignSystem(
  projectId: string,
  topicalMapId?: string
): Promise<BrandDesignSystem | null> {
  if (!supabase) throw new Error('Storage not initialized');

  console.log('[BrandDesignStorage] getBrandDesignSystem called for projectId:', projectId, 'topicalMapId:', topicalMapId);

  try {
    let query = supabase
      .from('brand_design_systems')
      .select('*')
      .eq('project_id', projectId);

    if (topicalMapId) {
      query = query.eq('topical_map_id', topicalMapId);
    }

    const { data, error } = await query
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
  hash: string,
  topicalMapId?: string
): Promise<boolean> {
  if (!supabase) throw new Error('Storage not initialized');

  try {
    let query = supabase
      .from('brand_design_systems')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('design_dna_hash', hash);

    if (topicalMapId) {
      query = query.eq('topical_map_id', topicalMapId);
    }

    const { count, error } = await query;

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

/**
 * List all brand profiles for a project (optionally scoped to a topical map)
 */
export async function listBrandProfiles(
  projectId: string,
  topicalMapId?: string
): Promise<Array<{
  id: string;
  sourceUrl: string;
  screenshotBase64?: string;
  isActive: boolean;
  createdAt: string;
  confidenceScore?: number;
}>> {
  if (!supabase) throw new Error('Storage not initialized');

  try {
    let query = supabase
      .from('brand_design_dna')
      .select('id, source_url, screenshot_base64, screenshot_storage_path, is_active, created_at, confidence_score')
      .eq('project_id', projectId);

    if (topicalMapId) {
      query = query.eq('topical_map_id', topicalMapId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      if (isTableMissingError(error)) {
        return [];
      }
      console.warn('[BrandDesignStorage] listBrandProfiles error:', error.message);
      return [];
    }

    if (!data) return [];

    return data.map((row: Record<string, unknown>) => {
      // For thumbnails, prefer storage path; only include base64 if no storage path
      const hasStoragePath = !!row.screenshot_storage_path;
      let thumbBase64: string | undefined;
      if (!hasStoragePath && row.screenshot_base64) {
        thumbBase64 = row.screenshot_base64 as string;
      }

      return {
        id: row.id as string,
        sourceUrl: row.source_url as string,
        screenshotBase64: thumbBase64,
        isActive: (row.is_active as boolean) ?? true,
        createdAt: row.created_at as string,
        confidenceScore: row.confidence_score as number | undefined,
      };
    });
  } catch (err) {
    console.warn('[BrandDesignStorage] listBrandProfiles exception:', err);
    return [];
  }
}

/**
 * Set a specific brand as active (deactivates all others for the same project/map)
 */
export async function setActiveBrand(
  projectId: string,
  brandDnaId: string,
  topicalMapId?: string
): Promise<boolean> {
  if (!supabase) throw new Error('Storage not initialized');

  try {
    // Deactivate all brands for this project/map
    let deactivateQuery = supabase
      .from('brand_design_dna')
      .update({ is_active: false })
      .eq('project_id', projectId);

    if (topicalMapId) {
      deactivateQuery = deactivateQuery.eq('topical_map_id', topicalMapId);
    }

    const { error: deactivateError } = await deactivateQuery;
    if (deactivateError) {
      if (isTableMissingError(deactivateError)) return false;
      console.warn('[BrandDesignStorage] setActiveBrand deactivate error:', deactivateError.message);
      return false;
    }

    // Activate the target brand
    const { error: activateError } = await supabase
      .from('brand_design_dna')
      .update({ is_active: true })
      .eq('id', brandDnaId);

    if (activateError) {
      console.warn('[BrandDesignStorage] setActiveBrand activate error:', activateError.message);
      return false;
    }

    console.log('[BrandDesignStorage] setActiveBrand SUCCESS:', brandDnaId);
    return true;
  } catch (err) {
    console.warn('[BrandDesignStorage] setActiveBrand exception:', err);
    return false;
  }
}
