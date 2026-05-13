import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendPilotEmail } from '@/lib/email';
import { generateMilestoneComment } from '@/ai/flows/generate-burnout-insights';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssessmentScores {
  emotional: number;
  cognitive: number;
  motivation: number;
  relational: number;
}

interface UserRecord {
  email?: string;
  participantId?: string;
  createdAt?: Timestamp;
  isDay0Complete?: boolean;
  isExitComplete?: boolean;
  remindersSent?: {
    day3?: boolean;
    day7?: boolean;
    day10?: boolean;
    day14?: boolean;
  };
}

interface EmailResult {
  uid: string;
  email: string;
  day: number;
  reminder: 'day3' | 'day7' | 'day10' | 'day14';
  status: 'sent' | 'failed';
  error?: string;
}

interface SkippedRecord {
  uid: string;
  reason: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSinceEnrolment(createdAt: Timestamp): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((Date.now() - createdAt.toMillis()) / msPerDay);
}

/**
 * Maps each day of the 14-day recovery sequence to a neuroscience target domain.
 * Used as metadata on recovery_email_sent telemetry events.
 */
const DAILY_DOMAIN_SEQUENCE: Record<number, string> = {
  1:  'Attention',
  2:  'Working Memory',
  3:  'Emotional Regulation',
  4:  'Executive Function',
  5:  'Motivation',
  6:  'Social Cognition',
  7:  'Cognitive Load',
  8:  'Attention',
  9:  'Working Memory',
  10: 'Stress Response',
  11: 'Executive Function',
  12: 'Emotional Regulation',
  13: 'Motivation',
  14: 'Cognitive Integration',
};

function targetDomainForDay(day: number): string {
  // Clamp to sequence; beyond day 14 cycles back through the map
  const key = day <= 14 ? day : ((day - 1) % 14) + 1;
  return DAILY_DOMAIN_SEQUENCE[key] ?? 'General Recovery';
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Security check ---
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on the server.' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  // --- Fetch all users ---
  const usersSnapshot = await adminDb.collection('users').get();

  const emailed: EmailResult[] = [];
  const skipped: SkippedRecord[] = [];

  const jobs = usersSnapshot.docs.map(async (docSnap) => {
    const uid = docSnap.id;
    const user = docSnap.data() as UserRecord;

    // Must have a reachable email address
    if (!user.email) {
      skipped.push({ uid, reason: 'no email stored' });
      return;
    }

    // Must have completed onboarding (Day 0 baseline)
    if (!user.isDay0Complete) {
      skipped.push({ uid, reason: 'Day 0 not complete' });
      return;
    }

    // Programme complete — no more nudges
    if (user.isExitComplete) {
      skipped.push({ uid, reason: 'programme complete' });
      return;
    }

    // Must have an enrolment timestamp to calculate days
    if (!user.createdAt) {
      skipped.push({ uid, reason: 'no createdAt timestamp' });
      return;
    }

    const day = daysSinceEnrolment(user.createdAt);
    const sent = user.remindersSent ?? {};

    // --- Day 3 milestone ---
    if (day >= 3 && !sent.day3) {
      const result: EmailResult = { uid, email: user.email, day, reminder: 'day3', status: 'sent' };
      try {
        // Fetch Day 0 assessment scores
        const assessmentSnap = await adminDb
          .collection('users').doc(uid).collection('assessments').doc('day0').get();
        const scores = assessmentSnap.exists
          ? (assessmentSnap.data() as AssessmentScores)
          : { emotional: 5, cognitive: 5, motivation: 5, relational: 5 };

        const { comment, recommendedExercise } = await generateMilestoneComment({
          dayOfStudy: 3,
          scores,
        });

        await sendPilotEmail({
          to: user.email,
          subject: 'Day 3 Check-In — Your Recovery Snapshot | JIT',
          type: 'milestone',
          milestoneData: {
            participantId: user.participantId ?? uid,
            dayOfStudy: 3,
            emotional: scores.emotional,
            cognitive: scores.cognitive,
            motivation: scores.motivation,
            relational: scores.relational,
            neuyComment: comment,
            recommendedExercise,
          },
        });

        await Promise.all([
          adminDb.collection('users').doc(uid).update({
            'remindersSent.day3': true,
            updatedAt: FieldValue.serverTimestamp(),
          }),
          adminDb.collection('users').doc(uid).collection('activity_logs').add({
            eventType: 'milestone_email_sent',
            eventData: {
              dayOfStudy: day,
              milestone: 3,
              lowestDomain: recommendedExercise,
              emailType: 'milestone_day3',
            },
            timestamp: FieldValue.serverTimestamp(),
          }),
        ]);
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : String(err);
      }
      emailed.push(result);
    }

    // --- Day 7 reminder ---
    if (day >= 7 && !sent.day7) {
      const result: EmailResult = {
        uid,
        email: user.email,
        day,
        reminder: 'day7',
        status: 'sent',
      };
      try {
        await sendPilotEmail({
          to: user.email,
          subject: 'Week 1 Complete — Time for Your Reflection | JIT',
          type: 'day7_reminder',
        });
        const domain = targetDomainForDay(day);
        await Promise.all([
          adminDb
            .collection('users')
            .doc(uid)
            .update({ 'remindersSent.day7': true, updatedAt: FieldValue.serverTimestamp() }),
          adminDb
            .collection('users')
            .doc(uid)
            .collection('activity_logs')
            .add({
              eventType: 'recovery_email_sent',
              eventData: { targetDomain: domain, emailType: 'day7_reminder', dayOfStudy: day },
              timestamp: FieldValue.serverTimestamp(),
            }),
        ]);
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : String(err);
      }
      emailed.push(result);
    }

    // --- Day 10 milestone ---
    if (day >= 10 && !sent.day10) {
      const result: EmailResult = { uid, email: user.email, day, reminder: 'day10', status: 'sent' };
      try {
        const [assessmentSnap, reflectionSnap, completionsSnap] = await Promise.all([
          adminDb.collection('users').doc(uid).collection('assessments').doc('day0').get(),
          adminDb.collection('users').doc(uid).collection('reflections').doc('week1').get(),
          adminDb.collection('users').doc(uid).collection('exerciseCompletions').get(),
        ]);

        const scores = assessmentSnap.exists
          ? (assessmentSnap.data() as AssessmentScores)
          : { emotional: 5, cognitive: 5, motivation: 5, relational: 5 };

        const week1ReflectionScore: number | undefined = reflectionSnap.exists
          ? (reflectionSnap.data()?.weeklyScore as number | undefined)
          : undefined;

        const exerciseCompletions = completionsSnap.size;

        const { comment, recommendedExercise } = await generateMilestoneComment({
          dayOfStudy: 10,
          scores,
          week1ReflectionScore,
          exerciseCompletions,
        });

        await sendPilotEmail({
          to: user.email,
          subject: 'Day 10 Check-In — Four Days to Go | JIT',
          type: 'milestone',
          milestoneData: {
            participantId: user.participantId ?? uid,
            dayOfStudy: 10,
            emotional: scores.emotional,
            cognitive: scores.cognitive,
            motivation: scores.motivation,
            relational: scores.relational,
            neuyComment: comment,
            recommendedExercise,
            week1ReflectionScore,
            exerciseCompletions,
          },
        });

        await Promise.all([
          adminDb.collection('users').doc(uid).update({
            'remindersSent.day10': true,
            updatedAt: FieldValue.serverTimestamp(),
          }),
          adminDb.collection('users').doc(uid).collection('activity_logs').add({
            eventType: 'milestone_email_sent',
            eventData: {
              dayOfStudy: day,
              milestone: 10,
              lowestDomain: recommendedExercise,
              emailType: 'milestone_day10',
            },
            timestamp: FieldValue.serverTimestamp(),
          }),
        ]);
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : String(err);
      }
      emailed.push(result);
    }

    // --- Day 14 reminder ---
    if (day >= 14 && !sent.day14) {
      const result: EmailResult = {
        uid,
        email: user.email,
        day,
        reminder: 'day14',
        status: 'sent',
      };
      try {
        await sendPilotEmail({
          to: user.email,
          subject: 'Your Day 14 Follow-Up Assessment is Now Open | JIT',
          type: 'day14_unlocked',
        });
        const domain = targetDomainForDay(day);
        await Promise.all([
          adminDb
            .collection('users')
            .doc(uid)
            .update({ 'remindersSent.day14': true, updatedAt: FieldValue.serverTimestamp() }),
          adminDb
            .collection('users')
            .doc(uid)
            .collection('activity_logs')
            .add({
              eventType: 'recovery_email_sent',
              eventData: { targetDomain: domain, emailType: 'day14_unlocked', dayOfStudy: day },
              timestamp: FieldValue.serverTimestamp(),
            }),
        ]);
      } catch (err) {
        result.status = 'failed';
        result.error = err instanceof Error ? err.message : String(err);
      }
      emailed.push(result);
    }
  });

  await Promise.all(jobs);

  // --- Summary response ---
  const summary = {
    runAt: new Date().toISOString(),
    totalUsers: usersSnapshot.size,
    emailsAttempted: emailed.length,
    emailsSent: emailed.filter((r) => r.status === 'sent').length,
    emailsFailed: emailed.filter((r) => r.status === 'failed').length,
    skipped: skipped.length,
    results: emailed,
    skippedDetail: skipped,
  };

  return NextResponse.json(summary, { status: 200 });
}
