/**
 * Verify RLS policies exist correctly
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/verify-rls-policies.ts
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

async function verify() {
  console.log('='.repeat(60));
  console.log('VERIFY RLS POLICIES');
  console.log('='.repeat(60));

  // Query pg_policies view for content_briefs
  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT policyname, cmd,
             SUBSTRING(qual::text, 1, 200) as using_clause,
             SUBSTRING(with_check::text, 1, 200) as with_check_clause
      FROM pg_policies
      WHERE tablename = 'content_briefs'
      ORDER BY policyname;
    `
  });

  if (error) {
    console.log('\n❌ Cannot execute SQL directly. Checking if function exists...');

    // Try to check if the migration claim_migrated_data function exists
    const { error: funcError } = await supabase.rpc('claim_migrated_data');
    if (funcError?.message.includes('does not exist')) {
      console.log('\n❌ Migration NOT applied. Run: npx supabase db push');
    } else {
      console.log('\n✅ Migration appears to be applied (function exists)');
      console.log('\nTo check policies manually, run this SQL in Supabase Dashboard:');
      console.log(`
SELECT policyname, cmd, qual::text, with_check::text
FROM pg_policies
WHERE tablename = 'content_briefs';
      `);
    }
    return;
  }

  console.log('\nPolicies on content_briefs:');
  console.log(JSON.stringify(data, null, 2));

  // Check for the updated INSERT policy
  const insertPolicy = Array.isArray(data)
    ? data.find((p: any) => p.cmd === 'INSERT')
    : null;

  if (insertPolicy) {
    console.log('\n📋 INSERT Policy check:');
    const withCheck = insertPolicy.with_check_clause || '';
    if (withCheck.includes('user_id') && withCheck.includes('auth.uid')) {
      console.log('✅ INSERT policy includes user_id = auth.uid() condition');
    } else {
      console.log('⚠️ INSERT policy may not include user_id fallback');
      console.log('   with_check:', withCheck);
    }
  }

  // Also check if the topic really exists for a sample brief
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING SAMPLE BRIEF/TOPIC RELATIONSHIP');
  console.log('='.repeat(60));

  // Get a sample brief
  const { data: briefs, error: briefErr } = await supabase
    .from('content_briefs')
    .select('id, topic_id, user_id, title')
    .limit(1);

  if (briefErr || !briefs?.[0]) {
    console.log('No briefs found to check');
    return;
  }

  const sampleBrief = briefs[0];
  console.log(`\nSample brief: "${sampleBrief.title?.substring(0, 40)}..."`);
  console.log(`  topic_id: ${sampleBrief.topic_id}`);
  console.log(`  user_id: ${sampleBrief.user_id}`);

  // Check if topic exists
  const { data: topic, error: topicErr } = await supabase
    .from('topics')
    .select('id, map_id, title')
    .eq('id', sampleBrief.topic_id)
    .single();

  if (topicErr || !topic) {
    console.log(`\n⚠️ Topic NOT found for this brief!`);
    console.log('   This means:');
    console.log('   - The first RLS condition (topic ownership) will FAIL');
    console.log('   - The second condition (user_id = auth.uid()) MUST work');
    console.log('   - If saves fail, the migration policy update may not be applied');
  } else {
    console.log(`\n✅ Topic found: "${topic.title?.substring(0, 40)}..."`);
    console.log(`   map_id: ${topic.map_id}`);

    // Check map ownership
    const { data: map } = await supabase
      .from('topical_maps')
      .select('id, user_id')
      .eq('id', topic.map_id)
      .single();

    if (map) {
      console.log(`   Map user_id: ${map.user_id}`);
      if (map.user_id === sampleBrief.user_id) {
        console.log('   ✅ Ownership chain intact');
      } else {
        console.log('   ⚠️ User mismatch between brief and map');
      }
    }
  }
}

verify().catch(console.error);
