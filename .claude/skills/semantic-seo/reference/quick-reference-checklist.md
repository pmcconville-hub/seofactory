# Structured Intelligence Quick-Reference Checklist

A consolidated daily-use checklist for content creators. Covers all critical rules from Algorithmic Authorship, EAV Architecture, Cost of Retrieval, and LLM Optimization in a single reference.

---

## Before Writing: Page Setup

```
[ ] Central Entity identified and named consistently
[ ] Source Context alignment confirmed (content fits your site's purpose)
[ ] Target query defined (the question this page answers)
[ ] H2 headings formatted as questions matching user queries
[ ] Page assigned to correct Topical Map cluster (Core or Author Section)
```

## Writing: Every Sentence

```
[ ] Clear Subject-Predicate-Object structure
[ ] One EAV triple per sentence
[ ] Under 30 words per sentence
[ ] No ambiguous pronouns (use explicit entity names)
[ ] Important terms placed early in the sentence
[ ] No filler words: very, really, basically, actually, overall,
    in conclusion, it is important to note, in today's world
[ ] Correct modality: "is" for facts, "can" for conditional,
    "should" for recommendations, "might" for uncertain
[ ] Specific values instead of vague quantifiers (not "many" or "some")
```

## Writing: Every Section (H2/H3)

```
[ ] Answer capsule: 40–70 words directly answering the heading's question
[ ] First sentence directly answers the heading's implied question
[ ] Entity named in first sentence (survives chunking)
[ ] Self-contained: makes complete sense read in isolation
[ ] No forward/backward references ("as mentioned above")
[ ] Section length: 200–500 words (optimal for RAG chunks)
[ ] Evidence paragraph with cited statistics or standards
[ ] Links placed AFTER entity/concept is defined
```

## Writing: Every Page

```
[ ] First 400 characters contain the core answer (Centerpiece Annotation)
[ ] Summary/TL;DR at top for long-form content (>1500 words)
[ ] All facts consistent with other pages on your site (KBT)
[ ] All facts consistent with consensus sources (Wikipedia, Wikidata)
[ ] Author byline with credentials visible
[ ] No more than 150 internal links
[ ] Same anchor text max 3 times per page
[ ] Tables for comparative data (LLMs extract these efficiently)
```

## Technical: Every Page

```
[ ] Article schema: author, datePublished, dateModified, publisher
[ ] Canonical URL set and consistent
[ ] Semantic HTML: <article>, <main>, <section>, <nav>, <aside>
[ ] DOM under 1500 nodes
[ ] Server response under 100ms
[ ] Text-to-code ratio above 50%
[ ] Critical content rendered server-side (not JS-dependent)
[ ] Mobile-responsive with identical content
```

## LLM-Specific: Every Page

```
[ ] Question-formatted H2 headings
[ ] Direct definition/answer in first paragraph
[ ] Short declarative sentences (2–4 per paragraph)
[ ] No pronouns that lose referent when section is read alone
[ ] Defined terms re-defined on first use in each section
[ ] Clear entity definitions at start of page
```

## Security: Every Page

```
[ ] UGC sanitized (hidden text, zero-width characters stripped)
[ ] Editorial content separated from UGC via semantic HTML
[ ] AI crawl permissions configured (robots.txt)
[ ] Attribution signals complete (schema, byline, canonical)
```

## After Publishing: Monitoring

```
Monthly:
[ ] Test target queries on Google AI Overview
[ ] Test target queries on ChatGPT, Perplexity
[ ] Verify attribution accuracy in AI responses
[ ] Check brand mention accuracy across platforms

Quarterly:
[ ] Full Semantic Compliance Score audit (target >85%)
[ ] Context Coherence Score review (target >0.8)
[ ] AI crawler access pattern review (server logs)
[ ] Content freshness audit (update dates, stale content)
[ ] Link integrity check (no broken links, no dead ends)
```

---

## Quick Scoring Reference

### Semantic Compliance Score (target >85%)

| Component | Weight | Check |
|-----------|--------|-------|
| EAV compliance | 25% | One fact per sentence, S-P-O structure |
| Entity consistency | 20% | Same names, same values site-wide |
| Information density | 20% | Facts per sentence, no fluff |
| Structural compliance | 20% | Answer-first, self-contained sections |
| Modality correctness | 15% | Appropriate certainty levels |

### Content Quality Score (target 16+/20)

| Criterion | Score |
|-----------|-------|
| Information Density | /5 |
| Sentence Clarity | /5 |
| Modality Appropriateness | /5 |
| Author Authority Signals | /5 |
| **Total** | **/20** |

### CoR 2.0 Score (target 4.0+/5.0)

| Factor | Score | Weight |
|--------|-------|--------|
| Self-contained sections | /5 | 20% |
| Information density | /5 | 20% |
| Answer capsule compliance | /5 | 15% |
| Entity explicitness | /5 | 15% |
| Structural clarity | /5 | 15% |
| Attribution integrity | /5 | 15% |

---

## Fluff Words: Kill List

Remove these from all content:

```
actually, basically, really, very, quite, rather, somewhat,
overall, in conclusion, as stated before, it goes without saying,
needless to say, at the end of the day, in my opinion,
I had the pleasure of, it is important to note that,
in today's world, in the ever-evolving landscape of,
when it comes to, it's worth noting that, without further ado,
last but not least, in a nutshell, at the end of the day,
it should be noted that, the fact of the matter is
```

## Anti-Pattern Quick Reference

| Pattern | Problem | Fix |
|---------|---------|-----|
| "It is really good" | Zero extractable facts | State specific fact with evidence |
| "He received the prize" | Ambiguous pronoun | Name the entity explicitly |
| "X can cure Y" (consensus fact) | Wrong modality | Use "X cures Y" |
| "X is Y" (uncertain claim) | Wrong modality | Use "X might/may Y" |
| "Many people believe..." | No specific value | State exact number or remove |
| "Click here" | No semantic anchor | Use descriptive anchor text |
| "As mentioned above..." | Cross-reference | Restate the fact |
| 1000-word section | Too long for RAG | Split into 200–500 word sections |
