import { NextResponse } from 'next/server';

export async function GET() {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  const metrics = `# HELP process_uptime_seconds Uptime of the process in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${uptime}
# HELP process_memory_bytes Memory usage in bytes
# TYPE process_memory_bytes gauge
process_memory_bytes{type="rss"} ${memoryUsage.rss}
process_memory_bytes{type="heapTotal"} ${memoryUsage.heapTotal}
process_memory_bytes{type="heapUsed"} ${memoryUsage.heapUsed}
`;

  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
    },
  });
}
