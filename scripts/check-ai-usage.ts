import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUsage() {
  // Check ai_usage_logs for provider info
  const { data, count, error } = await supabase
    .from('ai_usage_logs')
    .select('provider, model, operation, success, duration_ms, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  console.log('=== AI USAGE LOGS (recent 50) ===');
  console.log('Total records:', count);

  if (error) {
    console.log('Error:', error.message);
    return;
  }

  if (data && data.length > 0) {
    // Group by provider/model
    const providers: Record<string, { count: number; success: number; durations: number[] }> = {};
    data.forEach(d => {
      const key = `${d.provider}/${d.model}`;
      if (!providers[key]) providers[key] = { count: 0, success: 0, durations: [] };
      providers[key].count++;
      if (d.success) providers[key].success++;
      if (d.duration_ms) providers[key].durations.push(d.duration_ms);
    });

    console.log('\nProvider/Model breakdown:');
    Object.entries(providers).forEach(([key, p]) => {
      const avgDuration = p.durations.length > 0
        ? Math.round(p.durations.reduce((a, b) => a + b, 0) / p.durations.length)
        : 0;
      console.log(`  ${key}: ${p.count} calls, ${p.success} success, avg ${avgDuration}ms`);
    });

    // Show operations
    const ops: Record<string, number> = {};
    data.forEach(d => {
      ops[d.operation] = (ops[d.operation] || 0) + 1;
    });
    console.log('\nOperations:');
    Object.entries(ops)
      .sort((a, b) => b[1] - a[1])
      .forEach(([op, count]) => {
        console.log(`  ${op}: ${count}`);
      });

    // Show recent entries
    console.log('\nRecent 10 entries:');
    data.slice(0, 10).forEach(d => {
      const time = new Date(d.created_at).toISOString().substring(11, 19);
      const status = d.success ? '✓' : '✗';
      console.log(`  [${time}] ${status} ${d.provider}/${d.operation} (${d.duration_ms || 'N/A'}ms)`);
    });
  } else {
    console.log('No usage logs found');
  }

  // Also check the api_call_logs endpoints
  console.log('\n=== API CALL LOGS DETAIL ===');
  const { data: apiLogs } = await supabase
    .from('api_call_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (apiLogs) {
    console.log('\nRecent 20 API call logs:');
    apiLogs.forEach(log => {
      const time = new Date(log.created_at).toISOString().substring(11, 19);
      console.log(`  [${time}] ${log.provider}/${log.endpoint}: ${log.duration_ms}ms (${log.status})`);
    });
  }
}

checkUsage().catch(console.error);
