'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { EXERCISES, type ExerciseData } from "@/lib/exercises-data";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Brain,
  Waves,
  Compass,
  HeartHandshake,
  BrainCircuit,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Domain meta
// ---------------------------------------------------------------------------

type Domain = 'Emotional' | 'Cognitive' | 'Motivation' | 'Relational';

const DOMAIN_META: Record<Domain, {
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
  rationale: string;
  sampleIds: string[];
}> = {
  Emotional: {
    icon: Waves,
    colorClass: "text-rose-600",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-100",
    description:
      "Your emotional regulation system is under significant strain. The data shows sustained cortisol load that, without intervention, compounds into physical depletion.",
    rationale:
      "These tools activate your parasympathetic nervous system and restore cortisol regulation — helping your nervous system complete the stress cycle rather than remain trapped in it.",
    sampleIds: ["emo-1", "emo-2", "emo-4"],
  },
  Cognitive: {
    icon: Brain,
    colorClass: "text-blue-600",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-100",
    description:
      "Your working memory and executive function are operating at reduced capacity. Cognitive overload at this level degrades decision quality and accelerates depletion.",
    rationale:
      "These tools target prefrontal cortex restoration by externalising cognitive load and eliminating attentional switching — the two fastest routes back to recovered executive function.",
    sampleIds: ["cog-7", "cog-8", "cog-9"],
  },
  Motivation: {
    icon: Compass,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-100",
    description:
      "Your approach motivation is significantly depleted. This shows up as avoidance, difficulty initiating, and diminishing reward from work that used to feel meaningful.",
    rationale:
      "These tools reactivate the dopamine reward circuit incrementally — creating completion signals that rebuild approach motivation from the baseline up, without demanding more than your system can currently give.",
    sampleIds: ["mot-13", "mot-14", "mot-15"],
  },
  Relational: {
    icon: HeartHandshake,
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-100",
    description:
      "Your relational energy is your primary drain. Social demands are outpacing recovery, and the gap between giving and receiving in professional relationships is widening.",
    rationale:
      "These tools rebuild the distinction between depleting and nourishing contact, allowing the social engagement circuit to reset — and giving you language for boundaries before you're too depleted to find it.",
    sampleIds: ["rel-19", "rel-20", "rel-21"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function derivePrimaryDomain(scores: Record<string, number>): Domain {
  // Tie-break: prefer Emotional
  const order: Domain[] = ['Emotional', 'Cognitive', 'Motivation', 'Relational'];
  let top: Domain = 'Emotional';
  let topScore = -1;
  for (const domain of order) {
    const s = scores[domain.toLowerCase()] ?? 0;
    if (s > topScore) {
      topScore = s;
      top = domain;
    }
  }
  return top;
}

// ---------------------------------------------------------------------------
// Mini exercise preview card
// ---------------------------------------------------------------------------

function SampleCard({ exercise }: { exercise: ExerciseData }) {
  const burnoutColor =
    exercise.burnoutLevel === 'High Burnout'     ? 'bg-red-50 text-red-600' :
    exercise.burnoutLevel === 'Moderate Burnout' ? 'bg-orange-50 text-orange-600' :
                                                   'bg-green-50 text-green-600';
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className={cn("text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", burnoutColor)}>
          {exercise.burnoutLevel}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {exercise.domain}
        </span>
      </div>
      <div>
        <p className="font-bold text-base font-headline">{exercise.title}</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">{exercise.mechanism}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Clock className="w-3.5 h-3.5" />
        {exercise.timeRequired}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ProtocolPage() {
  const router = useRouter();
  const { user, isUserLoading, profile, isProfileLoading } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/auth');
  }, [user, isUserLoading, router]);

  const assessmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, 'users', user.uid, 'assessments');
  }, [firestore, user]);

  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef);

  const day0 = assessments?.find((a: any) => a.type === 'Day 0');

  // Redirect if no baseline — shouldn't happen but defensive
  useEffect(() => {
    if (!isUserLoading && !isAssessmentsLoading && user && assessments && !day0) {
      router.push('/assessment');
    }
  }, [user, assessments, day0, isUserLoading, isAssessmentsLoading, router]);

  const primaryDomain = useMemo((): Domain | null => {
    if (!day0) return null;
    const scores: Record<string, number> = {
      emotional:  Number((day0 as any).emotional  || 0),
      cognitive:  Number((day0 as any).cognitive  || 0),
      motivation: Number((day0 as any).motivation || 0),
      relational: Number((day0 as any).relational || 0),
    };
    return derivePrimaryDomain(scores);
  }, [day0]);

  const isHighDepletion = !!profile?.isHighDepletion;

  const [starting, setStarting] = useState(false);

  const handleStartDay1 = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!user || !firestore || starting) return;
    setStarting(true);
    await updateDoc(doc(firestore, 'users', user.uid), {
      isProtocolSeen: true,
      updatedAt: serverTimestamp(),
    });
    router.replace('/dashboard');
  };

  const sampleExercises = useMemo((): ExerciseData[] => {
    if (!primaryDomain) return [];
    const ids = DOMAIN_META[primaryDomain].sampleIds;
    return ids.map(id => EXERCISES.find(e => e.id === id)!).filter(Boolean);
  }, [primaryDomain]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isUserLoading || isProfileLoading || isAssessmentsLoading || !primaryDomain) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl animate-pulse">J</div>
        <p className="text-muted-foreground animate-pulse text-sm">Building your protocol…</p>
      </div>
    );
  }

  const meta = DOMAIN_META[primaryDomain];
  const DomainIcon = meta.icon;

  return (
    <>
    <div className="bg-background px-6 pt-14 pb-48 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-10">

        {/* ── Eyebrow + Hero ──────────────────────────────────────────────── */}
        <div className="space-y-3 pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            JAI Behavioural · JIT Program
          </p>
          <h1 className="text-3xl sm:text-4xl font-black font-headline tracking-tight leading-tight">
            Your 14-Day Protocol<br />is Ready.
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Based on your baseline scores, we've matched you to a targeted intervention sequence.
          </p>
        </div>

        {/* ── High Depletion notice ────────────────────────────────────────── */}
        {isHighDepletion && (
          <div className="flex items-start gap-4 p-5 rounded-2xl border-2 border-amber-300 bg-amber-50">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-amber-700">High Depletion Detected</p>
              <p className="text-sm text-amber-900 leading-relaxed">
                Your readiness score indicates your system is significantly depleted. Your first week will focus
                exclusively on <strong>low-demand recovery tools</strong> — minimal initiation cost, maximum
                restoration — before progressing to the full protocol.
              </p>
            </div>
          </div>
        )}

        {/* ── Primary Domain diagnosis ─────────────────────────────────────── */}
        <div className={cn("rounded-3xl p-5 sm:p-8 space-y-5 border", meta.bgClass, meta.borderClass)}>
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white shadow-sm", meta.borderClass, "border")}>
              <DomainIcon className={cn("w-6 h-6", meta.colorClass)} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Primary Drain Domain</p>
              <p className={cn("text-2xl font-black font-headline", meta.colorClass)}>{primaryDomain}</p>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            {meta.description}
          </p>
        </div>

        {/* ── Sample tools ─────────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Assigned Tools</p>
            <p className="text-2xl font-black font-headline tracking-tight">
              {primaryDomain} Recovery Toolkit
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sampleExercises.map(ex => (
              <SampleCard key={ex.id} exercise={ex} />
            ))}
          </div>

          {/* Rationale */}
          <div className="flex items-start gap-4 p-5 rounded-2xl bg-primary/5 border border-primary/10">
            <BrainCircuit className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">The Science</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{meta.rationale}</p>
            </div>
          </div>
        </div>

        {/* ── What to expect ───────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-white border shadow-sm p-5 sm:p-8 space-y-5">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">What Happens Next</p>
          <ul className="space-y-4">
            {[
              { label: "14 days", detail: "One targeted exercise recommended each day, matched to your profile." },
              { label: "Day 3 & 10", detail: "Your NEUY coach will send a personalised progress snapshot to your inbox." },
              { label: "Day 7", detail: "A mid-programme check-in email lands to help you reflect on Week 1." },
              { label: "Day 14", detail: "A follow-up assessment unlocks — and your full progress report is generated." },
            ].map(({ label, detail }) => (
              <li key={label} className="flex items-start gap-4">
                <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full shrink-0 mt-0.5">{label}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail}</p>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-16 py-8 border-t text-center space-y-1.5 w-full">
          <p className="text-xs text-muted-foreground/50">JIT by JAI Behavioural © 2026</p>
          <p className="text-[10px] text-muted-foreground">
            Developed by{" "}
            <a
              href="https://www.jaibehavioural.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-primary transition-colors"
            >
              JAI Behavioural
            </a>
          </p>
        </footer>

        {/* Spacer so footer clears the sticky CTA bar + nav bar on mobile */}
        <div className="h-56 w-full" aria-hidden="true" />

      </div>
    </div>

    {/* ── Sticky CTA — sits above content (z-40) but below nav bar (z-50) ── */}
    <div className="fixed bottom-20 inset-x-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border/40">
      <div className="max-w-2xl mx-auto px-6 pt-4 pb-6 space-y-2">
        <Button
          onClick={handleStartDay1}
          disabled={starting}
          className="relative z-10 w-full h-16 rounded-full font-black text-xl shadow-2xl shadow-primary/20 mb-24"
        >
          {starting ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>Start Day 1<ArrowRight className="w-6 h-6 ml-3" /></>
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          You can browse all 24 exercises at any time from the Exercise Library.
        </p>
      </div>
    </div>
    </>
  );
}
