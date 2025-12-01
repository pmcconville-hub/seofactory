import { v4 as uuidv4 } from 'uuid';
import { EnrichedTopic, ContentBrief, SEOPillars } from '../types';
import { CONTENT_BRIEF_FALLBACK } from '../config/schemas';

/**
 * Attempts to find an existing topic in the map that matches the provided URL.
 * Matches against strict slug or url_slug_hint.
 */
export const findTopicByUrl = (topics: EnrichedTopic[], url: string): EnrichedTopic | undefined => {
    if (!url) return undefined;

    // Normalize URL to get the path/slug
    let path = url.trim();
    try {
        // If it's a full URL, extract pathname
        if (path.startsWith('http')) {
            const urlObj = new URL(path);
            path = urlObj.pathname;
        }
    } catch (e) {
        // Invalid URL format, treat as relative path or slug
    }

    // Remove leading/trailing slashes
    const normalizedSlug = path.replace(/^\/+|\/+$/g, '').toLowerCase();

    return topics.find(topic => {
        const topicSlug = (topic.slug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
        const hint = (topic.url_slug_hint || '').toLowerCase().replace(/^\/+|\/+$/g, '');
        
        // Exact match on slug
        if (topicSlug && topicSlug === normalizedSlug) return true;

        // Fallback to hint if match
        if (hint && hint === normalizedSlug) return true;
        
        return false;
    });
};

/**
 * Creates a temporary "Transient" Content Brief based on the project pillars and scraped content.
 * This allows the audit tools to function even without a pre-existing brief record.
 */
export const createTransientBrief = (pillars: SEOPillars, url: string, scrapedContent: string): ContentBrief => {
    const id = `transient-${uuidv4()}`;
    
    // Attempt to extract a title from content (H1)
    const h1Match = scrapedContent.match(/^#\s+(.+)$/m);
    const extractedTitle = h1Match ? h1Match[1].trim() : url;

    return {
        ...CONTENT_BRIEF_FALLBACK,
        id: id,
        topic_id: id, // Transient ID ensures no collisions with real topics
        title: extractedTitle,
        slug: url, // Use the raw URL as the slug for reference
        keyTakeaways: [
            `Must align with Central Entity: ${pillars.centralEntity}`,
            `Must target Source Context: ${pillars.sourceContext}`,
            `Must address Search Intent: ${pillars.centralSearchIntent}`
        ],
        articleDraft: scrapedContent,
        // Inherit default empty structure for other fields
    };
};
