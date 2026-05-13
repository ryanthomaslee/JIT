import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/lib/firebase-admin';
import { sendPilotEmail } from '@/lib/email';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let email: string;

  try {
    const body = await req.json();
    email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  try {
    // Generate a secure Firebase password reset action URL server-side.
    // This is equivalent to sendPasswordResetEmail but gives us the raw URL
    // so we can send it inside our own branded email template.
    const resetLink = await getAuth(adminApp).generatePasswordResetLink(email);

    await sendPilotEmail({
      to: email,
      subject: 'Reset your JIT password',
      type: 'password_reset',
      resetLink,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // Surface specific user-facing errors; keep everything else opaque.
    if (message.includes('USER_NOT_FOUND') || message.includes('user-not-found')) {
      return NextResponse.json(
        { error: 'No account found for that email address.' },
        { status: 404 }
      );
    }
    if (message.includes('INVALID_EMAIL') || message.includes('invalid-email')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    console.error('[reset-password]', message);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
