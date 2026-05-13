'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const READINESS_QUESTIONS = [
  {
    id: 'currentLoad',
    question: 'How would you describe your workload this week?',
    options: [
      { label: 'Manageable', value: 3 },
      { label: 'Busy but okay', value: 2 },
      { label: 'Very heavy', value: 1 },
      { label: 'Completely overwhelming', value: 0 },
    ],
  },
  {
    id: 'freeTime',
    question: 'How many genuine free periods or breaks have you had today?',
    options: [
      { label: '3 or more', value: 3 },
      { label: '1 or 2', value: 2 },
      { label: 'Less than 1', value: 1 },
      { label: 'None at all', value: 0 },
    ],
  },
  {
    id: 'capacity',
    question: 'How do you feel about adding one small new habit this week?',
    options: [
      { label: 'Ready for it', value: 3 },
      { label: 'I can try', value: 2 },
      { label: 'Feels like a lot right now', value: 1 },
      { label: 'Not possible this week', value: 0 },
    ],
  },
];

export default function ReadinessPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const [answers, setAnswers] = useState<Record<string, number>>({});

  const allAnswered = READINESS_QUESTIONS.every(q => answers[q.id] !== undefined);
  const totalScore = Object.values(answers).reduce((sum, val) => sum + val, 0);
  const isHighDepletion = totalScore <= 3;

  const handleContinue = () => {
    if (!user || !firestore || !allAnswered) return;
    const userRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userRef, {
      isReadinessComplete: true,
      readinessScore: totalScore,
      isHighDepletion,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pb-24">
      <div className="max-w-2xl w-full space-y-8 pt-10">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">J</div>
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Readiness Check</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline tracking-tight">How are you right now?</h1>
          <p className="text-muted-foreground text-lg">Three quick questions about this week. Answer honestly — this helps us match the intervention to your current capacity.</p>
        </div>

        <div className="space-y-6">
          {READINESS_QUESTIONS.map((q) => (
            <div key={q.id} className="p-6 rounded-3xl bg-white border shadow-sm space-y-4">
              <p className="font-bold text-base">{q.question}</p>
              <div className="grid grid-cols-1 gap-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                    className={cn(
                      'p-4 rounded-2xl border-2 text-sm font-bold text-left transition-all',
                      answers[q.id] === opt.value
                        ? 'border-primary bg-primary text-white shadow-md'
                        : 'border-slate-100 bg-slate-50 text-muted-foreground hover:border-slate-200'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {allAnswered && isHighDepletion && (
          <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200">
            <p className="font-bold text-amber-800">This looks like a heavy week.</p>
            <p className="text-sm text-amber-700 mt-1">The intervention will still work — we will start with the lowest-demand version of Week 1 and check in with you before Week 2 begins. The most important thing is that you start.</p>
          </div>
        )}

        <Button
          onClick={handleContinue}
          disabled={!allAnswered}
          className="w-full rounded-full h-14 font-black text-lg shadow-xl shadow-primary/20"
        >
          Continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

      </div>
    </div>
  );
}