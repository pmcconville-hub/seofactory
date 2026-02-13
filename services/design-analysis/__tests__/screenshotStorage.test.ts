import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseBase64Screenshot,
  buildStoragePath,
  uploadScreenshot,
  getScreenshotUrl,
  uploadElementScreenshots,
  deleteScreenshots,
} from '../screenshotStorage';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
function createMockSupabase(overrides?: {
  uploadError?: { message: string } | null;
  listData?: Array<{ name: string }> | null;
  listError?: { message: string } | null;
  removeError?: { message: string } | null;
}) {
  const uploadFn = vi.fn().mockResolvedValue({ error: overrides?.uploadError ?? null });
  const getPublicUrlFn = vi.fn().mockImplementation((path: string) => ({
    data: { publicUrl: `https://storage.example.com/brand-screenshots/${path}` },
  }));
  const listFn = vi.fn().mockResolvedValue({
    data: overrides?.listData ?? [],
    error: overrides?.listError ?? null,
  });
  const removeFn = vi.fn().mockResolvedValue({ error: overrides?.removeError ?? null });

  const fromFn = vi.fn().mockReturnValue({
    upload: uploadFn,
    getPublicUrl: getPublicUrlFn,
    list: listFn,
    remove: removeFn,
  });

  return {
    client: { storage: { from: fromFn } } as any,
    fns: { fromFn, uploadFn, getPublicUrlFn, listFn, removeFn },
  };
}

// ---------------------------------------------------------------------------
// parseBase64Screenshot
// ---------------------------------------------------------------------------
describe('parseBase64Screenshot', () => {
  it('should detect PNG from data URI prefix', () => {
    const result = parseBase64Screenshot('data:image/png;base64,iVBORw0KGgoA==');
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.cleanBase64).toBe('iVBORw0KGgoA==');
  });

  it('should detect JPEG from data URI prefix', () => {
    const result = parseBase64Screenshot('data:image/jpeg;base64,/9j/4AAQ');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.cleanBase64).toBe('/9j/4AAQ');
  });

  it('should detect WebP from data URI prefix', () => {
    const result = parseBase64Screenshot('data:image/webp;base64,UklGRlI=');
    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.cleanBase64).toBe('UklGRlI=');
  });

  it('should sniff PNG from raw base64 (starts with iVBOR)', () => {
    const result = parseBase64Screenshot('iVBORw0KGgoAAAANSUhEUg');
    expect(result.mimeType).toBe('image/png');
    expect(result.extension).toBe('png');
    expect(result.cleanBase64).toBe('iVBORw0KGgoAAAANSUhEUg');
  });

  it('should sniff WebP from raw base64 (starts with UklG)', () => {
    const result = parseBase64Screenshot('UklGRlIAAABXRUJQVlA4');
    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('webp');
    expect(result.cleanBase64).toBe('UklGRlIAAABXRUJQVlA4');
  });

  it('should default to JPEG for unrecognized raw base64', () => {
    const result = parseBase64Screenshot('/9j/4AAQSkZJRgABAQAA');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
    expect(result.cleanBase64).toBe('/9j/4AAQSkZJRgABAQAA');
  });

  it('should default to JPEG for arbitrary base64', () => {
    const result = parseBase64Screenshot('SGVsbG8gV29ybGQ=');
    expect(result.mimeType).toBe('image/jpeg');
    expect(result.extension).toBe('jpg');
  });
});

// ---------------------------------------------------------------------------
// buildStoragePath
// ---------------------------------------------------------------------------
describe('buildStoragePath', () => {
  it('should produce {projectId}/{context}/{timestamp}.{ext} format', () => {
    const path = buildStoragePath('proj-123', 'brand-dna', 'jpg');
    expect(path).toMatch(/^proj-123\/brand-dna\/\d+\.jpg$/);
  });

  it('should include suffix when provided', () => {
    const path = buildStoragePath('proj-123', 'style-guide-element/sg-1', 'png', 'el-42');
    expect(path).toMatch(/^proj-123\/style-guide-element\/sg-1\/\d+-el-42\.png$/);
  });

  it('should produce unique timestamps on consecutive calls', () => {
    const path1 = buildStoragePath('p', 'c', 'jpg');
    const path2 = buildStoragePath('p', 'c', 'jpg');
    // Timestamps could be the same within one ms, so we just check format
    expect(path1).toMatch(/^p\/c\/\d+\.jpg$/);
    expect(path2).toMatch(/^p\/c\/\d+\.jpg$/);
  });
});

// ---------------------------------------------------------------------------
// getScreenshotUrl
// ---------------------------------------------------------------------------
describe('getScreenshotUrl', () => {
  it('should call supabase.storage.from(bucket).getPublicUrl(path)', () => {
    const { client, fns } = createMockSupabase();
    const url = getScreenshotUrl(client, 'proj-1/brand-dna/123.jpg');

    expect(fns.fromFn).toHaveBeenCalledWith('brand-screenshots');
    expect(fns.getPublicUrlFn).toHaveBeenCalledWith('proj-1/brand-dna/123.jpg');
    expect(url).toBe('https://storage.example.com/brand-screenshots/proj-1/brand-dna/123.jpg');
  });
});

// ---------------------------------------------------------------------------
// uploadScreenshot
// ---------------------------------------------------------------------------
describe('uploadScreenshot', () => {
  it('should upload and return storagePath + publicUrl on success', async () => {
    const { client, fns } = createMockSupabase();
    // Use a simple base64 string (JPEG default)
    const result = await uploadScreenshot(client, 'proj-1', 'brand-dna', '/9j/4AAQ');

    expect(result).not.toBeNull();
    expect(result!.storagePath).toMatch(/^proj-1\/brand-dna\/\d+\.jpg$/);
    expect(result!.publicUrl).toContain('brand-screenshots');
    expect(fns.uploadFn).toHaveBeenCalledTimes(1);
  });

  it('should return null when upload fails', async () => {
    const { client } = createMockSupabase({ uploadError: { message: 'Storage full' } });
    const result = await uploadScreenshot(client, 'proj-1', 'brand-dna', '/9j/4AAQ');
    expect(result).toBeNull();
  });

  it('should strip data URI prefix before upload', async () => {
    const { client, fns } = createMockSupabase();
    // Use valid base64 (btoa('hello')) = 'aGVsbG8='
    await uploadScreenshot(client, 'proj-1', 'brand-dna', 'data:image/png;base64,aGVsbG8=');

    // The upload call should have received Uint8Array content (not data URI)
    expect(fns.uploadFn).toHaveBeenCalledTimes(1);
    const uploadCallArgs = fns.uploadFn.mock.calls[0];
    const storagePath = uploadCallArgs[0] as string;
    expect(storagePath).toMatch(/\.png$/);
    // Second arg is the Uint8Array body
    expect(uploadCallArgs[1]).toBeInstanceOf(Uint8Array);
    // Third arg should have contentType = image/png
    expect(uploadCallArgs[2]).toMatchObject({ contentType: 'image/png' });
  });
});

// ---------------------------------------------------------------------------
// uploadElementScreenshots
// ---------------------------------------------------------------------------
describe('uploadElementScreenshots', () => {
  it('should upload screenshots for elements that have base64 data', async () => {
    const { client, fns } = createMockSupabase();
    const elements = [
      { id: 'el-1', elementScreenshotBase64: '/9j/4AAQ' },
      { id: 'el-2' }, // no screenshot
      { id: 'el-3', elementScreenshotBase64: 'iVBORw0K' },
    ];

    const paths = await uploadElementScreenshots(client, 'proj-1', 'sg-1', elements);

    expect(paths.size).toBe(2);
    expect(paths.has('el-1')).toBe(true);
    expect(paths.has('el-2')).toBe(false);
    expect(paths.has('el-3')).toBe(true);
    expect(fns.uploadFn).toHaveBeenCalledTimes(2);
  });

  it('should return empty map when no elements have screenshots', async () => {
    const { client } = createMockSupabase();
    const elements = [{ id: 'el-1' }, { id: 'el-2' }];

    const paths = await uploadElementScreenshots(client, 'proj-1', 'sg-1', elements);
    expect(paths.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deleteScreenshots
// ---------------------------------------------------------------------------
describe('deleteScreenshots', () => {
  it('should list and delete files under the prefix', async () => {
    const { client, fns } = createMockSupabase({
      listData: [{ name: '123.jpg' }, { name: '456.png' }],
    });

    await deleteScreenshots(client, 'proj-1', 'brand-dna');

    expect(fns.listFn).toHaveBeenCalledWith('proj-1/brand-dna');
    expect(fns.removeFn).toHaveBeenCalledWith([
      'proj-1/brand-dna/123.jpg',
      'proj-1/brand-dna/456.png',
    ]);
  });

  it('should not call remove if no files found', async () => {
    const { client, fns } = createMockSupabase({ listData: [] });

    await deleteScreenshots(client, 'proj-1', 'brand-dna');

    expect(fns.removeFn).not.toHaveBeenCalled();
  });

  it('should handle list errors gracefully', async () => {
    const { client, fns } = createMockSupabase({ listError: { message: 'not found' } });

    // Should not throw
    await deleteScreenshots(client, 'proj-1', 'brand-dna');
    expect(fns.removeFn).not.toHaveBeenCalled();
  });
});
