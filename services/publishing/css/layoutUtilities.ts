/**
 * Layout Utilities
 *
 * Generates grid, flexbox, and spacing utility CSS classes.
 *
 * @module services/publishing/css/layoutUtilities
 */

/**
 * Generate layout utility CSS
 */
export function generateLayoutUtilities(): string {
  return `/* ============================================
   Layout Utilities
   ============================================ */

/* Container */
.ctc-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--ctc-space-4);
}

.ctc-container--narrow {
  max-width: 768px;
}

.ctc-container--wide {
  max-width: 1400px;
}

/* Layout with sidebar */
.ctc-layout--with-sidebar,
.ctc-layout-sidebar {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--ctc-space-8);
  align-items: start;
  position: relative;
}

.ctc-sidebar {
  position: sticky;
  top: 1rem;
  height: fit-content;
}

.ctc-sidebar .ctc-toc--sidebar {
  position: relative;
  top: 0;
  width: 100%;
}

.ctc-content-wrapper {
  min-width: 0;
}

@media (max-width: 1024px) {
  .ctc-layout--with-sidebar,
  .ctc-layout-sidebar {
    grid-template-columns: 1fr;
    display: block;
  }

  .ctc-layout--with-sidebar > .ctc-toc--sidebar,
  .ctc-sidebar {
    display: none;
  }
}

/* Section spacing */
.ctc-section {
  margin-bottom: var(--ctc-space-12);
}

/* Grid utilities */
.ctc-grid {
  display: grid;
  gap: var(--ctc-space-6);
}

.ctc-grid-2 { grid-template-columns: repeat(2, 1fr); }
.ctc-grid-3 { grid-template-columns: repeat(3, 1fr); }
.ctc-grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
  .ctc-grid-2,
  .ctc-grid-3,
  .ctc-grid-4 {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .ctc-grid-3,
  .ctc-grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Flexbox utilities */
.ctc-flex { display: flex; }
.ctc-flex-col { flex-direction: column; }
.ctc-items-center { align-items: center; }
.ctc-items-start { align-items: flex-start; }
.ctc-justify-center { justify-content: center; }
.ctc-justify-between { justify-content: space-between; }
.ctc-gap-2 { gap: var(--ctc-space-2); }
.ctc-gap-4 { gap: var(--ctc-space-4); }
.ctc-gap-6 { gap: var(--ctc-space-6); }
.ctc-gap-8 { gap: var(--ctc-space-8); }
.ctc-flex-wrap { flex-wrap: wrap; }`;
}
