import { NextResponse } from 'next/server';

export async function GET(request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization') || '';

  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized cron request' }, { status: 401 });
  }

  console.log('[CRON] Keep-Alive executed');

  return NextResponse.json({ 
    success: true, 
    message: 'System active'
  });
}
