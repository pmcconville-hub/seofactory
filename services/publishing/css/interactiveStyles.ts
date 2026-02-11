/**
 * Interactive Element Styles
 *
 * Generates CSS for interactive elements like progress bars, focus styles,
 * smooth scrolling, and skip links.
 *
 * @module services/publishing/css/interactiveStyles
 */

/**
 * Generate interactive element CSS
 */
export function generateInteractiveStyles(): string {
  return `/* ============================================
   Interactive Element Styles
   ============================================ */

/* Progress Bar */
.ctc-progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--ctc-border);
  z-index: 1000;
}

.ctc-progress-fill {
  height: 100%;
  background: var(--ctc-primary);
  width: 0%;
  transition: width 100ms ease;
}

/* Focus styles */
.ctc-styled *:focus-visible {
  outline: 2px solid var(--ctc-primary);
  outline-offset: 2px;
}

/* Selection */
.ctc-styled ::selection {
  background: color-mix(in srgb, var(--ctc-primary) 20%, transparent);
  color: var(--ctc-text);
}

/* Smooth scrolling */
.ctc-styled {
  scroll-behavior: smooth;
}

/* Skip link */
.ctc-skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ctc-primary);
  color: var(--ctc-text-inverse);
  padding: var(--ctc-space-2) var(--ctc-space-4);
  border-radius: var(--ctc-radius-md);
  z-index: 9999;
  transition: top var(--ctc-duration-fast);
}

.ctc-skip-link:focus {
  top: var(--ctc-space-2);
}`;
}
