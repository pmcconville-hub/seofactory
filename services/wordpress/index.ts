/**
 * WordPress Integration Services
 *
 * Re-exports all WordPress-related services for easy importing.
 */

// API Client
export {
  WordPressApiClient,
  generateContentHash,
  testWordPressConnection,
  createClientFromConnection
} from './apiClient';

// Connection Service
export {
  addConnection,
  testConnection,
  verifyConnection,
  getConnectionsForUser,
  getConnectionsForProject,
  getConnection,
  updateConnection,
  removeConnection,
  getAuthenticatedClient
} from './connectionService';

// Publication Service
export {
  publishTopic,
  updatePublication,
  syncPublicationStatus,
  detectConflict,
  resolveConflict,
  getPublicationForTopic,
  getPublicationsForConnection,
  getPublicationHistory
} from './publicationService';

// Media Service
export {
  uploadImageToWordPress,
  uploadMultipleImages,
  uploadHeroImage,
  parseImagePlaceholders,
  replacePlaceholdersWithUrls,
  getMediaForPublication,
  getMediaByPlaceholder,
  buildPlaceholderMediaMap
} from './mediaService';

// Analytics Service
export {
  pullPublicationAnalytics,
  pullConnectionAnalytics,
  getPublicationAnalytics,
  getAggregatedAnalytics,
  getProjectAnalyticsSummary,
  getTopPerformingPosts,
  getUnderperformingPosts
} from './analyticsService';

// Re-export types for convenience
export type {
  WordPressConnection,
  WordPressConnectionInput,
  WordPressConnectionStatus,
  WordPressPublication,
  PublishOptions,
  WPPublicationStatus,
  WordPressMedia,
  WordPressMediaType,
  MediaUploadInput,
  MediaUploadResult,
  WordPressAnalytics,
  ConflictReport,
  ConflictResolution,
  PublicationHistoryEntry,
  WpPost,
  WpCategory,
  WpTag,
  WpMedia,
  TopicPublicationInfo,
  CalendarEntry,
  CalendarView
} from '../../types/wordpress';
