/**
 * One-shot email test script.
 * Sends all JIT email templates to ryanthomaslee93@gmail.com via Resend.
 *
 * Run:  npx tsx src/scripts/test-emails.ts
 */

import path from 'path';
import dotenv from 'dotenv';

// Try .env.local first (Next.js convention), fall back to .env.
const envPath = (() => {
  const local = path.resolve(process.cwd(), '.env.local');
  const base = path.resolve(process.cwd(), '.env');
  try {
    require('fs').accessSync(local);
    return local;
  } catch {
    return base;
  }
})();

dotenv.config({ path: envPath });

// Verify the key loaded before importing anything that consumes it.
console.log('Env file loaded:', envPath);
console.log(
  'Checking API Key: ' +
    (process.env.RESEND_API_KEY
      ? 'Found (starts with ' + process.env.RESEND_API_KEY.substring(0, 5) + ')'
      : 'NOT FOUND — key missing from ' + envPath)
);

const TO = process.env.TO_EMAIL || 'ryanthomaslee93@gmail.com';
console.log('Targeting Recipient:', TO);

async function main() {
  // Dynamic import ensures email.ts is initialised AFTER dotenv has populated
  // process.env, so the Resend client receives the correct API key.
  const { sendPilotEmail } = await import('../lib/email');

  const emails: Array<{ label: string; send: () => Promise<void> }> = [
    // ── 1. Welcome (Day 0 onboarding) ─────────────────────────────────────────
    {
      label: 'Welcome (Day 0)',
      send: () =>
        sendPilotEmail({
          to: TO,
          subject: "Welcome to the JIT Program — You're in.",
          type: 'welcome',
        }),
    },

    // ── 2. Day 7 — Week 1 reflection reminder ─────────────────────────────────
    {
      label: 'Day 7 Reminder',
      send: () =>
        sendPilotEmail({
          to: TO,
          subject: 'Week 1 complete — time for your reflection.',
          type: 'day7_reminder',
        }),
    },

    // ── 3. Day 14 — Follow-up assessment unlocked ─────────────────────────────
    {
      label: 'Day 14 Unlocked',
      send: () =>
        sendPilotEmail({
          to: TO,
          subject: 'Your Day 14 follow-up is now open.',
          type: 'day14_unlocked',
        }),
    },

    // ── 4. Milestone — Day 3 check-in (sample scores) ─────────────────────────
    {
      label: 'Milestone Day 3',
      send: () =>
        sendPilotEmail({
          to: TO,
          subject: 'Day 3 · Your JIT milestone check-in',
          type: 'milestone',
          milestoneData: {
            participantId: 'P2-001',
            dayOfStudy: 3,
            emotional: 7,
            cognitive: 6,
            motivation: 5,
            relational: 4,
            neuyComment:
              'Your Emotional score is the highest driver right now. The Buffer Window and Name It technique will give your nervous system a structured reset — try it at the end of each teaching block today.',
            recommendedExercise: 'The Buffer Window — 90-second physiological reset',
          },
        }),
    },

    // ── 5. Milestone — Day 10 check-in (sample scores + shift indicators) ─────
    {
      label: 'Milestone Day 10',
      send: () =>
        sendPilotEmail({
          to: TO,
          subject: 'Day 10 · Your JIT milestone check-in',
          type: 'milestone',
          milestoneData: {
            participantId: 'P2-001',
            dayOfStudy: 10,
            emotional: 5,
            cognitive: 4,
            motivation: 3,
            relational: 6,
            neuyComment:
              'Your scores are moving. Emotional load has dropped two points since Day 0 — that shift is real. Relational is now your primary focus for the final four days. Sanctioned Withdrawal remains the most effective tool for this profile.',
            recommendedExercise: 'The Sanctioned Withdrawal — structured solitude protocol',
            week1ReflectionScore: 6,
            exerciseCompletions: 8,
          },
        }),
    },
  ];

  console.log(`\nSending ${emails.length} emails to ${TO}...\n`);

  for (const { label, send } of emails) {
    try {
      await send();
      console.log(`✓  ${label}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗  ${label}: ${message}`);
    }
  }

  console.log('\nDone. Check your inbox at ' + TO);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
