/**
 * Dark Mode Overrides
 *
 * Generates dark mode CSS using prefers-color-scheme and data-theme attributes.
 *
 * @module services/publishing/css/darkMode
 */

/**
 * Generate dark mode CSS overrides
 */
export function generateDarkModeStyles(): string {
  return `/* ============================================
   Dark Mode Support
   ============================================ */

@media (prefers-color-scheme: dark) {
  .ctc-root:not([data-theme="light"]),
  .ctc-styled:not([data-theme="light"]) {
    --ctc-background: #0f172a;
    --ctc-surface: #1e293b;
    --ctc-surface-elevated: #334155;
    --ctc-text: #f1f5f9;
    --ctc-text-secondary: #cbd5e1;
    --ctc-text-muted: #94a3b8;
    --ctc-border: #334155;
    --ctc-border-subtle: #1e293b;
  }
}

[data-theme="dark"] {
  --ctc-background: #0f172a;
  --ctc-surface: #1e293b;
  --ctc-surface-elevated: #334155;
  --ctc-text: #f1f5f9;
  --ctc-text-secondary: #cbd5e1;
  --ctc-text-muted: #94a3b8;
  --ctc-border: #334155;
  --ctc-border-subtle: #1e293b;
}`;
}
