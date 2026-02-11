/**
 * CSS Custom Property / Design Token Generation
 *
 * Generates CSS custom properties from resolved design tokens.
 *
 * @module services/publishing/css/tokenGenerator
 */

import { tokensToCSS, type ResolvedTokens } from '../tokenResolver';

/**
 * Generate CSS custom properties from design tokens
 */
export function generateTokenVariables(tokens: ResolvedTokens): string {
  return `/* ============================================
   CTC Design System - CSS Custom Properties
   Generated from design personality tokens
   ============================================ */

${tokensToCSS(tokens, '.ctc-root, .ctc-styled')}

:root {
  ${Object.entries(tokens)
      .filter(([key]) => key.startsWith('--ctc-'))
      .map(([key, value]) => `${key}: ${value};`)
      .join('\n  ')}
}`;
}
