---
name: semantic-seo
description: Semantic SEO framework for reducing Cost of Retrieval (CoR) across search engines and LLMs. Use when creating SEO content, topical maps, content briefs, semantic content networks, knowledge graphs, website audits, optimizing for AI Overviews, LLM/RAG retrieval, prompt injection defense, or multi-platform visibility. Triggers on SEO strategy, content optimization, E-E-A-T, entity optimization, search visibility, ranking improvement, content architecture, semantic search, AI citation, structured intelligence, answer capsules, chunking optimization, and content security.
allowed-tools: Read, Grep, Glob
---

# Semantic SEO Framework

This skill implements Koray Tugberk Gubur's Semantic SEO methodology for reducing the **Cost of Retrieval (CoR)** for search engines, extended to cover **LLM/AI retrieval optimization** (CoR 2.0). The framework treats all machine readers — search crawlers, LLMs, RAG systems, and AI agents — as systems that need explicit, structured, consistent information to process content efficiently.

## How to Use

1. **Identify your task type** from the routing table below
2. **Read the relevant sub-file(s)** in this skill directory for detailed rules and checklists
3. **Apply the rules systematically** — the framework is interconnected
4. **Validate against compliance targets** before finalizing

All sub-files are relative to this skill's directory: `.claude/skills/semantic-seo/`

---

## Task Routing

### Content Strategy & Architecture
| Task | Read |
|------|------|
| Creating a Topical Map | `frameworks/topical-maps.md` |
| Website type-specific rules | `frameworks/website-types.md` |
| Entity-Attribute-Value architecture | `frameworks/eav-architecture.md` |

### Content Creation
| Task | Read |
|------|------|
| Creating Content Briefs | `frameworks/content-briefs.md` |
| Writing content | `frameworks/algorithmic-authorship.md` |
| Understanding semantic distance | `concepts/semantic-distance.md` |

### Auditing & Validation
| Task | Read |
|------|------|
| Full page audit | `audits/on-page-audit.md` |
| Knowledge graph validation | `audits/knowledge-graph-validation.md` |
| Semantic compliance scoring | `audits/semantic-compliance.md` |
| Technical/CoR audit | `audits/technical-audit.md` |

### Advanced Concepts
| Task | Read |
|------|------|
| Contextual flow & hierarchy | `concepts/contextual-flow.md` |
| Internal linking strategy | `concepts/internal-linking.md` |
| Sentence-level optimization | `concepts/micro-semantics.md` |
| Cost of Retrieval optimization | `concepts/cost-of-retrieval.md` |

### LLM & AI Optimization
| Task | Read |
|------|------|
| LLM/RAG content optimization | `concepts/llm-optimization.md` |
| AI Overview source selection | `concepts/llm-optimization.md` |
| Answer capsule pattern | `concepts/llm-optimization.md` |
| Token economy & density | `concepts/llm-optimization.md` |
| Chunking-resistant writing | `concepts/llm-optimization.md` |

### Content Security
| Task | Read |
|------|------|
| Prompt injection defense | `concepts/prompt-injection-defense.md` |
| Attribution integrity | `concepts/prompt-injection-defense.md` |
| AI crawl management | `concepts/prompt-injection-defense.md` |
| Content provenance | `concepts/prompt-injection-defense.md` |

### Reference
| Task | Read |
|------|------|
| Terminology glossary | `reference/terminology.md` |
| Patent insights | `reference/patents-summary.md` |
| Daily quick-reference checklist | `reference/quick-reference-checklist.md` |

---

## Core Philosophy

Decrease the computational cost for any machine reader to crawl, parse, understand, and rank/retrieve content through:

1. **Semantic Content Networks (SCN)** — Interconnected content for machine comprehension
2. **Entity-Attribute-Value (EAV) Architecture** — Facts as Subject-Predicate-Object triples
3. **Knowledge-Based Trust (KBT)** — Consistency of facts across the entire network
4. **Algorithmic Authorship** — Writing optimized for NLP algorithms and LLM chunking
5. **LLM Retrievability** — Content structured for RAG pipeline survival and AI citation

---

## Quick Reference

### EAV Triple
```
Entity (Subject) -> Attribute (Predicate) -> Value (Object)
Example: Germany -> Population -> 83 million
```

### Critical Rules
- One EAV triple per sentence
- First 400 characters = core answer (Centerpiece Annotation)
- First sentence after heading = direct answer to heading's question
- No modality (can/might/should) for consensus facts — use "is"
- Explicit entity naming — no ambiguous pronouns
- Answer capsule (40–70 words) after each H2
- Self-contained sections (200–500 words) that survive chunking
- Same anchor text max 3 times per page
- Links placed after entity/concept is defined
- Total links per page <150

### Compliance Targets
| Metric | Target |
|--------|--------|
| Semantic Compliance Score | >85% |
| Context Coherence Score | >0.8 |
| CoR 2.0 Score | >4.0 |
| Answer Capsule | 40–70 words |
| Section Length | 200–500 words |
| Server Response Time | <100ms |
| DOM Size | <1500 nodes |
