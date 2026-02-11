/**
 * Responsive Styles
 *
 * Generates media queries and responsive design adjustments.
 *
 * @module services/publishing/css/responsive
 */

/**
 * Generate responsive CSS adjustments
 */
export function generateResponsiveStyles(): string {
  return `/* ============================================
   Responsive Adjustments
   ============================================ */

@media (max-width: 768px) {
  .ctc-styled h1 { font-size: var(--ctc-text-4xl); }
  .ctc-styled h2 { font-size: var(--ctc-text-2xl); }
  .ctc-styled h3 { font-size: var(--ctc-text-xl); }

  .ctc-hero--centered {
    padding: var(--ctc-space-12) var(--ctc-space-4);
  }

  .ctc-hero-title {
    font-size: var(--ctc-text-3xl) !important;
  }

  .ctc-hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .ctc-hero-actions .ctc-btn {
    width: 100%;
    justify-content: center;
  }

  .ctc-cta-section {
    padding: var(--ctc-space-8) var(--ctc-space-4);
  }

  .ctc-testimonials-grid {
    grid-template-columns: 1fr !important;
  }

  .ctc-benefits-grid .ctc-card {
    text-align: left;
  }

  .ctc-toc--floating {
    display: none;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .ctc-hero--split {
    grid-template-columns: 1fr;
    text-align: center;
  }
}`;
}
