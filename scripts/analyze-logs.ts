import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://shtqshmmsrmtquuhyupl.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeLogs() {
  console.log('=== API CALL LOGS ANALYSIS ===\n');

  // Get API calls by provider
  const { data: apiByProvider } = await supabase
    .from('api_call_logs')
    .select('provider, endpoint, status, duration_ms, error_type, error_message')
    .order('created_at', { ascending: false })
    .limit(500);

  if (apiByProvider && apiByProvider.length > 0) {
    // Aggregate by provider
    const providerStats: Record<string, { total: number; success: number; failed: number; totalDuration: number; errors: Record<string, number> }> = {};
    apiByProvider.forEach(call => {
      if (!providerStats[call.provider]) {
        providerStats[call.provider] = { total: 0, success: 0, failed: 0, totalDuration: 0, errors: {} };
      }
      providerStats[call.provider].total++;
      if (call.status === 'success') {
        providerStats[call.provider].success++;
        providerStats[call.provider].totalDuration += call.duration_ms || 0;
      } else {
        providerStats[call.provider].failed++;
        const errType = call.error_type || 'unknown';
        providerStats[call.provider].errors[errType] = (providerStats[call.provider].errors[errType] || 0) + 1;
      }
    });

    console.log('Provider Performance:');
    Object.entries(providerStats).forEach(([provider, stats]) => {
      const successRate = ((stats.success / stats.total) * 100).toFixed(1);
      const avgDuration = stats.success > 0 ? Math.round(stats.totalDuration / stats.success) : 0;
      console.log(`  ${provider}: ${stats.total} calls, ${successRate}% success, avg ${avgDuration}ms`);
      if (Object.keys(stats.errors).length > 0) {
        console.log(`    Errors: ${JSON.stringify(stats.errors)}`);
      }
    });

    // Aggregate by endpoint
    console.log('\nEndpoint Performance:');
    const endpointStats: Record<string, { total: number; success: number; totalDuration: number }> = {};
    apiByProvider.forEach(call => {
      const key = `${call.provider}/${call.endpoint}`;
      if (!endpointStats[key]) {
        endpointStats[key] = { total: 0, success: 0, totalDuration: 0 };
      }
      endpointStats[key].total++;
      if (call.status === 'success') {
        endpointStats[key].success++;
        endpointStats[key].totalDuration += call.duration_ms || 0;
      }
    });

    Object.entries(endpointStats)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .forEach(([endpoint, stats]) => {
        const avgDuration = stats.success > 0 ? Math.round(stats.totalDuration / stats.success) : 0;
        const successRate = ((stats.success / stats.total) * 100).toFixed(0);
        console.log(`  ${endpoint}: ${stats.total} calls, ${successRate}% success, avg ${avgDuration}ms`);
      });
  } else {
    console.log('No API call logs found');
  }

  console.log('\n=== PERFORMANCE METRICS ===\n');

  // Get performance metrics
  const { data: perfMetrics } = await supabase
    .from('performance_metrics')
    .select('category, operation, duration_ms, success')
    .order('created_at', { ascending: false })
    .limit(500);

  if (perfMetrics && perfMetrics.length > 0) {
    const categoryStats: Record<string, { total: number; success: number; totalDuration: number }> = {};
    perfMetrics.forEach(metric => {
      const key = `${metric.category}:${metric.operation}`;
      if (!categoryStats[key]) {
        categoryStats[key] = { total: 0, success: 0, totalDuration: 0 };
      }
      categoryStats[key].total++;
      if (metric.success) {
        categoryStats[key].success++;
        categoryStats[key].totalDuration += metric.duration_ms || 0;
      }
    });

    console.log('Operation Performance (sorted by total time):');
    Object.entries(categoryStats)
      .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
      .slice(0, 15)
      .forEach(([op, stats]) => {
        const avgDuration = stats.success > 0 ? Math.round(stats.totalDuration / stats.success) : 0;
        console.log(`  ${op}: ${stats.total} calls, avg ${avgDuration}ms, total ${Math.round(stats.totalDuration/1000)}s`);
      });
  } else {
    console.log('No performance metrics found');
  }

  console.log('\n=== CONSOLE ERRORS ===\n');

  // Get recent errors
  const { data: consoleErrors } = await supabase
    .from('console_logs')
    .select('level, message, context, created_at')
    .eq('level', 'error')
    .order('created_at', { ascending: false })
    .limit(20);

  if (consoleErrors && consoleErrors.length > 0) {
    console.log(`Recent errors (${consoleErrors.length}):`);
    consoleErrors.forEach(err => {
      const msg = (err.message || 'No message').substring(0, 120);
      const time = new Date(err.created_at).toISOString().substring(11, 19);
      console.log(`  [${time}] ${msg}`);
    });
  } else {
    console.log('No console errors found');
  }

  console.log('\n=== SLOWEST API CALLS ===\n');

  // Get slowest calls
  const { data: slowCalls } = await supabase
    .from('api_call_logs')
    .select('provider, endpoint, duration_ms, status, created_at')
    .not('duration_ms', 'is', null)
    .order('duration_ms', { ascending: false })
    .limit(10);

  if (slowCalls && slowCalls.length > 0) {
    console.log('Top 10 slowest API calls:');
    slowCalls.forEach(call => {
      const time = new Date(call.created_at).toISOString().substring(11, 19);
      console.log(`  ${call.provider}/${call.endpoint}: ${call.duration_ms}ms (${call.status}) at ${time}`);
    });
  } else {
    console.log('No slow calls data');
  }

  console.log('\n=== FAILED API CALLS ===\n');

  // Get failed calls
  const { data: failedCalls } = await supabase
    .from('api_call_logs')
    .select('provider, endpoint, error_type, error_message, created_at')
    .eq('status', 'error')
    .order('created_at', { ascending: false })
    .limit(15);

  if (failedCalls && failedCalls.length > 0) {
    console.log(`Recent failures (${failedCalls.length}):`);
    failedCalls.forEach(call => {
      const time = new Date(call.created_at).toISOString().substring(11, 19);
      const errMsg = (call.error_message || call.error_type || 'unknown').substring(0, 80);
      console.log(`  [${time}] ${call.provider}/${call.endpoint}: ${errMsg}`);
    });
  } else {
    console.log('No failed API calls found - great!');
  }
}

analyzeLogs().catch(console.error);
