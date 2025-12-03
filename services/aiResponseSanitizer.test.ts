// services/aiResponseSanitizer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIResponseSanitizer } from './aiResponseSanitizer';
import type { AppAction } from '../state/appState';
import type React from 'react';

describe('AIResponseSanitizer', () => {
  let sanitizer: AIResponseSanitizer;
  let mockDispatch: React.Dispatch<AppAction>;

  beforeEach(() => {
    mockDispatch = vi.fn();
    sanitizer = new AIResponseSanitizer(mockDispatch);
  });

  describe('sanitize - JSON extraction', () => {
    it('extracts JSON from markdown code block with json tag', () => {
      const input = '```json\n{"key": "value"}\n```';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('extracts JSON from markdown code block without json tag', () => {
      const input = '```\n{"key": "value"}\n```';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('extracts plain JSON without markdown', () => {
      const input = '{"key": "value"}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('extracts JSON with surrounding text', () => {
      const input = 'Here is the response: {"key": "value"} Hope this helps!';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('extracts nested JSON object correctly', () => {
      const input = '{"outer": {"inner": "value"}}';
      const schema = { outer: { inner: String } };
      const fallback = { outer: { inner: 'default' } };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ outer: { inner: 'value' } });
    });

    it('handles invalid JSON by returning fallback', () => {
      const input = '{"key": invalid}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual(fallback);
    });

    it('handles empty string by returning fallback', () => {
      const input = '';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual(fallback);
    });

    it('removes BOM (Byte Order Mark) before parsing', () => {
      const input = '\uFEFF{"key": "value"}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('removes control characters before parsing', () => {
      const input = '{"key":\x00\x08 "value"}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('extracts JSON object when both array and object present (object first)', () => {
      const input = '{"key": "value"} [1, 2, 3]';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('handles JSON with escaped quotes in strings', () => {
      const input = '{"key": "value with \\"quotes\\""}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value with "quotes"' });
    });
  });

  describe('sanitize - truncated JSON repair', () => {
    it('repairs truncated JSON missing closing braces', () => {
      const input = '{"key": "value", "nested": {"inner": "data"';
      const schema = { key: String, nested: { inner: String } };
      const fallback = { key: 'default', nested: { inner: 'default' } };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value', nested: { inner: 'data' } });
    });

    it('repairs truncated JSON with unterminated string', () => {
      const input = '{"key": "value", "incomplete": "start';
      const schema = { key: String, incomplete: String };
      const fallback = { key: 'default', incomplete: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      // Should at least preserve the complete key
      expect(result.key).toBe('value');
    });

    it('repairs JSON with missing closing brackets in array', () => {
      const input = '{"items": [1, 2, 3';
      const schema = { items: Array };
      const fallback = { items: [] };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ items: [1, 2, 3] });
    });
  });

  describe('sanitize - schema validation', () => {
    it('validates string fields', () => {
      const input = '{"name": "John", "age": 30}';
      const schema = { name: String, age: String };
      const fallback = { name: 'default', age: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.name).toBe('John');
      expect(result.age).toBe('30'); // Should be coerced to string
    });

    it('validates number fields', () => {
      const input = '{"count": 42, "invalid": "text"}';
      const schema = { count: Number, invalid: Number };
      const fallback = { count: 0, invalid: 0 };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.count).toBe(42);
      expect(result.invalid).toBe(0); // Should use fallback
    });

    it('validates array fields', () => {
      const input = '{"items": [1, 2, 3], "notArray": "string"}';
      const schema = { items: Array, notArray: Array };
      const fallback = { items: [], notArray: [] };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.items).toEqual([1, 2, 3]);
      expect(result.notArray).toEqual([]); // Should use fallback
    });

    it('validates nested object schemas recursively', () => {
      const input = '{"user": {"name": "John", "age": 30}}';
      const schema = { user: { name: String, age: Number } };
      const fallback = { user: { name: 'default', age: 0 } };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ user: { name: 'John', age: 30 } });
    });

    it('uses fallback for missing nested object', () => {
      const input = '{"user": "not an object"}';
      const schema = { user: { name: String, age: Number } };
      const fallback = { user: { name: 'default', age: 0 } };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual(fallback);
    });

    it('uses fallback for missing keys', () => {
      const input = '{"name": "John"}';
      const schema = { name: String, age: Number };
      const fallback = { name: 'default', age: 0 };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.name).toBe('John');
      expect(result.age).toBe(0); // Should use fallback
    });

    it('uses fallback for null values', () => {
      const input = '{"name": null, "age": null}';
      const schema = { name: String, age: Number };
      const fallback = { name: 'default', age: 0 };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual(fallback);
    });

    it('preserves values that match schema', () => {
      const input = '{"name": "John", "age": 30, "items": [1, 2, 3]}';
      const schema = { name: String, age: Number, items: Array };
      const fallback = { name: 'default', age: 0, items: [] };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ name: 'John', age: 30, items: [1, 2, 3] });
    });
  });

  describe('sanitize - object input', () => {
    it('sanitizes object input directly without parsing', () => {
      const input = { key: 'value' };
      const schema = { key: String };
      const fallback = { key: 'default' };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result).toEqual({ key: 'value' });
    });

    it('validates object input against schema', () => {
      const input = { name: 'John', age: 'invalid' };
      const schema = { name: String, age: Number };
      const fallback = { name: 'default', age: 0 };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.name).toBe('John');
      expect(result.age).toBe(0); // Should use fallback for invalid number
    });
  });

  describe('sanitizeArray', () => {
    it('extracts array from JSON string', () => {
      const input = '[1, 2, 3]';
      const fallback = [] as number[];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual([1, 2, 3]);
    });

    it('extracts array from markdown code block', () => {
      const input = '```json\n[1, 2, 3]\n```';
      const fallback = [] as number[];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual([1, 2, 3]);
    });

    it('extracts array of objects', () => {
      const input = '[{"id": 1}, {"id": 2}]';
      const fallback = [] as Array<{ id: number }>;

      const result = sanitizer.sanitizeArray<{ id: number }>(input, fallback);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('extracts array with surrounding text', () => {
      const input = 'Here is the list: [1, 2, 3] as requested.';
      const fallback = [] as number[];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual([1, 2, 3]);
    });

    it('handles invalid JSON by returning fallback', () => {
      const input = '[1, 2, invalid]';
      const fallback = [99];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual(fallback);
    });

    it('handles empty string by returning fallback', () => {
      const input = '';
      const fallback = [1, 2, 3];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual(fallback);
    });

    it('extracts array from object with single array key', () => {
      const input = '{"items": [1, 2, 3]}';
      const fallback = [] as number[];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual([1, 2, 3]);
    });

    it('wraps non-array object in array', () => {
      const input = '{"key": "value"}';
      const fallback = [] as any[];

      const result = sanitizer.sanitizeArray<any>(input, fallback);

      expect(result).toEqual([{ key: 'value' }]);
    });

    it('extracts array when it appears before object', () => {
      const input = '[1, 2, 3] {"key": "value"}';
      const fallback = [] as number[];

      const result = sanitizer.sanitizeArray<number>(input, fallback);

      expect(result).toEqual([1, 2, 3]);
    });

    it('handles nested arrays', () => {
      const input = '[[1, 2], [3, 4], [5, 6]]';
      const fallback = [] as number[][];

      const result = sanitizer.sanitizeArray<number[]>(input, fallback);

      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });
  });

  describe('sanitizeArray - edge cases', () => {
    it('uses default empty array when no fallback provided', () => {
      const input = 'invalid json';

      const result = sanitizer.sanitizeArray(input);

      expect(result).toEqual([]);
    });

    it('handles array with mixed types', () => {
      const input = '[1, "string", true, null, {"key": "value"}]';
      const fallback = [] as any[];

      const result = sanitizer.sanitizeArray<any>(input, fallback);

      expect(result).toEqual([1, 'string', true, null, { key: 'value' }]);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('sanitizes content brief with serpAnalysis object', () => {
      const input = `{
        "title": "Article Title",
        "serpAnalysis": {
          "peopleAlsoAsk": ["Question 1", "Question 2"],
          "topRanking": []
        },
        "contextualBridge": [
          {"entity": "Entity1", "context": "Context1"}
        ]
      }`;

      const schema = {
        title: String,
        serpAnalysis: {
          peopleAlsoAsk: Array,
          topRanking: Array
        },
        contextualBridge: Array
      };

      const fallback = {
        title: '',
        serpAnalysis: {
          peopleAlsoAsk: [],
          topRanking: []
        },
        contextualBridge: []
      };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.title).toBe('Article Title');
      expect(result.serpAnalysis.peopleAlsoAsk).toEqual(['Question 1', 'Question 2']);
      expect(result.contextualBridge).toHaveLength(1);
    });

    it('handles malformed serpAnalysis as string and uses fallback', () => {
      const input = `{
        "title": "Article Title",
        "serpAnalysis": "Not available",
        "contextualBridge": []
      }`;

      const schema = {
        title: String,
        serpAnalysis: {
          peopleAlsoAsk: Array,
          topRanking: Array
        },
        contextualBridge: Array
      };

      const fallback = {
        title: '',
        serpAnalysis: {
          peopleAlsoAsk: [],
          topRanking: []
        },
        contextualBridge: []
      };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.title).toBe('Article Title');
      expect(result.serpAnalysis).toEqual({
        peopleAlsoAsk: [],
        topRanking: []
      });
    });

    it('handles deeply nested structures', () => {
      const input = `{
        "level1": {
          "level2": {
            "level3": {
              "value": "deep"
            }
          }
        }
      }`;

      const schema = {
        level1: {
          level2: {
            level3: {
              value: String
            }
          }
        }
      };

      const fallback = {
        level1: {
          level2: {
            level3: {
              value: 'default'
            }
          }
        }
      };

      const result = sanitizer.sanitize(input, schema, fallback);

      expect(result.level1.level2.level3.value).toBe('deep');
    });

    it('handles array of topics with mixed formats', () => {
      const input = '[{"name": "Topic1", "id": 1}, {"name": "Topic2", "id": 2}]';
      const fallback = [] as Array<{ name: string; id: number }>;

      const result = sanitizer.sanitizeArray<{ name: string; id: number }>(input, fallback);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: 'Topic1', id: 1 });
      expect(result[1]).toEqual({ name: 'Topic2', id: 2 });
    });
  });

  describe('Logging behavior', () => {
    it('dispatches LOG_EVENT actions during sanitization', () => {
      const input = '{"key": "value"}';
      const schema = { key: String };
      const fallback = { key: 'default' };

      sanitizer.sanitize(input, schema, fallback);

      expect(mockDispatch).toHaveBeenCalled();
      const calls = (mockDispatch as any).mock.calls;
      expect(calls.some((call: any) => call[0].type === 'LOG_EVENT')).toBe(true);
    });

    it('logs warning for non-JSON response', () => {
      const input = 'This is plain text, not JSON';
      const schema = { key: String };
      const fallback = { key: 'default' };

      sanitizer.sanitize(input, schema, fallback);

      expect(mockDispatch).toHaveBeenCalled();
      const calls = (mockDispatch as any).mock.calls;
      const logCalls = calls.filter((call: any) => call[0].type === 'LOG_EVENT');
      expect(logCalls.length).toBeGreaterThan(0);
    });
  });
});
