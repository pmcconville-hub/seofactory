
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, SemanticTriple } from '../../../types';

export class InformationalStrategy extends BaseStrategy {

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}

        **STRATEGY OVERRIDE: INFORMATIONAL / PUBLISHER**
        - **Depth:** Focus on **Topical Depth** and **Semantic Completeness**.
        - **Expansion:** Generate topics that cover historical context, future trends, and peripheral entities.
        - **Angle:** Ensure every topic has a unique angle that provides **Information Gain** over competitors.
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}

        **STRATEGY OVERRIDE: INFORMATION GAIN**
        - **Originality:** The brief must emphasize unique data, original research, or a novel perspective.
        - **Complexity:** Do not simplify. Cover the nuance.
        - **Symmetry:** Ensure the outline mirrors the depth of the Knowledge Graph.
        `;
    }
    
    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: INFORMATIONAL ATTRIBUTES**
        - **Focus:** Facts, History, and Relationships.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Definition, Origin, Etymology.
            - **SEARCH_DEMAND:** Statistics, Trends, Examples.
            - **COMPETITIVE_EXPANSION:** Theoretical Concepts, Academic Correlations.
        `;
    }
}
