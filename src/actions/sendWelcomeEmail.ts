'use server';

import { sendPilotEmail } from '@/lib/email';

export async function sendWelcomeEmail(email: string): Promise<void> {
  console.log(`[JIT] Sending welcome email to ${email}`);
  try {
    await sendPilotEmail({
      to: email,
      subject: 'Welcome to the JIT Program — You\'re in.',
      type: 'welcome',
    });
    console.log(`[JIT] Welcome email sent to ${email}`);
  } catch (err) {
    console.error(`[JIT] Welcome email failed for ${email}:`, err);
  }
}
