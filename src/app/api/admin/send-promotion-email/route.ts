import { NextRequest, NextResponse } from 'next/server';
import { sendPilotEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { to?: string; participantId?: string };
    const { to, participantId } = body;

    console.log('[send-promotion-email] received:', { to, participantId });

    if (!to || typeof to !== 'string') {
      console.error('[send-promotion-email] validation failed — missing or invalid `to`:', body);
      return NextResponse.json({ error: 'Missing or invalid `to` field.' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('[send-promotion-email] RESEND_API_KEY is not set in environment variables');
      return NextResponse.json({ error: 'Email service not configured (missing RESEND_API_KEY).' }, { status: 500 });
    }

    console.log('[send-promotion-email] sending to:', to);
    await sendPilotEmail({
      to,
      subject: 'Your JIT 14-Day Protocol is Ready',
      type: 'protocol_unlocked',
      participantId,
    });

    console.log('[send-promotion-email] success:', to);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[send-promotion-email] failed:', { message, err });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
