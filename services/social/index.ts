/**
 * Social Media Publishing Service
 *
 * Transforms generated article content into platform-optimized social posts
 * with semantic SEO compliance and export capabilities.
 *
 * Features:
 * - Hub-Spoke campaign model (1 hub + 7 supporting posts)
 * - 5 platform support: LinkedIn, X/Twitter, Facebook, Instagram, Pinterest
 * - Entity-first content with EAV architecture
 * - Semantic compliance scoring (target: >85%)
 * - Multiple export formats (clipboard, JSON, text, ZIP)
 * - UTM tracking for all links
 */

// Re-export types
export type {
  SocialMediaPlatform,
  SocialPostType,
  SocialTemplateType,
  SocialCampaignStatus,
  SocialPostStatus,
  SocialCampaign,
  SocialCampaignInput,
  SocialPost,
  SocialPostInput,
  ThreadSegment,
  ImageInstructions,
  UTMParameters,
  PostEAVTriple,
  SocialPostTemplate,
  TemplatePlaceholders,
  HashtagStrategy,
  CharacterLimits,
  SocialImageSpecs,
  EntityHashtagMapping,
  EntityHashtagMappingInput,
  PlatformPostingGuide,
  OptimalPostingTimes,
  ExportType,
  ExportFormat,
  SocialExportHistory,
  SinglePostExport,
  CampaignExport,
  BulkExportPackage,
  PlatformExportFolder,
  ComplianceCheckResult,
  PostComplianceReport,
  CampaignComplianceReport,
  ArticleTransformationSource,
  PlatformSelection,
  TransformationConfig,
  TransformationResult,
  TransformModalState,
  PostEditorState,
  ExportModalState
} from '../../types/social';

export {
  SOCIAL_PLATFORM_CONFIG,
  BANNED_FILLER_PHRASES,
  MAX_SEMANTIC_DISTANCE,
  CROSS_PLATFORM_LINK_THRESHOLD,
  TARGET_COMPLIANCE_SCORE
} from '../../types/social';

// Export transformation services
export { ContentTransformer } from './transformation/contentTransformer';
export { HubSpokeOrchestrator } from './transformation/hubSpokeOrchestrator';
export { HashtagGenerator } from './transformation/hashtagGenerator';
export { UTMGenerator } from './transformation/utmGenerator';
export { InstructionGenerator } from './transformation/instructionGenerator';

// Export platform adapters
export { LinkedInAdapter } from './transformation/platformAdapters/linkedinAdapter';
export { TwitterAdapter } from './transformation/platformAdapters/twitterAdapter';
export { FacebookAdapter } from './transformation/platformAdapters/facebookAdapter';
export { InstagramAdapter } from './transformation/platformAdapters/instagramAdapter';
export { PinterestAdapter } from './transformation/platformAdapters/pinterestAdapter';

// Export semantic services
export { EAVExtractor } from './semantic/eavExtractor';
export { EntityConsistencyValidator } from './semantic/entityConsistencyValidator';
export { SemanticDistanceCalculator } from './semantic/semanticDistanceCalculator';
export { ComplianceScorer } from './semantic/complianceScorer';

// Export export services
export { ExportService } from './export/exportService';
export { ClipboardExporter } from './export/clipboardExporter';
export { JsonExporter } from './export/jsonExporter';
export { TextExporter } from './export/textExporter';
export { PackageExporter } from './export/packageExporter';

// Export template services
export { TemplateService } from './templates/templateService';
export { DEFAULT_TEMPLATES } from './templates/defaultTemplates';

// Export image services
export {
  PLATFORM_IMAGE_REQUIREMENTS,
  selectImageForPlatform,
  selectImagesForCampaign,
  needsResizeForPlatform,
  getResizeRecommendations,
  getImageInstructionsText
} from './transformation/imageSelector';

export {
  generatePlatformVariation,
  generateMultiplePlatformVariations,
  analyzeImageForPlatform,
  getPlatformImageSummary
} from './transformation/imageVariationService';

export type {
  ImagePlaceholderExtended,
  SelectedImage
} from './transformation/imageSelector';

export type {
  VariationOptions,
  VariationResult
} from './transformation/imageVariationService';

// Export AI enhancement services
export {
  generateAIHashtags,
  generateAIContent,
  generateAIMentions,
  generateAIPostingTime,
  enhanceSocialPost,
  applyEnhancementsToPost
} from './ai/socialContentEnhancer';

export type {
  EnhancementOptions,
  AIHashtagResult,
  AIContentResult,
  AIMentionsResult,
  AIPostingTimeResult,
  AIEnhancementResult
} from './ai/socialContentEnhancer';
