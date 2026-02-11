/**
 * cacheService graceful degradation tests
 *
 * The CacheService uses a dual-layer caching strategy (in-memory Map + IndexedDB).
 * Every IndexedDB operation is wrapped in try/catch with console.error(...) logging.
 * This is intentional graceful degradation — a cache layer should never crash the
 * application; it should log the error and return a safe fallback (null for gets,
 * no-op for sets/deletes).
 *
 * These tests verify:
 *   1. The module can be imported and the singleton is exported
 *   2. The class exposes the expected public API surface
 *   3. The generateCacheKey logic produces deterministic, stable keys
 *   4. When IndexedDB is unavailable, operations degrade gracefully by logging
 *      errors rather than throwing exceptions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'idb' module so the CacheService constructor does not attempt
// to open a real IndexedDB connection (jsdom does not provide one).
const mockDB = {
  get: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  transaction: vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue({
      getAllKeys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(undefined),
    }),
    done: Promise.resolve(),
  }),
  objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
};

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue(mockDB),
}));

describe('cacheService', () => {
  // ---------- Module & Export Tests ----------

  it('can be imported without errors', async () => {
    const module = await import('../cacheService');
    expect(module).toBeDefined();
  });

  it('exports a cacheService singleton object', async () => {
    const { cacheService } = await import('../cacheService');
    expect(cacheService).toBeDefined();
    expect(typeof cacheService).toBe('object');
  });

  // ---------- Public API Surface Tests ----------

  describe('public API surface', () => {
    let cacheService: any;

    beforeEach(async () => {
      const module = await import('../cacheService');
      cacheService = module.cacheService;
    });

    it('exposes cacheThrough method', () => {
      expect(typeof cacheService.cacheThrough).toBe('function');
    });

    it('exposes get method', () => {
      expect(typeof cacheService.get).toBe('function');
    });

    it('exposes set method', () => {
      expect(typeof cacheService.set).toBe('function');
    });

    it('exposes delete method', () => {
      expect(typeof cacheService.delete).toBe('function');
    });

    it('exposes clearByPrefix method', () => {
      expect(typeof cacheService.clearByPrefix).toBe('function');
    });

    it('exposes clearAll method', () => {
      expect(typeof cacheService.clearAll).toBe('function');
    });
  });

  // ---------- generateCacheKey (via cacheThrough) Determinism ----------

  describe('cache key determinism', () => {
    let cacheService: any;

    beforeEach(async () => {
      const module = await import('../cacheService');
      cacheService = module.cacheService;
    });

    it('cacheThrough calls fetchFn on cache miss and returns its result', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ data: 'fresh' });

      const result = await cacheService.cacheThrough(
        'test-context',
        { a: 1, b: 2 },
        fetchFn,
        60
      );

      expect(fetchFn).toHaveBeenCalledOnce();
      expect(result).toEqual({ data: 'fresh' });
    });

    it('returns cached value from memory on second call with same params', async () => {
      const fetchFn = vi.fn().mockResolvedValue('value-1');

      // First call — cache miss, calls fetchFn
      await cacheService.cacheThrough('dedup-ctx', { x: 1 }, fetchFn, 300);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Second call — same context & params, should hit memory cache
      const fetchFn2 = vi.fn().mockResolvedValue('value-2');
      const result = await cacheService.cacheThrough('dedup-ctx', { x: 1 }, fetchFn2, 300);

      expect(fetchFn2).not.toHaveBeenCalled();
      expect(result).toBe('value-1');
    });

    it('generates the same key regardless of object property order', async () => {
      const fetchFn1 = vi.fn().mockResolvedValue('first');
      const fetchFn2 = vi.fn().mockResolvedValue('second');

      // Call with {a, b} order
      await cacheService.cacheThrough('order-test', { a: 1, b: 2 }, fetchFn1, 300);
      // Call with {b, a} order — should still be a memory cache hit
      const result = await cacheService.cacheThrough('order-test', { b: 2, a: 1 }, fetchFn2, 300);

      expect(fetchFn1).toHaveBeenCalledOnce();
      expect(fetchFn2).not.toHaveBeenCalled();
      expect(result).toBe('first');
    });
  });

  // ---------- Graceful Degradation Tests ----------

  describe('graceful degradation when IndexedDB fails', () => {
    let cacheService: any;

    beforeEach(async () => {
      vi.clearAllMocks();
      // Reset the module to get a fresh CacheService instance
      vi.resetModules();

      // Re-mock idb with a DB that rejects on every operation
      vi.doMock('idb', () => ({
        openDB: vi.fn().mockResolvedValue({
          get: vi.fn().mockRejectedValue(new Error('IndexedDB get failed')),
          put: vi.fn().mockRejectedValue(new Error('IndexedDB put failed')),
          delete: vi.fn().mockRejectedValue(new Error('IndexedDB delete failed')),
          clear: vi.fn().mockRejectedValue(new Error('IndexedDB clear failed')),
          transaction: vi.fn().mockImplementation(() => {
            throw new Error('IndexedDB transaction failed');
          }),
          objectStoreNames: { contains: vi.fn().mockReturnValue(true) },
        }),
      }));

      const module = await import('../cacheService');
      cacheService = module.cacheService;
    });

    it('get returns null and logs error when IndexedDB fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cacheService.get('nonexistent-key');

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error getting item from IndexedDB:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('set does not throw when IndexedDB fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw — graceful degradation
      await expect(
        cacheService.set('key', 'value', 60)
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error setting item in IndexedDB:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('delete does not throw when IndexedDB fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        cacheService.delete('key')
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error deleting item from IndexedDB:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('clearAll does not throw when IndexedDB fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        cacheService.clearAll()
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error clearing all cache:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('clearByPrefix does not throw when IndexedDB fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await cacheService.clearByPrefix('test:');

      // Should return a count (at least 0) without throwing
      expect(typeof result).toBe('number');
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error clearing cache by prefix:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('cacheThrough still works by calling fetchFn when cache is unavailable', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const fetchFn = vi.fn().mockResolvedValue({ status: 'fresh' });

      const result = await cacheService.cacheThrough(
        'degraded-ctx',
        { q: 'test' },
        fetchFn,
        60
      );

      // fetchFn should still be called and its value returned
      expect(fetchFn).toHaveBeenCalledOnce();
      expect(result).toEqual({ status: 'fresh' });

      consoleSpy.mockRestore();
    });
  });

  // ---------- Direct get/set with Memory Layer ----------

  describe('memory-layer get/set', () => {
    let cacheService: any;

    beforeEach(async () => {
      const module = await import('../cacheService');
      cacheService = module.cacheService;
    });

    it('set then get returns the cached value from memory', async () => {
      await cacheService.set('mem-test-key', { hello: 'world' }, 60);
      const result = await cacheService.get('mem-test-key');
      expect(result).toEqual({ hello: 'world' });
    });

    it('delete removes from memory cache', async () => {
      await cacheService.set('del-key', 'to-delete', 60);
      await cacheService.delete('del-key');

      // After delete, memory hit should be gone; DB mock returns undefined
      const result = await cacheService.get('del-key');
      expect(result).toBeNull();
    });
  });
});
