"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from "@/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { EXERCISES, type ExerciseData } from "@/lib/exercises-data";
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Clock, Calendar, BrainCircuit, CheckCircle2, ChevronRight, BookOpen, Shield, BarChart3, HeartHandshake, Lock, Sparkles, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { cn, toSafeDate } from "@/lib/utils";
import { NEUYChat } from "@/components/NEUYChat";

type SelectionType = "guided" | "self-selected";

// Deterministic hash: converts a user ID string into an unsigned 32-bit seed.
function hashUid(uid: string): number {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = (Math.imul(31, h) + uid.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Seeded Fisher-Yates shuffle (mulberry32 PRNG).
// Returns a new array; original is not mutated.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  const rng = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const DOMAIN_FILTERS = ["All", "Emotional", "Cognitive", "Motivation", "Relational"] as const;

const DOMAIN_META: Record<string, { icon: React.ElementType; colorClass: string }> = {
  Emotional:  { icon: Shield,       colorClass: "bg-accent/40 text-accent-foreground" },
  Cognitive:  { icon: BrainCircuit, colorClass: "bg-primary/20 text-primary" },
  Motivation: { icon: BarChart3,    colorClass: "bg-primary/20 text-primary" },
  Relational: { icon: HeartHandshake, colorClass: "bg-accent/40 text-accent-foreground" },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page content
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseLibraryContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const { user, isUserLoading, profile } = useUser();
  const firestore = useFirestore();

  const [activeTab, setActiveTab]         = useState<"today" | "library">("today");
  const [domainFilter, setDomainFilter]   = useState<string>("All");

  // Honour ?domain= query param by jumping straight to library tab + filter
  useEffect(() => {
    const d = searchParams.get("domain");
    if (d) {
      setActiveTab("library");
      setDomainFilter(d);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push("/auth");
  }, [user, isUserLoading, router]);

  const assessmentsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users", user.uid, "assessments");
  }, [firestore, user]);

  const completionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users", user.uid, "exerciseCompletions");
  }, [firestore, user]);

  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsQuery);
  const { data: completions, isLoading: isCompletionsLoading } = useCollection(completionsQuery);

  const day0  = assessments?.find((a: any) => a.type === "Day 0");
  const day14 = assessments?.find((a: any) => a.type === "Day 14");

  // Redirect if no baseline yet
  useEffect(() => {
    if (!isUserLoading && !isAssessmentsLoading && user && assessments && !day0) {
      router.push("/assessment");
    }
  }, [user, assessments, day0, isUserLoading, isAssessmentsLoading, router]);

  // Day-of-program (1-indexed)
  const programDay = useMemo(() => {
    const baselineDate = toSafeDate(day0?.timestamp || profile?.day0CompletedAt || profile?.baselineDate);
    if (!baselineDate) return 1;
    return Math.max(1, differenceInDays(new Date(), baselineDate) + 1);
  }, [day0, profile]);

  // Completion counts per exercise
  const completionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    completions?.forEach((c: any) => {
      counts[c.exerciseId] = (counts[c.exerciseId] || 0) + 1;
    });
    return counts;
  }, [completions]);

  // High Depletion flag — written by readiness/page.tsx when readinessScore ≤ 3
  const isHighDepletion = !!profile?.isHighDepletion;

  // Guided recommendation: highest-scoring domain → matching burnout tier →
  // deterministic per-user shuffle so each user's 14-day path is unique.
  // Week 1 override: if user is High Depletion, route to lowDemand exercises only.
  const recommendedExercise = useMemo((): ExerciseData | null => {
    if (!day0 || !user) return null;

    // High Depletion Week 1 routing: pool is the 7 low-demand exercises only
    if (isHighDepletion && programDay <= 7) {
      const lowDemandPool = EXERCISES.filter(e => e.lowDemand);
      const shuffled = seededShuffle(lowDemandPool, hashUid(user.uid));
      return shuffled[(programDay - 1) % shuffled.length] ?? shuffled[0] ?? null;
    }

    const scores: Record<string, number> = {
      Emotional:  Number((day0 as any).emotional  || 0),
      Cognitive:  Number((day0 as any).cognitive  || 0),
      Motivation: Number((day0 as any).motivation || 0),
      Relational: Number((day0 as any).relational || 0),
    };
    const topDomain = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    const topScore  = scores[topDomain];
    const tier = topScore >= 7 ? "High Burnout" : topScore >= 4 ? "Moderate Burnout" : "Low Burnout";
    const pool = EXERCISES.filter(e => e.domain === topDomain && e.burnoutLevel === tier);
    const list = pool.length ? pool : EXERCISES.filter(e => e.domain === topDomain);
    const shuffled = seededShuffle(list, hashUid(user.uid));
    return shuffled[(programDay - 1) % shuffled.length] ?? shuffled[0] ?? null;
  }, [day0, user, programDay, isHighDepletion]);

  // Log a completion to Firestore
  const addCompletion = (
    exercise: ExerciseData,
    rating: number,
    selectionType: SelectionType,
  ) => {
    if (!user || !firestore) return;
    const colRef = collection(firestore, "users", user.uid, "exerciseCompletions");
    addDocumentNonBlocking(colRef, {
      userId:          user.uid,
      exerciseId:      exercise.id,
      exerciseName:    exercise.title,
      domain:          exercise.domain,
      completionDate:  serverTimestamp(),
      loggedAt:        serverTimestamp(),
      usefulnessRating: rating,
      selectionType,   // 'guided' | 'self-selected'
      programDay,
    });
  };

  // NEUY context string
  const participantContext = day0 ? `
Domain Burnout Profile scores at Day 0:
Emotional: ${(day0 as any)?.emotional ?? "not yet assessed"}
Cognitive: ${(day0 as any)?.cognitive ?? "not yet assessed"}
Motivation: ${(day0 as any)?.motivation ?? "not yet assessed"}
Relational: ${(day0 as any)?.relational ?? "not yet assessed"}

WRS friction points: ${(profile?.entranceData?.workloadFrictionPoints as string[] | undefined)?.join(", ") ?? "not recorded"}
Current page: Exercise Library
Program day: ${programDay}
Day 14 scores available: ${day14 ? "Yes" : "No"}
` : undefined;

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isUserLoading || isCompletionsLoading || isAssessmentsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl animate-pulse">J</div>
        <p className="text-muted-foreground animate-pulse">Loading your library...</p>
      </div>
    );
  }

  // ── Gate: baseline required ──────────────────────────────────────────────
  if (!day0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6">
          <Lock className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black font-headline mb-4">Baseline Required</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Complete your baseline assessment first so we can personalise your library.
        </p>
        <Button asChild size="lg" className="rounded-full px-8">
          <Link href="/assessment">Complete Baseline Assessment</Link>
        </Button>
      </div>
    );
  }

  // ── Filtered library list ────────────────────────────────────────────────
  const libraryExercises = domainFilter === "All"
    ? EXERCISES
    : EXERCISES.filter(e => e.domain === domainFilter);

  // ── Main render ─────────────────────────────────────────────────────────
  return (
    <div className="bg-background px-6 pt-6 sm:pt-14">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between pt-4">
          <Link
            href="/dashboard"
            className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
            Day {programDay}
          </span>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-headline tracking-tight">Exercise Library</h1>
          <p className="text-muted-foreground text-base sm:text-lg mt-1">All 24 interventions — browse freely or follow today's recommendation.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab("today")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "today"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={cn(
              "px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
              activeTab === "library"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Library
          </button>
        </div>

        {/* ── TODAY TAB ─────────────────────────────────────────────────────── */}
        {activeTab === "today" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <Sparkles className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-primary">Day {programDay} Recommendation</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {isHighDepletion && programDay <= 7
                    ? "Based on your current readiness, we've tailored your first week to focus on low-effort recovery tools."
                    : "Matched to your highest-scoring domain from your baseline assessment."}
                </p>
              </div>
            </div>

            {recommendedExercise && (
              <ExerciseCard
                exercise={recommendedExercise}
                completionCount={completionCounts[recommendedExercise.id] || 0}
                onAddCompletion={(ex, rating) => addCompletion(ex, rating, "guided")}
              />
            )}

            <div className="pt-2 text-center">
              <button
                onClick={() => setActiveTab("library")}
                className="text-sm font-bold text-primary hover:underline underline-offset-4"
              >
                Browse all 24 exercises in the Library →
              </button>
            </div>
          </div>
        )}

        {/* ── LIBRARY TAB ───────────────────────────────────────────────────── */}
        {activeTab === "library" && (
          <div className="space-y-6">
            {/* Domain filter chips */}
            <div className="flex flex-wrap gap-2">
              {DOMAIN_FILTERS.map(d => (
                <button
                  key={d}
                  onClick={() => setDomainFilter(d)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border transition-all",
                    domainFilter === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {d}
                  {d !== "All" && (
                    <span className="ml-1.5 opacity-60">
                      {EXERCISES.filter(e => e.domain === d).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted-foreground font-medium">
              Showing {libraryExercises.length} exercise{libraryExercises.length !== 1 ? "s" : ""}
              {domainFilter !== "All" ? ` in ${domainFilter}` : " across all domains"}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {libraryExercises.map(exercise => (
                <ExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  completionCount={completionCounts[exercise.id] || 0}
                  onAddCompletion={(ex, rating) => addCompletion(ex, rating, "self-selected")}
                />
              ))}
            </div>
          </div>
        )}

        <footer className="mt-16 py-8 border-t text-center space-y-1.5">
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
        {/* Spacer so footer clears the nav bar on mobile */}
        <div className="h-40 w-full" aria-hidden="true" />
      </div>

      <NEUYChat participantContext={participantContext} targetDomain={domainFilter !== "All" ? domainFilter : undefined} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise card + dialog
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise,
  completionCount,
  onAddCompletion,
}: {
  exercise: ExerciseData;
  completionCount: number;
  onAddCompletion: (exercise: ExerciseData, rating: number) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [step, setStep]   = useState<"idle" | "rating">("idle");

  const handleRating = (rating: number) => {
    onAddCompletion(exercise, rating);
    setOpen(false);
    setTimeout(() => setStep("idle"), 300);
  };

  const burnoutColor =
    exercise.burnoutLevel === "High Burnout"     ? "bg-red-50 text-red-600" :
    exercise.burnoutLevel === "Moderate Burnout" ? "bg-orange-50 text-orange-600" :
                                                   "bg-green-50 text-green-600";
  const burnoutColorDialog =
    exercise.burnoutLevel === "High Burnout"     ? "bg-red-100 text-red-700" :
    exercise.burnoutLevel === "Moderate Burnout" ? "bg-orange-100 text-orange-700" :
                                                   "bg-green-100 text-green-700";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTimeout(() => setStep("idle"), 300); }}>
      <DialogTrigger asChild>
        <Card className={cn(
          "group relative cursor-pointer border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-white",
          completionCount > 0 ? "ring-2 ring-primary/20" : ""
        )}>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${burnoutColor}`}>
                {exercise.burnoutLevel}
              </span>
              {completionCount > 0 && (
                <div className="flex items-center gap-1.5 text-primary font-black text-[10px] uppercase tracking-wider bg-primary/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {completionCount}×
                </div>
              )}
            </div>
            <CardTitle className="text-xl font-bold font-headline">{exercise.title}</CardTitle>
            <CardDescription className="line-clamp-2 text-sm leading-relaxed mt-2">{exercise.mechanism}</CardDescription>
          </CardHeader>
          <CardFooter className="pt-4 flex items-center justify-between border-t border-slate-50 mt-2">
            <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {exercise.timeRequired}
            </div>
            <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </CardFooter>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl max-h-[90dvh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-5 sm:p-8 bg-primary/5 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{exercise.domain} Domain</span>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${burnoutColorDialog}`}>
              {exercise.burnoutLevel}
            </span>
          </div>
          <DialogTitle className="text-3xl font-black font-headline tracking-tight">{exercise.title}</DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="p-5 sm:p-8 space-y-8 overflow-y-auto flex-1">
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <BrainCircuit className="w-5 h-5" />
              <h4 className="font-black text-sm uppercase tracking-widest">The Mechanism</h4>
            </div>
            <p className="text-muted-foreground leading-relaxed italic">{exercise.mechanism}</p>
          </section>

          <section className="space-y-4 p-6 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-2 text-primary">
              <BookOpen className="w-5 h-5" />
              <h4 className="font-black text-sm uppercase tracking-widest">Instructions</h4>
            </div>
            <p className="text-lg font-medium leading-relaxed">{exercise.instruction}</p>
          </section>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Time</span>
              </div>
              <p className="font-bold">{exercise.timeRequired}</p>
            </div>
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">When</span>
              </div>
              <p className="font-bold">{exercise.whenToUse}</p>
            </div>
          </div>
        </div>

        {/* Footer — log completion */}
        <DialogFooter className="p-5 sm:p-8 bg-slate-50/50 border-t flex flex-col gap-4 shrink-0">
          {step === "idle" && (
            <>
              {completionCount > 0 && (
                <p className="text-center text-xs font-bold text-primary/50 uppercase tracking-widest">
                  Completed {completionCount} {completionCount === 1 ? "time" : "times"}
                </p>
              )}
              <Button
                onClick={() => setStep("rating")}
                className="w-full h-14 rounded-full font-bold text-lg shadow-lg shadow-primary/20"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                I did this
              </Button>
            </>
          )}

          {step === "rating" && (
            <div className="space-y-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="text-center font-black text-sm uppercase tracking-widest text-primary">
                Did it help?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleRating(3)}
                  className="h-14 rounded-2xl font-bold flex-col gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                >
                  <ThumbsUp className="w-5 h-5" />
                  <span className="text-xs">Yes</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRating(2)}
                  className="h-14 rounded-2xl font-bold flex-col gap-1 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-300"
                >
                  <Minus className="w-5 h-5" />
                  <span className="text-xs">Neutral</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRating(1)}
                  className="h-14 rounded-2xl font-bold flex-col gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <ThumbsDown className="w-5 h-5" />
                  <span className="text-xs">No</span>
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl animate-pulse">J</div>
        <p className="text-muted-foreground animate-pulse">Loading your library...</p>
      </div>
    }>
      <ExerciseLibraryContent />
    </Suspense>
  );
}
