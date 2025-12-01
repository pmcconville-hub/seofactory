
/**
 * Utility to clean and sanitize scraped Markdown content.
 * Removes common web noise like navigation, footers, ads, and boilerplate.
 */
export const cleanScrapedContent = (markdown: string): string => {
    if (!markdown) return '';

    let cleaned = markdown;

    // 1. Remove Link Clutter (Lines that are just links)
    // Matches lines containing only a link: [Link Text](URL), optionally with bullet points
    cleaned = cleaned.replace(/^(\s*[-*]\s*)?\[[^\]]+\]\([^)]+\)\s*$/gm, '');

    // 2. Regex Pattern Removal for Common Boilerplate
    const boilerplatePatterns = [
        /^Read more$/gmi,
        /^Subscribe$/gmi,
        /^Cookie Policy$/gmi,
        /^Privacy Policy$/gmi,
        /^Terms of Service$/gmi,
        /^All rights reserved/gmi,
        /^Share this post/gmi,
        /^Follow us/gmi,
        /^Skip to content/gmi,
        /^©/gm, // Copyright lines
        /^\s*\|?\s*Menu\s*\|?\s*$/gmi,
        /^\s*Login\s*$/gmi,
        /^\s*Sign Up\s*$/gmi
    ];

    boilerplatePatterns.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // 3. Metadata Stripping
    // Remove images with empty alt text (usually decorative)
    cleaned = cleaned.replace(/!\[\]\([^)]+\)/g, ''); 
    
    // Remove "Button" artifacts often left by scrapers
    cleaned = cleaned.replace(/\[Button:.*?\]/gi, '');

    // 4. Structure Normalization
    
    // Collapse excessive newlines (3 or more becomes 2)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
};
