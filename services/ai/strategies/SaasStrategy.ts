
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, SemanticTriple } from '../../../types';

export class SaasStrategy extends BaseStrategy {

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SAAS MODEL**
        - **Mapping:** Explicitly map 'Feature' -> 'Use Case' -> 'User Role'.
        - **Core Topics:** Must represent major Product Capabilities or Solutions.
        - **Spokes:** Must address specific Personas (e.g., 'For CTOs', 'For Marketers') and Integrations.
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SAAS (PAS FRAMEWORK)**
        - **Structure:** Adopt the **Problem-Agitation-Solution (PAS)** framework for the introduction and first H2.
        - **User Roles:** The brief MUST specify which User Role (Persona) this content targets in the 'perspectives' field.
        - **CTA:** Include specific 'Demo' or 'Trial' conversion points relevant to the topic intent.
        `;
    }
    
    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: SAAS ATTRIBUTES**
        - **Focus:** User Utility and Technical Specs.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Functionality, Deployment Method (Cloud/On-Prem).
            - **SEARCH_DEMAND:** Pricing Model, Free Trial Availability, Integrations.
            - **COMPETITIVE_EXPANSION:** "vs Competitor", Security Compliance (SOC2, GDPR).
        `;
    }
}
