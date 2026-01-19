/**
 * Entity Consistency Validator
 *
 * Validates that entities are mentioned consistently across
 * social posts and campaigns, avoiding ambiguous pronouns.
 */

import type {
  SocialPost,
  SocialCampaign,
  PostComplianceReport
} from '../../../types/social';
import { BANNED_FILLER_PHRASES } from '../../../types/social';

/**
 * Entity consistency check result
 */
export interface EntityConsistencyResult {
  score: number;  // 0-100
  entities_found: string[];
  ambiguous_pronouns: string[];
  filler_phrases: string[];
  issues: string[];
  suggestions: string[];
}

/**
 * Campaign-level consistency result
 */
export interface CampaignConsistencyResult {
  score: number;
  consistent_entities: string[];
  inconsistent_entities: string[];
  missing_entities_by_post: Map<string, string[]>;
  suggestions: string[];
}

/**
 * Ambiguous pronouns that should be replaced with entity names
 */
const AMBIGUOUS_PRONOUNS = [
  'it',
  'this',
  'that',
  'they',
  'them',
  'these',
  'those',
  'their',
  'its'
];

/**
 * Words that can start a sentence but are ambiguous without context
 */
const AMBIGUOUS_STARTERS = [
  'it is',
  'it\'s',
  'this is',
  'that is',
  'that\'s',
  'they are',
  'they\'re'
];

/**
 * Entity consistency validator for semantic SEO
 */
export class EntityConsistencyValidator {
  /**
   * Validate entity consistency in a single post
   */
  validatePost(
    post: SocialPost,
    expectedEntities: string[] = []
  ): EntityConsistencyResult {
    const content = post.post_type === 'thread' && post.content_thread
      ? post.content_thread.map(t => t.text).join(' ')
      : post.content_text;

    const contentLower = content.toLowerCase();
    const words = content.split(/\s+/);

    // Find entities mentioned
    const entitiesFound: string[] = [];
    const entitiesMissing: string[] = [];

    for (const entity of expectedEntities) {
      if (contentLower.includes(entity.toLowerCase())) {
        entitiesFound.push(entity);
      } else {
        entitiesMissing.push(entity);
      }
    }

    // Also check post.entities_mentioned if available
    if (post.entities_mentioned) {
      for (const entity of post.entities_mentioned) {
        if (!entitiesFound.includes(entity)) {
          entitiesFound.push(entity);
        }
      }
    }

    // Find ambiguous pronouns
    const ambiguousPronouns = this.findAmbiguousPronouns(content);

    // Find filler phrases
    const fillerPhrases = this.findFillerPhrases(content);

    // Calculate issues
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (entitiesFound.length === 0) {
      issues.push('No entities explicitly mentioned in the post');
      suggestions.push('Add at least one explicit entity name instead of relying on context');
    }

    if (ambiguousPronouns.length > 0) {
      issues.push(`Found ${ambiguousPronouns.length} ambiguous pronoun(s): ${ambiguousPronouns.join(', ')}`);
      suggestions.push('Replace pronouns with explicit entity names for clarity');
    }

    if (fillerPhrases.length > 0) {
      issues.push(`Found ${fillerPhrases.length} filler phrase(s): ${fillerPhrases.join(', ')}`);
      suggestions.push('Remove filler phrases to increase information density');
    }

    // Calculate score
    let score = 100;

    // Penalty for no entities
    if (entitiesFound.length === 0) {
      score -= 30;
    }

    // Penalty for ambiguous pronouns (5 points each, max 25)
    score -= Math.min(ambiguousPronouns.length * 5, 25);

    // Penalty for filler phrases (3 points each, max 15)
    score -= Math.min(fillerPhrases.length * 3, 15);

    // Penalty for missing expected entities
    if (expectedEntities.length > 0 && entitiesMissing.length > 0) {
      const missingRatio = entitiesMissing.length / expectedEntities.length;
      score -= Math.round(missingRatio * 20);

      if (entitiesMissing.length > 0) {
        suggestions.push(`Consider mentioning: ${entitiesMissing.slice(0, 2).join(', ')}`);
      }
    }

    return {
      score: Math.max(0, score),
      entities_found: entitiesFound,
      ambiguous_pronouns: ambiguousPronouns,
      filler_phrases: fillerPhrases,
      issues,
      suggestions
    };
  }

  /**
   * Validate entity consistency across a campaign
   */
  validateCampaign(
    campaign: SocialCampaign,
    posts: SocialPost[],
    primaryEntities: string[]
  ): CampaignConsistencyResult {
    const entityMentionCounts = new Map<string, number>();
    const missingByPost = new Map<string, string[]>();
    const suggestions: string[] = [];

    // Count entity mentions across all posts
    for (const entity of primaryEntities) {
      entityMentionCounts.set(entity, 0);
    }

    for (const post of posts) {
      const postResult = this.validatePost(post, primaryEntities);
      const missing: string[] = [];

      for (const entity of primaryEntities) {
        if (postResult.entities_found.includes(entity)) {
          entityMentionCounts.set(
            entity,
            (entityMentionCounts.get(entity) || 0) + 1
          );
        } else {
          missing.push(entity);
        }
      }

      if (missing.length > 0) {
        missingByPost.set(post.id, missing);
      }
    }

    // Determine consistency
    const consistent: string[] = [];
    const inconsistent: string[] = [];
    const totalPosts = posts.length;

    for (const [entity, count] of entityMentionCounts) {
      const coveragePercent = (count / totalPosts) * 100;

      if (coveragePercent >= 50) {
        consistent.push(entity);
      } else {
        inconsistent.push(entity);
      }
    }

    // Generate suggestions
    if (inconsistent.length > 0) {
      suggestions.push(`Entities not consistently mentioned: ${inconsistent.join(', ')}`);
      suggestions.push('Add explicit entity mentions to spoke posts for cross-platform consistency');
    }

    // Check hub post specifically
    const hubPost = posts.find(p => p.is_hub);
    if (hubPost) {
      const hubResult = this.validatePost(hubPost, primaryEntities);
      if (hubResult.entities_found.length === 0) {
        suggestions.push('Hub post should mention primary entity by name');
      }
    }

    // Calculate score
    const consistentRatio = primaryEntities.length > 0
      ? consistent.length / primaryEntities.length
      : 1;

    const ambiguousPronounCount = posts.reduce((sum, post) => {
      const result = this.validatePost(post, []);
      return sum + result.ambiguous_pronouns.length;
    }, 0);

    let score = Math.round(consistentRatio * 80);
    score += primaryEntities.length > 0 && consistent.length > 0 ? 20 : 0;
    score -= Math.min(ambiguousPronounCount * 2, 20);

    return {
      score: Math.max(0, Math.min(100, score)),
      consistent_entities: consistent,
      inconsistent_entities: inconsistent,
      missing_entities_by_post: missingByPost,
      suggestions
    };
  }

  /**
   * Find ambiguous pronouns in content
   */
  private findAmbiguousPronouns(content: string): string[] {
    const found: string[] = [];
    const sentences = content.split(/[.!?]+/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim().toLowerCase();

      // Check for ambiguous sentence starters
      for (const starter of AMBIGUOUS_STARTERS) {
        if (trimmed.startsWith(starter)) {
          found.push(starter);
          break;
        }
      }

      // Check for standalone pronouns that could be ambiguous
      // Only flag if the sentence doesn't have clear entity context
      const words = trimmed.split(/\s+/);
      const hasEntityContext = this.hasEntityContext(sentence);

      if (!hasEntityContext) {
        for (const word of words) {
          const cleanWord = word.replace(/[^a-z']/g, '');
          if (AMBIGUOUS_PRONOUNS.includes(cleanWord) && !found.includes(cleanWord)) {
            // Only flag if it's not already flagged as a starter
            const isPartOfStarter = AMBIGUOUS_STARTERS.some(s => s.includes(cleanWord));
            if (!isPartOfStarter || !found.some(f => f.includes(cleanWord))) {
              found.push(cleanWord);
            }
          }
        }
      }
    }

    return [...new Set(found)];  // Deduplicate
  }

  /**
   * Check if sentence has entity context (capitalized proper nouns)
   */
  private hasEntityContext(sentence: string): boolean {
    // Look for capitalized words that aren't at the start
    const words = sentence.split(/\s+/);

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      // Check for capitalized word (likely a proper noun/entity)
      if (/^[A-Z][a-z]+/.test(word)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find banned filler phrases in content
   */
  private findFillerPhrases(content: string): string[] {
    const found: string[] = [];
    const contentLower = content.toLowerCase();

    for (const phrase of BANNED_FILLER_PHRASES) {
      if (contentLower.includes(phrase)) {
        found.push(phrase);
      }
    }

    return found;
  }

  /**
   * Suggest entity replacements for pronouns
   */
  suggestReplacements(
    content: string,
    primaryEntity: string
  ): Array<{ original: string; suggested: string; position: number }> {
    const replacements: Array<{ original: string; suggested: string; position: number }> = [];
    const contentLower = content.toLowerCase();

    // Find positions of ambiguous pronouns
    for (const pronoun of AMBIGUOUS_PRONOUNS) {
      const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
      let match;

      while ((match = regex.exec(content)) !== null) {
        // Check if this pronoun starts a sentence (more likely to be ambiguous)
        const beforeMatch = content.substring(0, match.index);
        const isStartOfSentence = !beforeMatch.trim() ||
          /[.!?]\s*$/.test(beforeMatch);

        if (isStartOfSentence) {
          replacements.push({
            original: match[0],
            suggested: primaryEntity,
            position: match.index
          });
        }
      }
    }

    return replacements;
  }

  /**
   * Get entity mention density (entities per 100 characters)
   */
  getEntityDensity(content: string, entities: string[]): number {
    let mentionCount = 0;
    const contentLower = content.toLowerCase();

    for (const entity of entities) {
      const regex = new RegExp(entity.toLowerCase(), 'g');
      const matches = contentLower.match(regex);
      mentionCount += matches?.length || 0;
    }

    return (mentionCount / content.length) * 100;
  }
}

// Export singleton instance
export const entityConsistencyValidator = new EntityConsistencyValidator();
