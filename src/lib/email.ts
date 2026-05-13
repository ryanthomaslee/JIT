import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Allow override via FROM_EMAIL env var (useful for local testing against different verified domains).
const FROM_ADDRESS =
  process.env.FROM_EMAIL ?? 'Ryan from JAI Behavioural <ryan@jaibehavioural.com>';

export type PilotEmailType = 'welcome' | 'day7_reminder' | 'day14_unlocked' | 'password_reset' | 'milestone' | 'protocol_unlocked';

export interface MilestoneEmailData {
  participantId: string;
  dayOfStudy: 3 | 10;
  emotional: number;
  cognitive: number;
  motivation: number;
  relational: number;
  neuyComment: string;
  recommendedExercise: string;
  // Day 10 only — shift context
  week1ReflectionScore?: number;
  exerciseCompletions?: number;
}

// ---------------------------------------------------------------------------
// Shared layout wrapper
// ---------------------------------------------------------------------------

function layout(body: string): string {
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

          <!-- Logo / wordmark -->
          <tr>
            <td style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://jit.jaibehavioural.com/logo.png" alt="JIT" height="35" style="display:block;border:0;height:35px;width:auto;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="font-size:13px;font-weight:400;color:#6b7280;">by JAI Behavioural</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.6;">
                You are receiving this email because you enrolled in the JIT Program by JAI Behavioural.<br />
                Questions? <a href="mailto:ryan@jaibehavioural.com" style="color:#9ca3af;">ryan@jaibehavioural.com</a> &mdash; <a href="https://jaibehavioural.com" style="color:#9ca3af;">jaibehavioural.com</a>
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
// Templates
// ---------------------------------------------------------------------------

function welcomeTemplate(): string {
  return layout(`
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">Welcome to JIT.</h1>
    <p style="margin:0 0 24px;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;">Just-In-Time Burnout Prevention</p>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      Thank you for joining the JIT Program. You are about to start a neuroscience-backed burnout prevention journey built for working professionals.
    </p>

    <div style="background:#f9fafb;border-left:3px solid #1a1a1a;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">What happens next</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">
        <strong style="color:#374151;">Today &mdash; Day 0:</strong> Complete your baseline assessment to establish your burnout profile across four domains.
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">
        <strong style="color:#374151;">Days 1&ndash;14:</strong> Engage with your personalised intervention. Your NEUY coach is available throughout.
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        <strong style="color:#374151;">Day 14:</strong> Complete your follow-up assessment to measure change.
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;">
      Your responses are confidential and used solely within this program. If you have any questions at any point, reply directly to this email.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="https://jit.jaibehavioural.com/assessment" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Begin Baseline Assessment &rarr;</a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.8;">
      Best regards,<br />
      <strong style="color:#374151;">Ryan Lee</strong><br />
      <span style="color:#9ca3af;">Founder, JAI Behavioural</span>
    </p>
  `);
}

function day7ReminderTemplate(): string {
  return layout(`
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">Week 1 Complete</p>
    <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">Time for your first reflection.</h1>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      You have completed your first week of the JIT program. Taking a few minutes now to reflect on your experience is a key part of the process and helps consolidate the neurological changes you have been working towards.
    </p>

    <div style="background:#f9fafb;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a1a1a;">Your Week 1 reflection covers:</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">&#10003;&nbsp; How your overall load felt this week</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">&#10003;&nbsp; Your biggest source of depletion</p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">&#10003;&nbsp; Which exercise you found most useful</p>
    </div>

    <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;">
      Consistent engagement with reflections significantly improves the quality of your Day 14 progress narrative. It takes less than two minutes.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="https://jit.jaibehavioural.com/dashboard" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Complete Week 1 Reflection &rarr;</a>
        </td>
      </tr>
    </table>
  `);
}

function day14UnlockedTemplate(): string {
  return layout(`
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">Day 14</p>
    <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">Your follow-up is ready.</h1>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      Fourteen days ago you established your burnout baseline. Today, your follow-up assessment has unlocked. Completing it now generates your personalised progress narrative, comparing where you started to where you are.
    </p>

    <div style="background:#f9fafb;border-left:3px solid #1a1a1a;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.7;">
        For the most accurate progress picture, please complete your Day 14 assessment as close to today as possible. The window is open now &mdash; do not delay beyond 48 hours.
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;">
      After completing your follow-up, you will be taken through a brief exit survey. Your full progress report, including your NEUY narrative, will be available on your dashboard immediately afterwards.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="https://jit.jaibehavioural.com/assessment" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Complete Day 14 Assessment &rarr;</a>
        </td>
      </tr>
    </table>
  `);
}

function milestoneTemplate(data: MilestoneEmailData): string {
  const domains = [
    { name: 'Emotional', score: data.emotional },
    { name: 'Cognitive', score: data.cognitive },
    { name: 'Motivation', score: data.motivation },
    { name: 'Relational', score: data.relational },
  ].sort((a, b) => a.score - b.score); // ascending: best → worst

  const top = domains[0];
  const bottom = domains[domains.length - 1];

  const dayLabel = data.dayOfStudy === 3 ? 'Day 3' : 'Day 10';
  const journeyLabel = data.dayOfStudy === 3 ? 'three days in' : 'ten days in';

  const shiftBlock = data.dayOfStudy === 10 && data.week1ReflectionScore !== undefined
    ? `
    <!-- Shift indicators (Day 10 only) -->
    <div style="background:#f9fafb;border-radius:12px;padding:16px 20px;margin:0 0 28px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;">Shift Indicators — Week 1</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#6b7280;">Self-reported load score</td>
          <td align="right" style="font-size:15px;font-weight:900;color:#1a1a1a;font-family:monospace;">${data.week1ReflectionScore}<span style="font-size:11px;font-weight:400;color:#9ca3af;">/10</span></td>
        </tr>
        <tr><td colspan="2" style="height:8px;"></td></tr>
        <tr>
          <td style="font-size:13px;color:#6b7280;">Exercises completed</td>
          <td align="right" style="font-size:15px;font-weight:900;color:#1a1a1a;font-family:monospace;">${data.exerciseCompletions ?? 0}</td>
        </tr>
      </table>
    </div>`
    : '';

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
        <td style="background:${bg};border-radius:8px;padding:10px 14px;margin-bottom:6px;">
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

  return layout(`
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">${dayLabel} &middot; Milestone Check-In</p>
    <h1 style="margin:0 0 6px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">You are ${journeyLabel}.</h1>
    <p style="margin:0 0 28px;font-size:13px;color:#9ca3af;font-family:monospace;">${data.participantId}</p>

    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.7;">
      Here is a snapshot of your four recovery domains from your Day 0 baseline, so you can see where your energy is going right now.
    </p>

    <!-- Domain scores -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      ${domainRows}
    </table>

    ${shiftBlock}

    <!-- NEUY comment -->
    <div style="background:#f9fafb;border-left:3px solid #1a1a1a;border-radius:0 10px 10px 0;padding:18px 20px;margin:0 0 20px;">
      <p style="margin:0 0 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.15em;color:#9ca3af;">NEUY</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.75;">${data.neuyComment}</p>
    </div>

    <!-- Recommended exercise -->
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
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.8;">
      Best regards,<br />
      <strong style="color:#374151;">Ryan Lee</strong><br />
      <span style="color:#9ca3af;">Founder, JAI Behavioural</span>
    </p>
  `);
}

function protocolUnlockedTemplate(participantId?: string): string {
  const idLine = participantId
    ? `<p style="margin:0 0 28px;font-size:13px;color:#9ca3af;font-family:monospace;">${participantId}</p>`
    : '';
  return layout(`
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">Protocol Unlocked</p>
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">Your 14-day protocol is ready.</h1>
    ${idLine}

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      Thank you for your patience. Your baseline assessment has been processed and your personalised 14-day recovery protocol is now unlocked.
    </p>

    <div style="background:#f9fafb;border-left:3px solid #1a1a1a;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#1a1a1a;">What's waiting for you</p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">
        &#10003;&nbsp; A personalised burnout domain profile based on your assessment
      </p>
      <p style="margin:0 0 6px;font-size:13px;color:#6b7280;line-height:1.6;">
        &#10003;&nbsp; A curated set of daily recovery exercises matched to your profile
      </p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
        &#10003;&nbsp; Your NEUY coach, available throughout the 14 days
      </p>
    </div>

    <p style="margin:0 0 28px;font-size:14px;color:#374151;line-height:1.7;">
      Log in to your dashboard now to begin Day 1. Your 14-day window starts from the moment you complete your first exercise.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="https://jit.jaibehavioural.com/dashboard" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Start Day 1 &rarr;</a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#6b7280;line-height:1.8;">
      Best regards,<br />
      <strong style="color:#374151;">Ryan Lee</strong><br />
      <span style="color:#9ca3af;">Founder, JAI Behavioural</span>
    </p>
  `);
}

function passwordResetTemplate(resetLink: string): string {
  return layout(`
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;">Account Access</p>
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:900;color:#1a1a1a;letter-spacing:-0.5px;">Password reset.</h1>

    <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.7;">
      No stress — it happens to the best of us. Click the button below to set a new password and get straight back into your recovery journey.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>
        <td style="background:#1a1a1a;border-radius:10px;padding:14px 28px;">
          <a href="${resetLink}" style="color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">Reset My Password &rarr;</a>
        </td>
      </tr>
    </table>

    <div style="background:#f9fafb;border-radius:10px;padding:14px 18px;margin:0 0 8px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        This link expires in <strong style="color:#6b7280;">1 hour</strong> and can only be used once.
        If you did not request a password reset, you can safely ignore this email — your account remains secure.
      </p>
    </div>
  `);
}

// password_reset, milestone, and protocol_unlocked are excluded from the static map — they require dynamic data args.
const templates: Record<Exclude<PilotEmailType, 'password_reset' | 'milestone' | 'protocol_unlocked'>, () => string> = {
  welcome: welcomeTemplate,
  day7_reminder: day7ReminderTemplate,
  day14_unlocked: day14UnlockedTemplate,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SendPilotEmailParams {
  to: string;
  subject: string;
  type: PilotEmailType;
  /** Required when type === 'password_reset'. The Firebase-generated action URL. */
  resetLink?: string;
  /** Required when type === 'milestone'. */
  milestoneData?: MilestoneEmailData;
  /** Optional for type === 'protocol_unlocked'. */
  participantId?: string;
}

/**
 * Sends a transactional pilot study email via Resend.
 * Throws on send failure so callers can handle or log as appropriate.
 */
export async function sendPilotEmail({ to, subject, type, resetLink, milestoneData, participantId }: SendPilotEmailParams): Promise<void> {
  let html: string;
  if (type === 'password_reset') {
    if (!resetLink) throw new Error('resetLink is required for password_reset emails.');
    html = passwordResetTemplate(resetLink);
  } else if (type === 'milestone') {
    if (!milestoneData) throw new Error('milestoneData is required for milestone emails.');
    html = milestoneTemplate(milestoneData);
  } else if (type === 'protocol_unlocked') {
    html = protocolUnlockedTemplate(participantId);
  } else {
    html = templates[type]();
  }

  console.log('ACTUAL SENDER STRING:', FROM_ADDRESS);

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    replyTo: 'ryan@jaibehavioural.com',
    subject,
    html,
    headers: {
      // Unique per-message ID prevents Outlook/Hotmail deduplication false-positives
      'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      // List-Unsubscribe improves sender reputation with Outlook and reduces spam filtering
      'List-Unsubscribe': '<mailto:ryan@jaibehavioural.com?subject=unsubscribe>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (error) {
    throw new Error(`Resend error [${type}]: ${error.message}`);
  }
}
