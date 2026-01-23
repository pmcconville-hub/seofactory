/**
 * Component Library for Blueprint Renderer
 *
 * Defines rendering functions for each component type.
 * All components preserve SEO content while applying visual presentation.
 *
 * @module services/publishing/renderer/componentLibrary
 */

import type { ComponentType, SectionEmphasis, SectionSpacing } from '../architect/blueprintTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface RenderContext {
  /** Unique section ID */
  sectionId: string;
  /** Original content to render */
  content: string;
  /** Optional heading */
  heading?: string;
  /** Heading level (2-6) */
  headingLevel: number;
  /** Visual emphasis level */
  emphasis: SectionEmphasis;
  /** Spacing around section */
  spacing: SectionSpacing;
  /** Whether section has background */
  hasBackground: boolean;
  /** Whether section has divider */
  hasDivider: boolean;
  /** Component variant */
  variant: string;
  /** Style hints from blueprint */
  styleHints?: {
    icon?: string;
    accentColor?: string;
    columns?: 2 | 3 | 4;
    animateOnScroll?: boolean;
  };
}

export interface RenderedComponent {
  html: string;
  jsonLd?: object;
}

export type ComponentRenderer = (ctx: RenderContext) => RenderedComponent;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate CSS classes for emphasis level
 */
function emphasisClasses(emphasis: SectionEmphasis): string {
  switch (emphasis) {
    case 'background':
      return 'ctc-section--bg opacity-90';
    case 'featured':
      return 'ctc-section--featured bg-[var(--ctc-gradient-subtle)] shadow-lg';
    case 'hero-moment':
      return 'ctc-section--hero bg-gradient-to-br from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white';
    default:
      return '';
  }
}

/**
 * Generate CSS classes for spacing
 */
function spacingClasses(spacing: SectionSpacing): string {
  switch (spacing) {
    case 'tight':
      return 'py-4 md:py-6';
    case 'breathe':
      return 'py-12 md:py-16';
    default:
      return 'py-8 md:py-10';
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(str: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, char => escapeMap[char]);
}

/**
 * Generate slug from text
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .substring(0, 50);
}

/**
 * Convert markdown content to HTML (basic conversion)
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // Headings (h3-h6 only, h1/h2 handled by section structure)
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="ctc-h6 text-sm font-semibold mt-4 mb-2">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="ctc-h5 text-base font-semibold mt-4 mb-2">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="ctc-h4 text-lg font-semibold mt-5 mb-3">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 class="ctc-h3 text-xl font-semibold mt-6 mb-3">$1</h3>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="ctc-link text-[var(--ctc-primary)] hover:underline">$1</a>');

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="ctc-figure my-6"><img src="$2" alt="$1" class="ctc-image rounded-lg max-w-full" loading="lazy"></figure>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="ctc-pre bg-[var(--ctc-surface)] p-4 rounded-lg overflow-x-auto my-4"><code class="ctc-code language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="ctc-inline-code bg-[var(--ctc-surface)] px-1.5 py-0.5 rounded text-sm">$1</code>');

  // Blockquotes
  html = html.replace(/^>\s+(.+)$/gm, '<blockquote class="ctc-blockquote border-l-4 border-[var(--ctc-primary)] pl-4 italic text-[var(--ctc-text-secondary)] my-4">$1</blockquote>');

  return html;
}

/**
 * Extract list items from content
 */
function extractListItems(content: string): string[] {
  const items: string[] = [];

  // Match bullet points (- or *)
  const bulletMatches = content.matchAll(/^[-*]\s+(.+)$/gm);
  for (const match of bulletMatches) {
    items.push(match[1].trim());
  }

  // Match numbered items
  if (items.length === 0) {
    const numberedMatches = content.matchAll(/^\d+\.\s+(.+)$/gm);
    for (const match of numberedMatches) {
      items.push(match[1].trim());
    }
  }

  return items;
}

/**
 * Extract FAQ items from content
 */
function extractFaqItems(content: string): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = [];

  // Try Q/A pattern
  const qaPattern = /(?:Q[:\.]?\s*)?([^\n?]+\?)\s*\n+(?:A[:\.]?\s*)?([^\n]+(?:\n(?!Q[:\.]?\s*)[^\n]+)*)/gi;
  let match;
  while ((match = qaPattern.exec(content)) !== null) {
    items.push({
      question: match[1].trim(),
      answer: match[2].trim().replace(/\n+/g, ' '),
    });
  }

  // Try heading-based pattern
  if (items.length === 0) {
    const headingPattern = /#{3,4}\s*([^\n?]+\?)\s*\n+([^\n#]+)/g;
    while ((match = headingPattern.exec(content)) !== null) {
      items.push({
        question: match[1].trim(),
        answer: match[2].trim(),
      });
    }
  }

  return items;
}

/**
 * Extract process steps from content
 */
function extractSteps(content: string): Array<{ title: string; description: string }> {
  const steps: Array<{ title: string; description: string }> = [];

  // Try numbered steps with descriptions
  const stepPattern = /(?:stap|step)\s*(\d+)[:\.]?\s*\*?\*?([^*\n]+)\*?\*?\s*[-–:]?\s*([^\n]+)?/gi;
  let match;
  while ((match = stepPattern.exec(content)) !== null) {
    steps.push({
      title: match[2].trim(),
      description: match[3]?.trim() || '',
    });
  }

  // Fall back to numbered list
  if (steps.length === 0) {
    const numberedMatches = content.matchAll(/^\d+\.\s+(.+)$/gm);
    for (const m of numberedMatches) {
      const parts = m[1].split(/[:\-–]/).map(p => p.trim());
      steps.push({
        title: parts[0] || m[1],
        description: parts[1] || '',
      });
    }
  }

  return steps;
}

// ============================================================================
// COMPONENT RENDERERS
// ============================================================================

const componentRenderers: Partial<Record<ComponentType, ComponentRenderer>> = {
  // ---------------------------------------------------------------------------
  // CORE CONTENT
  // ---------------------------------------------------------------------------

  'prose': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const bgStyles = ctx.hasBackground
      ? 'rounded-[var(--ctc-radius-lg)] p-8 bg-[var(--ctc-surface)]'
      : '';
    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-prose ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} ${bgStyles}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading)}" class="ctc-section-heading" style="font-weight: var(--ctc-heading-weight); font-family: var(--ctc-font-display); font-size: var(--ctc-text-2xl); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-prose-content">
    ${htmlContent}
  </div>
  ${ctx.hasDivider ? '<hr class="ctc-divider" style="border: 0; height: 1px; background: var(--ctc-border); margin-top: var(--ctc-space-10)">' : ''}
</section>`,
    };
  },

  'lead-paragraph': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-lead-paragraph ${spacingClasses(ctx.spacing)}">
  <div class="ctc-lead-content text-lg md:text-xl leading-relaxed text-[var(--ctc-text-secondary)]">
    ${htmlContent}
  </div>
</div>`,
    };
  },

  'pull-quote': (ctx) => {
    // Extract the main quote from content
    const quoteMatch = ctx.content.match(/"([^"]+)"|>?\s*([^\n]+)/);
    const quote = quoteMatch ? (quoteMatch[1] || quoteMatch[2]) : ctx.content;

    return {
      html: `
<figure id="${ctx.sectionId}" class="ctc-pull-quote ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} relative my-8">
  <span class="ctc-quote-mark absolute -top-4 -left-2 text-8xl text-[var(--ctc-primary)] opacity-20 font-serif" aria-hidden="true">"</span>
  <blockquote class="text-2xl md:text-3xl font-medium leading-snug text-center px-8 relative z-10">
    ${escapeHtml(quote)}
  </blockquote>
</figure>`,
    };
  },

  'highlight-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const variant = ctx.variant || 'info';
    const variantClasses: Record<string, string> = {
      'info': 'bg-blue-50 border-blue-200 text-blue-900',
      'warning': 'bg-amber-50 border-amber-200 text-amber-900',
      'success': 'bg-green-50 border-green-200 text-green-900',
      'tip': 'bg-purple-50 border-purple-200 text-purple-900',
    };

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-highlight-box ${variantClasses[variant] || variantClasses.info} border-l-4 rounded-r-lg p-6 my-8">
  ${ctx.heading ? `<h${ctx.headingLevel} class="font-semibold mb-2">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="prose prose-sm max-w-none">
    ${htmlContent}
  </div>
</aside>`,
    };
  },

  'callout': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);
    const icon = ctx.styleHints?.icon || '💡';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-callout ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)} flex gap-4 p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] border border-[var(--ctc-border)]">
  <div class="ctc-callout-icon text-3xl flex-shrink-0" aria-hidden="true">${icon}</div>
  <div class="ctc-callout-content">
    ${ctx.heading ? `<h${ctx.headingLevel} class="font-semibold mb-2">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
    <div class="prose prose-sm max-w-none">${htmlContent}</div>
  </div>
</aside>`,
    };
  },

  // ---------------------------------------------------------------------------
  // LIST PRESENTATIONS
  // ---------------------------------------------------------------------------

  'bullet-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const bgStyles = ctx.hasBackground
      ? 'padding: var(--ctc-space-8); border-radius: var(--ctc-radius-lg); background: var(--ctc-surface); border: 1px solid var(--ctc-border-subtle)'
      : '';

    const htmlContent = items.length > 0
      ? `<ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--ctc-space-4)">${items.map(item => `<li style="display: flex; align-items: flex-start; gap: var(--ctc-space-3); color: var(--ctc-text-secondary); line-height: 1.6"><span style="width: 8px; height: 8px; min-width: 8px; background: var(--ctc-primary); border-radius: 50%; margin-top: 8px"></span><span>${markdownToHtml(item)}</span></li>`).join('')}</ul>`
      : markdownToHtml(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-bullet-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="${bgStyles}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-xl); margin-bottom: var(--ctc-space-6); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</section>`,
    };
  },

  'numbered-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const htmlContent = items.length > 0
      ? `<ol class="ctc-list list-decimal pl-6 space-y-2">${items.map(item => `<li class="ctc-li">${markdownToHtml(item)}</li>`).join('')}</ol>`
      : markdownToHtml(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-numbered-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} id="${slugify(ctx.heading || '')}" class="text-xl font-semibold mb-4">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  ${htmlContent}
</div>`,
    };
  },

  'checklist': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-checklist ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" style="background: var(--ctc-surface); padding: var(--ctc-space-8); border-radius: var(--ctc-radius-xl); border: 1px solid var(--ctc-border-subtle)">
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-xl); margin-bottom: var(--ctc-space-6); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--ctc-space-4)">
    ${items.map(item => `
    <li style="display: flex; align-items: flex-start; gap: var(--ctc-space-4)">
      <span style="width: 24px; height: 24px; min-width: 24px; border-radius: var(--ctc-radius-md); background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; margin-top: 2px">✓</span>
      <span style="color: var(--ctc-text-secondary); line-height: 1.6">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</section>`,
    };
  },

  'icon-list': (ctx) => {
    const items = extractListItems(ctx.content);
    const icons = ['🔹', '🔸', '▸', '→', '•'];

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-icon-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ul class="space-y-4">
    ${items.map((item, i) => `
    <li class="ctc-icon-list-item flex items-start gap-4">
      <span class="ctc-icon w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center flex-shrink-0">${icons[i % icons.length]}</span>
      <span class="pt-1">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</div>`,
    };
  },

  'card-grid': (ctx) => {
    const items = extractListItems(ctx.content);
    const columns = ctx.styleHints?.columns || 3;
    const icons = ['✨', '🎯', '🚀', '💡', '⭐', '🔥', '💪', '🎨', '📈', '🎁'];

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-card-grid ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-2xl); text-align: center; margin-bottom: var(--ctc-space-10); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--ctc-space-6)">
    ${items.map((item, i) => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      const title = parts[0];
      const desc = parts[1] || '';
      return `
    <div class="ctc-card" style="padding: var(--ctc-space-8); border-radius: var(--ctc-radius-xl); background: var(--ctc-surface); box-shadow: var(--ctc-shadow-md); transition: all 0.2s ease; border: 1px solid var(--ctc-border-subtle)">
      <div style="width: 48px; height: 48px; border-radius: var(--ctc-radius-lg); background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); display: flex; align-items: center; justify-content: center; margin-bottom: var(--ctc-space-5); font-size: 1.5rem">${icons[i % icons.length]}</div>
      <h3 style="font-weight: 600; font-size: var(--ctc-text-lg); margin-bottom: var(--ctc-space-2); color: var(--ctc-text)">${markdownToHtml(title)}</h3>
      ${desc ? `<p style="font-size: var(--ctc-text-sm); color: var(--ctc-text-secondary); line-height: 1.6">${markdownToHtml(desc)}</p>` : ''}
    </div>`;
    }).join('')}
  </div>
</section>`,
    };
  },

  'feature-list': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-feature-list ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <dl class="space-y-4">
    ${items.map(item => {
      const parts = item.split(/[:\-–]/).map(p => p.trim());
      return `
    <div class="ctc-feature flex gap-4 p-4 rounded-lg bg-[var(--ctc-surface)]">
      <dt class="ctc-feature-name font-semibold text-[var(--ctc-primary)] min-w-[120px]">${markdownToHtml(parts[0])}</dt>
      <dd class="ctc-feature-desc text-[var(--ctc-text-secondary)]">${markdownToHtml(parts[1] || '')}</dd>
    </div>`;
    }).join('')}
  </dl>
</div>`,
    };
  },

  'stat-cards': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<div id="${ctx.sectionId}" class="ctc-stat-cards ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
    ${items.map(item => {
      // Try to extract number and label
      const match = item.match(/(\d+[%+]?|\d+\.\d+)/);
      const stat = match ? match[1] : '•';
      const label = item.replace(/\d+[%+]?|\d+\.\d+/, '').trim() || item;
      return `
    <div class="ctc-stat text-center p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)]">
      <div class="ctc-stat-value text-4xl font-bold text-[var(--ctc-primary)]">${escapeHtml(stat)}</div>
      <div class="ctc-stat-label text-sm text-[var(--ctc-text-muted)] mt-2">${markdownToHtml(label)}</div>
    </div>`;
    }).join('')}
  </div>
</div>`,
    };
  },

  // ---------------------------------------------------------------------------
  // PROCESS & STRUCTURE
  // ---------------------------------------------------------------------------

  'timeline-vertical': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-vertical ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-2xl); text-align: center; margin-bottom: var(--ctc-space-10); color: var(--ctc-text)" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div style="position: relative; padding-left: var(--ctc-space-12); max-width: 700px; margin: 0 auto">
    <div style="position: absolute; left: 16px; top: 8px; bottom: 8px; width: 3px; background: linear-gradient(to bottom, var(--ctc-primary), var(--ctc-primary-light)); border-radius: 2px"></div>
    ${steps.map((step, i) => `
    <div style="position: relative; padding-bottom: var(--ctc-space-8)${i === steps.length - 1 ? '; padding-bottom: 0' : ''}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div style="position: absolute; left: calc(-1 * var(--ctc-space-12) + 4px); width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, var(--ctc-primary), var(--ctc-primary-light)); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15)">${i + 1}</div>
      <div style="background: var(--ctc-surface); padding: var(--ctc-space-5); border-radius: var(--ctc-radius-lg); border: 1px solid var(--ctc-border-subtle)">
        <h3 style="font-weight: 600; font-size: var(--ctc-text-lg); margin-bottom: var(--ctc-space-2); color: var(--ctc-text)" itemprop="name">${markdownToHtml(step.title)}</h3>
        <p style="color: var(--ctc-text-secondary); line-height: 1.6; margin: 0" itemprop="text">${markdownToHtml(step.description)}</p>
      </div>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Process',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  'timeline-zigzag': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-timeline-zigzag ${emphasisClasses(ctx.emphasis)} ${spacingClasses('breathe')}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-3xl font-bold text-center mb-12" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="ctc-timeline-zigzag-track relative before:absolute before:left-1/2 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-[var(--ctc-primary)] before:to-[var(--ctc-primary-light)] before:-translate-x-1/2">
    ${steps.map((step, i) => {
      const isLeft = i % 2 === 0;
      return `
    <div class="ctc-timeline-zigzag-step relative flex mb-12 ${isLeft ? '' : 'flex-row-reverse'}" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <div class="flex-1 ${isLeft ? 'pr-12 text-right' : 'pl-12 text-left'}">
        <div class="ctc-step-card inline-block max-w-md p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-lg">
          <h3 class="ctc-step-title text-xl font-semibold mb-2" itemprop="name">${markdownToHtml(step.title)}</h3>
          <p class="ctc-step-desc text-[var(--ctc-text-secondary)]" itemprop="text">${markdownToHtml(step.description)}</p>
        </div>
      </div>
      <div class="ctc-step-node absolute left-1/2 -translate-x-1/2 z-10">
        <span class="w-12 h-12 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center text-lg font-bold shadow-lg">${i + 1}</span>
      </div>
      <div class="flex-1"></div>
    </div>`;
    }).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Process',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  'steps-numbered': (ctx) => {
    const steps = extractSteps(ctx.content);
    if (steps.length === 0) {
      return componentRenderers['numbered-list']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-steps-numbered ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/HowTo">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-xl font-semibold mb-6" itemprop="name">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <ol class="ctc-steps-list space-y-4">
    ${steps.map((step, i) => `
    <li class="ctc-step flex items-start gap-4 p-4 rounded-lg bg-[var(--ctc-surface)]" itemscope itemprop="step" itemtype="https://schema.org/HowToStep">
      <meta itemprop="position" content="${i + 1}">
      <span class="ctc-step-num w-8 h-8 rounded-full bg-[var(--ctc-primary)] text-white flex items-center justify-center font-bold flex-shrink-0">${i + 1}</span>
      <div>
        <h4 class="ctc-step-title font-semibold" itemprop="name">${markdownToHtml(step.title)}</h4>
        ${step.description ? `<p class="ctc-step-desc text-sm text-[var(--ctc-text-secondary)] mt-1" itemprop="text">${markdownToHtml(step.description)}</p>` : ''}
      </div>
    </li>`).join('')}
  </ol>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: ctx.heading || 'Steps',
        step: steps.map((step, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: step.title,
          text: step.description,
        })),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // FAQ COMPONENTS
  // ---------------------------------------------------------------------------

  'faq-accordion': (ctx) => {
    const faqs = extractFaqItems(ctx.content);
    if (faqs.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-faq-accordion ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/FAQPage">
  ${ctx.heading ? `<h${ctx.headingLevel} style="font-family: var(--ctc-font-display); font-weight: var(--ctc-heading-weight); font-size: var(--ctc-text-2xl); text-align: center; margin-bottom: var(--ctc-space-10); color: var(--ctc-text)">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div style="max-width: 800px; margin: 0 auto; background: var(--ctc-surface); border-radius: var(--ctc-radius-xl); overflow: hidden; border: 1px solid var(--ctc-border-subtle)">
    ${faqs.map((faq, i) => `
    <div style="border-bottom: 1px solid var(--ctc-border-subtle)${i === faqs.length - 1 ? '; border-bottom: none' : ''}" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 style="margin: 0">
        <button type="button" aria-expanded="false" aria-controls="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-trigger" style="width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left; padding: var(--ctc-space-6); background: transparent; border: none; cursor: pointer; font-size: var(--ctc-text-lg); font-weight: 600; color: var(--ctc-text); transition: color 0.2s ease">
          <span itemprop="name">${markdownToHtml(faq.question)}</span>
          <span class="ctc-faq-icon" style="font-size: 1.5rem; color: var(--ctc-primary); transition: transform 0.2s ease; flex-shrink: 0; margin-left: var(--ctc-space-4)" aria-hidden="true">+</span>
        </button>
      </h3>
      <div id="faq-answer-${ctx.sectionId}-${i}" class="ctc-faq-answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer" hidden>
        <div style="padding: 0 var(--ctc-space-6) var(--ctc-space-6); color: var(--ctc-text-secondary); line-height: 1.7" itemprop="text">${markdownToHtml(faq.answer)}</div>
      </div>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    };
  },

  'faq-cards': (ctx) => {
    const faqs = extractFaqItems(ctx.content);
    if (faqs.length === 0) {
      return componentRenderers['prose']!(ctx);
    }

    const columns = ctx.styleHints?.columns || 2;

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-faq-cards ${emphasisClasses(ctx.emphasis)} ${spacingClasses(ctx.spacing)}" itemscope itemtype="https://schema.org/FAQPage">
  ${ctx.heading ? `<h${ctx.headingLevel} class="text-2xl font-semibold text-center mb-8">${escapeHtml(ctx.heading)}</h${ctx.headingLevel}>` : ''}
  <div class="grid md:grid-cols-${columns} gap-6">
    ${faqs.map(faq => `
    <div class="ctc-faq-card p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] shadow-sm" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <h3 class="ctc-faq-question font-semibold mb-3" itemprop="name">${markdownToHtml(faq.question)}</h3>
      <div class="ctc-faq-answer text-[var(--ctc-text-secondary)]" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <p itemprop="text">${markdownToHtml(faq.answer)}</p>
      </div>
    </div>`).join('')}
  </div>
</section>`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // CONVERSION COMPONENTS
  // ---------------------------------------------------------------------------

  'cta-banner': (ctx) => {
    const isHeroMoment = ctx.emphasis === 'hero-moment';

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-banner ${isHeroMoment ? 'bg-gradient-to-r from-[var(--ctc-primary)] to-[var(--ctc-primary-light)] text-white' : 'bg-[var(--ctc-surface)] border border-[var(--ctc-border)]'} rounded-[var(--ctc-radius-xl)] p-8 md:p-12 text-center my-12">
  ${ctx.heading ? `<h2 class="ctc-cta-title text-2xl md:text-3xl font-bold mb-4">${escapeHtml(ctx.heading)}</h2>` : ''}
  <div class="ctc-cta-text text-lg opacity-90 mb-6 max-w-2xl mx-auto">
    ${markdownToHtml(ctx.content)}
  </div>
  <div class="ctc-cta-actions flex gap-4 justify-center flex-wrap">
    <a href="#contact" class="ctc-btn ctc-btn-${isHeroMoment ? 'white' : 'primary'} px-8 py-3 rounded-[var(--ctc-radius-full)] font-semibold ${isHeroMoment ? 'bg-white text-[var(--ctc-primary)]' : 'bg-[var(--ctc-primary)] text-white'} hover:opacity-90 transition-opacity">
      Contact
    </a>
  </div>
</aside>`,
    };
  },

  'cta-inline': (ctx) => {
    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-cta-inline flex items-center justify-between gap-6 p-6 rounded-[var(--ctc-radius-lg)] bg-[var(--ctc-surface)] border border-[var(--ctc-border)] my-8">
  <div class="ctc-cta-text">
    ${ctx.heading ? `<strong class="block mb-1">${escapeHtml(ctx.heading)}</strong>` : ''}
    <span class="text-[var(--ctc-text-secondary)]">${markdownToHtml(ctx.content)}</span>
  </div>
  <a href="#contact" class="ctc-btn ctc-btn-primary px-6 py-2 rounded-[var(--ctc-radius-full)] bg-[var(--ctc-primary)] text-white font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
    Meer Info
  </a>
</aside>`,
    };
  },

  // ---------------------------------------------------------------------------
  // SPECIALIZED COMPONENTS
  // ---------------------------------------------------------------------------

  'key-takeaways': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-key-takeaways" style="background: linear-gradient(135deg, var(--ctc-primary) 0%, var(--ctc-primary-dark) 100%); color: white; padding: var(--ctc-space-10); border-radius: var(--ctc-radius-2xl); margin: var(--ctc-space-12) 0; position: relative; overflow: hidden">
  <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: white; opacity: 0.05; border-radius: 50%"></div>
  <div style="position: absolute; bottom: -30px; left: 10%; width: 100px; height: 100px; background: white; opacity: 0.05; border-radius: 50%"></div>
  <h2 style="font-family: var(--ctc-font-display); font-size: var(--ctc-text-2xl); font-weight: 700; margin-bottom: var(--ctc-space-6); display: flex; align-items: center; gap: var(--ctc-space-3); position: relative; z-index: 1">
    <span style="width: 40px; height: 40px; background: white; color: var(--ctc-primary); border-radius: var(--ctc-radius-lg); display: flex; align-items: center; justify-content: center; font-size: 1.25rem">💡</span>
    ${escapeHtml(ctx.heading || 'Belangrijkste Punten')}
  </h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--ctc-space-4); position: relative; z-index: 1">
    ${items.map(item => `
    <div style="display: flex; align-items: flex-start; gap: var(--ctc-space-4); background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(10px); padding: var(--ctc-space-5); border-radius: var(--ctc-radius-lg); border: 1px solid rgba(255, 255, 255, 0.2)">
      <span style="width: 28px; height: 28px; min-width: 28px; border-radius: 50%; background: white; color: var(--ctc-primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem">✓</span>
      <span style="color: rgba(255, 255, 255, 0.95); line-height: 1.6">${markdownToHtml(item)}</span>
    </div>`).join('')}
  </div>
</aside>`,
    };
  },

  'summary-box': (ctx) => {
    const htmlContent = markdownToHtml(ctx.content);

    return {
      html: `
<aside id="${ctx.sectionId}" class="ctc-summary-box border-2 border-[var(--ctc-primary)] rounded-[var(--ctc-radius-lg)] p-6 my-8">
  <h2 class="ctc-summary-title text-lg font-semibold text-[var(--ctc-primary)] mb-4 flex items-center gap-2">
    <span>📋</span>
    ${escapeHtml(ctx.heading || 'Samenvatting')}
  </h2>
  <div class="ctc-summary-content prose prose-sm max-w-none">
    ${htmlContent}
  </div>
</aside>`,
    };
  },

  'sources-section': (ctx) => {
    const items = extractListItems(ctx.content);

    return {
      html: `
<section id="${ctx.sectionId}" class="ctc-sources-section p-6 bg-[var(--ctc-surface)] rounded-[var(--ctc-radius-lg)] border border-[var(--ctc-border)] my-8">
  <h2 class="ctc-sources-title text-xl font-semibold mb-4">${escapeHtml(ctx.heading || 'Bronnen')}</h2>
  <ul class="ctc-sources-list space-y-2">
    ${items.map(item => `
    <li class="ctc-source-item flex items-start gap-2">
      <span class="text-[var(--ctc-primary)]">•</span>
      <span class="text-[var(--ctc-text-secondary)]">${markdownToHtml(item)}</span>
    </li>`).join('')}
  </ul>
</section>`,
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get renderer for a component type
 */
export function getComponentRenderer(type: ComponentType): ComponentRenderer {
  return componentRenderers[type] || componentRenderers['prose']!;
}

/**
 * Check if a component type has a dedicated renderer
 */
export function hasRenderer(type: ComponentType): boolean {
  return type in componentRenderers;
}

/**
 * Get all available component types
 */
export function getAvailableComponents(): ComponentType[] {
  return Object.keys(componentRenderers) as ComponentType[];
}

export { markdownToHtml, extractListItems, extractFaqItems, extractSteps };
