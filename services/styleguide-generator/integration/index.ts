// services/styleguide-generator/integration/index.ts
// Bridge utilities for integrating DesignTokenSet with existing systems.

export {
  toRendererTokens,
  generateCompiledCss,
  toBrandDesignSystem,
  type RendererDesignTokens,
} from './rendererBridge';

export {
  getColorExpectations,
  getTypographyExpectations,
  isOnBrandColor,
  isOnBrandFont,
  type BrandColorExpectations,
  type BrandTypographyExpectations,
} from './auditBridge';
