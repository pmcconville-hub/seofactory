
import { BaseStrategy } from './BaseStrategy';
import { SEOPillars, EnrichedTopic, ContentBrief, ResponseCode, KnowledgeGraph, SemanticTriple } from '../../../types';

export class ServiceStrategy extends BaseStrategy {

    getInitialMapPrompt(pillars: SEOPillars, eavs: SemanticTriple[], competitors: string[]): string {
        const basePrompt = super.getInitialMapPrompt(pillars, eavs, competitors);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SERVICE BUSINESS (LOCAL/PROFESSIONAL)**
        - **Authority:** Topics must demonstrate **Expertise, Authority, and Trust (E-A-T)**.
        - **Structure:** Separate 'Service Pages' (Transactional) from 'Educational Guides' (Informational).
        - **Spokes:** Must include 'Process', 'Costs', 'Case Studies', and 'Common Problems'.
        `;
    }

    getBriefPrompt(topic: EnrichedTopic, allTopics: EnrichedTopic[], pillars: SEOPillars, kg: KnowledgeGraph, responseCode: ResponseCode): string {
        const basePrompt = super.getBriefPrompt(topic, allTopics, pillars, kg, responseCode);
        return `${basePrompt}

        **STRATEGY OVERRIDE: SERVICE TRUST**
        - **Proof Elements:** Mandate a 'Proof' section (Case Studies, Testimonials, Certifications) in every Core Topic brief.
        - **Linking:** Enforce 'River Flow': Informational articles MUST link to Service Pages using exact service predicates (e.g., 'Hire X', 'Contact Y').
        `;
    }
    
    getEavPrompt(pillars: SEOPillars): string {
        const basePrompt = super.getEavPrompt(pillars);
        return `${basePrompt}
        
        **STRATEGY OVERRIDE: SERVICE ATTRIBUTES**
        - **Focus:** Credibility and Process.
        - **Required Classifications:**
            - **CORE_DEFINITION:** Service Type, Deliverables.
            - **SEARCH_DEMAND:** Cost/Rates, Turnaround Time, Service Area.
            - **COMPETITIVE_EXPANSION:** Unique Methodology, Certifications, Awards.
        `;
    }
}
