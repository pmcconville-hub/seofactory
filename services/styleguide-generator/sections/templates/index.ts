// services/styleguide-generator/sections/templates/index.ts
// Import all template sections to trigger their registration side-effects.
// After importing this module, all 17 template generators are registered in the SectionRegistry.

export { colorPaletteGenerator } from './colorPalette';          // Section 1
export { typographyGenerator } from './typography';               // Section 2
export { sectionBackgroundsGenerator } from './sectionBackgrounds'; // Section 3
export { imagesGenerator } from './images';                       // Section 6
export { badgesGenerator } from './badges';                       // Section 8
export { dividersGenerator } from './dividers';                   // Section 15
export { breadcrumbsGenerator } from './breadcrumbs';             // Section 20
export { animationsGenerator } from './animations';               // Section 22
export { hoverEffectsGenerator } from './hoverEffects';           // Section 23
export { responsiveUtilsGenerator } from './responsiveUtils';     // Section 24
export { formStatesGenerator } from './formStates';               // Section 37
export { skeletonLoadingGenerator } from './skeletonLoading';     // Section 38
export { accessibilityGenerator } from './accessibility';         // Section 42
export { globalSettingsGenerator } from './globalSettings';       // Section 45
export { completeStylesheetGenerator } from './completeStylesheet'; // Section 46
export { quickReferenceGenerator } from './quickReference';       // Section 47
export { versionChangelogGenerator } from './versionChangelog';   // Section 48
