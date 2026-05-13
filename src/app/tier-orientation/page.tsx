'use client';

import { useRouter } from 'next/navigation';
import { useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function TierOrientationPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const handleContinue = () => {
    if (!user || !firestore) return;
    const userRef = doc(firestore, 'users', user.uid);
    setDocumentNonBlocking(userRef, {
      isTierOrientationComplete: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    router.push('/readiness');
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pb-24">
      <div className="max-w-2xl w-full space-y-8 pt-10">

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">J</div>
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Orientation</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-black font-headline tracking-tight">Before you begin</h1>
          <p className="text-muted-foreground text-lg">Understanding how JIT works will help you get the most from the next 14 days.</p>
        </div>

        <div className="space-y-4">

          <div className="p-6 rounded-3xl bg-white border shadow-sm opacity-60">
            <div className="flex items-start gap-4">
              <span className="text-3xl font-black text-outline-variant font-headline">03</span>
              <div>
                <h3 className="font-bold text-lg uppercase tracking-tight text-muted-foreground">Leadership and Governance</h3>
                <p className="text-sm text-muted-foreground mt-1">Systemic interventions focused on institutional policy, organisational culture, and executive governance. Not part of this intervention.</p>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 inline-block">Inactive</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border shadow-sm opacity-60">
            <div className="flex items-start gap-4">
              <span className="text-3xl font-black text-outline-variant font-headline">02</span>
              <div>
                <h3 className="font-bold text-lg uppercase tracking-tight text-muted-foreground">Team and Collaboration</h3>
                <p className="text-sm text-muted-foreground mt-1">Interventions at team and line management level — communication norms, workload distribution, shared agreements. Not part of this intervention.</p>
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 inline-block">Inactive</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border-2 border-primary shadow-lg relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="flex items-start gap-4">
              <span className="text-5xl font-black text-primary font-headline">01</span>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full inline-block mb-2">Active — This intervention</span>
                <h3 className="font-black text-xl uppercase tracking-tight text-primary">Individual Assessment</h3>
                <p className="text-foreground mt-2 leading-relaxed">Individual habit tools operating at the level of your own behaviour and routine. These tools work best when the primary driver of your burnout is within your individual control.</p>
                <div className="mt-4 p-4 bg-primary/5 rounded-2xl">
                  <p className="text-sm font-bold text-foreground/80">Tier 1 has a ceiling.</p>
                  <p className="text-sm text-muted-foreground mt-1">Some sources of burnout are not within individual control — communication culture, workload volume set by institutional decisions, physical conditions that eliminate recovery space. When you hit this ceiling during the intervention, that observation is valuable. It tells you and your organisation something important. The app will help you name it clearly.</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        <Button
          onClick={handleContinue}
          className="w-full rounded-full h-14 font-black text-lg shadow-xl shadow-primary/20"
        >
          Understood, continue
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>

      </div>
    </div>
  );
}

