/**
 * Typography Styles
 *
 * Generates font/text styles including headings, paragraphs, links,
 * lists, blockquotes, code, tables, and section styling.
 *
 * @module services/publishing/css/typography
 */

/**
 * Generate typography system CSS
 */
export function generateTypographyStyles(): string {
  return `/* ============================================
   Typography System
   ============================================ */

.ctc-styled {
  font-size: var(--ctc-text-base);
  line-height: var(--ctc-line-height-body);
}

/* Headings */
.ctc-styled h1,
.ctc-styled h2,
.ctc-styled h3,
.ctc-styled h4,
.ctc-styled h5,
.ctc-styled h6 {
  font-family: var(--ctc-font-display);
  font-weight: var(--ctc-heading-weight);
  letter-spacing: var(--ctc-heading-letter-spacing);
  text-transform: var(--ctc-heading-case);
  line-height: 1.25;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: var(--ctc-text);
}

.ctc-styled h1 { font-size: var(--ctc-text-5xl); }
.ctc-styled h2 { font-size: var(--ctc-text-3xl); }
.ctc-styled h3 { font-size: var(--ctc-text-2xl); }
.ctc-styled h4 { font-size: var(--ctc-text-xl); }
.ctc-styled h5 { font-size: var(--ctc-text-lg); }
.ctc-styled h6 { font-size: var(--ctc-text-base); }

/* Paragraphs */
.ctc-styled p {
  margin-bottom: var(--ctc-paragraph-spacing);
  color: var(--ctc-text-secondary);
}

/* Links */
.ctc-styled a:not(.ctc-btn) {
  color: var(--ctc-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color var(--ctc-duration-fast) var(--ctc-ease-default);
}

.ctc-styled a:not(.ctc-btn):hover {
  opacity: 0.8;
}

/* Lists */
.ctc-styled ul,
.ctc-styled ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.ctc-styled li {
  margin-bottom: 0.5em;
  color: var(--ctc-text-secondary);
}

.ctc-styled ul > li {
  list-style-type: disc;
}

.ctc-styled ol > li {
  list-style-type: decimal;
}

/* Blockquotes */
.ctc-styled blockquote:not(.ctc-testimonial) {
  border-left: 4px solid var(--ctc-primary);
  padding-left: 1.5em;
  margin: 1.5em 0;
  font-style: italic;
  color: var(--ctc-text-muted);
}

/* Code */
.ctc-styled code:not(pre code) {
  font-family: var(--ctc-font-mono);
  font-size: 0.875em;
  background: var(--ctc-surface);
  padding: 0.125em 0.375em;
  border-radius: var(--ctc-radius-sm);
}

.ctc-styled pre {
  font-family: var(--ctc-font-mono);
  font-size: 0.875em;
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 1em;
  border-radius: var(--ctc-radius-lg);
  overflow-x: auto;
  margin: 1.5em 0;
}

.ctc-styled pre code {
  background: none;
  padding: 0;
}

/* Tables */
.ctc-styled table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  font-size: 0.875em;
}

.ctc-styled th,
.ctc-styled td {
  padding: 0.75em 1em;
  border-bottom: 1px solid var(--ctc-border);
  text-align: left;
}

.ctc-styled th {
  font-weight: 600;
  background: var(--ctc-surface);
  color: var(--ctc-text);
}

.ctc-styled tr:hover td {
  background: var(--ctc-surface);
}

/* Horizontal rule */
.ctc-styled hr {
  border: none;
  height: 1px;
  background: var(--ctc-border);
  margin: 2em 0;
}

/* Main content area */
.ctc-styled .ctc-main {
  max-width: 900px;
  margin: 0 auto;
  padding: var(--ctc-space-8) var(--ctc-space-6);
}

.ctc-styled .ctc-article {
  background: var(--ctc-background);
}

/* Section styling */
.ctc-styled .ctc-section,
.ctc-styled [class^="ctc-prose"],
.ctc-styled [class^="ctc-bullet-list"],
.ctc-styled [class^="ctc-numbered-list"],
.ctc-styled [class^="ctc-checklist"],
.ctc-styled [class^="ctc-icon-list"],
.ctc-styled [class^="ctc-card-grid"],
.ctc-styled [class^="ctc-feature-list"],
.ctc-styled [class^="ctc-stat-cards"],
.ctc-styled [class^="ctc-timeline"],
.ctc-styled [class^="ctc-steps"],
.ctc-styled [class^="ctc-faq"],
.ctc-styled [class^="ctc-key-takeaways"],
.ctc-styled [class^="ctc-summary-box"],
.ctc-styled [class^="ctc-callout"],
.ctc-styled [class^="ctc-highlight-box"],
.ctc-styled [class^="ctc-sources-section"],
.ctc-styled [class^="ctc-cta"],
.ctc-styled [class^="ctc-author-box"] {
  margin-bottom: var(--ctc-space-10);
}

/* Prose content improvements */
.ctc-styled .ctc-prose-content {
  font-size: var(--ctc-text-lg);
  line-height: 1.8;
}

.ctc-styled .ctc-prose-content p {
  margin-bottom: 1.5em;
}

/* Better section headings */
.ctc-styled .ctc-section-heading {
  position: relative;
  padding-bottom: var(--ctc-space-4);
  margin-bottom: var(--ctc-space-6);
}

.ctc-styled .ctc-section-heading::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 60px;
  height: 3px;
  background: var(--ctc-primary);
  border-radius: var(--ctc-radius-full);
}`;
}
