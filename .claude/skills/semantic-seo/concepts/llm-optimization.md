# LLM Optimization & AI Retrieval

Content optimization for Large Language Models, RAG systems, AI Overviews, and generative search. This extends the Cost of Retrieval framework from search-engine-only to all machine readers.

## Table of Contents

1. [CoR 2.0: Unified Machine Readability](#cor-20)
2. [How RAG Systems Process Content](#rag-processing)
3. [Chunking-Resistant Writing](#chunking-resistant-writing)
4. [AI Overview Source Selection](#ai-overview-source-selection)
5. [Answer Capsule Pattern](#answer-capsule-pattern)
6. [Token Economy Optimization](#token-economy)
7. [Validation Checklist](#validation-checklist)

---

## CoR 2.0: Unified Machine Readability

### The Extended Cost Model

Traditional CoR covers search engine crawl, render, parse, extract, and storage costs. CoR 2.0 extends this to LLM consumption:

| CoR Dimension | Search Engine | LLM/RAG System |
|--------------|---------------|-----------------|
| Access | Server response time | Crawl permissions (robots.txt for AI agents) |
| Parse | DOM complexity, semantic HTML | HTML-to-text conversion, chunk boundary alignment |
| Extract | NER, triple identification | Semantic similarity scoring, re-ranking |
| Comprehend | Passage ranking, topic classification | In-context reasoning, fact verification |
| Store | Index size, deduplication | Embedding vectors, context window limits |

### Key Insight

Every principle that reduces CoR for search engines also reduces CoR for LLMs:
- Explicit entity naming → accurate NER → accurate embedding
- One fact per sentence → clean extraction → accurate retrieval
- Answer-first structure → high Centerpiece Annotation → first chunk contains core answer
- Consistent facts → high KBT → LLM does not encounter contradictions across chunks

---

## How RAG Systems Process Content

### The Four-Stage Pipeline

| Stage | Process | Content Requirement |
|-------|---------|-------------------|
| **Chunking** | Page split into 256–1024 token segments | Sections must be self-contained and meaningful in isolation |
| **Embedding** | Each chunk converted to vector representation | Clear topic focus per section; no mixing unrelated subjects |
| **Retrieval** | Chunks matched to query by semantic similarity | High information density; explicit answers to likely questions |
| **Generation** | LLM synthesizes answer from top-k chunks | Unambiguous facts; no pronouns that lose referent when isolated |

### Sufficient Context Principle

Research (ICLR 2025) shows LLMs hallucinate primarily when retrieved context is insufficient. Content must provide **complete answers within individual sections**. Spreading an answer across multiple pages reduces the chance any single chunk provides sufficient context.

### Chunk Boundary Alignment

RAG chunking algorithms typically split at:
1. Section headings (H2, H3)
2. Paragraph breaks
3. Token count limits (typically 300–500 words per chunk)

**Optimization**: Structure content so natural section breaks align with complete thought units. Each H2 section = one retrievable answer unit.

---

## Chunking-Resistant Writing

### Rules for Content That Survives Chunking

| Rule | Implementation | Why It Matters |
|------|----------------|----------------|
| Entity re-introduction | Name the entity in every section's first sentence | Chunks that start with "it" or "they" lose their subject |
| Self-contained sections | Each H2/H3 must make sense read alone | RAG may retrieve only one section |
| No forward references | Don't say "as mentioned above" or "see below" | The chunk won't include "above" or "below" |
| Answer completeness | Core answer within each section | Partial answers across sections = insufficient context |
| Defined terms | Define terms on first use within each section | Don't assume the reader/LLM has seen your glossary |

### Section Length Optimization

| Length | Use Case | RAG Suitability |
|--------|----------|-----------------|
| 100–200 words | Quick definitions, FAQ answers | Good: fits in single chunk |
| 200–500 words | Standard explanatory sections | Optimal: self-contained, dense |
| 500–800 words | Deep-dive subtopics | Acceptable: may split into 2 chunks |
| 800+ words | Long-form analysis | Risk: multiple chunks may lose context |

**Target**: 200–500 words per H2 section for optimal RAG retrievability.

---

## AI Overview Source Selection

### Prerequisites for Inclusion

AI Overviews select sources based on:

1. **Organic ranking**: Majority of cited sources rank in top 10
2. **E-E-A-T signals**: Experience, Expertise, Authority, Trust demonstrated
3. **Structural clarity**: Short declarative sentences, question-formatted headings
4. **Answer directness**: Core answer in first paragraph (inverted pyramid)
5. **Content freshness**: Regular updates with accurate timestamps
6. **Topical authority**: Deep coverage of subject, not surface-level

### Content Patterns That Get Cited

| Pattern | Implementation |
|---------|----------------|
| Direct definition | Start section with "X is Y" definitional statement |
| Numeric claims | Include specific numbers, percentages, dates |
| Process steps | Numbered steps for how-to queries |
| Comparison tables | Structured data for "X vs Y" queries |
| Evidence backing | Cite statistics, standards, or policies after claims |

### Trigger Queries

AI Overviews appear most frequently for:
- Question-phrased queries ("How does X work?")
- Long-tail queries (8+ words)
- Informational intent queries
- Definition queries ("What is X?")
- Comparison queries ("X vs Y")

---

## Answer Capsule Pattern

### Structure

```
[H2: Question-formatted heading]

[Answer Capsule: 40–70 words]
Direct answer containing core EAV triples.
No preamble, no warming up, no "In this section..."

[Evidence Paragraph]
Supporting data with cited statistics, standards, or policy.
Links to 1–3 reputable sources.

[Depth Section: 200–400 words]
Expanded explanation for readers wanting detail.
Additional EAV triples covering rare attributes.
```

### Rules

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Capsule placement | Immediately after H2 | After introductory paragraph |
| Capsule length | 40–70 words | 100+ words |
| Capsule content | Direct factual answer | Background context |
| Evidence | Specific statistic + source | Vague claim without backing |

### Why This Works

- **Featured Snippets**: Google extracts the capsule as snippet text
- **AI Overviews**: Capsule provides the synthesizable answer
- **RAG Systems**: First chunk of section contains complete answer
- **Human readers**: Immediate value, can choose to read deeper

---

## Token Economy Optimization

### Information Density for LLMs

LLMs have finite context windows. When a RAG system retrieves your content, every token of fluff displaces a token that could contain a fact.

**Information Density** = Unique facts / Total words

| Quality Level | Density | Example |
|--------------|---------|---------|
| High | >0.15 | "The iPhone 15 weighs 171 grams, measures 147.6mm tall, and features a 6.1-inch display." (3 facts / 18 words) |
| Medium | 0.08–0.15 | "The iPhone 15 is Apple's latest smartphone, weighing 171 grams." (1 fact / 10 words) |
| Low | <0.08 | "The iPhone 15 is a really great phone that many people love." (0 facts / 13 words) |
| Zero | 0 | "In today's world, smartphones are essential." (0 facts / 7 words) |

### Token-Waste Patterns to Eliminate

```
REMOVE: actually, basically, really, very, quite, rather, somewhat,
        overall, in conclusion, as stated before, it goes without saying,
        needless to say, at the end of the day, in my opinion,
        I had the pleasure of, it is important to note that,
        in today's world, in the ever-evolving landscape of,
        when it comes to, it's worth noting that
```

### Environmental Cost Connection

Token waste has direct environmental impact:
- Each inference token requires GPU computation
- Unnecessary tokens multiply across millions of queries
- Dense content reduces total tokens processed for equivalent information
- Structured Intelligence reduces the aggregate environmental cost of AI

---

## Validation Checklist

### LLM Readiness Checks

```
[ ] Each H2 section makes sense when read in complete isolation
[ ] Entity named in first sentence of every section
[ ] Answer capsule (40–70 words) immediately after each H2
[ ] No pronouns that would lose referent if section is chunked alone
[ ] No forward/backward references ("as mentioned above")
[ ] Section length between 200–500 words
[ ] Summary/TL;DR at top of long-form content
[ ] Tables for comparative information
```

### AI Overview Optimization Checks

```
[ ] Page ranks in top 10 for target query (prerequisite)
[ ] Question-formatted H2 headings matching user queries
[ ] Direct answer in first paragraph (inverted pyramid)
[ ] Short declarative sentences (2–4 per paragraph)
[ ] E-E-A-T signals: author credentials, experience demonstrated
[ ] Content freshness: last-modified date accurate and recent
[ ] Article schema with complete author information
```

### Multi-Platform Checks

```
[ ] Consistent entity naming across all pages
[ ] Canonical URLs properly configured
[ ] AI agent crawl permissions reviewed (robots.txt)
[ ] Brand mentions trackable across AI platforms
[ ] Content tested against ChatGPT, Perplexity, Google AI Overview
```

### CoR 2.0 Score

Rate each factor 1–5:

| Factor | Score | Weight |
|--------|-------|--------|
| Self-contained sections | /5 | 20% |
| Information density | /5 | 20% |
| Answer capsule compliance | /5 | 15% |
| Entity explicitness | /5 | 15% |
| Structural clarity | /5 | 15% |
| Attribution integrity | /5 | 15% |
| **Weighted Total** | | /5 |

**Interpretation**:
- 4.5–5.0: Fully optimized for both search and LLM retrieval
- 3.5–4.4: Good foundation, specific improvements needed
- 2.5–3.4: Significant gaps in LLM readiness
- <2.5: Content is not optimized for AI retrieval
