'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useUser, useFirestore, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { ArrowRight, Loader2, ExternalLink } from 'lucide-react';


export default function ConsentPage() {
  const router = useRouter();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/auth');
  };

  const [ageChecked, setAgeChecked] = useState(false);
  const [withdrawChecked, setWithdrawChecked] = useState(false);
  const [dataChecked, setDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isAllChecked = ageChecked && withdrawChecked && dataChecked;

  const handleContinue = async () => {
    if (!isAllChecked || !user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(firestore, 'users', user.uid), {
        consentGiven: true,
        consentedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // RouteGuard will redirect once onSnapshot propagates the update,
      // but we also push directly for instant navigation.
      router.push('/tier-orientation');
    } catch (err) {
      console.error('Consent save error:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">

        {/* Wordmark */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-lg">
            J
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              JIT · Pilot Study
            </p>
            <p className="text-sm font-bold text-foreground leading-tight">
              Participant Consent
            </p>
          </div>
        </div>

        {/* Participant Information Sheet */}
        <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-4">
          <h1 className="text-2xl font-black font-headline tracking-tight">
            Before you begin
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please read the following information carefully before proceeding.
          </p>

          <Link
            href="/info"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Read the full Participant Information Sheet
          </Link>

          {/* Scrollable PIS */}
          <div className="overflow-y-auto max-h-72 rounded-2xl bg-primary/5 p-5 text-sm text-foreground leading-relaxed space-y-4 border border-primary/10">
            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Study Title
              </p>
              <p>
                Just-in-Time (JIT) Neuroscience-Based Burnout Prevention — Pilot Program
              </p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Purpose
              </p>
              <p>
                This program investigates the effectiveness of a 14-day structured burnout
                prevention intervention for working professionals. You will complete an initial
                assessment, engage with personalised exercises over 14 days, and complete a
                follow-up assessment to measure change across four burnout domains: Cognitive,
                Emotional, Motivational, and Relational.
              </p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                What Participation Involves
              </p>
              <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                <li>Entrance survey (approx. 10 minutes)</li>
                <li>Burnout domain assessment on Day 0</li>
                <li>Daily exercises and NEUY wellbeing coach interactions over 14 days</li>
                <li>Follow-up assessment on Day 14</li>
                <li>Brief exit survey</li>
              </ul>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Data & Confidentiality
              </p>
              <p>
                All data is anonymised using a participant code (e.g., P2-001) before analysis.
                Your email address is used solely for study communications and is not shared with
                any third parties. Data is stored securely on Google Firebase infrastructure and
                retained for a maximum of five years following study completion, in accordance
                with applicable data protection legislation.
              </p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Risks & Benefits
              </p>
              <p>
                There are no known significant risks associated with participation. Some
                questions may prompt reflection on personal experiences of stress or depletion.
                You may withdraw at any time if you experience distress. Potential benefits
                include increased self-awareness of burnout risk factors and access to
                evidence-based recovery strategies.
              </p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Right to Withdraw
              </p>
              <p>
                Participation is entirely voluntary. You may withdraw at any time without
                penalty, and your data will be deleted upon request. To withdraw, contact the
                program lead at{' '}
                <span className="font-semibold">ryan@jaibehavioural.com</span>.
              </p>
            </div>

            <div>
              <p className="font-bold uppercase tracking-widest text-xs text-muted-foreground mb-1">
                Contact
              </p>
              <p>
                Ryan Lee, Founder — JAI Behavioural
                <br />
                <span className="font-semibold">ryan@jaibehavioural.com</span>
              </p>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                This is an independent professional pilot conducted by JAI Behavioural. It is not affiliated with or conducted under King's College London.
              </p>
            </div>
          </div>
        </div>

        {/* Consent Checkboxes */}
        <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-5">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Declaration
          </p>
          <p className="text-sm text-muted-foreground">
            Please confirm each of the following to continue:
          </p>

          <div className="flex items-start gap-3">
            <Checkbox
              id="age"
              checked={ageChecked}
              onCheckedChange={(checked) => {
                const next = !!checked;
                setAgeChecked(next);
                console.log('[Consent] age:', next, '| withdraw:', withdrawChecked, '| data:', dataChecked, '| isAllChecked:', next && withdrawChecked && dataChecked);
              }}
              className="mt-0.5 shrink-0"
            />
            <Label htmlFor="age" className="text-sm leading-relaxed text-foreground cursor-pointer">
              I confirm that I am 18 years of age or older.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="withdraw"
              checked={withdrawChecked}
              onCheckedChange={(checked) => {
                const next = !!checked;
                setWithdrawChecked(next);
                console.log('[Consent] age:', ageChecked, '| withdraw:', next, '| data:', dataChecked, '| isAllChecked:', ageChecked && next && dataChecked);
              }}
              className="mt-0.5 shrink-0"
            />
            <Label htmlFor="withdraw" className="text-sm leading-relaxed text-foreground cursor-pointer">
              I understand that my participation is entirely voluntary and that I may withdraw at any time without penalty or consequence.
            </Label>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="data"
              checked={dataChecked}
              onCheckedChange={(checked) => {
                const next = !!checked;
                setDataChecked(next);
                console.log('[Consent] age:', ageChecked, '| withdraw:', withdrawChecked, '| data:', next, '| isAllChecked:', ageChecked && withdrawChecked && next);
              }}
              className="mt-0.5 shrink-0"
            />
            <Label htmlFor="data" className="text-sm leading-relaxed text-foreground cursor-pointer">
              I consent to my anonymised data being collected, stored securely, and used solely for the purposes of this research study.
            </Label>
          </div>
        </div>

        {/* PIS link before consent */}
        <div className="text-center">
          <Link
            href="/info"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Read the Participant Information Sheet here
          </Link>
        </div>

        {/* CTA */}
        <Button
          type="button"
          size="lg"
          className="w-full rounded-full h-14 font-black text-lg shadow-xl shadow-primary/20 transition-all"
          disabled={!isAllChecked || isSaving}
          onClick={handleContinue}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <>
              I Consent &amp; Continue
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>

        {user?.email && (
          <p className="text-center text-xs text-muted-foreground">
            Signed in as <span className="font-semibold">{user.email}</span>.{' '}
            <button
              onClick={handleSignOut}
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Not you? Sign out
            </button>
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          JAI Behavioural · 2026
        </p>
      </div>
    </div>
  );
}
