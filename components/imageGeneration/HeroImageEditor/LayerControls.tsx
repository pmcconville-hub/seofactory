/**
 * Layer Controls Component
 *
 * Controls for editing the selected layer's properties:
 * position, size, opacity, and type-specific settings.
 */

import React from 'react';
import {
  HeroLayerConfig,
  BackgroundLayerConfig,
  CentralObjectLayerConfig,
  TextOverlayLayerConfig,
  LogoLayerConfig,
  LayerPosition
} from '../../../types';
import {
  fontFamilyPresets,
  fontSizePresets,
  fontWeightPresets,
  textColorPresets,
  textBackgroundPresets
} from '../../../config/heroImageDefaults';

// ============================================
// TYPES
// ============================================

interface LayerControlsProps {
  layer: HeroLayerConfig | null;
  onUpdateLayer: (updates: Partial<HeroLayerConfig>) => void;
  onUpdatePosition: (position: Partial<LayerPosition>) => void;
  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const LayerControls: React.FC<LayerControlsProps> = ({
  layer,
  onUpdateLayer,
  onUpdatePosition,
  className = ''
}) => {
  if (!layer) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <p className="text-gray-500 text-sm text-center">
          Select a layer to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">
          Layer Properties
        </h3>
        <p className="text-xs text-gray-500">{layer.name || layer.type}</p>
      </div>

      <div className="p-3 space-y-4 max-h-96 overflow-y-auto">
        {/* Common Controls */}
        <CommonControls
          layer={layer}
          onUpdateLayer={onUpdateLayer}
          onUpdatePosition={onUpdatePosition}
        />

        {/* Type-Specific Controls */}
        {layer.type === 'background' && (
          <BackgroundControls
            layer={layer as BackgroundLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'centralObject' && (
          <CentralObjectControls
            layer={layer as CentralObjectLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'textOverlay' && (
          <TextOverlayControls
            layer={layer as TextOverlayLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
        {layer.type === 'logo' && (
          <LogoControls
            layer={layer as LogoLayerConfig}
            onUpdateLayer={onUpdateLayer}
          />
        )}
      </div>
    </div>
  );
};

// ============================================
// COMMON CONTROLS
// ============================================

interface CommonControlsProps {
  layer: HeroLayerConfig;
  onUpdateLayer: (updates: Partial<HeroLayerConfig>) => void;
  onUpdatePosition: (position: Partial<LayerPosition>) => void;
}

const CommonControls: React.FC<CommonControlsProps> = ({
  layer,
  onUpdateLayer,
  onUpdatePosition
}) => {
  return (
    <>
      {/* Position */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">X (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.x)}
              onChange={(e) => onUpdatePosition({ x: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Y (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.y)}
              onChange={(e) => onUpdatePosition({ y: parseFloat(e.target.value) || 0 })}
              min={0}
              max={100}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Size</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">Width (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.width)}
              onChange={(e) => onUpdatePosition({ width: parseFloat(e.target.value) || 10 })}
              min={5}
              max={100}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Height (%)</label>
            <input
              type="number"
              value={Math.round(layer.position.height)}
              onChange={(e) => onUpdatePosition({ height: parseFloat(e.target.value) || 10 })}
              min={5}
              max={100}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
            />
          </div>
        </div>
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">
          Opacity: {layer.opacity}%
        </label>
        <input
          type="range"
          value={layer.opacity}
          onChange={(e) => onUpdateLayer({ opacity: parseInt(e.target.value) })}
          min={0}
          max={100}
          className="w-full"
        />
      </div>

      {/* Layer Name */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700">Layer Name</label>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => onUpdateLayer({ name: e.target.value })}
          placeholder="Layer name"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
      </div>
    </>
  );
};

// ============================================
// BACKGROUND CONTROLS
// ============================================

interface BackgroundControlsProps {
  layer: BackgroundLayerConfig;
  onUpdateLayer: (updates: Partial<BackgroundLayerConfig>) => void;
}

const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      <label className="text-xs font-medium text-gray-700">Background Source</label>

      <div className="space-y-2">
        <select
          value={layer.source}
          onChange={(e) => onUpdateLayer({ source: e.target.value as BackgroundLayerConfig['source'] })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          <option value="ai-generated">AI Generated</option>
          <option value="user-upload">Upload Image</option>
          <option value="color">Solid Color</option>
        </select>
      </div>

      {layer.source === 'ai-generated' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">AI Prompt</label>
          <textarea
            value={layer.aiPrompt || ''}
            onChange={(e) => onUpdateLayer({ aiPrompt: e.target.value })}
            placeholder="Describe the background..."
            rows={3}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <select
            value={layer.aiProvider || 'gemini'}
            onChange={(e) => onUpdateLayer({ aiProvider: e.target.value as 'gemini' | 'dalle' })}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          >
            <option value="gemini">Gemini</option>
            <option value="dalle">DALL-E</option>
          </select>
        </div>
      )}

      {layer.source === 'user-upload' && (
        <div className="space-y-2">
          <label className="text-xs text-gray-500">Image URL</label>
          <input
            type="text"
            value={layer.imageUrl || ''}
            onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
            placeholder="Enter image URL or upload"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
          />
          <button
            type="button"
            className="w-full px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Upload Image
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// CENTRAL OBJECT CONTROLS
// ============================================

interface CentralObjectControlsProps {
  layer: CentralObjectLayerConfig;
  onUpdateLayer: (updates: Partial<CentralObjectLayerConfig>) => void;
}

const CentralObjectControls: React.FC<CentralObjectControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      <label className="text-xs font-medium text-gray-700">Central Object</label>

      <div className="space-y-2">
        <label className="text-xs text-gray-500">Entity Name</label>
        <input
          type="text"
          value={layer.entityName}
          onChange={(e) => onUpdateLayer({ entityName: e.target.value })}
          placeholder="e.g., Product Name"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-500">Image URL</label>
        <input
          type="text"
          value={layer.imageUrl || ''}
          onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
          placeholder="Enter image URL"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
        <button
          type="button"
          className="w-full px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Upload Object Image
        </button>
      </div>

      <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
        Central object must remain centered and fully visible. Position is auto-enforced.
      </div>
    </div>
  );
};

// ============================================
// TEXT OVERLAY CONTROLS
// ============================================

interface TextOverlayControlsProps {
  layer: TextOverlayLayerConfig;
  onUpdateLayer: (updates: Partial<TextOverlayLayerConfig>) => void;
}

const TextOverlayControls: React.FC<TextOverlayControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      <label className="text-xs font-medium text-gray-700">Text Overlay</label>

      {/* Text Content */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Text</label>
        <textarea
          value={layer.text}
          onChange={(e) => onUpdateLayer({ text: e.target.value })}
          placeholder="Enter text..."
          rows={2}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
      </div>

      {/* Placement */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Placement</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUpdateLayer({ placement: 'top' })}
            className={`flex-1 px-2 py-1 text-sm rounded ${
              layer.placement === 'top'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={() => onUpdateLayer({ placement: 'bottom' })}
            className={`flex-1 px-2 py-1 text-sm rounded ${
              layer.placement === 'bottom'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            Bottom
          </button>
        </div>
      </div>

      {/* Font Family */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Font</label>
        <select
          value={layer.fontFamily}
          onChange={(e) => onUpdateLayer({ fontFamily: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          {fontFamilyPresets.map(font => (
            <option key={font.id} value={font.value}>{font.name}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Size</label>
        <select
          value={layer.fontSize}
          onChange={(e) => onUpdateLayer({ fontSize: parseInt(e.target.value) })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          {fontSizePresets.map(size => (
            <option key={size.id} value={size.value}>{size.name} ({size.value}px)</option>
          ))}
        </select>
      </div>

      {/* Font Weight */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Weight</label>
        <select
          value={layer.fontWeight}
          onChange={(e) => onUpdateLayer({ fontWeight: parseInt(e.target.value) })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          {fontWeightPresets.map(weight => (
            <option key={weight.id} value={weight.value}>{weight.name}</option>
          ))}
        </select>
      </div>

      {/* Text Color */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Text Color</label>
        <div className="flex gap-1 flex-wrap">
          {textColorPresets.map(color => (
            <button
              key={color.id}
              type="button"
              onClick={() => onUpdateLayer({ textColor: color.value })}
              className={`w-6 h-6 rounded border-2 ${
                layer.textColor === color.value ? 'border-blue-500' : 'border-gray-200'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>

      {/* Background */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Background</label>
        <select
          value={layer.backgroundColor}
          onChange={(e) => onUpdateLayer({ backgroundColor: e.target.value })}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        >
          {textBackgroundPresets.map(bg => (
            <option key={bg.id} value={bg.value}>{bg.name}</option>
          ))}
        </select>
      </div>

      {/* Text Align */}
      <div className="space-y-2">
        <label className="text-xs text-gray-500">Alignment</label>
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map(align => (
            <button
              key={align}
              type="button"
              onClick={() => onUpdateLayer({ textAlign: align })}
              className={`flex-1 px-2 py-1 text-sm rounded ${
                layer.textAlign === align
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================
// LOGO CONTROLS
// ============================================

interface LogoControlsProps {
  layer: LogoLayerConfig;
  onUpdateLayer: (updates: Partial<LogoLayerConfig>) => void;
}

const LogoControls: React.FC<LogoControlsProps> = ({
  layer,
  onUpdateLayer
}) => {
  return (
    <div className="space-y-3 pt-3 border-t border-gray-200">
      <label className="text-xs font-medium text-gray-700">Logo</label>

      <div className="space-y-2">
        <label className="text-xs text-gray-500">Logo Image URL</label>
        <input
          type="text"
          value={layer.imageUrl || ''}
          onChange={(e) => onUpdateLayer({ imageUrl: e.target.value })}
          placeholder="Enter logo URL"
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
        />
        <button
          type="button"
          className="w-full px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
        >
          Upload Logo
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-500">Corner Position</label>
        <div className="grid grid-cols-2 gap-2">
          {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(corner => (
            <button
              key={corner}
              type="button"
              onClick={() => onUpdateLayer({ cornerPosition: corner })}
              className={`px-2 py-1.5 text-xs rounded ${
                layer.cornerPosition === corner
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300'
              }`}
            >
              {corner.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="p-2 bg-green-50 rounded text-xs text-green-700">
        Logo will snap to the selected corner position.
      </div>
    </div>
  );
};

export default LayerControls;
