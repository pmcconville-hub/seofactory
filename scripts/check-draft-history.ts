import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
  console.log('Connecting to Supabase...');

  // First get all briefs with drafts
  const { data: briefs, error } = await supabase
    .from('content_briefs')
    .select('id, title, article_draft, draft_history, updated_at')
    .not('article_draft', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  console.log('Found briefs with drafts:', briefs?.length || 0);

  for (const brief of briefs || []) {
    console.log('\n========================================');
    console.log('Title:', brief.title);
    console.log('ID:', brief.id);
    console.log('Updated:', brief.updated_at);
    console.log('Draft length:', brief.article_draft?.length || 0, 'chars');
    console.log('draft_history column value:', brief.draft_history);
    console.log('draft_history type:', typeof brief.draft_history);
    console.log('draft_history is array:', Array.isArray(brief.draft_history));

    if (brief.draft_history && Array.isArray(brief.draft_history)) {
      console.log('History entries:', brief.draft_history.length);
      for (const entry of brief.draft_history) {
        console.log('  - Version', entry.version, ':', entry.char_count, 'chars at', entry.saved_at);
      }
    }
  }
}

check().catch(e => console.error('Exception:', e));
