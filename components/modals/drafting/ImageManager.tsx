// components/modals/drafting/ImageManager.tsx
// Handles image placeholder management, generation, and insertion

import { useCallback, useMemo, useState } from 'react';
import { useDraftingContext } from './DraftingContext';
import { ImagePlaceholder } from '../../../types';
import { extractPlaceholdersFromDraft } from '../../../services/ai/imageGeneration/placeholderParser';
import { generateImage as generateImageFromOrchestrator, initImageGeneration } from '../../../services/ai/imageGeneration/orchestrator';
import { getSupabaseClient } from '../../../services/supabaseClient';
import { ContextualImageStyle, AspectRatio } from '../../../types/contextualEditor';

export interface ImageManagerHook {
  // Image state
  imagePlaceholders: ImagePlaceholder[];
  selectedPlaceholder: ImagePlaceholder | null;
  setSelectedPlaceholder: (placeholder: ImagePlaceholder | null) => void;
  showImageModal: boolean;
  setShowImageModal: (show: boolean) => void;
  openInVisualEditor: boolean;
  setOpenInVisualEditor: (open: boolean) => void;

  // Handlers
  handleOpenImageGeneration: () => void;
  handleImageInsert: (generatedPlaceholder: ImagePlaceholder) => void;

  // Contextual image generation
  contextualImageUrl: string | undefined;
  isGeneratingContextualImage: boolean;
  handleContextualImageGenerate: (prompt: string, style: ContextualImageStyle, aspectRatio: AspectRatio) => Promise<void>;
  handleContextualImageAccept: (imageUrl: string, altText: string) => void;
  handleContextualImageReject: () => void;
  handleContextualImageClose: () => void;
}

/**
 * Replace IMAGE placeholders with actual markdown images if they have generated URLs.
 */
export function replaceImagePlaceholdersWithUrls(content: string, placeholders: ImagePlaceholder[]): string {
  if (!content || !placeholders || placeholders.length === 0) return content;

  let result = content;

  // Build a map of description prefix to URL for matching
  const urlMap = new Map<string, { url: string; alt: string }>();
  for (const p of placeholders) {
    const url = p.generatedUrl || p.userUploadUrl;
    if (url && p.description) {
      urlMap.set(p.description.slice(0, 50).toLowerCase(), {
        url,
        alt: p.metadata?.altText || p.altTextSuggestion || p.description.slice(0, 100),
      });
    }
  }

  if (urlMap.size === 0) return content;

  // Replace [IMAGE: description | alt="text"] patterns with ![alt](url)
  result = result.replace(
    /\[IMAGE:\s*([^|\]]+)(?:\s*\|\s*alt="([^"]*)")?\]/gi,
    (match, description, altFromPattern) => {
      const descKey = description.trim().slice(0, 50).toLowerCase();
      const imgData = urlMap.get(descKey);

      if (imgData) {
        const alt = altFromPattern?.trim() || imgData.alt;
        return `![${alt}](${imgData.url})`;
      }

      return match;
    }
  );

  return result;
}

/**
 * Hook for managing image operations in the drafting modal
 */
export function useImageManager(contextualEditor?: any): ImageManagerHook {
  const {
    brief,
    draftContent,
    setDraftContent,
    setHasUnsavedChanges,
    databaseJobInfo,
    businessInfo,
    dispatch,
  } = useDraftingContext();

  // Image state
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<ImagePlaceholder | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [openInVisualEditor, setOpenInVisualEditor] = useState(false);

  // Contextual image generation state
  const [contextualImageUrl, setContextualImageUrl] = useState<string | undefined>(undefined);
  const [isGeneratingContextualImage, setIsGeneratingContextualImage] = useState(false);

  // Build comprehensive image list combining multiple sources
  const imagePlaceholders = useMemo(() => {
    const result: ImagePlaceholder[] = [];
    const seenIds = new Set<string>();
    const seenUrls = new Set<string>();

    // Source 1: Database-stored generated images (highest priority)
    const dbPlaceholders = databaseJobInfo?.imagePlaceholders || [];
    for (const dbp of dbPlaceholders) {
      if (dbp.id && !seenIds.has(dbp.id)) {
        seenIds.add(dbp.id);
        if (dbp.generatedUrl) seenUrls.add(dbp.generatedUrl);
        if (dbp.userUploadUrl) seenUrls.add(dbp.userUploadUrl);
        result.push({
          ...dbp,
          status: (dbp.generatedUrl || dbp.userUploadUrl) ? 'generated' as const : dbp.status,
        });
      }
    }

    // Source 2: Parse [IMAGE:...] placeholders from draft (pending images)
    if (draftContent) {
      const parsed = extractPlaceholdersFromDraft(draftContent, { heroTitle: brief?.title });
      for (const p of parsed) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          const descKey = p.description?.slice(0, 50).toLowerCase();
          const dbMatch = dbPlaceholders.find(dbp =>
            dbp.description?.slice(0, 50).toLowerCase() === descKey &&
            (dbp.generatedUrl || dbp.userUploadUrl)
          );
          if (dbMatch) {
            result.push({
              ...p,
              generatedUrl: dbMatch.generatedUrl,
              userUploadUrl: dbMatch.userUploadUrl,
              status: 'generated' as const,
              metadata: dbMatch.metadata,
            });
          } else {
            result.push(p);
          }
        }
      }
    }

    // Source 3: Extract already-inserted markdown images from draft
    if (draftContent) {
      const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
      let match;
      let insertedIndex = 0;
      while ((match = markdownImageRegex.exec(draftContent)) !== null) {
        const altText = match[1];
        const url = match[2];
        if (url.startsWith('blob:') || url.startsWith('data:') || seenUrls.has(url)) {
          continue;
        }
        seenUrls.add(url);

        const insertedId = `inserted_${insertedIndex++}`;
        if (!seenIds.has(insertedId)) {
          const isFirst = insertedIndex === 1 && match.index < 500;
          const type = isFirst ? 'HERO' : 'SECTION';

          result.push({
            id: insertedId,
            type: type as any,
            position: match.index,
            description: altText || 'Inserted image',
            altTextSuggestion: altText,
            status: 'generated',
            generatedUrl: url,
            specs: {
              width: type === 'HERO' ? 1200 : 800,
              height: type === 'HERO' ? 630 : 600,
              format: 'webp',
              maxFileSize: 500000,
            },
            metadata: {
              altText,
              filename: url.split('/').pop() || 'image',
              exif: { author: '', copyright: '', software: 'CoR Generator', description: altText || '' },
              iptc: { creator: '', rights: '', source: '', keywords: [] },
              schema: { "@type": "ImageObject" as const, url, width: 0, height: 0, caption: altText || '' },
            },
          });
        }
      }
    }

    return result;
  }, [draftContent, brief?.title, databaseJobInfo?.imagePlaceholders]);

  /**
   * Open image generation modal with the first placeholder
   */
  const handleOpenImageGeneration = useCallback(() => {
    if (imagePlaceholders.length > 0) {
      setSelectedPlaceholder(imagePlaceholders[0]);
      setShowImageModal(true);
    } else {
      dispatch({ type: 'SET_ERROR', payload: 'No image placeholders found in the draft.' });
    }
  }, [imagePlaceholders, dispatch]);

  /**
   * Handle image insertion from the modal
   */
  const handleImageInsert = useCallback((generatedPlaceholder: ImagePlaceholder) => {
    if (!selectedPlaceholder) return;

    if (generatedPlaceholder.status === 'error') {
      dispatch({ type: 'SET_ERROR', payload: generatedPlaceholder.errorMessage || 'Image generation failed' });
      return;
    }

    const imageUrl = generatedPlaceholder.generatedUrl || generatedPlaceholder.userUploadUrl;
    const altText = generatedPlaceholder.metadata?.altText || selectedPlaceholder.altTextSuggestion;

    if (imageUrl) {
      const imageMarkdown = `![${altText}](${imageUrl})`;

      // Find the placeholder pattern in the draft and replace it
      const escapedDesc = selectedPlaceholder.description.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const placeholderPattern = new RegExp(
        `\\[IMAGE:\\s*${escapedDesc}[^\\]]*\\]`,
        'i'
      );

      let newDraft = draftContent.replace(placeholderPattern, imageMarkdown);

      // If exact match didn't work, try a more flexible approach
      if (newDraft === draftContent) {
        const descWords = selectedPlaceholder.description.split(/\s+/).slice(0, 3).join('\\s+');
        const loosePattern = new RegExp(
          `\\[IMAGE:\\s*${descWords}[^\\]]*\\]`,
          'i'
        );
        newDraft = draftContent.replace(loosePattern, imageMarkdown);
      }

      if (newDraft !== draftContent) {
        setDraftContent(newDraft);
        setHasUnsavedChanges(true);
        dispatch({ type: 'SET_NOTIFICATION', payload: `Image generated and inserted successfully!` });
      } else {
        dispatch({ type: 'SET_NOTIFICATION', payload: `Image generated! Note: Could not auto-insert into draft.` });
      }
    }
  }, [selectedPlaceholder, draftContent, setDraftContent, setHasUnsavedChanges, dispatch]);

  /**
   * Handle contextual image generation (from selected text)
   */
  const handleContextualImageGenerate = useCallback(async (prompt: string, style: ContextualImageStyle, aspectRatio: AspectRatio) => {
    if (!contextualEditor?.selection) return;

    setIsGeneratingContextualImage(true);
    setContextualImageUrl(undefined);

    try {
      const supabase = getSupabaseClient(businessInfo.supabaseUrl, businessInfo.supabaseAnonKey);
      initImageGeneration(supabase);

      const tempPlaceholder: ImagePlaceholder = {
        id: `contextual_${Date.now()}`,
        description: prompt,
        altTextSuggestion: contextualEditor.state?.imagePromptResult?.altTextSuggestion || prompt.slice(0, 100),
        type: style === 'diagram' ? 'DIAGRAM' : style === 'infographic' ? 'INFOGRAPHIC' : 'SECTION',
        status: 'placeholder',
        specs: {
          width: aspectRatio === '16:9' ? 1920 : aspectRatio === '4:3' ? 1600 : aspectRatio === '1:1' ? 1200 : 1200,
          height: aspectRatio === '16:9' ? 1080 : aspectRatio === '4:3' ? 1200 : aspectRatio === '1:1' ? 1200 : 1600,
          format: 'webp',
          maxFileSize: 500000,
        },
        metadata: {
          filename: `contextual_${Date.now()}.webp`,
          altText: contextualEditor.state?.imagePromptResult?.altTextSuggestion || '',
          exif: { author: '', copyright: '', software: 'CoR Generator', description: '' },
          iptc: { creator: '', rights: '', source: '', keywords: [] },
          schema: { "@type": "ImageObject" as const, url: '', width: 0, height: 0, caption: '' },
        },
        position: 0,
      };

      const result = await generateImageFromOrchestrator(
        tempPlaceholder,
        { altText: tempPlaceholder.altTextSuggestion || prompt },
        businessInfo,
        (progress) => {
          console.log('[ImageManager] Progress:', progress.message);
        }
      );

      if (result.generatedUrl) {
        setContextualImageUrl(result.generatedUrl);
        dispatch({ type: 'SET_NOTIFICATION', payload: 'Image generated successfully!' });
      } else if (result.status === 'error') {
        dispatch({ type: 'SET_ERROR', payload: result.errorMessage || 'Image generation failed' });
      }
    } catch (error) {
      console.error('[ImageManager] Generation error:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Image generation failed' });
    } finally {
      setIsGeneratingContextualImage(false);
    }
  }, [contextualEditor, businessInfo, dispatch]);

  /**
   * Handle accepting and inserting contextual image
   */
  const handleContextualImageAccept = useCallback((imageUrl: string, altText: string) => {
    if (!contextualEditor?.selection) return;

    const imageMarkdown = `\n\n![${altText}](${imageUrl})\n\n`;
    const selectionText = contextualEditor.selection.text;
    const selectionIndex = draftContent.indexOf(selectionText);

    if (selectionIndex !== -1) {
      const afterSelection = draftContent.slice(selectionIndex + selectionText.length);
      const nextParagraphBreak = afterSelection.search(/\n\n|\n(?=[#\-\*])/);

      let insertPosition: number;
      if (nextParagraphBreak !== -1) {
        insertPosition = selectionIndex + selectionText.length + nextParagraphBreak;
      } else {
        insertPosition = selectionIndex + selectionText.length;
      }

      const newDraft = draftContent.slice(0, insertPosition) + imageMarkdown + draftContent.slice(insertPosition);
      setDraftContent(newDraft);
      setHasUnsavedChanges(true);
      dispatch({ type: 'SET_NOTIFICATION', payload: 'Image inserted into article!' });
    }

    contextualEditor.acceptImage?.();
    setContextualImageUrl(undefined);
  }, [contextualEditor, draftContent, setDraftContent, setHasUnsavedChanges, dispatch]);

  /**
   * Handle rejecting contextual image
   */
  const handleContextualImageReject = useCallback(() => {
    contextualEditor?.rejectImage?.();
    setContextualImageUrl(undefined);
    setIsGeneratingContextualImage(false);
  }, [contextualEditor]);

  /**
   * Handle closing contextual image panel
   */
  const handleContextualImageClose = useCallback(() => {
    contextualEditor?.closePanel?.();
    setContextualImageUrl(undefined);
    setIsGeneratingContextualImage(false);
  }, [contextualEditor]);

  return {
    imagePlaceholders,
    selectedPlaceholder,
    setSelectedPlaceholder,
    showImageModal,
    setShowImageModal,
    openInVisualEditor,
    setOpenInVisualEditor,
    handleOpenImageGeneration,
    handleImageInsert,
    contextualImageUrl,
    isGeneratingContextualImage,
    handleContextualImageGenerate,
    handleContextualImageAccept,
    handleContextualImageReject,
    handleContextualImageClose,
  };
}

export default useImageManager;
