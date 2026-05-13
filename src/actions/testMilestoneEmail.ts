/**
 * Temporary test script — milestone email end-to-end.
 * Run: npx tsx src/actions/testMilestoneEmail.ts
 * Delete after confirming the email arrives.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local before any SDK imports
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TO_EMAIL = 'rlee@nis.ac.th';

const SCORES = {
  emotional: 9,   // High burnout load
  cognitive: 3,   // Low burnout load
  motivation: 4,  // Low burnout load
  relational: 10, // Highest burnout load — will be flagged as Focus domain
};

const DAY_OF_STUDY = 3 as const;

// ---------------------------------------------------------------------------
// Step 1: Generate NEUY comment via Anthropic
// ---------------------------------------------------------------------------

async function generateMilestoneComment(): Promise<{ comment: string; recommendedExercise: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const domainList = [
    { name: 'Emotional', score: SCORES.emotional },
    { name: 'Cognitive', score: SCORES.cognitive },
    { name: 'Motivation', score: SCORES.motivation },
    { name: 'Relational', score: SCORES.relational },
  ];
  const lowestDomain = [...domainList].sort((a, b) => b.score - a.score)[0];

  console.log(`\n→ Highest-burden domain: ${lowestDomain.name} (${lowestDomain.score}/10)`);
  console.log('→ Calling Anthropic for NEUY comment…');

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    system: `You are NEUY, a warm and clinically sharp burnout recovery coach. You write brief, supportive milestone check-in messages for professionals in a 14-day burnout prevention programme.

SCORING: Higher scores (1–10) indicate higher burnout load (worse). The participant's highest-scoring domain is their primary area of concern.

TASK: Write a 2-sentence supportive comment acknowledging where the participant is in their journey, then recommend one specific, named exercise for their highest-burden domain.

RULES:
- Use British English.
- No em-dashes, en-dashes, or semicolons.
- No generic motivational jargon or toxic positivity.
- The exercise must be specific and named (e.g. "Box Breathing", "Cognitive Offloading", "Gratitude Journalling").
- Return only a JSON object: {"comment": "...", "recommendedExercise": "..."}`,
    messages: [
      {
        role: 'user',
        content: `Day ${DAY_OF_STUDY} milestone check-in.
Scores (higher = more burnout load):
- Emotional: ${SCORES.emotional}
- Cognitive: ${SCORES.cognitive}
- Motivation: ${SCORES.motivation}
- Relational: ${SCORES.relational}
Highest-burden domain: ${lowestDomain.name} (${lowestDomain.score}/10)

Return JSON: {"comment": "...", "recommendedExercise": "..."}`,
      },
    ],
  });

  const text = message.content.find((b) => b.type === 'text')?.text ?? '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? '{}');

  return {
    comment: parsed.comment ?? '',
    recommendedExercise: parsed.recommendedExercise ?? '',
  };
}

// ---------------------------------------------------------------------------
// Step 2: Build milestone email HTML (inline — no @/ alias needed)
// ---------------------------------------------------------------------------

function buildMilestoneHtml(data: {
  participantId: string;
  dayOfStudy: 3 | 10;
  emotional: number;
  cognitive: number;
  motivation: number;
  relational: number;
  neuyComment: string;
  recommendedExercise: string;
}): string {
  const domains = [
    { name: 'Emotional', score: data.emotional },
    { name: 'Cognitive', score: data.cognitive },
    { name: 'Motivation', score: data.motivation },
    { name: 'Relational', score: data.relational },
  ].sort((a, b) => a.score - b.score);

  const top = domains[0];
  const bottom = domains[domains.length - 1];
  const dayLabel = data.dayOfStudy === 3 ? 'Day 3' : 'Day 10';
  const journeyLabel = data.dayOfStudy === 3 ? 'three days in' : 'ten days in';

  const domainRows = [
    { name: 'Emotional', score: data.emotional },
    { name: 'Cognitive', score: data.cognitive },
    { name: 'Motivation', score: data.motivation },
    { name: 'Relational', score: data.relational },
  ].map(({ name, score }) => {
    const isTop = name === top.name;
    const isBottom = name === bottom.name;
    const bg = isTop ? '#f0fdf4' : isBottom ? '#fffbeb' : '#f9fafb';
    const badge = isTop
      ? '<span style="font-size:10px;font-weight:700;color:#15803d;background:#dcfce7;border-radius:4px;padding:1px 6px;margin-left:6px;text-transform:uppercase;letter-spacing:0.08em;">Best</span>'
      : isBottom
        ? '<span style="font-size:10px;font-weight:700;color:#b45309;background:#fef3c7;border-radius:4px;padding:1px 6px;margin-left:6px;text-transform:uppercase;letter-spacing:0.08em;">Focus</span>'
        : '';
    return `
      <tr>
        <td style="background:${bg};border-radius:8px;padding:10px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;font-weight:600;color:#374151;">${name}${badge}</td>
              <td align="right" style="font-size:16px;font-weight:900;color:#1a1a1a;font-family:monospace;">${score}<span style="font-size:11px;font-weight:400;color:#9ca3af;">/10</span></td>
            </tr>
          </table>
        </td>
      </tr>
      <tr><td style="height:6px;"></td></tr>`;
  }).join('');

  const body = `
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">${dayLabel} &middot; Milestone Check-In</p>
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">You are ${journeyLabel}.</h1>
    <p style="margin:0 0 28px;font-size:13px;color:#9ca3af;font-family:monospace;">${data.participantId}</p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
      Here is a snapshot of your four recovery domains from your Day 0 baseline, so you can see where your energy is going right now.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${domainRows}
    </table>

    <div style="background:#f9fafb;border-left:3px solid #1a1a1a;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;">NEUY</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.75;">${data.neuyComment}</p>
    </div>

    <div style="background:#1a1a1a;border-radius:10px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0 0 4px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#6b7280;">Recommended for your ${bottom.name} domain</p>
      <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;">${data.recommendedExercise}</p>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="https://jit.jaibehavioural.com/dashboard" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Go to My Dashboard &rarr;</a>
        </td>
      </tr>
    </table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JIT — Burnout Prevention</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#1a1a1a;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:16px;font-weight:900;letter-spacing:-0.5px;">J</span>
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:13px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#1a1a1a;">JIT</span>
                    <span style="font-size:13px;font-weight:400;color:#6b7280;margin-left:6px;">by JAI Behavioural</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                You are receiving this email because you enrolled in the JIT Pilot Study.<br />
                JAI Behavioural &mdash; <a href="https://jaibehavioural.com" style="color:#9ca3af;">jaibehavioural.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Step 3: Send via Resend
// ---------------------------------------------------------------------------

async function sendEmail(html: string): Promise<void> {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: 'Ryan Lee (JAI Behavioural) <ryan@jaibehavioural.com>',
    to: TO_EMAIL,
    replyTo: 'ryan@jaibehavioural.com',
    subject: '[TEST] Day 3 Milestone Check-In — Your Recovery Snapshot | JIT',
    html,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Milestone Email Test ===');
  console.log(`To:     ${TO_EMAIL}`);
  console.log(`Day:    ${DAY_OF_STUDY}`);
  console.log(`Scores: Emotional=${SCORES.emotional} Cognitive=${SCORES.cognitive} Motivation=${SCORES.motivation} Relational=${SCORES.relational}`);

  const { comment, recommendedExercise } = await generateMilestoneComment();
  console.log('\n✓ NEUY comment generated:');
  console.log(`  "${comment}"`);
  console.log(`  Exercise: ${recommendedExercise}`);

  const html = buildMilestoneHtml({
    participantId: 'TEST-P001',
    dayOfStudy: DAY_OF_STUDY,
    ...SCORES,
    neuyComment: comment,
    recommendedExercise,
  });

  console.log('\n→ Sending email via Resend…');
  await sendEmail(html);
  console.log(`\n✓ Email sent to ${TO_EMAIL}`);
}

main().catch((err) => {
  console.error('\n✗ Error:', err.message);
  process.exit(1);
});
