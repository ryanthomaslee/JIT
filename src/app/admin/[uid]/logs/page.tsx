'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Activity } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = 'ryanthomaslee93@gmail.com';

interface ActivityLog {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  timestamp: Timestamp;
}

interface ParticipantSummary {
  participantId: string;
  email?: string;
  createdAt?: Timestamp;
  entranceData?: {
    organisation?: string;
    // NOTE: no gender, no 'f' shortcode — we only surface fields collected in the pilot entrance survey
  };
}

const EVENT_LABELS: Record<string, string> = {
  recovery_email_sent: 'Recovery Email Sent',
  chat_session_started: 'NEUY Chat Session',
  tool_selected: 'Tool Selected',
  module_completed: 'Module Completed',
  exercise_started: 'Exercise Started',
  exercise_completed: 'Exercise Completed',
  reflection_submitted: 'Reflection Submitted',
};

const EVENT_COLOURS: Record<string, string> = {
  recovery_email_sent: 'bg-violet-50 text-violet-700 border-violet-200',
  chat_session_started: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  tool_selected: 'bg-sky-50 text-sky-700 border-sky-200',
  module_completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  exercise_started: 'bg-amber-50 text-amber-700 border-amber-200',
  exercise_completed: 'bg-teal-50 text-teal-700 border-teal-200',
  reflection_submitted: 'bg-pink-50 text-pink-700 border-pink-200',
};

function formatTs(ts?: Timestamp): string {
  if (!ts) return '—';
  return ts.toDate().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function UserLogsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const uid = params.uid as string;

  const [participant, setParticipant] = useState<ParticipantSummary | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.replace('/');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileSnap, logsSnap] = await Promise.all([
          getDoc(doc(firestore, 'users', uid)),
          getDocs(
            query(
              collection(firestore, 'users', uid, 'activity_logs'),
              orderBy('timestamp', 'desc')
            )
          ),
        ]);

        if (profileSnap.exists()) {
          setParticipant(profileSnap.data() as ParticipantSummary);
        }

        const logRecords: ActivityLog[] = logsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityLog, 'id'>),
        }));
        setLogs(logRecords);
      } catch (err) {
        setError('Failed to load activity logs. Verify Firestore security rules.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isUserLoading, uid]);

  if (isUserLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="text-xs tracking-widest uppercase text-slate-400">Loading Activity Logs</p>
      </div>
    );
  }

  const eventCounts = logs.reduce<Record<string, number>>((acc, log) => {
    acc[log.eventType] = (acc[log.eventType] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="sm" asChild className="text-xs text-slate-500 font-mono -ml-2">
              <Link href="/admin">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-mono">
                Activity Log · Participant Record
              </p>

              {/* Four-field research header — no ghost data */}
              <div className="grid grid-cols-2 gap-x-10 gap-y-2">
                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-slate-400 font-mono mb-0.5">
                    Participant ID
                  </p>
                  <p className="text-sm font-mono font-semibold text-slate-900">
                    {participant?.participantId ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-slate-400 font-mono mb-0.5">
                    Email
                  </p>
                  <p className="text-sm font-mono text-slate-700">
                    {participant?.email ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-slate-400 font-mono mb-0.5">
                    Organisation
                  </p>
                  <p className="text-sm text-slate-700">
                    {participant?.entranceData?.organisation ?? '—'}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] tracking-[0.12em] uppercase text-slate-400 font-mono mb-0.5">
                    Enrolment Date
                  </p>
                  <p className="text-sm font-mono text-slate-700">
                    {participant?.createdAt
                      ? participant.createdAt.toDate().toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 rounded px-3 py-1.5 shrink-0">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-mono text-slate-600">{logs.length} events</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-3 text-sm font-mono">
            {error}
          </div>
        )}

        {/* Event Summary */}
        {Object.keys(eventCounts).length > 0 && (
          <div className="bg-white border border-slate-200 rounded p-4">
            <p className="text-[10px] tracking-[0.15em] uppercase text-slate-400 font-mono mb-3">
              Event Summary
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventCounts).map(([type, count]) => (
                <span
                  key={type}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono ${EVENT_COLOURS[type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                >
                  {EVENT_LABELS[type] ?? type}
                  <span className="font-bold">&times;{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Log Timeline */}
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-[10px] tracking-[0.15em] uppercase text-slate-500 font-mono font-medium">
              Chronological Log — Most Recent First
            </p>
            <span className="text-[10px] font-mono text-slate-400">UID: {uid}</span>
          </div>

          {logs.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-16 font-mono">
              No activity logs recorded yet for this participant.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {logs.map((log, index) => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-slate-50/60">
                  {/* Index */}
                  <span className="text-[10px] font-mono text-slate-300 tabular-nums w-6 pt-0.5 text-right shrink-0">
                    {logs.length - index}
                  </span>

                  {/* Timestamp */}
                  <span className="text-xs font-mono text-slate-400 tabular-nums whitespace-nowrap shrink-0 w-44">
                    {formatTs(log.timestamp)}
                  </span>

                  {/* Event Type Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono shrink-0 ${EVENT_COLOURS[log.eventType] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
                  >
                    {EVENT_LABELS[log.eventType] ?? log.eventType}
                    {log.eventData?.targetDomain
                      ? ` — ${String(log.eventData.targetDomain)}`
                      : ''}
                  </span>

                  {/* Event Data */}
                  {Object.keys(log.eventData ?? {}).length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                      {Object.entries(log.eventData).map(([key, val]) => (
                        <span key={key}>
                          <span className="text-slate-400">{key}:</span>{' '}
                          <span className="text-slate-600">
                            {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-[10px] text-slate-400 font-mono tracking-wide">
          CONFIDENTIAL · Authorised access only · JAI Behavioural Program
        </p>
      </main>
    </div>
  );
}
