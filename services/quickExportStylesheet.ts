// =============================================================================
// Quick Export Stylesheet — Professional HTML export styling
// =============================================================================
// Replaces the generic Georgia/serif CSS in buildFullHtmlDocument() with a
// modern, responsive, dark-mode-aware stylesheet for professional blog output.

/**
 * Professional CSS stylesheet for Quick Export HTML documents.
 * Features: system font stack, responsive design, dark mode, print styles, TOC.
 */
export const QUICK_EXPORT_CSS = `
/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 18px; -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }

body {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.7;
  max-width: 680px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  color: #242424;
  background: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Semantic Structure */
main { display: block; }
article { display: block; }
section { margin-bottom: 2rem; }

/* Typography — Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: Georgia, 'Times New Roman', serif;
  color: #242424;
  line-height: 1.3;
  font-weight: 700;
}

h1 { font-size: 2rem; margin-top: 0; margin-bottom: 0.75rem; line-height: 1.2; }
h2 { font-size: 1.5rem; margin-top: 2.5rem; margin-bottom: 0.75rem; padding-bottom: 0.4rem; border-bottom: 1px solid #e5e5e5; }
h3 { font-size: 1.2rem; margin-top: 2rem; margin-bottom: 0.5rem; }
h4 { font-size: 1.05rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #444; }

/* Typography — Body */
p { margin: 1rem 0; }
strong { font-weight: 600; }
em { font-style: italic; }

/* Links */
a { color: #1a8917; text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
a:hover { border-bottom-color: #1a8917; }
a:focus-visible { outline: 2px solid #1a8917; outline-offset: 2px; border-radius: 2px; }

/* Lists */
ul, ol { padding-left: 1.5rem; margin: 1rem 0; }
li { margin: 0.4rem 0; }
li > ul, li > ol { margin: 0.25rem 0; }

/* Images & Figures */
img { max-width: 100%; height: auto; border-radius: 4px; display: block; }
figure { margin: 2rem 0; text-align: center; }
figure img { margin: 0 auto; }
figcaption { font-size: 0.85rem; color: #666; font-style: italic; margin-top: 0.5rem; line-height: 1.4; }

/* Tables */
.table-wrapper { overflow-x: auto; margin: 1.5rem 0; -webkit-overflow-scrolling: touch; }
table { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid #e5e5e5; }
th { font-weight: 600; color: #242424; border-bottom-width: 2px; }
tr:nth-child(even) { background: #fafafa; }

/* Code */
code {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.88em;
  background: #f5f5f5;
  padding: 0.15em 0.35em;
  border-radius: 3px;
}
pre {
  background: #f5f5f5;
  padding: 1rem 1.25rem;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1.5rem 0;
  line-height: 1.5;
}
pre code { background: none; padding: 0; font-size: 0.85rem; }

/* Blockquotes */
blockquote {
  border-left: 3px solid #242424;
  margin: 1.5rem 0;
  padding: 0.5rem 1.25rem;
  font-style: italic;
  color: #555;
}
blockquote p { margin: 0.5rem 0; }

/* Horizontal Rule */
hr { border: none; border-top: 1px solid #e5e5e5; margin: 2rem 0; }

/* Byline */
.byline {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e5e5;
}
.byline time { color: #888; }

/* Table of Contents */
.toc {
  background: #f7f7f7;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0 2rem;
}
.toc-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin-bottom: 0.75rem;
}
.toc ul { list-style: none; padding-left: 0; margin: 0; }
.toc li { margin: 0.3rem 0; }
.toc li.toc-h3 { padding-left: 1.25rem; }
.toc a { color: #242424; font-size: 0.9rem; border-bottom: none; }
.toc a:hover { color: #1a8917; }

/* Related Topics */
.related-topics {
  background: #f7f7f7;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  padding: 1.5rem 2rem;
  margin-top: 2.5rem;
}
.related-topics h2 { border: none; margin-top: 0; font-size: 1.15rem; padding-bottom: 0.25rem; }

/* Image Placeholders */
.image-placeholder {
  border: 2px dashed #ccc;
  border-radius: 8px;
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  padding: 2rem;
  margin: 1.5rem 0;
  text-align: center;
}
.image-placeholder .placeholder-content { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: #999; }
.image-placeholder .placeholder-label { font-size: 0.9rem; font-weight: 500; color: #666; }
.image-placeholder figcaption { margin-top: 1rem; font-size: 0.85rem; color: #666; font-style: italic; }

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  body { background: #121212; color: #e0e0e0; }
  h1, h2, h3, h4, h5, h6 { color: #f0f0f0; }
  h2 { border-bottom-color: #333; }
  h4 { color: #bbb; }
  a { color: #4caf50; }
  a:hover { border-bottom-color: #4caf50; }
  a:focus-visible { outline-color: #4caf50; }
  th { color: #e0e0e0; border-bottom-color: #444; }
  td { border-bottom-color: #333; }
  tr:nth-child(even) { background: #1a1a1a; }
  code { background: #1e1e1e; color: #ddd; }
  pre { background: #1e1e1e; }
  blockquote { border-left-color: #e0e0e0; color: #bbb; }
  hr { border-top-color: #333; }
  .byline { color: #999; border-bottom-color: #333; }
  .byline time { color: #777; }
  .toc { background: #1a1a1a; }
  .toc-title { color: #777; }
  .toc a { color: #e0e0e0; }
  .toc a:hover { color: #4caf50; }
  .related-topics { background: #1a1a1a; border-color: #333; }
  figcaption { color: #999; }
  .image-placeholder { border-color: #444; background: linear-gradient(135deg, #1a1a1a, #222); }
  .image-placeholder .placeholder-content { color: #666; }
  .image-placeholder .placeholder-label { color: #999; }
}

/* Responsive — Tablet */
@media (max-width: 768px) {
  html { font-size: 17px; }
  body { padding: 1.5rem 1rem; }
  h1 { font-size: 1.75rem; }
  h2 { font-size: 1.35rem; }
}

/* Responsive — Mobile */
@media (max-width: 640px) {
  html { font-size: 16px; }
  body { padding: 1rem 0.75rem; }
  h1 { font-size: 1.5rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }
  .toc { padding: 1rem; }
}

/* Print Styles */
@media print {
  body { max-width: 100%; padding: 0; color: #000; background: #fff; font-size: 12pt; }
  a { color: #000; border-bottom: none; }
  a[href]::after { content: " (" attr(href) ")"; font-size: 0.8em; color: #666; }
  a[href^="#"]::after { content: ""; }
  h1, h2, h3, h4, img, figure, blockquote, table { page-break-inside: avoid; }
  h2, h3, h4 { page-break-after: avoid; }
  .toc { background: #f0f0f0; }
  .byline { border-bottom-color: #ccc; }
  pre { white-space: pre-wrap; word-wrap: break-word; }
}
`.trim();


/**
 * Generate a URL-friendly slug from a heading text.
 * Handles duplicates by appending -2, -3, etc.
 */
function slugify(text: string, usedSlugs: Set<string>): string {
  let slug = text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')       // strip HTML tags
    .replace(/&[^;]+;/g, '')       // strip HTML entities
    .replace(/[^\w\s-]/g, '')      // remove non-word chars
    .replace(/\s+/g, '-')          // spaces to hyphens
    .replace(/-+/g, '-')           // collapse hyphens
    .replace(/^-|-$/g, '')         // trim hyphens
    .substring(0, 80);             // limit length

  if (!slug) slug = 'section';

  let finalSlug = slug;
  let counter = 2;
  while (usedSlugs.has(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  usedSlugs.add(finalSlug);
  return finalSlug;
}


/**
 * Post-process HTML to inject `id` attributes on <h2>–<h4> tags for anchor linking.
 * Handles duplicate slugs with -2, -3 suffixes.
 */
export function injectHeadingIds(html: string): string {
  const usedSlugs = new Set<string>();

  return html.replace(
    /<(h[2-4])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (_match, tag: string, attrs: string, content: string) => {
      // Don't overwrite existing id
      if (/\bid\s*=\s*["']/i.test(attrs)) return _match;

      const textContent = content.replace(/<[^>]+>/g, '').trim();
      const id = slugify(textContent, usedSlugs);
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    }
  );
}


/**
 * Extract <h2> and <h3> headings from HTML and generate a Table of Contents.
 * Returns empty string if fewer than 4 H2 headings are found.
 */
export function generateTableOfContentsHtml(html: string): string {
  const headingRegex = /<(h[23])[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings: { level: number; id: string; text: string }[] = [];

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1].charAt(1), 10);
    const id = match[2];
    const text = match[3].replace(/<[^>]+>/g, '').trim();
    headings.push({ level, id, text });
  }

  // Only generate TOC if there are 4+ H2 headings
  const h2Count = headings.filter(h => h.level === 2).length;
  if (h2Count < 4) return '';

  const items = headings
    .map(h => {
      const cls = h.level === 3 ? ' class="toc-h3"' : '';
      return `<li${cls}><a href="#${h.id}">${h.text}</a></li>`;
    })
    .join('\n    ');

  return `<nav class="toc">
  <div class="toc-title">Contents</div>
  <ul>
    ${items}
  </ul>
</nav>`;
}
