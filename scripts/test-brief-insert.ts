/**
 * Test if RLS allows brief insert with user_id
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/test-brief-insert.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://shtqshmmsrmtquuhyupl.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

// Service role client (bypasses RLS)
const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function test() {
  console.log('='.repeat(60));
  console.log('TEST BRIEF INSERT WITH RLS');
  console.log('='.repeat(60));

  // 1. Get a user
  const { data: usersData } = await adminSupabase.auth.admin.listUsers();
  const user = usersData?.users?.[0];
  if (!user) {
    console.log('No users found');
    return;
  }
  console.log(`\nUser: ${user.email} (${user.id})`);

  // 2. Get a valid topic (one that exists and has proper ownership)
  const { data: topic } = await adminSupabase
    .from('topics')
    .select('id, title, map_id')
    .limit(1)
    .single();

  if (!topic) {
    console.log('No topics found');
    return;
  }
  console.log(`\nTopic: "${topic.title?.substring(0, 40)}..." (${topic.id})`);
  console.log(`Map ID: ${topic.map_id}`);

  // 3. Check if there's already a brief for this topic
  const { data: existingBrief } = await adminSupabase
    .from('content_briefs')
    .select('id, topic_id')
    .eq('topic_id', topic.id)
    .single();

  if (existingBrief) {
    console.log(`\n⚠️ Brief already exists for this topic. Testing UPDATE instead.`);

    // Test update
    const { error: updateError } = await adminSupabase
      .from('content_briefs')
      .update({ title: 'Test update ' + Date.now() })
      .eq('id', existingBrief.id);

    if (updateError) {
      console.log(`\n❌ UPDATE failed: ${updateError.message}`);
    } else {
      console.log(`\n✅ UPDATE succeeded`);
    }
    return;
  }

  // 4. Try to insert a new brief (using service role, which bypasses RLS)
  // This is just to show what happens - we'd need an actual user session to test RLS
  console.log('\n--- ADMIN INSERT (bypasses RLS) ---');
  const testBriefId = crypto.randomUUID();
  const { error: insertError } = await adminSupabase
    .from('content_briefs')
    .insert({
      id: testBriefId,
      topic_id: topic.id,
      user_id: user.id,
      title: 'Test brief from script',
    });

  if (insertError) {
    console.log(`\n❌ INSERT failed: ${insertError.message}`);
    console.log(`   Full error:`, insertError);
  } else {
    console.log(`\n✅ Admin INSERT succeeded`);

    // Clean up
    await adminSupabase.from('content_briefs').delete().eq('id', testBriefId);
    console.log(`   (Cleaned up test brief)`);
  }

  // 5. To test actual RLS, we'd need to create a user session
  // But we can check the policy definition by looking at the pg_policies view
  console.log('\n--- CHECKING IF RLS FALLBACK CONDITION EXISTS ---');
  console.log('The updated INSERT policy should contain:');
  console.log('  OR content_briefs.user_id = auth.uid()');
  console.log('\nTo verify, run this SQL in Supabase Dashboard SQL Editor:');
  console.log(`
SELECT policyname, with_check::text
FROM pg_policies
WHERE tablename = 'content_briefs'
AND cmd = 'INSERT';
  `);
  console.log('\nLook for "user_id" and "auth.uid()" in the with_check column.');
}

test().catch(console.error);
