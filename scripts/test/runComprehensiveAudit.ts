/**
 * runComprehensiveAudit.ts
 *
 * COMPREHENSIVE APPLICATION QUALITY AUDIT
 *
 * This script tests ALL application features by calling REAL AI services
 * and validating the QUALITY of outputs against expected criteria.
 *
 * Run with:
 * SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/test/runComprehensiveAudit.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Import AI services for real testing
import * as aiService from '../../services/ai/index';
import { AIResponseSanitizer } from '../../services/aiResponseSanitizer';
import { BusinessInfo, SEOPillars, SemanticTriple, EnrichedTopic, ContentBrief, KnowledgeGraph } from '../../types';

// Load environment variables from .env.local if available
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
// Allow API key from environment variable as fallback (useful for CI/testing)
// Check both ANTHROPIC_API_KEY and VITE_ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY_ENV = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || '';

// Test Data Configuration
const TEST_CONFIG = {
  projectName: 'CTC-test',
  mapName: 'CutTheCrapTestSite',
  domain: 'cutthecrap.io',
};

// Quality thresholds for validation
const QUALITY_THRESHOLDS = {
  // EAV Quality
  minEavCount: 8,
  minUniqueEavs: 2,
  minRootEavs: 2,

  // Topic Quality
  minCoreTopics: 3,
  minOuterTopics: 5,
  minSpokeRatio: 2,

  // Brief Quality
  minMetaDescLength: 50,
  maxMetaDescLength: 160,
  minOutlineSections: 3,
  maxOutlineSections: 10,
  minVisualSemantics: 1,

  // Content Quality
  minAuditScore: 70,
  maxPronounDensity: 0.05,
  maxStopWordDensity: 0.05,

  // Schema Quality
  requiredSchemaFields: ['@context', '@type', 'mainEntity', 'name'],
};

// Types for test results
interface ValidationResult {
  check: string;
  passed: boolean;
  expected: string;
  actual: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface FeatureTestResult {
  feature: string;
  status: 'pass' | 'fail' | 'partial' | 'skipped';
  validations: ValidationResult[];
  duration: number;
  error?: string;
  data?: any;
}

interface TestReport {
  startTime: Date;
  endTime?: Date;
  projectId?: string;
  mapId?: string;
  features: FeatureTestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    partial: number;
    skipped: number;
    criticalIssues: number;
    highIssues: number;
  };
  recommendations: string[];
}

// Global state
const report: TestReport = {
  startTime: new Date(),
  features: [],
  summary: { total: 0, passed: 0, failed: 0, partial: 0, skipped: 0, criticalIssues: 0, highIssues: 0 },
  recommendations: []
};

let supabase: SupabaseClient;
let testUserId: string;
let testBusinessInfo: BusinessInfo;

// Mock dispatch for AI services
const mockDispatch = (action: any) => {
  if (action.type === 'LOG_EVENT') {
    console.log(`  [AI] ${action.payload.service}: ${action.payload.message}`);
  }
};

// Utility functions
function log(message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const prefix = {
    info: '\x1b[36m[INFO]\x1b[0m',
    success: '\x1b[32m[PASS]\x1b[0m',
    warning: '\x1b[33m[WARN]\x1b[0m',
    error: '\x1b[31m[FAIL]\x1b[0m'
  };
  console.log(`${prefix[level]} ${message}`);
}

function validate(check: string, passed: boolean, expected: string, actual: string, severity: ValidationResult['severity'] = 'medium'): ValidationResult {
  return { check, passed, expected, actual, severity };
}

function addFeatureResult(result: FeatureTestResult) {
  report.features.push(result);
  report.summary.total++;

  if (result.status === 'pass') report.summary.passed++;
  else if (result.status === 'fail') report.summary.failed++;
  else if (result.status === 'partial') report.summary.partial++;
  else report.summary.skipped++;

  // Count issues
  for (const v of result.validations) {
    if (!v.passed) {
      if (v.severity === 'critical') report.summary.criticalIssues++;
      if (v.severity === 'high') report.summary.highIssues++;
    }
  }

  const statusIcon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : result.status === 'partial' ? '⚠️' : '⏭️';
  log(`${statusIcon} ${result.feature}: ${result.status.toUpperCase()} (${result.validations.filter(v => v.passed).length}/${result.validations.length} checks)`,
    result.status === 'pass' ? 'success' : result.status === 'fail' ? 'error' : 'warning');

  // Log failed validations
  for (const v of result.validations) {
    if (!v.passed) {
      console.log(`     ❌ ${v.check}: expected ${v.expected}, got ${v.actual} [${v.severity}]`);
    }
  }
}

// ============================================================================
// PHASE 1: SETUP & INITIALIZATION
// ============================================================================

async function setupTestEnvironment(): Promise<boolean> {
  log('\n=== PHASE 1: SETUP & INITIALIZATION ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  // Get test user
  const { data: users } = await supabase.auth.admin.listUsers();
  if (!users?.users?.length) {
    addFeatureResult({
      feature: 'Environment Setup',
      status: 'fail',
      validations: [validate('Test user exists', false, 'At least 1 user', '0 users', 'critical')],
      duration: Date.now() - startTime
    });
    return false;
  }
  testUserId = users.users[0].id;
  validations.push(validate('Test user exists', true, 'User available', `${users.users[0].email}`, 'critical'));

  // Get user settings for API keys directly from database (edge function requires auth)
  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', testUserId)
    .single();

  if (settingsError || !settings) {
    validations.push(validate('User settings loaded', false, 'Settings object', settingsError?.message || 'null', 'medium'));
  } else {
    validations.push(validate('User settings loaded', true, 'Settings available', 'Loaded'));
  }

  // Get Anthropic API key - check DB first, then environment variable fallback
  const anthropicApiKey = settings?.anthropic_api_key || ANTHROPIC_API_KEY_ENV;
  const hasAnthropicKey = !!anthropicApiKey;
  const keySource = settings?.anthropic_api_key ? 'database' : (ANTHROPIC_API_KEY_ENV ? 'environment' : 'none');

  validations.push(validate(
    'Anthropic API key configured',
    hasAnthropicKey,
    'API key present',
    hasAnthropicKey ? `Present (from ${keySource})` : 'Missing (set ANTHROPIC_API_KEY env var)',
    'critical'
  ));

  // Check for Supabase anon key (required for AI proxy)
  const hasSupabaseAnonKey = !!SUPABASE_ANON_KEY;
  validations.push(validate(
    'Supabase anon key configured',
    hasSupabaseAnonKey,
    'Anon key present',
    hasSupabaseAnonKey ? 'Present' : 'Missing (set VITE_SUPABASE_ANON_KEY env var)',
    'critical'
  ));

  // Build businessInfo for AI calls
  // Note: settings fields from DB use snake_case (e.g., anthropic_api_key, ai_model)
  testBusinessInfo = {
    domain: TEST_CONFIG.domain,
    projectName: TEST_CONFIG.projectName,
    industry: 'SEO Software / Content Marketing Technology',
    websiteType: 'SAAS' as const,
    valueProp: 'The only topical map tool implementing Koray Tugberk GUBUR\'s complete Holistic SEO framework with 9-pass AI article generation',
    audience: 'SEO professionals, content strategists, and digital marketing agencies',
    expertise: 'Expert',
    seedKeyword: 'topical map generator',
    language: 'English',
    region: 'Global',
    targetMarket: 'Global / English-speaking markets',
    conversionGoal: 'Sign up for paid subscription',
    aiProvider: 'anthropic' as const,
    aiModel: 'claude-3-5-sonnet-20241022',
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
    anthropicApiKey: anthropicApiKey,
    model: 'claude-3-5-sonnet-20241022',
  };

  // Clean up existing test data
  const { data: existingProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('project_name', TEST_CONFIG.projectName);

  if (existingProjects && existingProjects.length > 0) {
    for (const project of existingProjects) {
      const { data: maps } = await supabase.from('topical_maps').select('id').eq('project_id', project.id);
      if (maps) {
        for (const map of maps) {
          const { data: topics } = await supabase.from('topics').select('id').eq('map_id', map.id);
          if (topics) {
            for (const topic of topics) {
              await supabase.from('content_briefs').delete().eq('topic_id', topic.id);
            }
          }
          await supabase.from('content_generation_jobs').delete().eq('map_id', map.id);
          await supabase.from('topics').delete().eq('map_id', map.id);
          await supabase.from('topical_maps').delete().eq('id', map.id);
        }
      }
      await supabase.from('projects').delete().eq('id', project.id);
    }
    validations.push(validate('Cleanup existing data', true, 'Clean state', 'Cleaned'));
  }

  addFeatureResult({
    feature: 'Environment Setup',
    status: validations.every(v => v.passed || v.severity === 'low') ? 'pass' : 'fail',
    validations,
    duration: Date.now() - startTime
  });

  return validations.filter(v => v.severity === 'critical').every(v => v.passed);
}

// ============================================================================
// PHASE 2: PROJECT & MAP CREATION
// ============================================================================

async function testProjectCreation(): Promise<{ projectId: string; mapId: string } | null> {
  log('\n=== PHASE 2: PROJECT & MAP CREATION ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  // Create project via RPC
  const { data: projectData, error: projectError } = await supabase.rpc('create_new_project', {
    p_project_data: {
      project_name: TEST_CONFIG.projectName,
      domain: TEST_CONFIG.domain,
      user_id: testUserId
    }
  });

  if (projectError) {
    validations.push(validate('Project creation', false, 'Project created', projectError.message, 'critical'));
    addFeatureResult({ feature: 'Project Creation', status: 'fail', validations, duration: Date.now() - startTime });
    return null;
  }

  const projectId = Array.isArray(projectData) ? projectData[0]?.id : projectData?.id;
  validations.push(validate('Project ID returned', !!projectId, 'Valid UUID', projectId || 'null', 'critical'));
  report.projectId = projectId;

  // Create topical map with business info
  const { data: mapData, error: mapError } = await supabase
    .from('topical_maps')
    .insert({
      project_id: projectId,
      user_id: testUserId,
      name: TEST_CONFIG.mapName,
      domain: TEST_CONFIG.domain,
      business_info: testBusinessInfo
    })
    .select()
    .single();

  if (mapError) {
    validations.push(validate('Topical map creation', false, 'Map created', mapError.message, 'critical'));
    addFeatureResult({ feature: 'Project Creation', status: 'fail', validations, duration: Date.now() - startTime });
    return null;
  }

  validations.push(validate('Map ID returned', !!mapData?.id, 'Valid UUID', mapData?.id || 'null', 'critical'));
  report.mapId = mapData.id;

  // Verify business_info persistence
  const { data: verifyMap } = await supabase.from('topical_maps').select('business_info').eq('id', mapData.id).single();
  const storedInfo = verifyMap?.business_info as any;

  validations.push(validate('business_info.seedKeyword persisted', storedInfo?.seedKeyword === testBusinessInfo.seedKeyword, testBusinessInfo.seedKeyword, storedInfo?.seedKeyword || 'null'));
  validations.push(validate('business_info.industry persisted', storedInfo?.industry === testBusinessInfo.industry, testBusinessInfo.industry, storedInfo?.industry || 'null'));
  validations.push(validate('business_info.websiteType persisted', storedInfo?.websiteType === testBusinessInfo.websiteType, testBusinessInfo.websiteType, storedInfo?.websiteType || 'null'));
  validations.push(validate('business_info.aiProvider persisted', storedInfo?.aiProvider === testBusinessInfo.aiProvider, testBusinessInfo.aiProvider, storedInfo?.aiProvider || 'null'));

  addFeatureResult({
    feature: 'Project & Map Creation',
    status: validations.every(v => v.passed) ? 'pass' : validations.some(v => !v.passed && v.severity === 'critical') ? 'fail' : 'partial',
    validations,
    duration: Date.now() - startTime
  });

  return { projectId, mapId: mapData.id };
}

// ============================================================================
// PHASE 3: SEO PILLARS (AI-ASSISTED)
// ============================================================================

async function testPillarGeneration(mapId: string): Promise<SEOPillars | null> {
  log('\n=== PHASE 3: SEO PILLARS (AI-ASSISTED) ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  try {
    // Test Central Entity suggestion
    log('  Calling AI: suggestCentralEntityCandidates...');
    const entityCandidates = await aiService.suggestCentralEntityCandidates(testBusinessInfo, mockDispatch);

    validations.push(validate('Entity candidates returned', Array.isArray(entityCandidates) && entityCandidates.length > 0, 'Array with candidates', `Array with ${entityCandidates?.length || 0} items`));

    if (entityCandidates && entityCandidates.length > 0) {
      const firstCandidate = entityCandidates[0];
      validations.push(validate('Candidate has entity field', !!firstCandidate?.entity, 'Entity name present', firstCandidate?.entity || 'null'));
      validations.push(validate('Candidate has reasoning', !!firstCandidate?.reasoning, 'Reasoning present', firstCandidate?.reasoning ? 'Present' : 'null'));
      validations.push(validate('Candidate has score', typeof firstCandidate?.score === 'number', 'Numeric score', String(firstCandidate?.score)));
    }

    // Use best candidate or fallback
    const centralEntity = entityCandidates?.[0]?.entity || 'Topical Map Generator';

    // Test Source Context suggestion
    log('  Calling AI: suggestSourceContextOptions...');
    const contextOptions = await aiService.suggestSourceContextOptions(testBusinessInfo, centralEntity, mockDispatch);

    validations.push(validate('Context options returned', Array.isArray(contextOptions) && contextOptions.length > 0, 'Array with options', `Array with ${contextOptions?.length || 0} items`));

    const sourceContext = contextOptions?.[0]?.context || 'Holistic SEO methodology by Koray Tugberk GUBUR';

    // Build pillars
    const pillars: SEOPillars = {
      centralEntity,
      sourceContext,
      centralSearchIntent: 'Create comprehensive SEO topical maps with AI assistance',
      primary_verb: 'Create',
      auxiliary_verb: 'Learn'
    };

    // Save to database
    const { error: saveError } = await supabase
      .from('topical_maps')
      .update({ pillars })
      .eq('id', mapId);

    if (saveError) {
      validations.push(validate('Pillars saved to DB', false, 'Saved', saveError.message, 'high'));
    } else {
      validations.push(validate('Pillars saved to DB', true, 'Saved', 'Success'));

      // Verify persistence
      const { data: verifyMap } = await supabase.from('topical_maps').select('pillars').eq('id', mapId).single();
      const storedPillars = verifyMap?.pillars as SEOPillars;

      validations.push(validate('pillars.centralEntity persisted', storedPillars?.centralEntity === pillars.centralEntity, pillars.centralEntity, storedPillars?.centralEntity || 'null'));
      validations.push(validate('pillars.sourceContext persisted', storedPillars?.sourceContext === pillars.sourceContext, pillars.sourceContext, storedPillars?.sourceContext || 'null'));
    }

    addFeatureResult({
      feature: 'SEO Pillars Generation',
      status: validations.every(v => v.passed) ? 'pass' : validations.some(v => !v.passed && v.severity === 'critical') ? 'fail' : 'partial',
      validations,
      duration: Date.now() - startTime,
      data: pillars
    });

    return pillars;

  } catch (error) {
    validations.push(validate('AI service call', false, 'Success', (error as Error).message, 'critical'));
    addFeatureResult({
      feature: 'SEO Pillars Generation',
      status: 'fail',
      validations,
      duration: Date.now() - startTime,
      error: (error as Error).message
    });
    return null;
  }
}

// ============================================================================
// PHASE 4: EAV DISCOVERY (AI-GENERATED)
// ============================================================================

async function testEAVDiscovery(mapId: string, pillars: SEOPillars): Promise<SemanticTriple[] | null> {
  log('\n=== PHASE 4: EAV DISCOVERY (AI-GENERATED) ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  try {
    // Call REAL AI service for EAV discovery
    log('  Calling AI: discoverCoreSemanticTriples...');
    const eavs = await aiService.discoverCoreSemanticTriples(testBusinessInfo, pillars, mockDispatch);

    // Validate EAV count
    validations.push(validate(
      'Minimum EAV count',
      Array.isArray(eavs) && eavs.length >= QUALITY_THRESHOLDS.minEavCount,
      `>= ${QUALITY_THRESHOLDS.minEavCount}`,
      `${eavs?.length || 0}`,
      'high'
    ));

    if (Array.isArray(eavs) && eavs.length > 0) {
      // Validate EAV structure
      let validStructures = 0;
      let invalidStructures: string[] = [];

      for (const eav of eavs) {
        const hasSubject = eav.subject?.label && eav.subject?.type;
        const hasPredicate = eav.predicate?.relation && eav.predicate?.type;
        const hasObject = eav.object?.value !== undefined && eav.object?.type;

        if (hasSubject && hasPredicate && hasObject) {
          validStructures++;
        } else {
          invalidStructures.push(JSON.stringify(eav).substring(0, 100));
        }
      }

      validations.push(validate(
        'All EAVs have valid structure',
        validStructures === eavs.length,
        `${eavs.length}/${eavs.length} valid`,
        `${validStructures}/${eavs.length} valid`,
        'high'
      ));

      // Validate category distribution
      const categories: Record<string, number> = { UNIQUE: 0, ROOT: 0, RARE: 0, COMMON: 0 };
      for (const eav of eavs) {
        const cat = eav.predicate?.category;
        if (cat && categories[cat] !== undefined) categories[cat]++;
      }

      validations.push(validate(
        'Has UNIQUE category EAVs',
        categories.UNIQUE >= QUALITY_THRESHOLDS.minUniqueEavs,
        `>= ${QUALITY_THRESHOLDS.minUniqueEavs}`,
        `${categories.UNIQUE}`,
        'medium'
      ));

      validations.push(validate(
        'Has ROOT category EAVs',
        categories.ROOT >= QUALITY_THRESHOLDS.minRootEavs,
        `>= ${QUALITY_THRESHOLDS.minRootEavs}`,
        `${categories.ROOT}`,
        'medium'
      ));

      // Validate classification distribution
      const classifications: Record<string, number> = {};
      for (const eav of eavs) {
        const cls = eav.predicate?.classification || 'UNKNOWN';
        classifications[cls] = (classifications[cls] || 0) + 1;
      }

      const hasMultipleClassifications = Object.keys(classifications).length >= 3;
      validations.push(validate(
        'Diverse classifications',
        hasMultipleClassifications,
        '>= 3 types',
        `${Object.keys(classifications).length} types: ${Object.keys(classifications).join(', ')}`,
        'medium'
      ));

      // Save to database
      const { error: saveError } = await supabase
        .from('topical_maps')
        .update({ eavs })
        .eq('id', mapId);

      if (saveError) {
        validations.push(validate('EAVs saved to DB', false, 'Saved', saveError.message, 'high'));
      } else {
        validations.push(validate('EAVs saved to DB', true, 'Saved', 'Success'));
      }

      addFeatureResult({
        feature: 'EAV Discovery (AI)',
        status: validations.every(v => v.passed) ? 'pass' : validations.some(v => !v.passed && (v.severity === 'critical' || v.severity === 'high')) ? 'fail' : 'partial',
        validations,
        duration: Date.now() - startTime,
        data: { count: eavs.length, categories, classifications }
      });

      return eavs;
    }

    addFeatureResult({
      feature: 'EAV Discovery (AI)',
      status: 'fail',
      validations,
      duration: Date.now() - startTime
    });
    return null;

  } catch (error) {
    validations.push(validate('AI service call', false, 'Success', (error as Error).message, 'critical'));
    addFeatureResult({
      feature: 'EAV Discovery (AI)',
      status: 'fail',
      validations,
      duration: Date.now() - startTime,
      error: (error as Error).message
    });
    return null;
  }
}

// ============================================================================
// PHASE 5: TOPIC GENERATION (AI-GENERATED)
// ============================================================================

async function testTopicGeneration(mapId: string, pillars: SEOPillars, eavs: SemanticTriple[]): Promise<EnrichedTopic[] | null> {
  log('\n=== PHASE 5: TOPIC GENERATION (AI-GENERATED) ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  try {
    // Call REAL AI for topic generation
    // Function signature: generateInitialTopicalMap(businessInfo, pillars, eavs, competitors, dispatch)
    log('  Calling AI: generateInitialTopicalMap...');
    const topicResult = await aiService.generateInitialTopicalMap(
      testBusinessInfo,
      pillars,
      eavs,
      [], // No competitors for initial test
      mockDispatch
    );

    const coreTopics = topicResult?.coreTopics || [];
    const outerTopics = topicResult?.outerTopics || [];

    validations.push(validate(
      'Core topics generated',
      coreTopics.length >= QUALITY_THRESHOLDS.minCoreTopics,
      `>= ${QUALITY_THRESHOLDS.minCoreTopics}`,
      `${coreTopics.length}`,
      'high'
    ));

    validations.push(validate(
      'Outer topics generated',
      outerTopics.length >= QUALITY_THRESHOLDS.minOuterTopics,
      `>= ${QUALITY_THRESHOLDS.minOuterTopics}`,
      `${outerTopics.length}`,
      'high'
    ));

    // Combine all topics
    const allTopics = [...coreTopics, ...outerTopics];

    if (allTopics.length > 0) {
      // Validate topic structure
      let validTopics = 0;
      for (const topic of allTopics) {
        const hasTitle = !!topic.title && topic.title.length > 5;
        const hasDescription = !!topic.description && topic.description.length > 10;
        const hasType = topic.type === 'core' || topic.type === 'outer';
        // topic_class may not be set initially, so this is optional
        const hasTopicClass = !topic.topic_class || topic.topic_class === 'monetization' || topic.topic_class === 'informational';

        if (hasTitle && hasDescription && hasType && hasTopicClass) {
          validTopics++;
        }
      }

      validations.push(validate(
        'Topics have valid structure',
        validTopics === allTopics.length,
        `${allTopics.length}/${allTopics.length}`,
        `${validTopics}/${allTopics.length}`,
        'high'
      ));

      // Check for duplicate titles
      const titles = allTopics.map(t => t.title.toLowerCase());
      const uniqueTitles = new Set(titles);
      validations.push(validate(
        'No duplicate topic titles',
        titles.length === uniqueTitles.size,
        `${allTopics.length} unique`,
        `${uniqueTitles.size} unique out of ${titles.length}`,
        'medium'
      ));

      // Validate topic title quality
      const genericTitles = allTopics.filter(t =>
        t.title.toLowerCase().includes('introduction') ||
        t.title.toLowerCase().includes('conclusion') ||
        t.title.toLowerCase().includes('overview') ||
        t.title.length < 10
      );
      validations.push(validate(
        'No generic topic titles',
        genericTitles.length === 0,
        '0 generic',
        `${genericTitles.length} generic: ${genericTitles.map(t => t.title).join(', ')}`,
        'medium'
      ));

      // Save topics to database
      const topicsToInsert = allTopics.map((t, idx) => ({
        map_id: mapId,
        user_id: testUserId,
        type: t.type || 'core',
        topic_class: t.topic_class || 'informational',
        title: t.title,
        slug: t.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        description: t.description,
        cluster_role: t.cluster_role || 'cluster_content'
      }));

      const { data: insertedTopics, error: insertError } = await supabase
        .from('topics')
        .insert(topicsToInsert)
        .select();

      if (insertError) {
        validations.push(validate('Topics saved to DB', false, 'Saved', insertError.message, 'critical'));
      } else {
        validations.push(validate('Topics saved to DB', true, 'Saved', `${insertedTopics?.length} topics`));

        // Verify retrieval
        const { data: verifyTopics } = await supabase.from('topics').select('*').eq('map_id', mapId);
        validations.push(validate(
          'Topics retrievable from DB',
          verifyTopics?.length === insertedTopics?.length,
          `${insertedTopics?.length}`,
          `${verifyTopics?.length}`
        ));

        addFeatureResult({
          feature: 'Topic Generation (AI)',
          status: validations.every(v => v.passed) ? 'pass' : validations.some(v => !v.passed && (v.severity === 'critical' || v.severity === 'high')) ? 'fail' : 'partial',
          validations,
          duration: Date.now() - startTime,
          data: {
            core: coreTopics.length,
            outer: outerTopics.length,
            total: insertedTopics?.length
          }
        });

        return insertedTopics as EnrichedTopic[];
      }
    }

    addFeatureResult({
      feature: 'Topic Generation (AI)',
      status: 'fail',
      validations,
      duration: Date.now() - startTime
    });
    return null;

  } catch (error) {
    validations.push(validate('AI service call', false, 'Success', (error as Error).message, 'critical'));
    addFeatureResult({
      feature: 'Topic Generation (AI)',
      status: 'fail',
      validations,
      duration: Date.now() - startTime,
      error: (error as Error).message
    });
    return null;
  }
}

// ============================================================================
// PHASE 6: CONTENT BRIEF GENERATION (AI-GENERATED)
// ============================================================================

async function testBriefGeneration(mapId: string, topics: EnrichedTopic[], pillars: SEOPillars): Promise<ContentBrief[] | null> {
  log('\n=== PHASE 6: CONTENT BRIEF GENERATION (AI-GENERATED) ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];
  const generatedBriefs: ContentBrief[] = [];

  // Select topics for brief generation
  const monetizationTopic = topics.find(t => t.topic_class === 'monetization');
  const informationalTopic = topics.find(t => t.topic_class === 'informational');

  const testTopics = [monetizationTopic, informationalTopic].filter(Boolean) as EnrichedTopic[];

  if (testTopics.length === 0) {
    validations.push(validate('Topics available for brief generation', false, '>= 1', '0', 'critical'));
    addFeatureResult({ feature: 'Content Brief Generation (AI)', status: 'fail', validations, duration: Date.now() - startTime });
    return null;
  }

  validations.push(validate('Topics selected for testing', true, '>= 1', `${testTopics.length}`));

  // Build proper KnowledgeGraph instance for brief generation
  const kg = new KnowledgeGraph();

  for (const topic of testTopics) {
    try {
      log(`  Calling AI: generateContentBrief for "${topic.title}"...`);

      const brief = await aiService.generateContentBrief(
        testBusinessInfo,
        topic,
        topics,
        pillars,
        kg,
        topic.topic_class === 'monetization' ? 'monetization' : 'informational',
        mockDispatch
      );

      if (!brief) {
        validations.push(validate(`Brief generated for "${topic.title}"`, false, 'Brief object', 'null', 'high'));
        continue;
      }

      // DETAILED BRIEF QUALITY VALIDATION
      const briefValidations: ValidationResult[] = [];

      // 1. Meta description
      const metaDesc = brief.metaDescription || '';
      briefValidations.push(validate(
        'meta_description present',
        !!metaDesc && metaDesc.length > 0,
        'Non-empty string',
        metaDesc ? `${metaDesc.length} chars` : 'null/empty',
        'high'
      ));
      briefValidations.push(validate(
        'meta_description length valid',
        metaDesc.length >= QUALITY_THRESHOLDS.minMetaDescLength && metaDesc.length <= QUALITY_THRESHOLDS.maxMetaDescLength,
        `${QUALITY_THRESHOLDS.minMetaDescLength}-${QUALITY_THRESHOLDS.maxMetaDescLength} chars`,
        `${metaDesc.length} chars`,
        'medium'
      ));

      // 2. Structured outline
      const outline = brief.structured_outline as any;
      const sections = outline?.sections || [];
      briefValidations.push(validate(
        'structured_outline present',
        !!outline && typeof outline === 'object',
        'Object',
        typeof outline,
        'high'
      ));
      briefValidations.push(validate(
        'outline has sections array',
        Array.isArray(sections),
        'Array',
        Array.isArray(sections) ? `Array[${sections.length}]` : typeof sections,
        'high'
      ));
      briefValidations.push(validate(
        'outline section count',
        sections.length >= QUALITY_THRESHOLDS.minOutlineSections && sections.length <= QUALITY_THRESHOLDS.maxOutlineSections,
        `${QUALITY_THRESHOLDS.minOutlineSections}-${QUALITY_THRESHOLDS.maxOutlineSections}`,
        `${sections.length}`,
        'medium'
      ));

      // Validate each section has heading and hints
      if (sections.length > 0) {
        let validSections = 0;
        for (const section of sections) {
          if (section.heading && section.type && (section.subordinate_text_hints || section.hints)) {
            validSections++;
          }
        }
        briefValidations.push(validate(
          'sections have complete structure',
          validSections === sections.length,
          `${sections.length}/${sections.length}`,
          `${validSections}/${sections.length}`,
          'high'
        ));
      }

      // 3. Visual semantics
      const visuals = brief.visual_semantics as any;
      briefValidations.push(validate(
        'visual_semantics present',
        !!visuals && typeof visuals === 'object',
        'Object',
        typeof visuals,
        'medium'
      ));
      if (visuals) {
        const hasHeroImage = !!visuals.hero_image || !!visuals.heroImage;
        const hasSectionImages = Array.isArray(visuals.section_images) || Array.isArray(visuals.sectionImages);
        briefValidations.push(validate(
          'has hero image definition',
          hasHeroImage,
          'Present',
          hasHeroImage ? 'Present' : 'Missing',
          'medium'
        ));
        briefValidations.push(validate(
          'has section images array',
          hasSectionImages,
          'Array present',
          hasSectionImages ? 'Present' : 'Missing',
          'low'
        ));
      }

      // 4. SERP analysis
      const serp = brief.serpAnalysis as any;
      briefValidations.push(validate(
        'serpAnalysis present',
        !!serp && typeof serp === 'object',
        'Object',
        typeof serp,
        'medium'
      ));
      if (serp) {
        // Check it's not just a string (common AI error)
        briefValidations.push(validate(
          'serpAnalysis is object (not string)',
          typeof serp !== 'string',
          'Object type',
          typeof serp,
          'high'
        ));

        const hasPAA = Array.isArray(serp.peopleAlsoAsk) && serp.peopleAlsoAsk.length > 0;
        briefValidations.push(validate(
          'serpAnalysis.peopleAlsoAsk populated',
          hasPAA,
          'Non-empty array',
          hasPAA ? `Array[${serp.peopleAlsoAsk.length}]` : 'Empty/missing',
          'medium'
        ));
      }

      // 5. Contextual bridge
      const bridge = brief.contextualBridge as any;
      briefValidations.push(validate(
        'contextualBridge present',
        !!bridge,
        'Present',
        bridge ? 'Present' : 'Missing',
        'medium'
      ));

      // 6. Target keyword
      briefValidations.push(validate(
        'targetKeyword present',
        !!brief.targetKeyword,
        'Non-empty',
        brief.targetKeyword || 'null',
        'high'
      ));

      // Add all brief validations to main validations
      validations.push(...briefValidations);

      // Calculate brief quality score
      const passedChecks = briefValidations.filter(v => v.passed).length;
      const totalChecks = briefValidations.length;
      const qualityScore = Math.round((passedChecks / totalChecks) * 100);

      validations.push(validate(
        `Brief quality score for "${topic.title}"`,
        qualityScore >= 70,
        '>= 70%',
        `${qualityScore}%`,
        qualityScore < 50 ? 'high' : 'medium'
      ));

      // Save brief to database
      const briefToSave = {
        topic_id: topic.id,
        user_id: testUserId,
        title: topic.title,
        meta_description: brief.metaDescription,
        contextual_bridge: brief.contextualBridge,
        structured_outline: brief.structured_outline,
        visual_semantics: brief.visual_semantics,
        serp_analysis: brief.serpAnalysis,
        status: 'NOT_STARTED' as const
      };

      const { data: savedBrief, error: saveError } = await supabase
        .from('content_briefs')
        .insert(briefToSave)
        .select()
        .single();

      if (saveError) {
        validations.push(validate(`Brief saved for "${topic.title}"`, false, 'Saved', saveError.message, 'high'));
      } else {
        validations.push(validate(`Brief saved for "${topic.title}"`, true, 'Saved', savedBrief.id));
        generatedBriefs.push(savedBrief as ContentBrief);
      }

    } catch (error) {
      validations.push(validate(`Brief generation for "${topic.title}"`, false, 'Success', (error as Error).message, 'high'));
    }
  }

  addFeatureResult({
    feature: 'Content Brief Generation (AI)',
    status: generatedBriefs.length === testTopics.length ? 'pass' : generatedBriefs.length > 0 ? 'partial' : 'fail',
    validations,
    duration: Date.now() - startTime,
    data: { generated: generatedBriefs.length, expected: testTopics.length }
  });

  return generatedBriefs.length > 0 ? generatedBriefs : null;
}

// ============================================================================
// PHASE 7: RESPONSE SANITIZER TESTING
// ============================================================================

async function testResponseSanitizer(): Promise<void> {
  log('\n=== PHASE 7: RESPONSE SANITIZER TESTING ===\n');
  const startTime = Date.now();
  const validations: ValidationResult[] = [];

  // AIResponseSanitizer expects dispatch function directly, not an object
  const sanitizer = new AIResponseSanitizer(mockDispatch);

  // Test 1: Valid JSON
  const validJson = '{"name": "test", "value": 123}';
  const result1 = sanitizer.sanitize(validJson, { name: String, value: Number }, { name: '', value: 0 });
  validations.push(validate('Parses valid JSON', result1?.name === 'test', 'name: test', `name: ${result1?.name}`));

  // Test 2: JSON wrapped in markdown
  const markdownWrapped = '```json\n{"name": "test"}\n```';
  const result2 = sanitizer.sanitize(markdownWrapped, { name: String }, { name: '' });
  validations.push(validate('Extracts JSON from markdown', result2?.name === 'test', 'name: test', `name: ${result2?.name}`));

  // Test 3: Malformed nested structure (common AI error)
  const malformedNested = '{"serpAnalysis": "Not available", "outline": []}';
  const result3 = sanitizer.sanitize(malformedNested, { serpAnalysis: Object, outline: Array }, { serpAnalysis: {}, outline: [] });
  validations.push(validate(
    'Handles string instead of object (serpAnalysis)',
    typeof result3?.serpAnalysis === 'object',
    'object',
    typeof result3?.serpAnalysis
  ));

  // Test 4: Array sanitization
  const arrayResult = sanitizer.sanitizeArray('[{"id": 1}, {"id": 2}]', []);
  validations.push(validate('Sanitizes arrays', Array.isArray(arrayResult) && arrayResult.length === 2, 'Array[2]', `Array[${arrayResult?.length}]`));

  // Test 5: Invalid JSON recovery
  const invalidJson = 'This is not JSON at all';
  const result5 = sanitizer.sanitize(invalidJson, { data: String }, { data: 'fallback' });
  validations.push(validate('Returns fallback for invalid JSON', result5?.data === 'fallback', 'fallback', result5?.data));

  addFeatureResult({
    feature: 'Response Sanitizer',
    status: validations.every(v => v.passed) ? 'pass' : validations.filter(v => !v.passed).length <= 1 ? 'partial' : 'fail',
    validations,
    duration: Date.now() - startTime
  });
}

// ============================================================================
// GENERATE FINAL REPORT
// ============================================================================

function generateReport(): string {
  report.endTime = new Date();
  const duration = (report.endTime.getTime() - report.startTime.getTime()) / 1000;

  // Calculate overall pass rate
  const totalValidations = report.features.reduce((sum, f) => sum + f.validations.length, 0);
  const passedValidations = report.features.reduce((sum, f) => sum + f.validations.filter(v => v.passed).length, 0);
  const overallPassRate = totalValidations > 0 ? Math.round((passedValidations / totalValidations) * 100) : 0;

  let markdown = `# CTC-test Comprehensive Quality Audit Report

**Generated:** ${report.endTime.toISOString()}
**Duration:** ${duration.toFixed(2)} seconds
**Overall Pass Rate:** ${overallPassRate}%

## Executive Summary

| Metric | Value |
|--------|-------|
| Features Tested | ${report.summary.total} |
| Features Passed | ${report.summary.passed} |
| Features Failed | ${report.summary.failed} |
| Features Partial | ${report.summary.partial} |
| Total Validations | ${totalValidations} |
| Validations Passed | ${passedValidations} |
| Critical Issues | ${report.summary.criticalIssues} |
| High Issues | ${report.summary.highIssues} |

## Test Data

- **Project ID:** ${report.projectId || 'Not created'}
- **Map ID:** ${report.mapId || 'Not created'}

---

## Feature Test Results

`;

  for (const feature of report.features) {
    const passedCount = feature.validations.filter(v => v.passed).length;
    const statusIcon = feature.status === 'pass' ? '✅' : feature.status === 'fail' ? '❌' : feature.status === 'partial' ? '⚠️' : '⏭️';

    markdown += `### ${statusIcon} ${feature.feature}

**Status:** ${feature.status.toUpperCase()} | **Duration:** ${feature.duration}ms | **Checks:** ${passedCount}/${feature.validations.length}

`;

    if (feature.error) {
      markdown += `**Error:** ${feature.error}\n\n`;
    }

    if (feature.validations.length > 0) {
      markdown += '| Check | Status | Expected | Actual | Severity |\n';
      markdown += '|-------|--------|----------|--------|----------|\n';

      for (const v of feature.validations) {
        const icon = v.passed ? '✅' : '❌';
        const truncatedActual = v.actual.length > 50 ? v.actual.substring(0, 47) + '...' : v.actual;
        const truncatedExpected = v.expected.length > 30 ? v.expected.substring(0, 27) + '...' : v.expected;
        markdown += `| ${v.check} | ${icon} | ${truncatedExpected} | ${truncatedActual} | ${v.severity} |\n`;
      }
      markdown += '\n';
    }

    if (feature.data) {
      markdown += `**Data:** \`${JSON.stringify(feature.data)}\`\n\n`;
    }
  }

  // Add recommendations based on failures
  markdown += `## Recommendations\n\n`;

  const criticalFailures = report.features.flatMap(f =>
    f.validations.filter(v => !v.passed && v.severity === 'critical')
  );
  const highFailures = report.features.flatMap(f =>
    f.validations.filter(v => !v.passed && v.severity === 'high')
  );

  if (criticalFailures.length > 0) {
    markdown += `### Critical Issues (Must Fix)\n\n`;
    for (const v of criticalFailures) {
      markdown += `- **${v.check}**: Expected ${v.expected}, got ${v.actual}\n`;
    }
    markdown += '\n';
  }

  if (highFailures.length > 0) {
    markdown += `### High Priority Issues\n\n`;
    for (const v of highFailures) {
      markdown += `- **${v.check}**: Expected ${v.expected}, got ${v.actual}\n`;
    }
    markdown += '\n';
  }

  markdown += `---

## Conclusion

${overallPassRate >= 80 ? '✅ Application quality is GOOD.' : overallPassRate >= 60 ? '⚠️ Application quality needs IMPROVEMENT.' : '❌ Application quality is POOR.'}

**Quality Grade:** ${overallPassRate >= 90 ? 'A' : overallPassRate >= 80 ? 'B' : overallPassRate >= 70 ? 'C' : overallPassRate >= 60 ? 'D' : 'F'}

### Next Steps

1. Address all critical issues immediately
2. Fix high-priority issues before production deployment
3. Review partial passes for potential improvements
4. Add automated tests for skipped features

---

*Report generated by runComprehensiveAudit.ts with REAL AI service calls*
`;

  return markdown;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('\n========================================');
  console.log('  COMPREHENSIVE QUALITY AUDIT');
  console.log('  With REAL AI Service Calls');
  console.log('========================================\n');

  if (!SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Phase 1: Setup
    const setupOk = await setupTestEnvironment();
    if (!setupOk) {
      log('Setup failed - critical requirements not met', 'error');
    }

    // Phase 2: Project & Map
    const projectResult = await testProjectCreation();
    if (!projectResult) {
      log('Project creation failed - cannot continue with AI tests', 'error');
    }

    let pillars: SEOPillars | null = null;
    let eavs: SemanticTriple[] | null = null;
    let topics: EnrichedTopic[] | null = null;

    if (projectResult) {
      // Phase 3: Pillars
      pillars = await testPillarGeneration(projectResult.mapId);

      if (pillars) {
        // Phase 4: EAVs
        eavs = await testEAVDiscovery(projectResult.mapId, pillars);

        if (eavs) {
          // Phase 5: Topics
          topics = await testTopicGeneration(projectResult.mapId, pillars, eavs);

          if (topics) {
            // Phase 6: Briefs
            await testBriefGeneration(projectResult.mapId, topics, pillars);
          }
        }
      }
    }

    // Phase 7: Response Sanitizer (independent test)
    await testResponseSanitizer();

    // Generate and save report
    const reportContent = generateReport();
    const reportPath = path.join(process.cwd(), 'docs', 'test-reports', 'CTC-test-audit-report.md');
    fs.writeFileSync(reportPath, reportContent);

    console.log('\n========================================');
    console.log('  AUDIT COMPLETE');
    console.log(`  Report: ${reportPath}`);
    console.log('========================================\n');

    const totalValidations = report.features.reduce((sum, f) => sum + f.validations.length, 0);
    const passedValidations = report.features.reduce((sum, f) => sum + f.validations.filter(v => v.passed).length, 0);

    console.log('Summary:');
    console.log(`  Features: ${report.summary.passed}/${report.summary.total} passed`);
    console.log(`  Validations: ${passedValidations}/${totalValidations} passed`);
    console.log(`  Critical Issues: ${report.summary.criticalIssues}`);
    console.log(`  High Issues: ${report.summary.highIssues}`);

  } catch (error) {
    console.error('Fatal error:', error);

    const reportContent = generateReport();
    const reportPath = path.join(process.cwd(), 'docs', 'test-reports', 'CTC-test-audit-report-partial.md');
    fs.writeFileSync(reportPath, reportContent);
    console.log(`Partial report saved to: ${reportPath}`);
  }
}

main();
