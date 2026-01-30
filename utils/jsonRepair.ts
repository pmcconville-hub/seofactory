/**
 * Robust JSON Repair Utility
 *
 * Handles malformed JSON from AI responses:
 * - Unescaped quotes within strings
 * - Newlines within strings
 * - Trailing commas
 * - JavaScript-style comments
 * - Unquoted property names
 * - Truncated JSON
 */

/**
 * Attempt to repair malformed JSON from AI responses
 */
export function repairJson(input: string): string {
  if (!input || typeof input !== 'string') {
    return '{}';
  }

  let json = input.trim();

  // Step 1: Remove markdown code blocks
  if (json.startsWith('```json')) {
    json = json.slice(7);
  } else if (json.startsWith('```')) {
    json = json.slice(3);
  }
  if (json.endsWith('```')) {
    json = json.slice(0, -3);
  }
  json = json.trim();

  // Step 2: Find the actual JSON object/array boundaries
  const firstBrace = json.indexOf('{');
  const firstBracket = json.indexOf('[');

  let start = -1;
  let isObject = true;

  if (firstBrace === -1 && firstBracket === -1) {
    return '{}';
  } else if (firstBrace === -1) {
    start = firstBracket;
    isObject = false;
  } else if (firstBracket === -1) {
    start = firstBrace;
    isObject = true;
  } else {
    start = Math.min(firstBrace, firstBracket);
    isObject = firstBrace < firstBracket;
  }

  json = json.slice(start);

  // Step 3: Remove JavaScript-style comments
  // Single-line comments
  json = json.replace(/\/\/[^\n\r]*/g, '');
  // Multi-line comments
  json = json.replace(/\/\*[\s\S]*?\*\//g, '');

  // Step 4: Process character by character to handle strings properly
  json = processJsonString(json);

  // Step 5: Remove trailing commas
  json = json.replace(/,(\s*[}\]])/g, '$1');

  // Step 6: Ensure property names are quoted
  json = json.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Step 7: Truncate content AFTER the complete JSON object/array
  // AI responses often include explanation text after the JSON
  json = truncateAfterJson(json, isObject);

  // Step 8: Balance braces/brackets (for truncated/incomplete JSON)
  json = balanceBraces(json, isObject);

  return json;
}

/**
 * Truncate content after a complete JSON object/array ends.
 * AI responses often include explanation text after the JSON body.
 * E.g.: '{"key": "value"} Here is some explanation...'
 */
function truncateAfterJson(json: string, isObject: boolean): string {
  const openChar = isObject ? '{' : '[';
  const closeChar = isObject ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar || (isObject && char === '[') || (!isObject && char === '{')) {
        if (char === '{') depth++;
        if (char === '[') depth++;
      }
      if (char === '}') depth--;
      if (char === ']') depth--;

      // When depth reaches 0 after being positive, we found the end of the root JSON
      if (depth === 0 && i > 0) {
        return json.substring(0, i + 1);
      }
    }
  }

  // JSON wasn't complete - return as-is for balanceBraces to fix
  return json;
}

/**
 * Process JSON string to handle problematic characters within string values
 */
function processJsonString(input: string): string {
  const result: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const prevChar = i > 0 ? input[i - 1] : '';

    if (escape) {
      // Handle escape sequences
      if (char === 'n' || char === 'r' || char === 't' || char === '"' || char === '\\' || char === '/') {
        result.push(char);
      } else if (char === '\n' || char === '\r') {
        // Escaped newline - convert to \n
        result.push('n');
      } else {
        // Unknown escape - just keep the character
        result.push(char);
      }
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      result.push(char);
      continue;
    }

    if (char === '"' && !escape) {
      inString = !inString;
      result.push(char);
      continue;
    }

    if (inString) {
      // Inside a string - handle special characters
      if (char === '\n') {
        result.push('\\n');
      } else if (char === '\r') {
        result.push('\\r');
      } else if (char === '\t') {
        result.push('\\t');
      } else {
        result.push(char);
      }
    } else {
      // Outside string
      result.push(char);
    }
  }

  // If we ended inside a string, close it
  if (inString) {
    result.push('"');
  }

  return result.join('');
}

/**
 * Balance braces and brackets in JSON
 */
function balanceBraces(json: string, isObject: boolean): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  // Add missing closing braces/brackets
  let result = json;

  // Remove any trailing incomplete content (partial strings, etc.)
  // Look for the last complete structure
  result = trimToLastComplete(result);

  // Recount after trimming
  openBraces = 0;
  openBrackets = 0;
  inString = false;
  escape = false;

  for (let i = 0; i < result.length; i++) {
    const char = result[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }

  // Add closing brackets/braces
  while (openBrackets > 0) {
    result += ']';
    openBrackets--;
  }

  while (openBraces > 0) {
    result += '}';
    openBraces--;
  }

  return result;
}

/**
 * Trim to the last complete JSON structure
 */
function trimToLastComplete(json: string): string {
  // Find the last valid closing character
  let lastValidEnd = json.length;
  let inString = false;
  let escape = false;
  let depth = 0;
  let lastCompletePos = 0;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === '\\') {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        depth++;
      } else if (char === '}' || char === ']') {
        depth--;
        if (depth >= 0) {
          lastCompletePos = i + 1;
        }
      } else if (char === ',' && depth > 0) {
        lastCompletePos = i + 1;
      }
    }
  }

  // If we're still in a string at the end, try to close it
  if (inString) {
    // Find where the string started and truncate there
    let stringStart = -1;
    escape = false;
    inString = false;

    for (let i = lastCompletePos; i < json.length; i++) {
      const char = json[i];

      if (escape) {
        escape = false;
        continue;
      }

      if (char === '\\') {
        escape = true;
        continue;
      }

      if (char === '"') {
        if (!inString) {
          stringStart = i;
        }
        inString = !inString;
      }
    }

    if (stringStart > lastCompletePos) {
      // Truncate before the unclosed string
      return json.slice(0, stringStart).replace(/,\s*$/, '');
    }
  }

  return json;
}

/**
 * Safe JSON parse with repair
 */
export function safeJsonParse<T>(input: string, fallback: T): T {
  try {
    return JSON.parse(input);
  } catch (e1) {
    // Try with repair
    try {
      const repaired = repairJson(input);
      return JSON.parse(repaired);
    } catch (e2) {
      console.warn('[jsonRepair] Failed to parse even after repair:', e2);
      return fallback;
    }
  }
}
