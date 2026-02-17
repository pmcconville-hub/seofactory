
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

    // 5. Remove navigation-style blocks: lines of 3+ links separated by | or ·
    cleaned = cleaned.replace(/^(\s*\[.+?\]\(.+?\)\s*[|·•]\s*){2,}.+$/gm, '');

    // 6. Remove image-only lines (standalone images, often logos/icons)
    cleaned = cleaned.replace(/^\s*!\[.*?\]\(.*?\)\s*$/gm, '');

    // 7. Remove header/footer landmark patterns
    const navPatterns = [
        /^\s*(Home|About|Contact|Blog|News|FAQ|Careers|Sitemap|Search)\s*$/gmi,
        /^\s*#{1,3}\s*(Navigation|Menu|Footer|Header|Sidebar|Breadcrumb)/gmi,
        /^\s*Select Page\s*$/gmi,
    ];
    navPatterns.forEach(p => { cleaned = cleaned.replace(p, ''); });

    // 8. Remove social media link lines
    cleaned = cleaned.replace(/^\s*\[?(Facebook|Twitter|LinkedIn|Instagram|YouTube|Pinterest|TikTok|X)\]?\s*(\(.*?\))?\s*$/gmi, '');

    // 9. Remove phone/email-only lines (footer contact info)
    cleaned = cleaned.replace(/^\s*(\+?\d[\d\s\-()]{7,}|[\w.-]+@[\w.-]+\.\w+)\s*$/gm, '');

    // 10. Trim leading noise: remove everything before the first ## or # heading
    // that appears within the first 30 lines (likely nav/header above article)
    const lines = cleaned.split('\n');
    let firstHeadingIndex = -1;
    for (let i = 0; i < Math.min(lines.length, 30); i++) {
        if (/^#{1,3}\s+\S/.test(lines[i]) && !/(Navigation|Menu|Footer|Header)/i.test(lines[i])) {
            firstHeadingIndex = i;
            break;
        }
    }
    if (firstHeadingIndex > 3) {
        lines.splice(0, firstHeadingIndex);
        cleaned = lines.join('\n');
    }

    // 11. Trim trailing noise: remove everything after "---" or similar footer separators
    // followed by mostly link/boilerplate lines
    const footerSepIndex = cleaned.search(/\n---+\s*\n(?:[^\n]*\n){0,3}(?:\s*\[.+?\]\(.+?\)\s*\n){2,}/);
    if (footerSepIndex > cleaned.length * 0.5) {
        cleaned = cleaned.substring(0, footerSepIndex);
    }

    // Collapse excessive newlines (3 or more becomes 2)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned.trim();
};
