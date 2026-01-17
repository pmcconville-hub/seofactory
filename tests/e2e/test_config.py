# tests/e2e/test_config.py
"""
Test configuration for CutTheCrap E2E tests
"""

# Application URLs
BASE_URL = "https://app.cutthecrap.net"
LOGIN_URL = f"{BASE_URL}/"

# Test credentials
TEST_EMAIL = "richard@kjenmarks.nl"
TEST_PASSWORD = "pannekoek"

# Test project (Dutch)
TEST_PROJECT = "daadvracht"
TEST_LANGUAGE = "Dutch"
TEST_REGION = "Netherlands"

# Screenshot directory
SCREENSHOT_DIR = "D:/www/cost-of-retreival-reducer/tests/e2e/screenshots"

# Timeouts
DEFAULT_TIMEOUT = 30000  # 30 seconds
LONG_TIMEOUT = 120000    # 2 minutes for AI operations
PAGE_LOAD_TIMEOUT = 15000  # 15 seconds

# Quality thresholds (aligned with audit rules)
QUALITY_THRESHOLDS = {
    "min_audit_score": 70,
    "min_word_count": 1500,
    "max_word_count": 4000,
    "min_sections": 5,
    "max_sections": 15,
    "min_prose_ratio": 0.6,  # 60% prose vs structured
    "max_list_sections_ratio": 0.4,  # Max 40% of sections with lists
    "max_table_sections_ratio": 0.15,  # Max 15% of sections with tables
}

# Audit rule categories (from auditChecks.ts)
AUDIT_RULES = {
    "Central Entity": {
        "rules": ["CENTERPIECE_CHECK", "SEMANTIC_CORE_CHECK"],
        "description": "Target keyword in title, meta, and first paragraph"
    },
    "Content Structure": {
        "rules": ["HEADING_HIERARCHY_CHECK", "SECTION_BALANCE_CHECK"],
        "description": "Proper H2/H3 hierarchy, balanced section lengths"
    },
    "Semantic Depth": {
        "rules": ["VOCABULARY_DIVERSITY_CHECK", "ENTITY_DENSITY_CHECK"],
        "description": "Type-token ratio, entity mentions"
    },
    "Readability": {
        "rules": ["SENTENCE_LENGTH_CHECK", "PARAGRAPH_LENGTH_CHECK"],
        "description": "Average sentence/paragraph lengths"
    },
    "SEO Optimization": {
        "rules": ["META_DESCRIPTION_CHECK", "INTERNAL_LINKING_CHECK"],
        "description": "Meta optimization, link density"
    },
    "AI Detection": {
        "rules": ["LLM_SIGNATURE_DETECTION"],
        "description": "AI-generated content patterns"
    },
    "Modality": {
        "rules": ["MODALITY_CHECK"],
        "description": "Hedging language, certainty markers"
    }
}
