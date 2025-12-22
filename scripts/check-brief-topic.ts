/**
 * Check if briefs have valid topic relationships
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/check-brief-topic.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function check() {
  console.log('='.repeat(60));
  console.log('CHECK BRIEF-TOPIC RELATIONSHIPS');
  console.log('='.repeat(60));

  // Get all topics first (with pagination if needed)
  console.log('\nFetching all topics...');
  const { data: allTopics, error: topicErr } = await supabase
    .from('topics')
    .select('id');

  if (topicErr) {
    console.error('Error fetching topics:', topicErr.message);
    return;
  }

  const topicIds = new Set(allTopics?.map(t => t.id) || []);
  console.log(`Found ${topicIds.size} topics in database`);

  // Get all briefs
  console.log('\nFetching all briefs...');
  const { data: allBriefs, error: briefErr } = await supabase
    .from('content_briefs')
    .select('id, topic_id, title');

  if (briefErr) {
    console.error('Error fetching briefs:', briefErr.message);
    return;
  }

  console.log(`Found ${allBriefs?.length || 0} briefs in database`);

  // Check for orphaned briefs (topic_id doesn't exist)
  const orphanedBriefs = allBriefs?.filter(b => !topicIds.has(b.topic_id)) || [];
  const validBriefs = allBriefs?.filter(b => topicIds.has(b.topic_id)) || [];

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.log(`\n✅ Briefs with valid topic_id: ${validBriefs.length}`);
  console.log(`❌ Briefs with INVALID topic_id (orphaned): ${orphanedBriefs.length}`);

  if (orphanedBriefs.length > 0) {
    console.log('\n⚠️ ORPHANED BRIEFS (first 10):');
    orphanedBriefs.slice(0, 10).forEach(b => {
      console.log(`  - "${b.title?.substring(0, 40)}..." (topic_id: ${b.topic_id?.substring(0, 8)}...)`);
    });

    console.log('\n❗ IMPORTANT: These orphaned briefs will FAIL RLS checks because:');
    console.log('   1. The topic doesn\'t exist, so the first condition fails');
    console.log('   2. The fallback condition (user_id = auth.uid()) should work');
    console.log('   3. If saves are still failing, the policy update was NOT applied');
  }

  // Test: Pick a valid topic and check if we can see its full ownership chain
  if (validBriefs.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('CHECKING OWNERSHIP CHAIN FOR A VALID BRIEF');
    console.log('='.repeat(60));

    const sampleBrief = validBriefs[0];
    console.log(`\nSample brief: "${sampleBrief.title?.substring(0, 40)}..."`);

    const { data: topic } = await supabase
      .from('topics')
      .select('id, title, map_id, user_id')
      .eq('id', sampleBrief.topic_id)
      .single();

    if (topic) {
      console.log(`Topic: "${topic.title?.substring(0, 40)}..."`);
      console.log(`  map_id: ${topic.map_id}`);
      console.log(`  topic user_id: ${topic.user_id}`);

      const { data: map } = await supabase
        .from('topical_maps')
        .select('id, user_id')
        .eq('id', topic.map_id)
        .single();

      if (map) {
        console.log(`Map user_id: ${map.user_id}`);
      }
    }
  }
}

check().catch(console.error);
