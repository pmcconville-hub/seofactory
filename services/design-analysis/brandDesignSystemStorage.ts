// services/design-analysis/brandDesignSystemStorage.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DesignDNA, DesignDNAExtractionResult, BrandDesignSystem } from '../../types/designDna';

let supabase: SupabaseClient | null = null;

export function initBrandDesignSystemStorage(url: string, key: string) {
  supabase = createClient(url, key);
}

/**
 * Save Design DNA extraction result
 */
export async function saveDesignDNA(
  projectId: string,
  result: DesignDNAExtractionResult
): Promise<string> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_dna')
    .insert({
      project_id: projectId,
      source_url: result.sourceUrl,
      screenshot_base64: result.screenshotBase64,
      design_dna: result.designDna,
      ai_model: result.aiModel,
      confidence_score: result.designDna.confidence.overall,
      processing_time_ms: result.processingTimeMs
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get Design DNA for a project
 */
export async function getDesignDNA(projectId: string): Promise<DesignDNAExtractionResult | null> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_dna')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    designDna: data.design_dna as DesignDNA,
    screenshotBase64: data.screenshot_base64,
    sourceUrl: data.source_url,
    extractedAt: data.created_at,
    aiModel: data.ai_model,
    processingTimeMs: data.processing_time_ms
  };
}

/**
 * Save Brand Design System
 */
export async function saveBrandDesignSystem(
  projectId: string,
  designDnaId: string | null,
  system: BrandDesignSystem
): Promise<string> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_systems')
    .upsert({
      project_id: projectId,
      design_dna_id: designDnaId,
      brand_name: system.brandName,
      design_dna_hash: system.designDnaHash,
      tokens: system.tokens,
      component_styles: system.componentStyles,
      decorative_elements: system.decorative,
      interactions: system.interactions,
      typography_treatments: system.typographyTreatments,
      image_treatments: system.imageTreatments,
      compiled_css: system.compiledCss,
      variant_mappings: system.variantMappings
    }, {
      onConflict: 'project_id,design_dna_hash'
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Get Brand Design System for a project
 */
export async function getBrandDesignSystem(projectId: string): Promise<BrandDesignSystem | null> {
  if (!supabase) throw new Error('Storage not initialized');

  const { data, error } = await supabase
    .from('brand_design_systems')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

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
}

/**
 * Check if design system exists for hash (for caching)
 */
export async function hasDesignSystemForHash(
  projectId: string,
  hash: string
): Promise<boolean> {
  if (!supabase) throw new Error('Storage not initialized');

  const { count } = await supabase
    .from('brand_design_systems')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('design_dna_hash', hash);

  return (count || 0) > 0;
}
