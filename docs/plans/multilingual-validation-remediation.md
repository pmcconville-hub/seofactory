# Multilingual Validation System Remediation Plan

**Created**: 2026-01-09
**Status**: IN PROGRESS
**Priority**: CRITICAL

## Problem Statement

The entire validation and audit system is **100% English-only**. Dutch, German, French, Spanish, and other language content passes ALL validations simply because the English patterns don't match, resulting in **false "perfect" results** and **lowest quality output**.

This is a **systemic failure** affecting:
- Content blocking validators (prohibitedLanguage.ts)
- 24+ audit checks (auditChecks.ts)
- EAV density validation (eavDensity.ts)
- Contextual vector validation (contextualVectorValidator.ts)

---

## Affected Files

| File | Severity | Current State | Impact |
|------|----------|---------------|--------|
| `validators/prohibitedLanguage.ts` | **CRITICAL** | 100% English | Non-English content NEVER blocked for opinions, analogies, fluff |
| `passes/auditChecks.ts` | **CRITICAL** | 100% English | All 24+ audit checks return false positives for non-English |
| `validators/eavDensity.ts` | HIGH | English verbs only | EAV detection fails for non-English |
| `validators/contextualVectorValidator.ts` | MEDIUM | Partial Dutch | Heading flow validation incomplete |
| `types.ts` | HIGH | No language in SectionGenerationContext | Validators can't access language |

---

## Implementation Plan

### Phase 1: Infrastructure (Enable Language Passing)

#### 1.1 Add language to SectionGenerationContext
**File**: `types.ts`
**Change**: Add `language?: string` to `SectionGenerationContext` interface

```typescript
export interface SectionGenerationContext {
  // ... existing fields
  language?: string; // ISO code: 'nl', 'en', 'de', 'fr', 'es'
}
```

#### 1.2 Update validator index to pass language
**File**: `validators/index.ts`
**Change**: Ensure language is available in context when calling validators

---

### Phase 2: Fix prohibitedLanguage.ts (CRITICAL)

**File**: `services/ai/contentGeneration/rulesEngine/validators/prohibitedLanguage.ts`

#### 2.1 Create Multilingual Pattern Structure

```typescript
interface LanguagePatterns {
  STOP_WORDS: string[];
  OPINIONS: RegExp[];
  ANALOGIES: RegExp[];
  FLUFF_OPENERS: RegExp[];
  AMBIGUOUS_PRONOUNS: RegExp[];
  FUTURE_FOR_FACTS: RegExp[];
  PASSIVE_VOICE: RegExp[];
}

const PATTERNS: Record<string, LanguagePatterns> = {
  'en': { /* English patterns */ },
  'nl': { /* Dutch patterns */ },
  'de': { /* German patterns */ },
  'fr': { /* French patterns */ },
  'es': { /* Spanish patterns */ },
};
```

#### 2.2 Dutch Patterns to Add

**STOP_WORDS (Dutch)**:
- ook, eigenlijk, echt, zeer, gewoon, best, nogal, sowieso, natuurlijk, uiteraard, wellicht, misschien

**OPINIONS (Dutch)**:
- "ik denk", "wij denken", "ik geloof", "wij geloven", "naar mijn mening", "volgens mij"
- "helaas", "gelukkig", "hopelijk"
- "mooi", "geweldig", "verschrikkelijk", "fantastisch"

**ANALOGIES (Dutch)**:
- "zoals een", "vergelijkbaar met", "is als", "alsof", "stel je voor"
- "denk eraan als", "net als"

**FLUFF_OPENERS (Dutch)**:
- "In dit artikel", "Laten we", "Welkom bij", "In deze gids"

#### 2.3 Update validate() Method

```typescript
static validate(content: string, language?: string): ValidationViolation[] {
  const lang = language || 'en';
  const patterns = PATTERNS[lang] || PATTERNS['en'];
  // Use language-specific patterns
}
```

---

### Phase 3: Fix auditChecks.ts (CRITICAL - 24+ Checks)

**File**: `services/ai/contentGeneration/passes/auditChecks.ts`

#### 3.1 Functions Requiring Multilingual Patterns

| Function | Line | Current English | Dutch Equivalent Needed |
|----------|------|-----------------|------------------------|
| `checkLLMSignatures` | 29-58 | "delve", "game-changer" | "verdiepen", "gamechanger" |
| `GENERIC_HEADINGS` | 77-87 | "introduction", "conclusion" | "introductie", "conclusie" |
| `PASSIVE_PATTERNS` | 90-93 | "is created", "was made" | "wordt gemaakt", "werd gemaakt" |
| `FUTURE_TENSE_PATTERNS` | 96-99 | "will always" | "zal altijd" |
| `STOP_WORDS_FULL` | 103-108 | "also", "basically" | "ook", "eigenlijk" |
| `checkListCountSpecificity` | 484 | "three", "four", "five" | "drie", "vier", "vijf" |
| `classifyQueryIntent` | 956-978 | "how to", "what is" | "hoe", "wat is" |
| `GENERIC_ANCHORS` | 1089-1099 | "click here", "read more" | "klik hier", "lees meer" |
| `SUPPLEMENTARY_HEADING_PATTERNS` | 819-828 | "related", "see also" | "gerelateerd", "zie ook" |

#### 3.2 Implementation Strategy

Create a `MULTILINGUAL_AUDIT_PATTERNS` object at the top of the file:

```typescript
const MULTILINGUAL_AUDIT_PATTERNS: Record<string, {
  llmSignatures: string[];
  genericHeadings: string[];
  passivePatterns: RegExp[];
  futureTensePatterns: RegExp[];
  stopWords: string[];
  numberWords: Record<number, string>;
  genericAnchors: string[];
  supplementaryHeadingPatterns: RegExp[];
  queryPatterns: {
    howTo: RegExp;
    whatIs: RegExp;
    // ... etc
  };
}> = {
  'en': { /* existing English patterns */ },
  'nl': { /* Dutch patterns */ },
  'de': { /* German patterns */ },
  'fr': { /* French patterns */ },
  'es': { /* Spanish patterns */ },
};
```

#### 3.3 Dutch LLM Signature Phrases

```typescript
'nl': {
  llmSignatures: [
    'over het algemeen', 'samenvattend', 'het is belangrijk om op te merken',
    'verdiepen', 'duiken in', 'op reis gaan', 'ontdekken',
    'in de wereld van vandaag', 'in het digitale tijdperk',
    'een revolutie teweegbrengen', 'naar een hoger niveau tillen',
    'de kracht van', 'het volledige potentieel',
    'complexiteiten', 'fijne kneepjes', 'veelzijdig',
    'naadloos', 'robuust', 'holistisch', 'synergieën',
    'het landschap', 'aan het begin van', 'onmiskenbaar',
  ],
  // ... other Dutch patterns
}
```

#### 3.4 Update All Check Functions

Each check function needs a language parameter:

```typescript
function checkLLMSignatures(content: string, language: string = 'en'): AuditCheckResult {
  const patterns = MULTILINGUAL_AUDIT_PATTERNS[language] || MULTILINGUAL_AUDIT_PATTERNS['en'];
  // Use patterns.llmSignatures
}
```

---

### Phase 4: Fix eavDensity.ts

**File**: `services/ai/contentGeneration/rulesEngine/validators/eavDensity.ts`

#### 4.1 Multilingual EAV Verb Patterns

```typescript
const EAV_VERBS: Record<string, string[]> = {
  'en': ['is', 'are', 'was', 'were', 'has', 'have', 'had', 'requires', 'needs', 'provides'],
  'nl': ['is', 'zijn', 'was', 'waren', 'heeft', 'hebben', 'had', 'vereist', 'nodig heeft', 'biedt'],
  'de': ['ist', 'sind', 'war', 'waren', 'hat', 'haben', 'hatte', 'erfordert', 'braucht', 'bietet'],
  'fr': ['est', 'sont', 'était', 'étaient', 'a', 'ont', 'avait', 'nécessite', 'fournit'],
  'es': ['es', 'son', 'era', 'eran', 'tiene', 'tienen', 'tenía', 'requiere', 'necesita', 'proporciona'],
};
```

#### 4.2 Build Dynamic Pattern

```typescript
private static getEavPatterns(language: string = 'en'): RegExp[] {
  const verbs = EAV_VERBS[language] || EAV_VERBS['en'];
  const verbPattern = verbs.join('|');
  return [
    new RegExp(`\\b[A-Z][a-z]+\\s+(?:${verbPattern})\\s+`, 'i'),
    // ... other patterns
  ];
}
```

---

### Phase 5: Complete contextualVectorValidator.ts

**File**: `services/ai/contentGeneration/rulesEngine/validators/contextualVectorValidator.ts`

#### 5.1 Add Complete Multilingual Patterns

```typescript
const SECTION_TYPE_PATTERNS: Record<string, Record<SectionType, RegExp[]>> = {
  'en': {
    definition: [/^what\s+is/i, /^definition/i, /^understanding/i],
    attribute: [/^characteristics/i, /^features/i, /^benefits/i, /^types/i],
    detail: [/^how\s+does/i, /^why/i, /^when/i, /^technical/i],
    application: [/^how\s+to\s+use/i, /^applications/i, /^examples/i],
    comparison: [/^comparison/i, /^vs\.?/i, /^alternatives/i],
    conclusion: [/^conclusion/i, /^summary/i, /^final\s+thoughts/i],
  },
  'nl': {
    definition: [/^wat\s+is/i, /^definitie/i, /^begrijpen/i],
    attribute: [/^kenmerken/i, /^eigenschappen/i, /^voordelen/i, /^typen/i, /^soorten/i],
    detail: [/^hoe\s+werkt/i, /^waarom/i, /^wanneer/i, /^technische/i],
    application: [/^hoe\s+te\s+gebruiken/i, /^toepassingen/i, /^voorbeelden/i],
    comparison: [/^vergelijking/i, /^vs\.?/i, /^alternatieven/i],
    conclusion: [/^conclusie/i, /^samenvatting/i, /^slotwoord/i],
  },
  // German, French, Spanish patterns
};
```

---

### Phase 6: Update Validator Pipeline

#### 6.1 Pass Language Through Orchestrator

**File**: `services/ai/contentGeneration/orchestrator.ts`

When building SectionGenerationContext, include language:

```typescript
const context: SectionGenerationContext = {
  // ... existing fields
  language: job.language || brief.language || 'en',
};
```

#### 6.2 Update All Validator Signatures

Every validator's `validate()` method needs to:
1. Accept `context: SectionGenerationContext` (already does)
2. Extract `context.language` and use it for pattern selection

---

## Testing Plan

### Test 1: Dutch Content Blocking

Create test content with Dutch opinions, analogies, fluff:

```typescript
const dutchTestContent = `
Ik denk dat dit een geweldig artikel is.
Het is als een wandeling door de natuur.
In dit artikel bespreken we...
Ook is het belangrijk om te weten dat...
`;

// Expected: 4 violations (opinion, analogy, fluff opener, stop word)
```

### Test 2: Dutch Audit Checks

```typescript
const dutchArticle = `
# Introductie
In de wereld van vandaag is het belangrijk om...
Laten we verdiepen in dit onderwerp.

## Conclusie
Over het algemeen kunnen we concluderen...
`;

// Expected: LLM signatures detected, generic headings flagged
```

### Test 3: Dutch EAV Detection

```typescript
const dutchEavContent = `
TypeScript is een programmeertaal.
Het heeft statische typering.
De compiler vereist type-annotaties.
`;

// Expected: 3 EAV patterns detected
```

---

## File Modification Checklist

- [ ] `types.ts` - Add language to SectionGenerationContext
- [ ] `validators/prohibitedLanguage.ts` - Full multilingual rewrite
- [ ] `passes/auditChecks.ts` - Add MULTILINGUAL_AUDIT_PATTERNS, update all 24+ functions
- [ ] `validators/eavDensity.ts` - Add EAV_VERBS, update pattern generation
- [ ] `validators/contextualVectorValidator.ts` - Complete multilingual patterns
- [ ] `validators/index.ts` - Ensure language passed in context
- [ ] Create test script to validate all fixes

---

## Success Criteria

1. **Dutch content with opinions** triggers `OPINIONS` violations
2. **Dutch content with analogies** triggers `ANALOGIES` violations
3. **Dutch LLM phrases** detected by audit
4. **Dutch generic headings** flagged ("Introductie", "Conclusie")
5. **Dutch EAV patterns** detected ("X is Y", "X heeft Z")
6. **All 5 supported languages** (EN, NL, DE, FR, ES) have complete pattern coverage
7. **No regressions** for English content validation

---

## Execution Order

1. **Phase 1**: Add language to SectionGenerationContext (types.ts)
2. **Phase 2**: Fix prohibitedLanguage.ts (CRITICAL - blocking validators)
3. **Phase 3**: Fix auditChecks.ts (CRITICAL - 24+ checks)
4. **Phase 4**: Fix eavDensity.ts
5. **Phase 5**: Complete contextualVectorValidator.ts
6. **Phase 6**: Update validator pipeline
7. **Testing**: Validate all fixes with Dutch test content
