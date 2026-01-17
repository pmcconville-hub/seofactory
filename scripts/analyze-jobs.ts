import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeJobs() {
  // Get recent jobs
  const { data: jobs, error: jobsError } = await supabase
    .from('content_generation_jobs')
    .select('id, status, current_pass, total_sections, completed_sections, passes_status, final_audit_score, created_at, started_at, completed_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('=== RECENT CONTENT GENERATION JOBS ===\n');

  if (jobsError) {
    console.log('Error fetching jobs:', jobsError.message);
  } else if (jobs && jobs.length > 0) {
    jobs.forEach(job => {
      const duration = job.completed_at && job.started_at
        ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
        : 'N/A';
      console.log('Job:', job.id.substring(0, 8));
      console.log('  Status:', job.status, '| Pass:', job.current_pass, '| Audit Score:', job.final_audit_score || 'N/A');
      console.log('  Sections:', job.completed_sections, '/', job.total_sections);
      console.log('  Duration:', duration, 'seconds');

      // Parse passes status
      const passes = job.passes_status as Record<string, string> || {};
      const passNames = ['pass_1_draft', 'pass_2_headers', 'pass_3_lists', 'pass_4_visuals',
                        'pass_5_microsemantics', 'pass_6_discourse', 'pass_7_intro', 'pass_8_audit', 'pass_9_schema'];
      const passStatus = passNames.map(p => {
        const s = passes[p];
        if (s === 'completed') return '✓';
        if (s === 'in_progress') return '→';
        if (s === 'failed') return '✗';
        return '○';
      }).join('');
      console.log('  Passes: [' + passStatus + ']', '(1-9)');
      console.log('');
    });
  } else {
    console.log('No jobs found');
  }

  // Get sections with timing info
  const { data: sections, error: sectionsError } = await supabase
    .from('content_generation_sections')
    .select('job_id, section_key, section_heading, current_pass, status, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('=== SECTION GENERATION TIMES ===\n');

  if (sectionsError) {
    console.log('Error fetching sections:', sectionsError.message);
  } else if (sections && sections.length > 0) {
    // Calculate average section generation time
    let totalTime = 0;
    let count = 0;
    const sectionTimes: { heading: string; time: number }[] = [];

    sections.forEach(s => {
      if (s.updated_at && s.created_at) {
        const time = (new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 1000;
        if (time > 0 && time < 600) { // Reasonable time (< 10 min)
          totalTime += time;
          count++;
          sectionTimes.push({ heading: s.section_heading || s.section_key, time });
        }
      }
    });

    if (count > 0) {
      console.log('Average section generation time:', Math.round(totalTime / count), 'seconds');
      console.log('Total sections analyzed:', count);

      // Show slowest sections
      console.log('\nSlowest sections:');
      sectionTimes
        .sort((a, b) => b.time - a.time)
        .slice(0, 10)
        .forEach(s => {
          console.log('  ', Math.round(s.time), 's -', s.heading?.substring(0, 50));
        });
    }
  } else {
    console.log('No sections found');
  }

  // Check for any audit results
  console.log('\n=== AUDIT SCORES ===\n');

  const { data: audits } = await supabase
    .from('content_generation_jobs')
    .select('id, final_audit_score, audit_results, created_at')
    .not('final_audit_score', 'is', null)
    .order('created_at', { ascending: false })
    .limit(5);

  if (audits && audits.length > 0) {
    audits.forEach(audit => {
      console.log('Job:', audit.id.substring(0, 8), '- Score:', audit.final_audit_score);
      const results = audit.audit_results as any;
      if (results && results.failures) {
        console.log('  Failures:', results.failures.length);
        results.failures.slice(0, 3).forEach((f: any) => {
          console.log('    -', f.rule || f.type, ':', (f.message || f.details || '').substring(0, 60));
        });
      }
    });
  } else {
    console.log('No audit results found');
  }
}

analyzeJobs().catch(err => console.error('Error:', err));
