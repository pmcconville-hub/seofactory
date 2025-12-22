/**
 * Hero Image Default Configurations
 *
 * Default values for layer configurations, canvas settings,
 * and preset templates for common hero image layouts.
 */

import {
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig,
  HeroImageComposition,
  LayerPosition,
  HeroImageMetadata
} from '../types';

// ============================================
// CANVAS DEFAULTS
// ============================================

/**
 * Standard canvas presets for different use cases
 */
export const canvasPresets = {
  // Social Media Optimized (1.91:1 - Facebook/LinkedIn)
  social: {
    width: 1200,
    height: 630,
    name: 'Social Media (1200x630)',
    description: 'Optimized for Facebook and LinkedIn sharing'
  },
  // Twitter Card (2:1)
  twitter: {
    width: 1200,
    height: 600,
    name: 'Twitter Card (1200x600)',
    description: 'Optimized for Twitter large image cards'
  },
  // Blog Hero (16:9)
  blog: {
    width: 1280,
    height: 720,
    name: 'Blog Hero (1280x720)',
    description: 'Standard 16:9 for blog featured images'
  },
  // Square (Instagram)
  square: {
    width: 1080,
    height: 1080,
    name: 'Square (1080x1080)',
    description: 'Square format for Instagram'
  },
  // Wide Banner (3:1)
  banner: {
    width: 1500,
    height: 500,
    name: 'Wide Banner (1500x500)',
    description: 'Wide banner format'
  }
} as const;

export const defaultCanvasWidth = canvasPresets.social.width;
export const defaultCanvasHeight = canvasPresets.social.height;

// ============================================
// LAYER POSITION DEFAULTS
// ============================================

/**
 * Default positions for each layer type
 * All values are percentages (0-100)
 */
export const defaultLayerPositions: Record<string, LayerPosition> = {
  background: {
    x: 0,
    y: 0,
    width: 100,
    height: 100
  },
  centralObject: {
    x: 25, // Centered: 25% from left
    y: 20, // Slightly above center to leave room for bottom text
    width: 50,
    height: 50
  },
  textOverlayTop: {
    x: 10,
    y: 5,
    width: 80,
    height: 15
  },
  textOverlayBottom: {
    x: 10,
    y: 80,
    width: 80,
    height: 15
  },
  logoTopLeft: {
    x: 3,
    y: 3,
    width: 10,
    height: 10
  },
  logoTopRight: {
    x: 87,
    y: 3,
    width: 10,
    height: 10
  },
  logoBottomLeft: {
    x: 3,
    y: 87,
    width: 10,
    height: 10
  },
  logoBottomRight: {
    x: 87,
    y: 87,
    width: 10,
    height: 10
  }
};

// ============================================
// LAYER CONFIG DEFAULTS
// ============================================

/**
 * Default background layer configuration
 */
export const defaultBackgroundLayer: Omit<BackgroundLayerConfig, 'id'> = {
  type: 'background',
  source: 'ai-generated',
  position: defaultLayerPositions.background,
  visible: true,
  locked: false,
  opacity: 100,
  zIndex: 0,
  name: 'Background'
};

/**
 * Default central object layer configuration
 */
export const defaultCentralObjectLayer: Omit<CentralObjectLayerConfig, 'id'> = {
  type: 'centralObject',
  entityName: '',
  centeredEnforced: true,
  visibilityEnforced: true,
  position: defaultLayerPositions.centralObject,
  visible: true,
  locked: false,
  opacity: 100,
  zIndex: 1,
  name: 'Central Object'
};

/**
 * Default text overlay layer configuration
 */
export const defaultTextOverlayLayer: Omit<TextOverlayLayerConfig, 'id'> = {
  type: 'textOverlay',
  text: '',
  placement: 'bottom',
  fontSize: 48,
  fontFamily: 'Inter, system-ui, sans-serif',
  fontWeight: 700,
  textColor: '#FFFFFF',
  textAlign: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  padding: 16,
  position: defaultLayerPositions.textOverlayBottom,
  visible: true,
  locked: false,
  opacity: 100,
  zIndex: 2,
  name: 'Text Overlay'
};

/**
 * Default logo layer configuration
 */
export const defaultLogoLayer: Omit<LogoLayerConfig, 'id'> = {
  type: 'logo',
  cornerPosition: 'bottom-right',
  position: defaultLayerPositions.logoBottomRight,
  visible: true,
  locked: false,
  opacity: 80, // Slightly transparent for watermark effect
  zIndex: 3,
  name: 'Logo'
};

// ============================================
// TEXT STYLING PRESETS
// ============================================

/**
 * Font family presets
 */
export const fontFamilyPresets = [
  { id: 'inter', name: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto, Arial, sans-serif' },
  { id: 'opensans', name: 'Open Sans', value: '"Open Sans", sans-serif' },
  { id: 'playfair', name: 'Playfair Display', value: '"Playfair Display", serif' },
  { id: 'montserrat', name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { id: 'lato', name: 'Lato', value: 'Lato, sans-serif' },
  { id: 'poppins', name: 'Poppins', value: 'Poppins, sans-serif' },
  { id: 'oswald', name: 'Oswald', value: 'Oswald, sans-serif' }
] as const;

/**
 * Font size presets
 */
export const fontSizePresets = [
  { id: 'xs', name: 'Extra Small', value: 24 },
  { id: 'sm', name: 'Small', value: 32 },
  { id: 'md', name: 'Medium', value: 40 },
  { id: 'lg', name: 'Large', value: 48 },
  { id: 'xl', name: 'Extra Large', value: 56 },
  { id: '2xl', name: '2X Large', value: 64 },
  { id: '3xl', name: '3X Large', value: 72 }
] as const;

/**
 * Font weight presets
 */
export const fontWeightPresets = [
  { id: 'light', name: 'Light', value: 300 },
  { id: 'normal', name: 'Normal', value: 400 },
  { id: 'medium', name: 'Medium', value: 500 },
  { id: 'semibold', name: 'Semi Bold', value: 600 },
  { id: 'bold', name: 'Bold', value: 700 },
  { id: 'extrabold', name: 'Extra Bold', value: 800 }
] as const;

/**
 * Text color presets
 */
export const textColorPresets = [
  { id: 'white', name: 'White', value: '#FFFFFF' },
  { id: 'black', name: 'Black', value: '#000000' },
  { id: 'gray', name: 'Gray', value: '#6B7280' },
  { id: 'blue', name: 'Blue', value: '#3B82F6' },
  { id: 'green', name: 'Green', value: '#10B981' },
  { id: 'red', name: 'Red', value: '#EF4444' },
  { id: 'yellow', name: 'Yellow', value: '#F59E0B' },
  { id: 'purple', name: 'Purple', value: '#8B5CF6' }
] as const;

/**
 * Text background presets
 */
export const textBackgroundPresets = [
  { id: 'none', name: 'None', value: 'transparent' },
  { id: 'dark-overlay', name: 'Dark Overlay', value: 'rgba(0, 0, 0, 0.5)' },
  { id: 'light-overlay', name: 'Light Overlay', value: 'rgba(255, 255, 255, 0.5)' },
  { id: 'dark-solid', name: 'Dark Solid', value: 'rgba(0, 0, 0, 0.8)' },
  { id: 'light-solid', name: 'Light Solid', value: 'rgba(255, 255, 255, 0.9)' },
  { id: 'blur', name: 'Blur Effect', value: 'rgba(0, 0, 0, 0.3)' }
] as const;

// ============================================
// METADATA DEFAULTS
// ============================================

/**
 * Default metadata structure
 */
export const defaultMetadata: HeroImageMetadata = {
  iptc: {
    creator: '',
    copyright: `Copyright ${new Date().getFullYear()}`,
    caption: '',
    headline: '',
    keywords: []
  },
  exif: {
    artist: '',
    copyright: `Copyright ${new Date().getFullYear()}`,
    imageDescription: ''
  },
  schemaOrg: {
    '@type': 'ImageObject',
    contentUrl: '',
    name: '',
    description: '',
    author: {
      '@type': 'Organization',
      name: ''
    },
    copyrightHolder: {
      '@type': 'Organization',
      name: ''
    },
    license: ''
  },
  altText: '',
  fileName: ''
};

/**
 * Create metadata from business info and topic context
 */
export const createMetadataFromContext = (
  businessName: string,
  topicTitle: string,
  entityName?: string
): HeroImageMetadata => {
  const year = new Date().getFullYear();
  const altText = entityName
    ? `${entityName} - ${topicTitle} by ${businessName}`
    : `${topicTitle} by ${businessName}`;

  return {
    iptc: {
      creator: businessName,
      copyright: `Copyright ${year} ${businessName}`,
      caption: altText,
      headline: topicTitle.substring(0, 64),
      keywords: [entityName, ...topicTitle.split(' ')].filter(Boolean) as string[]
    },
    exif: {
      artist: businessName,
      copyright: `Copyright ${year} ${businessName}`,
      imageDescription: altText
    },
    schemaOrg: {
      '@type': 'ImageObject',
      contentUrl: '',
      name: topicTitle,
      description: altText,
      author: {
        '@type': 'Organization',
        name: businessName
      },
      copyrightHolder: {
        '@type': 'Organization',
        name: businessName
      },
      license: ''
    },
    altText,
    fileName: `${topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-hero.avif`
  };
};

// ============================================
// COMPOSITION TEMPLATES
// ============================================

let templateIdCounter = 0;
const generateId = () => `layer-${Date.now()}-${++templateIdCounter}`;

/**
 * Create a blank composition with default settings
 */
export const createBlankComposition = (): HeroImageComposition => ({
  id: `comp-${Date.now()}`,
  canvasWidth: defaultCanvasWidth,
  canvasHeight: defaultCanvasHeight,
  layers: [
    { ...defaultBackgroundLayer, id: generateId() }
  ],
  validation: {
    isValid: true,
    errors: [],
    warnings: [],
    ruleResults: []
  },
  metadata: defaultMetadata
});

/**
 * Create a standard hero composition with all layer types
 */
export const createStandardComposition = (
  h1Text: string,
  entityName: string,
  businessName: string
): HeroImageComposition => {
  const metadata = createMetadataFromContext(businessName, h1Text, entityName);

  return {
    id: `comp-${Date.now()}`,
    canvasWidth: defaultCanvasWidth,
    canvasHeight: defaultCanvasHeight,
    layers: [
      { ...defaultBackgroundLayer, id: generateId() },
      {
        ...defaultCentralObjectLayer,
        id: generateId(),
        entityName
      },
      {
        ...defaultTextOverlayLayer,
        id: generateId(),
        text: h1Text,
        placement: 'bottom'
      },
      { ...defaultLogoLayer, id: generateId() }
    ],
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      ruleResults: []
    },
    metadata
  };
};

/**
 * Template presets for common hero image layouts
 */
export const compositionTemplates = {
  /**
   * Clean layout with text at bottom
   */
  clean: {
    id: 'clean',
    name: 'Clean',
    description: 'Minimal design with central focus and bottom text',
    thumbnail: '/templates/hero-clean.png',
    create: (h1Text: string, entityName: string, businessName: string) => ({
      ...createStandardComposition(h1Text, entityName, businessName),
      layers: [
        { ...defaultBackgroundLayer, id: generateId() },
        {
          ...defaultCentralObjectLayer,
          id: generateId(),
          entityName,
          position: { x: 25, y: 15, width: 50, height: 55 }
        },
        {
          ...defaultTextOverlayLayer,
          id: generateId(),
          text: h1Text,
          placement: 'bottom' as const,
          position: { x: 5, y: 75, width: 90, height: 20 },
          backgroundColor: 'rgba(0, 0, 0, 0.6)'
        },
        {
          ...defaultLogoLayer,
          id: generateId(),
          cornerPosition: 'top-right' as const,
          position: defaultLayerPositions.logoTopRight,
          opacity: 60
        }
      ]
    })
  },

  /**
   * Bold layout with text at top
   */
  bold: {
    id: 'bold',
    name: 'Bold',
    description: 'Impactful design with prominent top text',
    thumbnail: '/templates/hero-bold.png',
    create: (h1Text: string, entityName: string, businessName: string) => ({
      ...createStandardComposition(h1Text, entityName, businessName),
      layers: [
        { ...defaultBackgroundLayer, id: generateId() },
        {
          ...defaultTextOverlayLayer,
          id: generateId(),
          text: h1Text,
          placement: 'top' as const,
          position: { x: 5, y: 3, width: 90, height: 22 },
          fontSize: 56,
          fontWeight: 800,
          backgroundColor: 'transparent',
          textColor: '#FFFFFF'
        },
        {
          ...defaultCentralObjectLayer,
          id: generateId(),
          entityName,
          position: { x: 20, y: 28, width: 60, height: 60 }
        },
        {
          ...defaultLogoLayer,
          id: generateId(),
          cornerPosition: 'bottom-left' as const,
          position: defaultLayerPositions.logoBottomLeft
        }
      ]
    })
  },

  /**
   * Split layout with object on side
   */
  split: {
    id: 'split',
    name: 'Split',
    description: 'Object on left, text on right',
    thumbnail: '/templates/hero-split.png',
    create: (h1Text: string, entityName: string, businessName: string) => ({
      ...createStandardComposition(h1Text, entityName, businessName),
      layers: [
        { ...defaultBackgroundLayer, id: generateId() },
        {
          ...defaultCentralObjectLayer,
          id: generateId(),
          entityName,
          position: { x: 5, y: 10, width: 45, height: 80 }
        },
        {
          ...defaultTextOverlayLayer,
          id: generateId(),
          text: h1Text,
          placement: 'bottom' as const,
          position: { x: 52, y: 30, width: 45, height: 40 },
          textAlign: 'left' as const,
          backgroundColor: 'transparent',
          fontSize: 44
        },
        {
          ...defaultLogoLayer,
          id: generateId(),
          cornerPosition: 'bottom-right' as const,
          position: defaultLayerPositions.logoBottomRight
        }
      ]
    })
  },

  /**
   * Infographic style
   */
  infographic: {
    id: 'infographic',
    name: 'Infographic',
    description: 'Information-dense engaging layout',
    thumbnail: '/templates/hero-infographic.png',
    create: (h1Text: string, entityName: string, businessName: string) => ({
      ...createStandardComposition(h1Text, entityName, businessName),
      layers: [
        {
          ...defaultBackgroundLayer,
          id: generateId(),
          source: 'color' as const
        },
        {
          ...defaultTextOverlayLayer,
          id: generateId(),
          text: h1Text,
          placement: 'top' as const,
          position: { x: 10, y: 5, width: 80, height: 18 },
          fontSize: 40,
          fontWeight: 700,
          backgroundColor: 'transparent',
          textColor: '#1F2937'
        },
        {
          ...defaultCentralObjectLayer,
          id: generateId(),
          entityName,
          position: { x: 15, y: 25, width: 70, height: 55 }
        },
        {
          ...defaultLogoLayer,
          id: generateId(),
          cornerPosition: 'bottom-right' as const,
          position: defaultLayerPositions.logoBottomRight,
          opacity: 70
        }
      ]
    })
  }
} as const;

// ============================================
// AI PROMPT TEMPLATES
// ============================================

/**
 * Default AI prompt templates for background generation
 */
export const aiPromptTemplates = {
  abstract: {
    id: 'abstract',
    name: 'Abstract Background',
    prompt: 'Abstract professional background with subtle gradients and geometric shapes, modern and clean, {colors}, high resolution'
  },
  gradient: {
    id: 'gradient',
    name: 'Gradient',
    prompt: 'Smooth gradient background, professional, {colors}, subtle texture, high resolution'
  },
  nature: {
    id: 'nature',
    name: 'Nature/Outdoor',
    prompt: 'Beautiful {subject} landscape photography, professional quality, natural lighting, slightly blurred for text overlay'
  },
  office: {
    id: 'office',
    name: 'Business/Office',
    prompt: 'Modern professional office environment, clean and minimal, natural lighting, {colors} accent colors'
  },
  technology: {
    id: 'technology',
    name: 'Technology',
    prompt: 'Abstract technology visualization, circuit patterns, data streams, {colors}, futuristic and professional'
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    prompt: 'Minimal clean background, solid or subtle gradient, {colors}, professional and elegant'
  }
} as const;

/**
 * Generate AI prompt with variables replaced
 */
export const generateAIPrompt = (
  templateId: keyof typeof aiPromptTemplates,
  variables: { colors?: string; subject?: string }
): string => {
  const template = aiPromptTemplates[templateId];
  let prompt: string = template.prompt;

  if (variables.colors) {
    prompt = prompt.replace('{colors}', variables.colors);
  } else {
    prompt = prompt.replace('{colors}', 'blue and purple');
  }

  if (variables.subject) {
    prompt = prompt.replace('{subject}', variables.subject);
  } else {
    prompt = prompt.replace('{subject}', 'scenic');
  }

  return prompt;
};

// ============================================
// EXPORT FORMAT OPTIONS
// ============================================

/**
 * Available export formats
 */
export const exportFormats = [
  {
    id: 'avif',
    name: 'AVIF',
    extension: '.avif',
    mimeType: 'image/avif',
    recommended: true,
    description: 'Best compression, modern browsers'
  },
  {
    id: 'webp',
    name: 'WebP',
    extension: '.webp',
    mimeType: 'image/webp',
    recommended: true,
    description: 'Good compression, wide support'
  },
  {
    id: 'png',
    name: 'PNG',
    extension: '.png',
    mimeType: 'image/png',
    recommended: false,
    description: 'Lossless, larger files'
  },
  {
    id: 'jpeg',
    name: 'JPEG',
    extension: '.jpg',
    mimeType: 'image/jpeg',
    recommended: false,
    description: 'Universal support, lossy'
  }
] as const;

/**
 * Default export quality settings
 */
export const exportQualityDefaults = {
  avif: 80,
  webp: 85,
  png: 100, // Lossless
  jpeg: 85
} as const;
