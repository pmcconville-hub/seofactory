import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTables() {
  console.log('Checking WordPress tables in Supabase...\n');

  // Check if wordpress_connections table exists
  const { data: wpConn, error: wpConnErr } = await supabase
    .from('wordpress_connections')
    .select('id')
    .limit(1);

  console.log('wordpress_connections table:');
  if (wpConnErr) {
    console.log('  ERROR:', wpConnErr.message);
    console.log('  Code:', wpConnErr.code);
  } else {
    console.log('  EXISTS - found', wpConn?.length || 0, 'rows');
  }

  // Check if wordpress_publications table exists
  const { data: wpPub, error: wpPubErr } = await supabase
    .from('wordpress_publications')
    .select('id')
    .limit(1);

  console.log('\nwordpress_publications table:');
  if (wpPubErr) {
    console.log('  ERROR:', wpPubErr.message);
    console.log('  Code:', wpPubErr.code);
  } else {
    console.log('  EXISTS - found', wpPub?.length || 0, 'rows');
  }

  // Check if wordpress_media table exists
  const { data: wpMedia, error: wpMediaErr } = await supabase
    .from('wordpress_media')
    .select('id')
    .limit(1);

  console.log('\nwordpress_media table:');
  if (wpMediaErr) {
    console.log('  ERROR:', wpMediaErr.message);
    console.log('  Code:', wpMediaErr.code);
  } else {
    console.log('  EXISTS - found', wpMedia?.length || 0, 'rows');
  }

  // Check if wordpress_sync_log table exists
  const { data: wpSync, error: wpSyncErr } = await supabase
    .from('wordpress_sync_log')
    .select('id')
    .limit(1);

  console.log('\nwordpress_sync_log table:');
  if (wpSyncErr) {
    console.log('  ERROR:', wpSyncErr.message);
    console.log('  Code:', wpSyncErr.code);
  } else {
    console.log('  EXISTS - found', wpSync?.length || 0, 'rows');
  }
}

checkTables().catch(console.error);
