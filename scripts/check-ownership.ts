/**
 * Check ownership chain: topic → map → user
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/check-ownership.ts
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
  console.log('OWNERSHIP CHAIN CHECK');
  console.log('='.repeat(60));

  // Get authenticated user
  const { data: usersData } = await supabase.auth.admin.listUsers();
  const users = usersData?.users || [];
  console.log('\nUsers:');
  users.forEach(u => console.log(`  ${u.email} = ${u.id}`));

  // Get maps with user ownership
  console.log('\nTopical Maps:');
  const { data: maps } = await supabase
    .from('topical_maps')
    .select('id, user_id');

  maps?.forEach(m => {
    const owner = users.find(u => u.id === m.user_id);
    console.log(`  Map ${m.id.substring(0, 8)}... → user: ${owner?.email || m.user_id || 'NULL'}`);
  });

  // Get topics with map relationship
  console.log('\nTopics with Map relationships:');
  const { data: topics } = await supabase
    .from('topics')
    .select('id, map_id, user_id, title')
    .limit(10);

  for (const t of topics || []) {
    const map = maps?.find(m => m.id === t.map_id);
    const mapOwner = map ? users.find(u => u.id === map.user_id)?.email : null;
    const topicOwner = users.find(u => u.id === t.user_id)?.email;

    console.log(`  Topic "${t.title?.substring(0, 30)}..."`);
    console.log(`    → map_id: ${t.map_id?.substring(0, 8) || 'NULL'}... (owner: ${mapOwner || 'NULL'})`);
    console.log(`    → topic user_id: ${topicOwner || t.user_id?.substring(0, 8) || 'NULL'}`);
  }

  // Check for mismatches
  console.log('\n' + '='.repeat(60));
  console.log('CHECKING FOR OWNERSHIP MISMATCHES');
  console.log('='.repeat(60));

  // Get all briefs with their topic and map relationships
  const { data: briefs } = await supabase
    .from('content_briefs')
    .select('id, topic_id, user_id, title');

  let mismatches = 0;
  for (const brief of briefs || []) {
    const topic = topics?.find(t => t.id === brief.topic_id);
    if (!topic) {
      console.log(`\n⚠️ Brief "${brief.title?.substring(0, 30)}" has invalid topic_id`);
      mismatches++;
      continue;
    }

    const map = maps?.find(m => m.id === topic.map_id);
    if (!map) {
      console.log(`\n⚠️ Topic "${topic.title?.substring(0, 30)}" has invalid map_id`);
      mismatches++;
      continue;
    }

    const briefOwner = brief.user_id;
    const mapOwner = map.user_id;

    if (briefOwner !== mapOwner) {
      console.log(`\n❌ MISMATCH: Brief "${brief.title?.substring(0, 30)}"`);
      console.log(`   Brief user: ${briefOwner}`);
      console.log(`   Map user:   ${mapOwner}`);
      mismatches++;
    }
  }

  if (mismatches === 0) {
    console.log('\n✅ No ownership mismatches found');
  } else {
    console.log(`\n❌ Found ${mismatches} ownership mismatches`);
  }

  // SQL to check policies
  console.log('\n' + '='.repeat(60));
  console.log('RUN THIS SQL TO CHECK POLICIES:');
  console.log('='.repeat(60));
  console.log(`
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'content_briefs';
  `);
}

check().catch(console.error);
