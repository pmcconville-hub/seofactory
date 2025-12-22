/**
 * Fix user_id references after database migration
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/fix-user-ids.ts
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

async function fixUserIds() {
  console.log('='.repeat(60));
  console.log('FIX USER IDs AFTER MIGRATION');
  console.log('='.repeat(60));

  // Get the user ID from auth.users
  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('Error getting users:', userError);
    return;
  }

  const users = usersData.users;
  console.log('\nFound users:');
  users.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  if (users.length === 0) {
    console.error('No users found');
    return;
  }

  // Use the first user's ID (richard@kjenmarks.nl)
  const targetUserId = users[0].id;
  console.log(`\nUpdating all data to user: ${targetUserId} (${users[0].email})`);
  console.log('-'.repeat(60));

  // Direct updates using the Supabase client with service role key
  const tables = [
    'projects',
    'topical_maps',
    'topics',
    'content_briefs'
  ];

  for (const table of tables) {
    try {
      // Get all rows - service role bypasses RLS
      const { data: rows, error: selectError } = await supabase
        .from(table)
        .select('id, user_id');

      if (selectError) {
        console.log(`${table}: Select error - ${selectError.message}`);
        continue;
      }

      // Filter rows that need updating (different user_id or null)
      const rowsToUpdate = rows?.filter(r => r.user_id !== targetUserId) || [];
      console.log(`${table}: Found ${rows?.length || 0} rows, ${rowsToUpdate.length} need update`);

      if (rowsToUpdate.length === 0) continue;

      // Update all rows at once using .in()
      const idsToUpdate = rowsToUpdate.map(r => r.id);
      const { error: updateError, count } = await supabase
        .from(table)
        .update({ user_id: targetUserId })
        .in('id', idsToUpdate);

      if (updateError) {
        console.log(`${table}: Update error - ${updateError.message}`);
      } else {
        console.log(`${table}: Updated successfully`);
      }
    } catch (e) {
      console.log(`${table}: Exception - ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  }

  console.log('-'.repeat(60));
  console.log('Done! Try saving a content brief now.');
}

fixUserIds().catch(console.error);
