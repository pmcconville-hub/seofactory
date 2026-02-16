import { describe, it, expect } from 'vitest';
import { normalizeInventoryUrl } from '../migrationService';

describe('normalizeInventoryUrl', () => {
    it('strips trailing slash from path URLs', () => {
        expect(normalizeInventoryUrl('https://example.com/page/')).toBe('https://example.com/page');
    });

    it('preserves root URL without trailing slash', () => {
        expect(normalizeInventoryUrl('https://example.com/')).toBe('https://example.com/');
    });

    it('leaves URLs without trailing slash unchanged', () => {
        expect(normalizeInventoryUrl('https://example.com/page')).toBe('https://example.com/page');
    });

    it('handles deep paths with trailing slash', () => {
        expect(normalizeInventoryUrl('https://example.com/blog/2024/post/')).toBe('https://example.com/blog/2024/post');
    });

    it('preserves query parameters', () => {
        expect(normalizeInventoryUrl('https://example.com/page/?q=test')).toBe('https://example.com/page?q=test');
    });

    it('preserves fragments', () => {
        expect(normalizeInventoryUrl('https://example.com/page/#section')).toBe('https://example.com/page#section');
    });

    it('returns invalid URLs unchanged', () => {
        expect(normalizeInventoryUrl('not-a-url')).toBe('not-a-url');
        expect(normalizeInventoryUrl('')).toBe('');
    });

    it('handles http protocol', () => {
        expect(normalizeInventoryUrl('http://example.com/page/')).toBe('http://example.com/page');
    });

    it('handles URLs with www', () => {
        expect(normalizeInventoryUrl('https://www.example.com/page/')).toBe('https://www.example.com/page');
    });

    it('handles URLs with port numbers', () => {
        expect(normalizeInventoryUrl('https://example.com:8080/page/')).toBe('https://example.com:8080/page');
    });
});
