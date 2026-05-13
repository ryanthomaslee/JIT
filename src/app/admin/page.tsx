'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, getDoc, getDocs, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, RefreshCw, Users, Download, Activity, Zap } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const ADMIN_EMAIL = 'ryanthomaslee93@gmail.com';

interface UserRecord {
  id: string;
  participantId?: string;
  email?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  day14UnlockDate?: Timestamp;
  isEntranceComplete?: boolean;
  isDay0Complete?: boolean;
  isDay14AssessmentComplete?: boolean;
  isExitComplete?: boolean;
  isTierOrientationComplete?: boolean;
  isReadinessComplete?: boolean;
  lastActiveAt?: Timestamp;
  status?: 'active' | 'waitlist';
  consentGiven?: boolean;
  remindersSent?: {
    day3?: boolean;
    day7?: boolean;
    day10?: boolean;
    day14?: boolean;
  };
  entranceData?: {
    occupation?: string;
    organisation?: string;
  };
}

// ---------------------------------------------------------------------------
// Heartbeat — aggregate metrics (no PII)
// ---------------------------------------------------------------------------

interface HeartbeatMetrics {
  totalEnrolled: number;
  activeInProgram: number;
  completedProgram: number;
  pendingBaseline: number;
  inOnboarding: number;
  dayDistribution: { day: number; label: string; count: number }[];
  nudgesSent: { day3: number; day7: number; day10: number; day14: number; total: number };
  activeLastDay: number;
}

function computeHeartbeat(users: UserRecord[]): HeartbeatMetrics {
  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;

  const active = users.filter(u => u.isDay0Complete && !u.isExitComplete);

  // Day distribution bucketed 1–14, then 15+
  const dayCounts: Record<number, number> = {};
  active.forEach(u => {
    const d = Math.min(getDayOfStudy(u.createdAt), 15);
    dayCounts[d] = (dayCounts[d] ?? 0) + 1;
  });
  const dayDistribution = Array.from({ length: 15 }, (_, i) => {
    const day = i + 1;
    return { day, label: day === 15 ? '15+' : `D${day}`, count: dayCounts[day] ?? 0 };
  });

  // Cumulative nudge counts from remindersSent flags
  const nudgesSent = users.reduce(
    (acc, u) => {
      if (u.remindersSent?.day3)  acc.day3++;
      if (u.remindersSent?.day7)  acc.day7++;
      if (u.remindersSent?.day10) acc.day10++;
      if (u.remindersSent?.day14) acc.day14++;
      return acc;
    },
    { day3: 0, day7: 0, day10: 0, day14: 0, total: 0 }
  );
  nudgesSent.total = nudgesSent.day3 + nudgesSent.day7 + nudgesSent.day10 + nudgesSent.day14;

  // Active in last 24 h (lastActiveAt within window)
  const activeLastDay = users.filter(u => {
    const ts = u.lastActiveAt;
    return ts && typeof ts.toMillis === 'function' && now - ts.toMillis() < ms24h;
  }).length;

  return {
    totalEnrolled: users.length,
    activeInProgram: active.length,
    completedProgram: users.filter(u => u.isExitComplete).length,
    pendingBaseline: users.filter(u => u.isEntranceComplete && !u.isDay0Complete).length,
    inOnboarding: users.filter(u => u.consentGiven && !u.isEntranceComplete).length,
    dayDistribution,
    nudgesSent,
    activeLastDay,
  };
}

function HeartbeatPanel({ metrics }: { metrics: HeartbeatMetrics }) {
  const maxCount = Math.max(...metrics.dayDistribution.map(d => d.count), 1);

  return (
    <div className="mb-6 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-mono font-semibold tracking-[0.18em] uppercase text-slate-500">
          Cohort Heartbeat
        </span>
        <span className="text-[10px] font-mono text-slate-400 ml-auto">
          {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} snapshot · no PII
        </span>
      </div>

      {/* Stage counts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total Enrolled',    value: metrics.totalEnrolled,     sub: 'all accounts' },
          { label: 'Active in Program', value: metrics.activeInProgram,   sub: 'Day 0 → Day 14' },
          { label: 'Programme Complete',value: metrics.completedProgram,  sub: 'exit survey done' },
          { label: 'Pending Baseline',  value: metrics.pendingBaseline,   sub: 'entrance done, no D0' },
          { label: 'Active Last 24 h',  value: metrics.activeLastDay,     sub: 'by lastActiveAt' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white border border-slate-200 rounded p-3">
            <p className="text-2xl font-black font-mono text-slate-900">{value}</p>
            <p className="text-[11px] font-semibold text-slate-700 mt-0.5">{label}</p>
            <p className="text-[10px] text-slate-400 font-mono">{sub}</p>
          </div>
        ))}
      </div>

      {/* Day distribution histogram */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <p className="text-[10px] font-mono font-semibold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Active Users — Day Distribution
        </p>
        <div className="flex items-end gap-1 h-16">
          {metrics.dayDistribution.map(({ label, count }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-mono text-slate-500">{count > 0 ? count : ''}</span>
              <div
                className="w-full rounded-sm bg-slate-800 transition-all"
                style={{ height: `${Math.max(count > 0 ? 8 : 2, (count / maxCount) * 48)}px`,
                         opacity: count > 0 ? 1 : 0.12 }}
              />
              <span className="text-[8px] font-mono text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email nudges */}
      <div className="bg-white border border-slate-200 rounded p-4">
        <p className="text-[10px] font-mono font-semibold tracking-[0.15em] uppercase text-slate-500 mb-3">
          Email Nudges Dispatched (cumulative)
        </p>
        <div className="grid grid-cols-5 gap-2">
          {[
            { label: 'Day 3',  value: metrics.nudgesSent.day3 },
            { label: 'Day 7',  value: metrics.nudgesSent.day7 },
            { label: 'Day 10', value: metrics.nudgesSent.day10 },
            { label: 'Day 14', value: metrics.nudgesSent.day14 },
            { label: 'Total',  value: metrics.nudgesSent.total },
          ].map(({ label, value }) => (
            <div key={label} className={`text-center rounded p-2 ${label === 'Total' ? 'bg-slate-900' : 'bg-slate-50 border border-slate-200'}`}>
              <p className={`text-xl font-black font-mono ${label === 'Total' ? 'text-white' : 'text-slate-800'}`}>{value}</p>
              <p className={`text-[10px] font-mono mt-0.5 ${label === 'Total' ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline';

function getProgressStatus(u: UserRecord): { label: string; variant: StatusVariant } {
  if (u.isExitComplete) return { label: 'Programme Complete', variant: 'default' };
  if (u.isDay14AssessmentComplete) return { label: 'Awaiting Exit Survey', variant: 'secondary' };
  if (u.isDay0Complete) {
    const unlock = u.day14UnlockDate?.toDate?.();
    if (unlock) {
      const now = new Date();
      if (now >= unlock) return { label: 'Day 14 Assessment Ready', variant: 'destructive' };
      const daysLeft = Math.ceil((unlock.getTime() - now.getTime()) / 86400000);
      return { label: `Day 14 in ${daysLeft}d`, variant: 'secondary' };
    }
    return { label: 'Active — Wk 1/2', variant: 'secondary' };
  }
  if (u.isEntranceComplete) return { label: 'Baseline Pending', variant: 'destructive' };
  if (u.isTierOrientationComplete || u.isReadinessComplete) return { label: 'Onboarding', variant: 'outline' };
  return { label: 'Registered', variant: 'outline' };
}

function getDayOfStudy(createdAt?: Timestamp): number {
  if (!createdAt || typeof createdAt.toDate !== 'function') return 1;
  try {
    const created = createdAt.toDate();
    const diff = new Date().getTime() - created.getTime();
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  } catch {
    return 1;
  }
}

function formatLastActive(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return 'No activity';
  try {
    return formatDistanceToNow(ts.toDate(), { addSuffix: true });
  } catch {
    return 'No activity';
  }
}

function formatDate(ts?: Timestamp | null): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  try {
    return ts.toDate().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

/** Wraps a cell value in quotes if it contains commas, quotes, or newlines. */
function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Triggers a browser download of a CSV file. Includes UTF-8 BOM for Excel/SPSS. */
function downloadCsv(filename: string, rows: unknown[][]): void {
  const BOM = '\uFEFF';
  const csv = BOM + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotingIds, setPromotingIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(collection(firestore, 'users'));
      const records: UserRecord[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserRecord, 'id'>),
      }));
      records.sort((a, b) => {
        const tA = a.createdAt?.toMillis() ?? 0;
        const tB = b.createdAt?.toMillis() ?? 0;
        return tA - tB;
      });
      console.log('Participants found:', records.length);
      setUsers(records);
    } catch (err) {
      setError('Failed to load participants. Verify Firestore security rules allow coordinator reads.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Assign a participantId to a user who was created before the counter existed
  // or whose profile document was created without one. Idempotent — if the user
  // already has an ID this is a no-op (the transaction exits early).
  const handleBackfillId = async (uid: string) => {
    const userRef = doc(firestore, 'users', uid);
    const counterRef = doc(firestore, 'meta', 'participantCounter');
    await runTransaction(firestore, async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists() || userSnap.data().participantId) return; // already has one
      const counterSnap = await transaction.get(counterRef);
      const next = counterSnap.exists() ? (counterSnap.data().count as number) + 1 : 1;
      const participantId = `P2-${String(next).padStart(3, '0')}`;
      transaction.set(counterRef, { count: next }, { merge: true });
      transaction.update(userRef, { participantId, updatedAt: serverTimestamp() });
    });
    // Reflect the new ID immediately in local state
    const updated = await getDoc(doc(firestore, 'users', uid));
    if (updated.exists()) {
      const newId = updated.data().participantId as string | undefined;
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, participantId: newId } : u));
    }
  };

  const handlePromote = async (uid: string) => {
    setPromotingIds(prev => new Set(prev).add(uid));
    try {
      const { updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(firestore, 'users', uid), {
        status: 'active',
        promotedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // isWaitlistControl is intentionally left intact for data analysis
      });
      setUsers(prev => prev.map(u => u.id === uid ? { ...u, status: 'active' } : u));

      // Send protocol unlocked notification email
      const userRecord = users.find(u => u.id === uid);
      if (userRecord?.email) {
        const res = await fetch('/api/admin/send-promotion-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: userRecord.email, participantId: userRecord.participantId }),
        });
        if (res.ok) {
          showToast(`Protocol unlocked email sent to ${userRecord.email}`, 'success');
        } else {
          showToast(`User promoted but email failed — manual notification required for ${userRecord.email}`, 'error');
        }
      } else {
        showToast('User promoted. No email on record — notify manually.', 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Promote error — full details:', { uid, message, err });
      showToast(`Promotion failed: ${message}`, 'error');
    } finally {
      setPromotingIds(prev => { const next = new Set(prev); next.delete(uid); return next; });
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Fresh full fetch so export is always up-to-date
      const usersSnap = await getDocs(collection(firestore, 'users'));

      const rows = await Promise.all(
        usersSnap.docs.map(async (userDoc) => {
          const uid = userDoc.id;
          const u = userDoc.data();
          const ed = (u.entranceData as Record<string, unknown>) ?? {};

          // Fetch subcollections in parallel
          const [assessmentsSnap, w1Snap, w2Snap, logsSnap] = await Promise.all([
            getDocs(collection(firestore, 'users', uid, 'assessments')),
            getDoc(doc(firestore, 'users', uid, 'reflections', 'week1')),
            getDoc(doc(firestore, 'users', uid, 'reflections', 'week2')),
            getDocs(collection(firestore, 'users', uid, 'activity_logs')),
          ]);

          const day0 = assessmentsSnap.docs.find((d) => d.id === 'day0')?.data() ?? {};
          const day14 = assessmentsSnap.docs.find((d) => d.id === 'day14')?.data() ?? {};
          const w1 = w1Snap.exists() ? w1Snap.data() : {};
          const w2 = w2Snap.exists() ? w2Snap.data() : {};

          // Activity log event counts + per-type domain metadata
          const logCounts: Record<string, number> = {};
          const recoveryEmailDomains: string[] = [];
          const chatSessionDomains: string[] = [];
          logsSnap.docs.forEach((d) => {
            const data = d.data();
            const t = String(data.eventType ?? 'unknown');
            logCounts[t] = (logCounts[t] ?? 0) + 1;
            if (t === 'recovery_email_sent' && data.eventData?.targetDomain) {
              recoveryEmailDomains.push(String(data.eventData.targetDomain));
            }
            if (t === 'chat_session_started' && data.eventData?.targetDomain) {
              chatSessionDomains.push(String(data.eventData.targetDomain));
            }
          });

          const createdAt = (u.createdAt as Timestamp | undefined)?.toDate();
          const consentedAt = (u.consentedAt as Timestamp | undefined)?.toDate();
          const dayOfStudy = createdAt
            ? Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / 86400000) + 1)
            : '';

          // Score deltas (negative = improvement for burnout scores)
          const delta = (d0: unknown, d14: unknown) =>
            d0 !== undefined && d14 !== undefined ? Number(d14) - Number(d0) : '';

          return [
            u.participantId ?? '',
            u.email ?? '',
            ed.organisation ?? '',
            ed.occupation ?? '',
            ed.sector ?? '',
            createdAt ? createdAt.toLocaleDateString('en-GB') : '',
            dayOfStudy,
            getProgressStatus(u as UserRecord).label,
            u.consentGiven ? 'TRUE' : 'FALSE',
            consentedAt ? consentedAt.toLocaleDateString('en-GB') : '',
            // Journey flags
            u.isEntranceComplete ? 'TRUE' : 'FALSE',
            u.isDay0Complete ? 'TRUE' : 'FALSE',
            u.isDay14AssessmentComplete ? 'TRUE' : 'FALSE',
            u.isExitComplete ? 'TRUE' : 'FALSE',
            // Entrance survey — quantitative
            ed.durationInRole ?? '',
            ed.workingHours ?? '',
            ed.breaksPerDay ?? '',
            ed.planningTimeLossPerWeek ?? '',
            ed.taskParalysisPerWeek ?? '',
            ed.sustainabilityBefore ?? '',
            Array.isArray(ed.workloadFrictionPoints)
              ? (ed.workloadFrictionPoints as string[]).join(' | ')
              : '',
            // Day 0 domain scores
            day0.emotional ?? '',
            day0.cognitive ?? '',
            day0.motivation ?? '',
            day0.relational ?? '',
            // Day 14 domain scores
            day14.emotional ?? '',
            day14.cognitive ?? '',
            day14.motivation ?? '',
            day14.relational ?? '',
            // Deltas (Day14 − Day0; negative = improvement)
            delta(day0.emotional, day14.emotional),
            delta(day0.cognitive, day14.cognitive),
            delta(day0.motivation, day14.motivation),
            delta(day0.relational, day14.relational),
            // Week 1 reflection
            w1.weeklyScore ?? '',
            w1.biggestDrain ?? '',
            w1.mostUsefulExercise ?? '',
            // Week 2 reflection
            w2.weeklyScore ?? '',
            w2.biggestDrain ?? '',
            w2.mostUsefulExercise ?? '',
            // Activity log counts + domain breakdowns
            logsSnap.size,
            logCounts['recovery_email_sent'] ?? 0,
            recoveryEmailDomains.join(' | '),
            logCounts['chat_session_started'] ?? 0,
            chatSessionDomains.join(' | '),
            logCounts['exercise_started'] ?? 0,
            logCounts['exercise_completed'] ?? 0,
            logCounts['reflection_submitted'] ?? 0,
          ];
        })
      );

      // Sort by participant ID
      rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));

      const headers = [
        'participant_id', 'email', 'organisation', 'occupation', 'sector',
        'enrolment_date', 'day_of_study', 'progress_status',
        'consent_given', 'consented_at',
        'is_entrance_complete', 'is_day0_complete', 'is_day14_complete', 'is_exit_complete',
        'duration_in_role', 'working_hours', 'breaks_per_day',
        'planning_time_loss_per_week', 'task_paralysis_per_week',
        'sustainability_before', 'workload_friction_points',
        'day0_emotional', 'day0_cognitive', 'day0_motivation', 'day0_relational',
        'day14_emotional', 'day14_cognitive', 'day14_motivation', 'day14_relational',
        'delta_emotional', 'delta_cognitive', 'delta_motivation', 'delta_relational',
        'week1_score', 'week1_biggest_drain', 'week1_most_useful_exercise',
        'week2_score', 'week2_biggest_drain', 'week2_most_useful_exercise',
        'total_activity_events',
        'recovery_emails_sent', 'recovery_email_domains',
        'neuy_chat_sessions', 'neuy_chat_domains',
        'exercises_started', 'exercises_completed', 'reflections_submitted',
      ];

      const date = new Date().toISOString().slice(0, 10);
      downloadCsv(`JIT_pilot_data_${date}.csv`, [headers, ...rows]);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace('/');
      return;
    }
    fetchUsers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading]);

  if (isUserLoading || (isLoading && users.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-xs tracking-widest uppercase text-slate-400">Loading Participant Data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-mono mb-1">
              JAI Behavioural
            </p>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              Coordinator Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 rounded px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-mono text-slate-600">{users.length} participants</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={isLoading || isExporting}
              className="text-xs tracking-wide"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={isExporting || isLoading}
              className="text-xs tracking-wide bg-slate-900 hover:bg-slate-700 text-white"
            >
              {isExporting
                ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                : <Download className="w-3.5 h-3.5 mr-1.5" />}
              {isExporting ? 'Exporting…' : 'Export Data'}
            </Button>
          </div>
        </div>
      </header>

      {/* Study Period Banner */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <div className="bg-white border border-slate-200 rounded px-4 py-2.5 flex items-center gap-6 text-xs text-slate-500 font-mono">
          <span>PILOT COHORT</span>
          <span className="text-slate-300">|</span>
          <span>Protocol: 14-Day Burnout Recovery Intervention</span>
          <span className="text-slate-300">|</span>
          <span>Session: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Heartbeat */}
      <main className="max-w-7xl mx-auto px-6 pt-6">
        <HeartbeatPanel metrics={computeHeartbeat(users)} />
      </main>

      {/* Main Table */}
      <main className="max-w-7xl mx-auto px-6 pb-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm font-mono">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium w-[120px]">
                  Participant ID
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Email
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Organisation
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Enrolled
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium text-center">
                  Day of Study
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Batch Status
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Progress Status
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
                  Last Active
                </TableHead>
                <TableHead className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium text-right">
                  Logs
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-slate-400 text-sm py-12 font-mono">
                    No participant records found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const status = getProgressStatus(u);
                  const day = getDayOfStudy(u.createdAt);
                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/80 border-slate-100">
                      <TableCell className="font-mono text-sm text-slate-700 font-medium">
                        {u.participantId ? (
                          u.participantId
                        ) : (
                          <button
                            onClick={() => handleBackfillId(u.id)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-1 rounded-full transition-colors"
                            title="Assign a participant ID to this user"
                          >
                            <Zap className="w-3 h-3" />
                            Assign ID
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600 font-mono">
                        {u.email ?? <span className="text-slate-300 italic text-xs">not stored</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {u.entranceData?.organisation ?? <span className="text-slate-300">—</span>}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono tabular-nums">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {day}
                        </span>
                      </TableCell>
                      <TableCell>
                        {u.status === 'waitlist' ? (
                          <button
                            onClick={() => handlePromote(u.id)}
                            disabled={promotingIds.has(u.id)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-2 py-1 rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Promote to active"
                          >
                            {promotingIds.has(u.id)
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Zap className="w-3 h-3" />}
                            {promotingIds.has(u.id) ? 'Promoting…' : 'Waitlist'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-full">
                            Active
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={status.variant} label={status.label} />
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 font-mono tabular-nums whitespace-nowrap">
                        {formatLastActive(u.lastActiveAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          className="text-xs text-slate-500 hover:text-slate-900 hover:bg-slate-100 font-mono"
                        >
                          <Link href={`/admin/${u.id}/logs`}>
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            View Logs
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-[10px] text-slate-400 font-mono tracking-wide">
          CONFIDENTIAL · Authorised access only · JAI Behavioural Program
        </p>
      </main>

      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg text-sm font-mono
                ${t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'}`}
            >
              <span className="mt-0.5 shrink-0">{t.type === 'success' ? '✓' : '⚠'}</span>
              <span className="leading-snug">{t.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ variant, label }: { variant: StatusVariant; label: string }) {
  const styles: Record<StatusVariant, string> = {
    default: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    secondary: 'bg-blue-50 text-blue-700 border-blue-200',
    destructive: 'bg-amber-50 text-amber-700 border-amber-200',
    outline: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${styles[variant]}`}>
      {label}
    </span>
  );
}
