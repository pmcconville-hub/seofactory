/**
 * Layer Management Hook for Hero Image Editor
 *
 * Provides specialized layer operations including:
 * - Layer creation with type-specific defaults
 * - Position/size transformations
 * - Semantic constraint enforcement
 * - Layer alignment and distribution
 */

import { useCallback, useMemo } from 'react';
import {
  HeroLayerConfig,
  HeroLayerType,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig,
  LayerPosition
} from '../types';
import {
  defaultBackgroundLayer,
  defaultCentralObjectLayer,
  defaultTextOverlayLayer,
  defaultLogoLayer,
  defaultLayerPositions
} from '../config/heroImageDefaults';

// ============================================
// TYPES
// ============================================

export interface LayerManagementActions {
  // Layer creation
  createLayer: (type: HeroLayerType, options?: Partial<HeroLayerConfig>) => HeroLayerConfig;
  createBackgroundLayer: (options?: Partial<BackgroundLayerConfig>) => BackgroundLayerConfig;
  createCentralObjectLayer: (entityName: string, options?: Partial<CentralObjectLayerConfig>) => CentralObjectLayerConfig;
  createTextOverlayLayer: (text: string, placement: 'top' | 'bottom', options?: Partial<TextOverlayLayerConfig>) => TextOverlayLayerConfig;
  createLogoLayer: (corner: LogoLayerConfig['cornerPosition'], options?: Partial<LogoLayerConfig>) => LogoLayerConfig;

  // Position operations
  moveLayer: (layer: HeroLayerConfig, deltaX: number, deltaY: number) => HeroLayerConfig;
  resizeLayer: (layer: HeroLayerConfig, newWidth: number, newHeight: number, anchor?: string) => HeroLayerConfig;
  setLayerPosition: (layer: HeroLayerConfig, position: Partial<LayerPosition>) => HeroLayerConfig;

  // Semantic constraint enforcement
  enforceConstraints: (layer: HeroLayerConfig) => HeroLayerConfig;
  centerLayer: (layer: HeroLayerConfig) => HeroLayerConfig;
  snapToCorner: (layer: HeroLayerConfig, corner: string) => HeroLayerConfig;
  snapToEdge: (layer: HeroLayerConfig, edge: 'top' | 'bottom') => HeroLayerConfig;

  // Alignment
  alignLayers: (layers: HeroLayerConfig[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => HeroLayerConfig[];
  distributeLayers: (layers: HeroLayerConfig[], direction: 'horizontal' | 'vertical') => HeroLayerConfig[];

  // Layer utilities
  getLayerBounds: (layer: HeroLayerConfig) => { left: number; top: number; right: number; bottom: number; centerX: number; centerY: number };
  isLayerInBounds: (layer: HeroLayerConfig) => boolean;
  getLayersByType: (layers: HeroLayerConfig[], type: HeroLayerType) => HeroLayerConfig[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

let layerIdCounter = 0;

const generateLayerId = (): string => {
  return `layer-${Date.now()}-${++layerIdCounter}`;
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useLayerManagement(): LayerManagementActions {
  // ============================================
  // LAYER CREATION
  // ============================================

  const createBackgroundLayer = useCallback((
    options?: Partial<BackgroundLayerConfig>
  ): BackgroundLayerConfig => {
    return {
      ...defaultBackgroundLayer,
      ...options,
      id: generateLayerId(),
      type: 'background'
    };
  }, []);

  const createCentralObjectLayer = useCallback((
    entityName: string,
    options?: Partial<CentralObjectLayerConfig>
  ): CentralObjectLayerConfig => {
    return {
      ...defaultCentralObjectLayer,
      ...options,
      id: generateLayerId(),
      type: 'centralObject',
      entityName,
      centeredEnforced: true,
      visibilityEnforced: true
    };
  }, []);

  const createTextOverlayLayer = useCallback((
    text: string,
    placement: 'top' | 'bottom',
    options?: Partial<TextOverlayLayerConfig>
  ): TextOverlayLayerConfig => {
    const positionKey = placement === 'top' ? 'textOverlayTop' : 'textOverlayBottom';

    return {
      ...defaultTextOverlayLayer,
      ...options,
      id: generateLayerId(),
      type: 'textOverlay',
      text,
      placement,
      position: options?.position || defaultLayerPositions[positionKey]
    };
  }, []);

  const createLogoLayer = useCallback((
    corner: LogoLayerConfig['cornerPosition'],
    options?: Partial<LogoLayerConfig>
  ): LogoLayerConfig => {
    const positionMap: Record<string, LayerPosition> = {
      'top-left': defaultLayerPositions.logoTopLeft,
      'top-right': defaultLayerPositions.logoTopRight,
      'bottom-left': defaultLayerPositions.logoBottomLeft,
      'bottom-right': defaultLayerPositions.logoBottomRight
    };

    return {
      ...defaultLogoLayer,
      ...options,
      id: generateLayerId(),
      type: 'logo',
      cornerPosition: corner,
      position: options?.position || positionMap[corner]
    };
  }, []);

  const createLayer = useCallback((
    type: HeroLayerType,
    options?: Partial<HeroLayerConfig>
  ): HeroLayerConfig => {
    switch (type) {
      case 'background':
        return createBackgroundLayer(options as Partial<BackgroundLayerConfig>);
      case 'centralObject':
        return createCentralObjectLayer(
          (options as Partial<CentralObjectLayerConfig>)?.entityName || 'Entity',
          options as Partial<CentralObjectLayerConfig>
        );
      case 'textOverlay':
        return createTextOverlayLayer(
          (options as Partial<TextOverlayLayerConfig>)?.text || '',
          (options as Partial<TextOverlayLayerConfig>)?.placement || 'bottom',
          options as Partial<TextOverlayLayerConfig>
        );
      case 'logo':
        return createLogoLayer(
          (options as Partial<LogoLayerConfig>)?.cornerPosition || 'bottom-right',
          options as Partial<LogoLayerConfig>
        );
      default:
        throw new Error(`Unknown layer type: ${type}`);
    }
  }, [createBackgroundLayer, createCentralObjectLayer, createTextOverlayLayer, createLogoLayer]);

  // ============================================
  // POSITION OPERATIONS
  // ============================================

  const moveLayer = useCallback((
    layer: HeroLayerConfig,
    deltaX: number,
    deltaY: number
  ): HeroLayerConfig => {
    const newX = Math.max(0, Math.min(100 - layer.position.width, layer.position.x + deltaX));
    const newY = Math.max(0, Math.min(100 - layer.position.height, layer.position.y + deltaY));

    return {
      ...layer,
      position: { ...layer.position, x: newX, y: newY }
    } as HeroLayerConfig;
  }, []);

  const resizeLayer = useCallback((
    layer: HeroLayerConfig,
    newWidth: number,
    newHeight: number,
    anchor: string = 'top-left'
  ): HeroLayerConfig => {
    const clampedWidth = Math.max(5, Math.min(100, newWidth));
    const clampedHeight = Math.max(5, Math.min(100, newHeight));

    let newX = layer.position.x;
    let newY = layer.position.y;

    // Adjust position based on anchor point
    switch (anchor) {
      case 'center':
        newX = layer.position.x + (layer.position.width - clampedWidth) / 2;
        newY = layer.position.y + (layer.position.height - clampedHeight) / 2;
        break;
      case 'top-right':
        newX = layer.position.x + layer.position.width - clampedWidth;
        break;
      case 'bottom-left':
        newY = layer.position.y + layer.position.height - clampedHeight;
        break;
      case 'bottom-right':
        newX = layer.position.x + layer.position.width - clampedWidth;
        newY = layer.position.y + layer.position.height - clampedHeight;
        break;
    }

    // Clamp position to stay in bounds
    newX = Math.max(0, Math.min(100 - clampedWidth, newX));
    newY = Math.max(0, Math.min(100 - clampedHeight, newY));

    return {
      ...layer,
      position: { x: newX, y: newY, width: clampedWidth, height: clampedHeight }
    } as HeroLayerConfig;
  }, []);

  const setLayerPosition = useCallback((
    layer: HeroLayerConfig,
    position: Partial<LayerPosition>
  ): HeroLayerConfig => {
    return {
      ...layer,
      position: { ...layer.position, ...position }
    } as HeroLayerConfig;
  }, []);

  // ============================================
  // SEMANTIC CONSTRAINT ENFORCEMENT
  // ============================================

  const centerLayer = useCallback((layer: HeroLayerConfig): HeroLayerConfig => {
    const newX = (100 - layer.position.width) / 2;
    const newY = (100 - layer.position.height) / 2;

    return {
      ...layer,
      position: { ...layer.position, x: newX, y: newY }
    } as HeroLayerConfig;
  }, []);

  const snapToCorner = useCallback((
    layer: HeroLayerConfig,
    corner: string
  ): HeroLayerConfig => {
    const margin = 3; // 3% margin from edges
    let newX: number;
    let newY: number;

    switch (corner) {
      case 'top-left':
        newX = margin;
        newY = margin;
        break;
      case 'top-right':
        newX = 100 - layer.position.width - margin;
        newY = margin;
        break;
      case 'bottom-left':
        newX = margin;
        newY = 100 - layer.position.height - margin;
        break;
      case 'bottom-right':
      default:
        newX = 100 - layer.position.width - margin;
        newY = 100 - layer.position.height - margin;
        break;
    }

    const result = {
      ...layer,
      position: { ...layer.position, x: newX, y: newY }
    } as HeroLayerConfig;

    // Update corner position if it's a logo layer
    if (layer.type === 'logo') {
      (result as LogoLayerConfig).cornerPosition = corner as LogoLayerConfig['cornerPosition'];
    }

    return result;
  }, []);

  const snapToEdge = useCallback((
    layer: HeroLayerConfig,
    edge: 'top' | 'bottom'
  ): HeroLayerConfig => {
    const margin = 5; // 5% margin from edges
    const newY = edge === 'top' ? margin : 100 - layer.position.height - margin;

    const result = {
      ...layer,
      position: { ...layer.position, y: newY }
    } as HeroLayerConfig;

    // Update placement if it's a text layer
    if (layer.type === 'textOverlay') {
      (result as TextOverlayLayerConfig).placement = edge;
    }

    return result;
  }, []);

  const enforceConstraints = useCallback((layer: HeroLayerConfig): HeroLayerConfig => {
    switch (layer.type) {
      case 'centralObject': {
        // Central object must be centered
        const centered = centerLayer(layer);

        // Ensure it's fully visible (scale down if needed)
        let { width, height } = centered.position;
        if (width > 90) {
          const scale = 90 / width;
          width = 90;
          height = height * scale;
        }
        if (height > 90) {
          const scale = 90 / height;
          height = 90;
          width = width * scale;
        }

        // Re-center after potential resize
        const newX = (100 - width) / 2;
        const newY = (100 - height) / 2;

        return {
          ...centered,
          position: { x: newX, y: newY, width, height }
        } as CentralObjectLayerConfig;
      }

      case 'textOverlay': {
        const textLayer = layer as TextOverlayLayerConfig;
        // Text must be at top or bottom
        const centerY = textLayer.position.y + (textLayer.position.height / 2);
        const placement: 'top' | 'bottom' = centerY < 50 ? 'top' : 'bottom';
        const snapped = snapToEdge(textLayer, placement);
        return {
          ...snapped,
          placement
        } as TextOverlayLayerConfig;
      }

      case 'logo': {
        const logoLayer = layer as LogoLayerConfig;
        // Logo must be in a corner
        const centerX = logoLayer.position.x + (logoLayer.position.width / 2);
        const centerY = logoLayer.position.y + (logoLayer.position.height / 2);

        const isLeft = centerX < 50;
        const isTop = centerY < 50;

        const corner: LogoLayerConfig['cornerPosition'] =
          isTop && isLeft ? 'top-left' :
          isTop && !isLeft ? 'top-right' :
          !isTop && isLeft ? 'bottom-left' :
          'bottom-right';

        return snapToCorner(logoLayer, corner);
      }

      default:
        return layer;
    }
  }, [centerLayer, snapToCorner, snapToEdge]);

  // ============================================
  // ALIGNMENT
  // ============================================

  const alignLayers = useCallback((
    layers: HeroLayerConfig[],
    alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
  ): HeroLayerConfig[] => {
    if (layers.length < 2) return layers;

    // Calculate reference value
    let refValue: number;

    switch (alignment) {
      case 'left':
        refValue = Math.min(...layers.map(l => l.position.x));
        return layers.map(l => ({ ...l, position: { ...l.position, x: refValue } } as HeroLayerConfig));

      case 'center':
        refValue = layers.reduce((sum, l) => sum + l.position.x + l.position.width / 2, 0) / layers.length;
        return layers.map(l => ({
          ...l,
          position: { ...l.position, x: refValue - l.position.width / 2 }
        } as HeroLayerConfig));

      case 'right':
        refValue = Math.max(...layers.map(l => l.position.x + l.position.width));
        return layers.map(l => ({
          ...l,
          position: { ...l.position, x: refValue - l.position.width }
        } as HeroLayerConfig));

      case 'top':
        refValue = Math.min(...layers.map(l => l.position.y));
        return layers.map(l => ({ ...l, position: { ...l.position, y: refValue } } as HeroLayerConfig));

      case 'middle':
        refValue = layers.reduce((sum, l) => sum + l.position.y + l.position.height / 2, 0) / layers.length;
        return layers.map(l => ({
          ...l,
          position: { ...l.position, y: refValue - l.position.height / 2 }
        } as HeroLayerConfig));

      case 'bottom':
        refValue = Math.max(...layers.map(l => l.position.y + l.position.height));
        return layers.map(l => ({
          ...l,
          position: { ...l.position, y: refValue - l.position.height }
        } as HeroLayerConfig));

      default:
        return layers;
    }
  }, []);

  const distributeLayers = useCallback((
    layers: HeroLayerConfig[],
    direction: 'horizontal' | 'vertical'
  ): HeroLayerConfig[] => {
    if (layers.length < 3) return layers;

    const sorted = [...layers].sort((a, b) =>
      direction === 'horizontal'
        ? a.position.x - b.position.x
        : a.position.y - b.position.y
    );

    if (direction === 'horizontal') {
      const totalWidth = sorted.reduce((sum, l) => sum + l.position.width, 0);
      const first = sorted[0].position.x;
      const last = sorted[sorted.length - 1].position.x + sorted[sorted.length - 1].position.width;
      const totalSpace = last - first - totalWidth;
      const gap = totalSpace / (sorted.length - 1);

      let currentX = first;
      return sorted.map(layer => {
        const result = { ...layer, position: { ...layer.position, x: currentX } } as HeroLayerConfig;
        currentX += layer.position.width + gap;
        return result;
      });
    } else {
      const totalHeight = sorted.reduce((sum, l) => sum + l.position.height, 0);
      const first = sorted[0].position.y;
      const last = sorted[sorted.length - 1].position.y + sorted[sorted.length - 1].position.height;
      const totalSpace = last - first - totalHeight;
      const gap = totalSpace / (sorted.length - 1);

      let currentY = first;
      return sorted.map(layer => {
        const result = { ...layer, position: { ...layer.position, y: currentY } } as HeroLayerConfig;
        currentY += layer.position.height + gap;
        return result;
      });
    }
  }, []);

  // ============================================
  // LAYER UTILITIES
  // ============================================

  const getLayerBounds = useCallback((layer: HeroLayerConfig) => {
    return {
      left: layer.position.x,
      top: layer.position.y,
      right: layer.position.x + layer.position.width,
      bottom: layer.position.y + layer.position.height,
      centerX: layer.position.x + layer.position.width / 2,
      centerY: layer.position.y + layer.position.height / 2
    };
  }, []);

  const isLayerInBounds = useCallback((layer: HeroLayerConfig): boolean => {
    const bounds = getLayerBounds(layer);
    return bounds.left >= 0 && bounds.top >= 0 && bounds.right <= 100 && bounds.bottom <= 100;
  }, [getLayerBounds]);

  const getLayersByType = useCallback((
    layers: HeroLayerConfig[],
    type: HeroLayerType
  ): HeroLayerConfig[] => {
    return layers.filter(l => l.type === type);
  }, []);

  // ============================================
  // RETURN
  // ============================================

  return useMemo(() => ({
    createLayer,
    createBackgroundLayer,
    createCentralObjectLayer,
    createTextOverlayLayer,
    createLogoLayer,
    moveLayer,
    resizeLayer,
    setLayerPosition,
    enforceConstraints,
    centerLayer,
    snapToCorner,
    snapToEdge,
    alignLayers,
    distributeLayers,
    getLayerBounds,
    isLayerInBounds,
    getLayersByType
  }), [
    createLayer, createBackgroundLayer, createCentralObjectLayer,
    createTextOverlayLayer, createLogoLayer, moveLayer, resizeLayer,
    setLayerPosition, enforceConstraints, centerLayer, snapToCorner,
    snapToEdge, alignLayers, distributeLayers, getLayerBounds,
    isLayerInBounds, getLayersByType
  ]);
}

export default useLayerManagement;
