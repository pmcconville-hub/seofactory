/**
 * CSS Reset / Normalize Styles
 *
 * Generates scoped reset styles to prevent style leakage.
 *
 * @module services/publishing/css/resetStyles
 */

/**
 * Generate scoped CSS reset
 */
export function generateScopedReset(): string {
  return `/* ============================================
   Scoped Reset - Prevents style leakage
   ============================================ */

.ctc-root,
.ctc-styled {
  box-sizing: border-box;
  line-height: var(--ctc-line-height-body, 1.6);
  font-family: var(--ctc-font-body);
  color: var(--ctc-text);
  background-color: var(--ctc-background);
  min-height: 100%;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.ctc-root *,
.ctc-styled *,
.ctc-root *::before,
.ctc-styled *::before,
.ctc-root *::after,
.ctc-styled *::after {
  box-sizing: inherit;
}

.ctc-root img,
.ctc-styled img {
  max-width: 100%;
  height: auto;
  display: block;
}

.ctc-root a,
.ctc-styled a {
  color: inherit;
  text-decoration: inherit;
}

.ctc-root button,
.ctc-styled button {
  font: inherit;
  color: inherit;
  background: none;
  border: none;
  cursor: pointer;
}`;
}
