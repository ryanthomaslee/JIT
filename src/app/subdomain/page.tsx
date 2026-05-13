'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  {
    value: 'communication_overload',
    label: 'Volume of communication and requests',
    description: 'Too many messages, expectations of constant availability, difficulty maintaining response boundaries.',
  },
  {
    value: 'enforced_proximity',
    label: 'Never having enough time alone',
    description: 'Insufficient solitude during the working day, always being around people, no recovery space between social demands.',
  },
  {
    value: 'both',
    label: 'Both feel equally true',
    description: 'Communication volume and lack of solitude are both significant drains for you.',
  },
];

export default function SubdomainPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    if (!user || !firestore || !selected) return;
    const userRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userRef, {
      relationalSubdomain: selected,
      isSubdomainComplete: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    router.push('/protocol');
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pb-24">
      <div className="max-w-2xl w-full space-y-8 pt-10">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">J</div>
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Relational Profile</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline tracking-tight">One more question</h1>
          <p className="text-muted-foreground text-lg">Your Relational domain is your highest scoring area. Before we assign your tools we need to understand what is actually driving that score.</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border shadow-sm">
          <p className="font-bold text-lg mb-6">When you think about what drains you most in your working relationships, is it more about:</p>
          <div className="space-y-3">
            {OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={cn(
                  'w-full p-5 rounded-2xl border-2 text-left transition-all',
                  selected === opt.value
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                )}
              >
                <p className={cn('font-bold text-base', selected === opt.value ? 'text-primary' : 'text-foreground')}>{opt.label}</p>
                <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10">
          <p className="text-sm text-foreground/70 leading-relaxed">This tells NEUY which tools to surface first. Both communication overload and enforced proximity produce similar scores but require different interventions. Getting this right matters.</p>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full rounded-full h-14 font-black text-lg shadow-xl shadow-primary/20"
        >
          Continue to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

      </div>
    </div>
  );
}
