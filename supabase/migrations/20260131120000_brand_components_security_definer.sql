-- SECURITY DEFINER function for brand_components upsert
-- Bypasses RLS since the direct policies aren't working reliably
-- Still validates project access via has_project_access() inside the function

CREATE OR REPLACE FUNCTION upsert_brand_component(
  p_id UUID,
  p_extraction_id UUID,
  p_project_id UUID,
  p_visual_description TEXT,
  p_component_type TEXT,
  p_literal_html TEXT,
  p_literal_css TEXT,
  p_their_class_names TEXT[] DEFAULT NULL,
  p_content_slots JSONB DEFAULT NULL,
  p_bounding_box JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_result UUID;
BEGIN
  -- Validate project access
  IF NOT has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access denied: no access to project %', p_project_id;
  END IF;

  INSERT INTO brand_components (
    id, extraction_id, project_id, visual_description, component_type,
    literal_html, literal_css, their_class_names, content_slots, bounding_box,
    created_at
  ) VALUES (
    p_id, p_extraction_id, p_project_id, p_visual_description, p_component_type,
    p_literal_html, p_literal_css, p_their_class_names, p_content_slots, p_bounding_box,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    visual_description = EXCLUDED.visual_description,
    component_type = EXCLUDED.component_type,
    literal_html = EXCLUDED.literal_html,
    literal_css = EXCLUDED.literal_css,
    their_class_names = EXCLUDED.their_class_names,
    content_slots = EXCLUDED.content_slots,
    bounding_box = EXCLUDED.bounding_box
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION upsert_brand_component TO authenticated;

-- Also create a SECURITY DEFINER function for brand_tokens upsert
CREATE OR REPLACE FUNCTION upsert_brand_tokens(
  p_id UUID,
  p_project_id UUID,
  p_colors JSONB DEFAULT NULL,
  p_typography JSONB DEFAULT NULL,
  p_spacing JSONB DEFAULT NULL,
  p_shadows JSONB DEFAULT NULL,
  p_borders JSONB DEFAULT NULL,
  p_gradients JSONB DEFAULT NULL,
  p_extracted_from TEXT[] DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_result UUID;
BEGIN
  -- Validate project access
  IF NOT has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'Access denied: no access to project %', p_project_id;
  END IF;

  INSERT INTO brand_tokens (
    id, project_id, colors, typography, spacing, shadows, borders, gradients,
    extracted_from, extracted_at
  ) VALUES (
    p_id, p_project_id, p_colors, p_typography, p_spacing, p_shadows, p_borders,
    p_gradients, p_extracted_from, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    colors = EXCLUDED.colors,
    typography = EXCLUDED.typography,
    spacing = EXCLUDED.spacing,
    shadows = EXCLUDED.shadows,
    borders = EXCLUDED.borders,
    gradients = EXCLUDED.gradients,
    extracted_from = EXCLUDED.extracted_from,
    extracted_at = NOW()
  RETURNING id INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION upsert_brand_tokens TO authenticated;
