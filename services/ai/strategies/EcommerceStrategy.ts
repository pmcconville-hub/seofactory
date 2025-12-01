
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, ExpansionMode } from '../../../types';

export class EcommerceStrategy extends BaseStrategy {
    
    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: E-COMMERCE MODEL**
        - **Hierarchy:** Enforce a strict 'Category -> Product Line -> Product' hierarchy.
        - **Spoke Logic:** For every Product/Category Core Topic, spokes MUST include 'Buying Guide', 'Comparison', 'Review', and 'Maintenance/Care'.
        - **Attributes:** Ensure topics cover physical dimensions (Size, Material) and transactional concerns (Warranty, Shipping).
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: E-COMMERCE (LIFT MODEL)**
        - **Structure:** Prioritize the **Value Proposition** and **Urgency**.
        - **Conversion:** The section immediately following the definition MUST be the 'Buying Context' (Price, Availability, CTA).
        - **Visuals:** Request 'Product Diagram', 'Size Chart', or 'Comparison Matrix' in visual_semantics.
        - **Linking:** Enforce Ontology linking: Link from 'Material' (Attribute) pages to specific 'Product' pages.
        `;
    }

    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: E-COMMERCE ATTRIBUTES**
        - **Dominant Attribute:** 'Price' / 'Value' is the central pivot.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Product Type, Material, Brand.
            - **SEARCH_DEMAND:** Price, Discount, Review Score, Shipping Time.
            - **COMPOSITE:** Dimensions (LxWxH), Weight.
        `;
    }
}
