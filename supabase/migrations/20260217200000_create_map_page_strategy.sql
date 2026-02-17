-- Map-level strategy overlay for site inventory pages.
-- Each (map_id, inventory_id) pair stores map-specific mapping decisions,
-- action plans, alignment scores, and workflow status.

CREATE TABLE IF NOT EXISTS public.map_page_strategy (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    map_id uuid NOT NULL REFERENCES public.topical_maps(id) ON DELETE CASCADE,
    inventory_id uuid NOT NULL REFERENCES public.site_inventory(id) ON DELETE CASCADE,

    -- Mapping
    mapped_topic_id uuid REFERENCES public.topics(id) ON DELETE SET NULL,
    match_category text CHECK (match_category IS NULL OR match_category IN ('matched', 'orphan', 'cannibalization')),
    match_confidence numeric(4,2),
    match_source text,

    -- Action plan
    action action_type,
    recommended_action action_type,
    action_reasoning text,
    action_priority text CHECK (action_priority IS NULL OR action_priority IN ('critical', 'high', 'medium', 'low')),
    action_effort text CHECK (action_effort IS NULL OR action_effort IN ('none', 'low', 'medium', 'high')),
    action_data_points jsonb,

    -- Workflow
    status transition_status DEFAULT 'AUDIT_PENDING',
    section section_type,

    -- Semantic alignment (map-specific: compares detected CE/SC/CSI against map's targets)
    ce_alignment numeric,
    sc_alignment numeric,
    csi_alignment numeric,
    semantic_overall_score numeric,
    overlay_status text CHECK (overlay_status IS NULL OR overlay_status IN (
        'covered_aligned', 'covered_needs_work', 'gap', 'orphan', 'cannibalization'
    )),

    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),

    UNIQUE(map_id, inventory_id)
);

ALTER TABLE public.map_page_strategy ENABLE ROW LEVEL SECURITY;

-- RLS: Use has_project_access via site_inventory -> projects chain
CREATE POLICY "map_page_strategy_access"
    ON public.map_page_strategy FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            WHERE si.id = map_page_strategy.inventory_id
              AND has_project_access(si.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.site_inventory si
            WHERE si.id = map_page_strategy.inventory_id
              AND has_project_access(si.project_id)
        )
    );

CREATE POLICY "Service role full access to map_page_strategy"
    ON public.map_page_strategy FOR ALL TO service_role
    USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_map_page_strategy_map ON public.map_page_strategy(map_id);
CREATE INDEX IF NOT EXISTS idx_map_page_strategy_inventory ON public.map_page_strategy(inventory_id);
CREATE INDEX IF NOT EXISTS idx_map_page_strategy_map_inventory ON public.map_page_strategy(map_id, inventory_id);
CREATE INDEX IF NOT EXISTS idx_map_page_strategy_topic ON public.map_page_strategy(mapped_topic_id);

-- Backfill: Migrate existing strategy data from site_inventory rows that have a mapped_topic_id.
-- Derive map_id from the topic's map_id.
INSERT INTO public.map_page_strategy (
    map_id, inventory_id, mapped_topic_id,
    match_category, match_confidence, match_source,
    action, recommended_action, action_reasoning, action_priority, action_effort, action_data_points,
    status, section,
    ce_alignment, sc_alignment, csi_alignment, semantic_overall_score, overlay_status
)
SELECT
    t.map_id,
    si.id,
    si.mapped_topic_id,
    si.match_category,
    si.match_confidence,
    si.match_source,
    si.action,
    si.recommended_action,
    si.action_reasoning,
    si.action_priority,
    si.action_effort,
    si.action_data_points,
    si.status,
    si.section,
    si.ce_alignment,
    si.sc_alignment,
    si.csi_alignment,
    si.semantic_overall_score,
    si.overlay_status
FROM public.site_inventory si
JOIN public.topics t ON t.id = si.mapped_topic_id
WHERE si.mapped_topic_id IS NOT NULL
ON CONFLICT (map_id, inventory_id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
