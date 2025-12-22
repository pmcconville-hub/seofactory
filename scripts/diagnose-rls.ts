/**
 * Diagnose RLS policy issues
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/diagnose-rls.ts
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

async function diagnose() {
  console.log('='.repeat(60));
  console.log('RLS POLICY DIAGNOSTIC');
  console.log('='.repeat(60));

  // 1. Check if claim_migrated_data function exists
  console.log('\n1. Checking if migration was applied...');
  const { data: funcData, error: funcError } = await supabase.rpc('claim_migrated_data');
  if (funcError) {
    if (funcError.message.includes('function') && funcError.message.includes('does not exist')) {
      console.log('   ❌ Migration NOT applied - claim_migrated_data function does not exist');
      console.log('   Run: npx supabase db push');
    } else if (funcError.message.includes('Not authenticated')) {
      console.log('   ✅ Migration applied - function exists (returns "Not authenticated" with service role)');
    } else {
      console.log('   ⚠️ Function check returned error:', funcError.message);
    }
  } else {
    console.log('   ✅ Migration applied - function exists');
    console.log('   Function result:', funcData);
  }

  // 2. Get all users
  console.log('\n2. Getting users...');
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.log('   ❌ Error listing users:', usersError.message);
    return;
  }
  const users = usersData.users;
  console.log(`   Found ${users.length} users:`);
  users.forEach(u => console.log(`   - ${u.email} (${u.id})`));

  // 3. Check topical_maps ownership
  console.log('\n3. Checking topical_maps ownership...');
  const { data: maps, error: mapsError } = await supabase
    .from('topical_maps')
    .select('id, title, user_id');

  if (mapsError) {
    console.log('   ❌ Error fetching maps:', mapsError.message);
  } else {
    console.log(`   Found ${maps?.length || 0} maps:`);
    maps?.forEach(m => {
      const owner = users.find(u => u.id === m.user_id);
      console.log(`   - "${m.title}" (${m.id.substring(0, 8)}...) owned by ${owner?.email || m.user_id || 'NULL'}`);
    });
  }

  // 4. Check topics with their map relationships
  console.log('\n4. Checking topics with map relationships...');
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('id, title, map_id, user_id')
    .limit(20);

  if (topicsError) {
    console.log('   ❌ Error fetching topics:', topicsError.message);
  } else {
    console.log(`   Found ${topics?.length || 0} topics (showing first 20):`);
    const orphanTopics = topics?.filter(t => !t.map_id) || [];
    const topicsWithMap = topics?.filter(t => t.map_id) || [];

    console.log(`   - ${topicsWithMap.length} topics have map_id`);
    console.log(`   - ${orphanTopics.length} topics have NULL map_id`);

    if (orphanTopics.length > 0) {
      console.log('\n   ⚠️ Topics without map_id (may cause RLS issues):');
      orphanTopics.slice(0, 5).forEach(t => {
        console.log(`     - "${t.title}" (${t.id.substring(0, 8)}...)`);
      });
    }
  }

  // 5. Check content_briefs
  console.log('\n5. Checking content_briefs...');
  const { data: briefs, error: briefsError } = await supabase
    .from('content_briefs')
    .select('id, topic_id, user_id, title')
    .limit(10);

  if (briefsError) {
    console.log('   ❌ Error fetching briefs:', briefsError.message);
  } else {
    console.log(`   Found ${briefs?.length || 0} briefs (showing first 10):`);
    briefs?.forEach(b => {
      const owner = users.find(u => u.id === b.user_id);
      console.log(`   - "${b.title?.substring(0, 30) || 'No title'}..." owned by ${owner?.email || b.user_id?.substring(0, 8) || 'NULL'}`);
    });
  }

  // 6. Check RLS policies
  console.log('\n6. Checking RLS policies on content_briefs...');
  const { data: policies, error: policiesError } = await supabase.rpc('get_policies_for_table', {
    table_name: 'content_briefs'
  }).catch(() => ({ data: null, error: { message: 'Function not available' } }));

  if (policiesError || !policies) {
    // Fallback: query pg_policies directly
    const { data: pgPolicies, error: pgError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'content_briefs');

    if (pgError) {
      console.log('   Unable to query policies directly. Run this SQL to check:');
      console.log('   SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = \'content_briefs\';');
    } else if (pgPolicies) {
      console.log('   Policies found:');
      pgPolicies.forEach(p => console.log(`   - ${p.policyname} (${p.cmd})`));
    }
  } else {
    console.log('   Policies:', policies);
  }

  console.log('\n' + '='.repeat(60));
  console.log('DIAGNOSTIC COMPLETE');
  console.log('='.repeat(60));

  console.log('\nIf RLS issues persist, verify:');
  console.log('1. The topic exists and has a valid map_id');
  console.log('2. The map\'s user_id matches the authenticated user');
  console.log('3. OR the brief\'s user_id matches auth.uid()');
}

diagnose().catch(console.error);
