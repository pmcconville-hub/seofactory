import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function check() {
  // Get the brief ID
  const briefId = '8e8ad6f4-a2c0-4601-afef-27d65845a043';

  // Check all jobs for this brief
  const { data: jobs, error } = await supabase
    .from('content_generation_jobs')
    .select('id, draft_content, status, current_pass, passes_status, updated_at, created_at')
    .eq('brief_id', briefId)
    .order('created_at', { ascending: false });

  if (error) {
    console.log('Error:', error);
    return;
  }

  console.log('Jobs found:', jobs?.length || 0);

  for (const job of jobs || []) {
    console.log('\n========================================');
    console.log('Job ID:', job.id);
    console.log('Status:', job.status);
    console.log('Current pass:', job.current_pass);
    console.log('Draft content length:', job.draft_content?.length || 0);
    console.log('Created:', job.created_at);
    console.log('Updated:', job.updated_at);
    console.log('Passes status:', JSON.stringify(job.passes_status, null, 2));
  }
}

check();
