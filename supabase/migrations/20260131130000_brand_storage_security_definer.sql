-- SECURITY DEFINER functions for brand_design_dna and brand_design_systems
-- These bypass RLS while still validating project access internally

-- Function to insert brand_design_dna
CREATE OR REPLACE FUNCTION insert_brand_design_dna(
  p_project_id UUID,
  p_source_url TEXT,
  p_screenshot_base64 TEXT DEFAULT NULL,
  p_design_dna JSONB DEFAULT NULL,
  p_ai_model TEXT DEFAULT NULL,
  p_confidence_score NUMERIC DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_result UUID;
BEGIN
  IF NOT has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access denied: no access to project %', p_project_id;
  END IF;

  INSERT INTO brand_design_dna (
    project_id, source_url, screenshot_base64, design_dna,
    ai_model, confidence_score, processing_time_ms
  ) VALUES (
    p_project_id, p_source_url, p_screenshot_base64, p_design_dna,
    p_ai_model, p_confidence_score, p_processing_time_ms
  )
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION insert_brand_design_dna TO authenticated;

-- Function to upsert brand_design_systems
CREATE OR REPLACE FUNCTION upsert_brand_design_system(
  p_project_id UUID,
  p_design_dna_id UUID DEFAULT NULL,
  p_brand_name TEXT DEFAULT NULL,
  p_design_dna_hash TEXT DEFAULT NULL,
  p_tokens JSONB DEFAULT NULL,
  p_component_styles JSONB DEFAULT NULL,
  p_decorative_elements JSONB DEFAULT NULL,
  p_interactions JSONB DEFAULT NULL,
  p_typography_treatments JSONB DEFAULT NULL,
  p_image_treatments JSONB DEFAULT NULL,
  p_compiled_css TEXT DEFAULT NULL,
  p_variant_mappings JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_result UUID;
BEGIN
  IF NOT has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access denied: no access to project %', p_project_id;
  END IF;

  INSERT INTO brand_design_systems (
    project_id, design_dna_id, brand_name, design_dna_hash,
    tokens, component_styles, decorative_elements, interactions,
    typography_treatments, image_treatments, compiled_css, variant_mappings
  ) VALUES (
    p_project_id, p_design_dna_id, p_brand_name, p_design_dna_hash,
    p_tokens, p_component_styles, p_decorative_elements, p_interactions,
    p_typography_treatments, p_image_treatments, p_compiled_css, p_variant_mappings
  )
  ON CONFLICT (project_id, design_dna_hash) DO UPDATE SET
    design_dna_id = EXCLUDED.design_dna_id,
    brand_name = EXCLUDED.brand_name,
    tokens = EXCLUDED.tokens,
    component_styles = EXCLUDED.component_styles,
    decorative_elements = EXCLUDED.decorative_elements,
    interactions = EXCLUDED.interactions,
    typography_treatments = EXCLUDED.typography_treatments,
    image_treatments = EXCLUDED.image_treatments,
    compiled_css = EXCLUDED.compiled_css,
    variant_mappings = EXCLUDED.variant_mappings
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_brand_design_system TO authenticated;
