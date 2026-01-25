import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DesignInheritanceService } from '../DesignInheritanceService';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client with proper chaining
const createMockSupabase = () => {
  const responses: Array<{ data: unknown; error: unknown }> = [];
  let responseIndex = 0;

  const getNextResponse = () => {
    const response = responses[responseIndex] || { data: null, error: { message: 'Not found' } };
    responseIndex++;
    return response;
  };

  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockImplementation(() => Promise.resolve(getNextResponse())),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  const mockFrom = vi.fn().mockReturnValue(chainable);
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    from: mockFrom,
    rpc: mockRpc,
    _addResponse: (data: unknown, error: unknown = null) => {
      responses.push({ data, error });
    },
    _resetResponses: () => {
      responses.length = 0;
      responseIndex = 0;
    },
    _chainable: chainable,
  } as unknown as SupabaseClient & {
    _addResponse: (data: unknown, error?: unknown) => void;
    _resetResponses: () => void;
    _chainable: typeof chainable;
  };
};

describe('DesignInheritanceService', () => {
  let service: DesignInheritanceService;
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    service = new DesignInheritanceService({ supabase: mockSupabase });
  });

  describe('getActiveDesignProfile', () => {
    it('should return null when no profile exists', async () => {
      mockSupabase._addResponse(null, { message: 'Not found' });

      const result = await service.getActiveDesignProfile('project-123');

      expect(result).toBeNull();
    });

    it('should return profile when it exists', async () => {
      const mockProfile = {
        id: 'profile-1',
        project_id: 'project-123',
        name: 'My Brand',
        final_tokens: {
          colors: { primary: '#FF0000' },
        },
        is_active: true,
      };

      mockSupabase._addResponse(mockProfile);

      const result = await service.getActiveDesignProfile('project-123');

      expect(result).toEqual(mockProfile);
    });
  });

  describe('resolveDesignSettings', () => {
    it('should return default settings when no data exists', async () => {
      // Mock no profile, no defaults
      mockSupabase._addResponse(null, { message: 'Not found' });
      mockSupabase._addResponse(null, { message: 'Not found' });

      const result = await service.resolveDesignSettings('project-123');

      expect(result.tokens).toBeDefined();
      expect(result.tokens.colors.primary).toBe('#3B82F6'); // Default
      expect(result.preferences).toBeDefined();
      expect(result.inheritanceSource.tokens).toBe('project');
      expect(result.inheritanceSource.preferences).toBe('project');
    });

    it('should use project tokens when profile exists', async () => {
      const mockProfile = {
        id: 'profile-1',
        project_id: 'project-123',
        final_tokens: {
          colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
            accent: '#0000FF',
            background: '#FFFFFF',
            surface: '#F5F5F5',
            text: '#000000',
            textMuted: '#666666',
            border: '#CCCCCC',
            success: '#00FF00',
            warning: '#FFFF00',
            error: '#FF0000',
          },
          fonts: {
            heading: 'Arial',
            body: 'Georgia',
          },
          spacing: {
            sectionGap: 'normal',
            contentWidth: 'standard',
            paragraphSpacing: 'normal',
          },
          borderRadius: 'rounded',
          shadows: 'subtle',
          typography: {
            headingWeight: 'bold',
            bodyLineHeight: 'normal',
            headingLineHeight: 'tight',
          },
        },
        is_active: true,
      };

      // Profile found
      mockSupabase._addResponse(mockProfile);
      // No project defaults
      mockSupabase._addResponse(null, { message: 'Not found' });

      const result = await service.resolveDesignSettings('project-123');

      expect(result.tokens.colors.primary).toBe('#FF0000');
      expect(result.tokens.fonts.heading).toBe('Arial');
    });

    it('should merge topical map overrides', async () => {
      // resolveDesignSettings calls:
      // 1. getActiveDesignProfile (for tokens)
      // 2. loadInheritanceHierarchy which calls getActiveDesignProfile + getProjectDefaults in parallel
      // 3. getTopicalMapRules

      // Response 1: getActiveDesignProfile for tokens
      mockSupabase._addResponse(null, { message: 'Not found' });
      // Response 2: getActiveDesignProfile in loadInheritanceHierarchy
      mockSupabase._addResponse(null, { message: 'Not found' });
      // Response 3: getProjectDefaults in loadInheritanceHierarchy
      mockSupabase._addResponse({
        component_preferences: { prose: 'lead-paragraph' },
        spacing_preference: 'normal',
        visual_intensity: 'moderate',
      });
      // Response 4: getTopicalMapRules
      mockSupabase._addResponse({
        topical_map_id: 'map-123',
        inherit_from_project: true,
        overrides: {
          layoutPatterns: { faq: 'faq-accordion' },
        },
      });

      const result = await service.resolveDesignSettings('project-123', 'map-123');

      expect(result.preferences.layoutPatterns.prose).toBe('lead-paragraph');
      expect(result.preferences.layoutPatterns.faq).toBe('faq-accordion');
      expect(result.inheritanceSource.preferences).toBe('topicalMap');
    });

    it('should apply article overrides', async () => {
      // No profile, no defaults
      mockSupabase._addResponse(null, { message: 'Not found' });
      mockSupabase._addResponse(null, { message: 'Not found' });

      const articleOverrides = {
        layoutPatterns: { comparison: 'card-grid' },
      };

      const result = await service.resolveDesignSettings(
        'project-123',
        undefined,
        articleOverrides
      );

      expect(result.preferences.layoutPatterns.comparison).toBe('card-grid');
      expect(result.inheritanceSource.preferences).toBe('article');
    });
  });

  describe('loadInheritanceHierarchy', () => {
    it('should load project level only when no map provided', async () => {
      // No profile, no defaults
      mockSupabase._addResponse(null, { message: 'Not found' });
      mockSupabase._addResponse(null, { message: 'Not found' });

      const result = await service.loadInheritanceHierarchy('project-123');

      expect(result.projectLevel).toBeDefined();
      expect(result.topicalMapLevel).toBeUndefined();
      expect(result.articleLevel).toBeUndefined();
    });

    it('should include topical map level when map ID provided', async () => {
      // No profile
      mockSupabase._addResponse(null, { message: 'Not found' });
      // No project defaults
      mockSupabase._addResponse(null, { message: 'Not found' });
      // Map rules exist
      mockSupabase._addResponse({
        topical_map_id: 'map-123',
        inherit_from_project: true,
        overrides: { layoutPatterns: {} },
      });

      const result = await service.loadInheritanceHierarchy('project-123', 'map-123');

      expect(result.projectLevel).toBeDefined();
      expect(result.topicalMapLevel).toBeDefined();
      expect(result.topicalMapLevel?.topicalMapId).toBe('map-123');
    });
  });

  describe('saveProjectDefaults', () => {
    it('should insert when no existing defaults', async () => {
      mockSupabase._addResponse(null, { message: 'Not found' });

      await service.saveProjectDefaults('project-123', {
        default_personality: 'bold-editorial',
      });

      expect(mockSupabase._chainable.insert).toHaveBeenCalled();
    });

    it('should update when defaults exist', async () => {
      mockSupabase._addResponse({ id: 'existing-id' });

      await service.saveProjectDefaults('project-123', {
        default_personality: 'modern-minimal',
      });

      expect(mockSupabase._chainable.update).toHaveBeenCalled();
    });
  });
});
