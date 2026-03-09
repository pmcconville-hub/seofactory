# Website Type-Specific Rules

Different website types (Source Contexts) require different Topical Map configurations, attribute priorities, and content strategies. This guide provides specialized rules for each major website type.

## Table of Contents

1. [E-commerce Websites](#e-commerce-websites)
2. [SaaS Websites](#saas-websites)
3. [B2B Service Websites](#b2b-service-websites)
4. [Blog/Informational Websites](#bloginformational-websites)
5. [Comparison Matrix](#comparison-matrix)

---

## E-commerce Websites

E-commerce sites must balance commercial intent with informational depth, handling complex entity attributes (size, color, material).

### Topical Map Configuration

| Component | E-commerce Specification |
|-----------|-------------------------|
| Central Entity | Product category or brand |
| Source Context | Selling products |
| CSI Predicates | buy, compare, choose, find, order |
| Core Section | Product pages, category pages |
| Author Section | Buying guides, comparisons, how-tos |

### Attribute Coverage

Cover products, brands, services, and dimensions:

| Attribute Type | Examples | Priority |
|---------------|----------|----------|
| Transactional | Price, availability, shipping | Highest |
| Specification | Size, weight, material, color | High |
| Comparison | Alternatives, pros/cons | Medium |
| Usage | How to use, maintenance | Medium |
| Trust | Reviews, ratings, warranty | High |

### Content Structure Rules

| Rule | Implementation |
|------|----------------|
| Use LIFT Model | Order: Buy -> Compare -> Reviews -> Statistics |
| Mixed formats | Prose definitions + Tables for specs + Lists for features |
| Social proof | Brand review + Expert review + Customer review |
| Responsiveness | Transactional content above fold |

### Link Structure

| Rule | Correct | Incorrect |
|------|---------|-----------|
| Ontology-based linking | Link "holster" to "nylon material" page | Random category links |
| Limit filter URLs | Curated facet combinations only | Millions of filter URLs |
| Product-to-guide | Products link to buying guides | Orphaned product pages |

### E-commerce Checklist

```
[ ] Product specifications in tables
[ ] Multiple review types present
[ ] Transactional elements above fold
[ ] Category pages have prose introductions
[ ] Filter combinations limited
[ ] Products link to material/brand pages
[ ] Buying guides link to products
```

---

## SaaS Websites

SaaS websites must connect technical products to real-world user needs and search behaviors.

### Topical Map Configuration

| Component | SaaS Specification |
|-----------|-------------------|
| Central Entity | The software product/platform |
| Source Context | Selling software/services |
| CSI Predicates | generate, automate, manage, track, integrate |
| Core Section | Feature pages, pricing, use cases |
| Author Section | Tutorials, industry content, thought leadership |

### Connecting to User Needs

The TM must link the product to external search activities:

| Product | Connected User Needs |
|---------|---------------------|
| Gym Management SaaS | Martial arts, personal trainers, membership tracking |
| Email Marketing Tool | Newsletter templates, subscriber management |
| Project Management | Team collaboration, deadline tracking |

### Template Flexibility

Different features need different attribute priorities:

| Feature Type | Template Configuration |
|--------------|----------------------|
| Core features | Benefits -> Use cases -> How it works |
| Integrations | Compatible tools -> Setup -> Benefits |
| Comparisons | Feature matrix -> Pricing -> Verdict |

### Link Flow Rules

| Rule | Implementation |
|------|----------------|
| Homepage most linked | Service pages link to homepage |
| Feature-to-use-case | Each feature links to relevant use cases |
| CSI predicates in anchors | "generate reports" not "click here" |

### Competitor Intelligence

Use competitor forums and review platforms as attribute sources:

| Source | What to Extract |
|--------|-----------------|
| G2/Capterra reviews | Feature requests, pain points |
| Competitor forums | User questions, common issues |
| Competitor content | Attribute gaps to exploit |

### SaaS Checklist

```
[ ] Product connected to user search behaviors
[ ] Features linked to use cases
[ ] Homepage receives most internal links
[ ] CSI predicates in anchor texts
[ ] Competitor attributes analyzed
[ ] Templates flexible per feature type
[ ] Free trial/demo prominently placed
```

---

## B2B Service Websites

B2B and professional services require extremely high E-A-T signals and structured expertise content.

### Topical Map Configuration

| Component | B2B Specification |
|-----------|------------------|
| Central Entity | The service or expertise area |
| Source Context | Providing professional services |
| CSI Predicates | consult, advise, implement, solve, analyze |
| Core Section | Service pages, case studies, consultations |
| Author Section | Methodology, research, industry insights |

### Expertise Demonstration

| Signal Type | Implementation |
|-------------|----------------|
| Statistics | Original research, data, metrics |
| Research papers | Published studies, white papers |
| Unique definitions | Proprietary frameworks, methodologies |
| Deep expertise | Material science, legal precedents, etc. |

### Content Engineering

| Requirement | Implementation |
|-------------|----------------|
| Scientific style | Objective language, citations |
| Multiple perspectives | User view, expert view, regulatory view |
| Conditional language | "Depends on...", "In cases where..." |
| Expert authors | Named domain experts, credentials shown |

### Contextual Segmentation

Create segments linking related service aspects:

```
Divorce Law Services
|---- Legal Process -> links to -> Psychological Impact
|---- Child Custody -> links to -> Financial Implications
---- Mediation -> links to -> Court Procedures
```

### Trust Signals

| Signal | Implementation |
|--------|----------------|
| Licenses/Certifications | Digitized and displayed |
| Awards | Schema markup + visible display |
| Reviews/Testimonials | Structured data implementation |
| Case studies | Detailed methodology + results |

### B2B Checklist

```
[ ] Expert authors with credentials
[ ] Original research/statistics present
[ ] Multiple perspectives covered
[ ] Methodology documented
[ ] Licenses/awards displayed with schema
[ ] Case studies with metrics
[ ] Service pages link to expertise content
[ ] Semantic HTML for trust elements
```

---

## Blog/Informational Websites

Informational sites must cover entire query networks and prove unique insight beyond summarizing common knowledge.

### Topical Map Configuration

| Component | Blog Specification |
|-----------|-------------------|
| Central Entity | The knowledge domain |
| Source Context | Publishing/informing |
| CSI Predicates | learn, understand, discover, explore |
| Core Section | Main topic clusters |
| Author Section | Related topics, background, tangential |

### Content Justification Rules

| Rule | Implementation |
|------|----------------|
| Query connection required | No pages without query demand |
| Historical data value | AS content must link to CS |
| No dead weight | Unlinked pages dilute authority |

### Template Standards

| Content Type | Template Requirements |
|--------------|----------------------|
| Listicles | Specified predicates (compare, learn, examine) |
| How-to guides | Numbered steps, action verbs |
| Definitions | X is Y format, followed by attributes |
| Comparisons | Table format, consistent criteria |

### Unique Information Gain

You must provide information not found on competitors:

| Strategy | Implementation |
|----------|----------------|
| New entities | Add factors competitors missed |
| New contexts | Different angles on same topic |
| New attributes | Deeper detail than competitors |
| Unique expressions | Distinctive phrases, terminology |

### Bridge Topics

Use bridge topics to connect distant concepts:

| Distant Concepts | Bridge Topic |
|------------------|--------------|
| Swimming styles <-> Pool construction | Pool design considerations |
| Recipe types <-> Kitchen equipment | Equipment needs by cuisine |
| Travel guides <-> Visa requirements | Trip planning overview |

### Blog Checklist

```
[ ] All pages have query demand
[ ] Author Section links to Core Section
[ ] No orphan pages
[ ] Unique information present
[ ] Bridge topics connect clusters
[ ] Consistent templates by content type
[ ] Author vector distinctive
[ ] N-grams unique to site
```

---

## Comparison Matrix

### Attribute Priority by Type

| Attribute | E-commerce | SaaS | B2B | Blog |
|-----------|------------|------|-----|------|
| Price | Highest | High | Medium | Low |
| Features | High | Highest | High | Medium |
| Reviews | Highest | High | High | Low |
| Expertise | Low | Medium | Highest | High |
| Tutorials | Medium | High | Medium | Highest |
| Research | Low | Medium | Highest | High |

### Link Flow by Type

| From -> To | E-commerce | SaaS | B2B | Blog |
|-----------|------------|------|-----|------|
| AS -> CS | Guides -> Products | Tutorials -> Features | Insights -> Services | Background -> Core |
| Homepage prominence | Category focus | Feature focus | Service focus | Topic focus |

### Content Format by Type

| Format | E-commerce | SaaS | B2B | Blog |
|--------|------------|------|-----|------|
| Tables | Specs, comparisons | Features, pricing | Service comparison | Data, comparisons |
| Lists | Features, benefits | Steps, integrations | Process steps | Tips, items |
| Prose | Descriptions | Use cases | Methodology | Explanations |

### Trust Signals by Type

| Signal | E-commerce | SaaS | B2B | Blog |
|--------|------------|------|-----|------|
| Reviews | Critical | Important | Important | Optional |
| Certifications | Product certs | Security certs | Professional certs | Author creds |
| Case studies | Optional | Important | Critical | Optional |
| Statistics | Optional | Important | Critical | Important |
