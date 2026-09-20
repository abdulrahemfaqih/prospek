import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // 1. Authorize CRON_SECRET Bearer token
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Header Authorization Bearer token tidak valid atau tidak cocok.' },
      { status: 401 }
    );
  }

  try {
    // 2. Perform write to heartbeat table using service role client
    const supabase = createAdminClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from('heartbeat')
      .update({ pinged_at: nowIso })
      .eq('id', 1);

    if (error) {
      console.error('[CRON KEEPALIVE ERROR]:', error);
      return NextResponse.json(
        { error: `Database write failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        pingedAt: nowIso,
        message: 'Heartbeat ping berhasil diperbarui.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[CRON KEEPALIVE UNCAUGHT ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error saat eksekusi cron keepalive.' },
      { status: 500 }
    );
  }
}
