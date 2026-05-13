"use client";

import { useMemo, Suspense, useState, useEffect, useCallback } from "react";
import { useUser, useFirestore, useCollection, useAuth, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, Loader2, Lock, Waves, Brain, Compass, HeartHandshake, ArrowUp, ArrowDown, Minus, CheckCircle2, ClipboardCheck, ArrowRight, Sparkles } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import Link from "next/link";
import { isAfter, format, differenceInDays } from "date-fns";
import { cn, toSafeDate } from "@/lib/utils";
import { generateProgressNarrative, generateBurnoutInsights } from "@/ai/flows/generate-burnout-insights";
import { NEUYChat } from '@/components/NEUYChat';

function ProgressRoadmap({ profile, day0, day14, unlockDate }: any) {
  const baselineDate = toSafeDate(day0?.timestamp || profile?.day0CompletedAt || profile?.baselineDate);
  const today = new Date();
  const daysSinceBaseline = baselineDate ? differenceInDays(today, baselineDate) : 0;

  const isWeek1ReflectionComplete = !!profile?.isWeek1ReflectionComplete;
  const isDay14Complete = !!day14;
  const isExitComplete = !!profile?.isExitComplete;
  const isDay14Available = unlockDate ? isAfter(today, unlockDate) : false;
  const currentWeek = daysSinceBaseline < 7 ? 1 : 2;

  const steps = [
    {
      label: 'Day 0',
      sublabel: baselineDate ? format(baselineDate, 'd MMM yyyy') : '',
      complete: true,
      active: false,
      locked: false,
    },
    {
      label: 'Week 1',
      sublabel: daysSinceBaseline >= 0 && daysSinceBaseline < 7 ? `Day ${daysSinceBaseline + 1} today` : 'Days 1-7',
      complete: daysSinceBaseline >= 7,
      active: currentWeek === 1 && !isWeek1ReflectionComplete,
      locked: false,
    },
    {
      label: 'Reflection',
      sublabel: isWeek1ReflectionComplete ? 'Done' : daysSinceBaseline >= 6 ? 'Due now' : 'End of Week 1',
      complete: isWeek1ReflectionComplete,
      active: daysSinceBaseline >= 6 && !isWeek1ReflectionComplete,
      locked: false,
    },
    {
      label: 'Week 2',
      sublabel: daysSinceBaseline >= 7 && daysSinceBaseline < 14 ? `Day ${daysSinceBaseline + 1} today` : 'Days 8-14',
      complete: daysSinceBaseline >= 14,
      active: currentWeek === 2,
      locked: daysSinceBaseline < 7,
    },
    {
      label: 'Day 14',
      sublabel: isDay14Complete ? 'Done' : isDay14Available ? 'Available' : unlockDate ? format(unlockDate, 'd MMM') : 'Day 14',
      complete: isDay14Complete,
      active: isDay14Available && !isDay14Complete,
      locked: !isDay14Available,
    },
    {
      label: 'Exit',
      sublabel: isExitComplete ? 'Done' : 'Final step',
      complete: isExitComplete,
      active: isDay14Complete && !isExitComplete,
      locked: !isDay14Complete,
    },
  ];

  return (
    <Card className="rounded-[2.5rem] shadow-sm border-none bg-white p-6">
      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-6">Your 14-Day Journey</h3>
      <div className="overflow-x-auto pb-2">
        <div className="flex items-start gap-1" style={{ minWidth: '480px' }}>
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center relative flex-1">
              {i < steps.length - 1 && (
                <div className={cn(
                  "absolute top-3 left-1/2 w-full h-0.5",
                  step.complete ? "bg-primary" : "bg-slate-100"
                )} />
              )}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center z-10 flex-shrink-0 border-2 transition-all",
                step.complete ? "bg-primary border-primary" :
                step.active ? "bg-white border-primary" :
                "bg-slate-50 border-slate-200"
              )}>
                {step.complete ? (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                ) : step.locked ? (
                  <Lock className="w-2.5 h-2.5 text-slate-300" />
                ) : step.active ? (
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                )}
              </div>
              <div className="mt-2 text-center px-1">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-wider leading-tight",
                  step.complete ? "text-primary" :
                  step.active ? "text-foreground" :
                  "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.sublabel && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{step.sublabel}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function DashboardContent() {
  const auth = useAuth();
  const { user, isUserLoading, profile, isProfileLoading } = useUser();
  const firestore = useFirestore();

  const [isReflectionOpen, setIsReflectionOpen] = useState(false);
  const [reflectionLoading, setReflectionLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [reflectionForm, setReflectionForm] = useState({
    weeklyScore: 5,
    biggestDrain: "",
    mostUsefulExercise: "",
    workNote: ""
  });

  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [aiDayZeroInsights, setAiDayZeroInsights] = useState<{ summary: string; insights: string } | null>(null);
  const [isAiDayZeroLoading, setIsAiDayZeroLoading] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const assessmentsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users", user.uid, "assessments");
  }, [firestore, user]);

  const completionsRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, "users", user.uid, "exerciseCompletions");
  }, [firestore, user]);

  const w1ReflectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid, "reflections", "week1");
  }, [firestore, user]);

  const w2ReflectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid, "reflections", "week2");
  }, [firestore, user]);

  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef);
  const { data: completions, isLoading: isCompletionsLoading } = useCollection(completionsRef);
  const { data: w1Reflection } = useDoc(w1ReflectionRef);
  const { data: w2Reflection } = useDoc(w2ReflectionRef);

  const day0 = useMemo(() => assessments?.find(a => a.type === 'Day 0'), [assessments]);
  const day14 = useMemo(() => assessments?.find(a => a.type === 'Day 14'), [assessments]);

  const isComparisonMode = useMemo(() => {
    return !!day0 && !!day14 && day0.emotional !== undefined && day14.emotional !== undefined;
  }, [day0, day14]);

  const fetchAiNarrative = useCallback(async () => {
    if (!isComparisonMode || !day0 || !day14 || isAiLoading || aiNarrative) return;

    setIsAiLoading(true);
    try {
      const primaryInterventionName = completions?.[0]?.exerciseName || w1Reflection?.mostUsefulExercise || "General burnout prevention exercises";
      const interventionCompletions = completions?.filter((c: any) => c.exerciseName === primaryInterventionName).length || 0;

      const result = await generateProgressNarrative({
        baseline: {
          emotional: Number(day0.emotional || 1),
          cognitive: Number(day0.cognitive || 1),
          motivation: Number(day0.motivation || 1),
          relational: Number(day0.relational || 1),
        },
        followUp: {
          emotional: Number(day14.emotional || 1),
          cognitive: Number(day14.cognitive || 1),
          motivation: Number(day14.motivation || 1),
          relational: Number(day14.relational || 1),
        },
        intervention: primaryInterventionName,
        completionsCount: interventionCompletions,
        week1Reflection: w1Reflection ? {
          weeklyScore: Number(w1Reflection.weeklyScore || 5),
          biggestDrain: String(w1Reflection.biggestDrain || ""),
          mostUsefulExercise: String(w1Reflection.mostUsefulExercise || ""),
        } : undefined,
        week2Reflection: w2Reflection ? {
          weeklyScore: Number(w2Reflection.weeklyScore || 5),
          biggestDrain: String(w2Reflection.biggestDrain || ""),
          mostUsefulExercise: String(w2Reflection.mostUsefulExercise || ""),
        } : undefined,
      });
      setAiNarrative(result.narrative);
    } catch (err) {
      console.error("AI Narrative generation failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  }, [isComparisonMode, day0, day14, completions, w1Reflection, w2Reflection, aiNarrative, isAiLoading]);

  useEffect(() => {
    if (isComparisonMode && !aiNarrative && !isAiLoading) {
      fetchAiNarrative();
    }
  }, [isComparisonMode, aiNarrative, isAiLoading, fetchAiNarrative]);

  const fetchAiDayZeroInsights = useCallback(async () => {
    if (!day0 || isComparisonMode || isAiDayZeroLoading || aiDayZeroInsights) return;

    // Use cached insights from Firestore if available
    if (profile?.day0Insights?.summary) {
      setAiDayZeroInsights(profile.day0Insights as { summary: string; insights: string });
      return;
    }

    setIsAiDayZeroLoading(true);
    try {
      const result = await generateBurnoutInsights({
        currentAssessment: {
          type: 'Day 0',
          emotional: Number(day0.emotional || 1),
          cognitive: Number(day0.cognitive || 1),
          motivation: Number(day0.motivation || 1),
          relational: Number(day0.relational || 1),
        },
        frictionPoints: (profile?.entranceData?.workloadFrictionPoints as string[]) ?? [],
      });
      setAiDayZeroInsights(result);

      // Cache to Firestore so subsequent loads are instant
      if (firestore && user) {
        updateDocumentNonBlocking(doc(firestore, "users", user.uid), {
          day0Insights: result,
        });
      }
    } catch (err) {
      console.error('Day 0 AI insights failed:', err);
    } finally {
      setIsAiDayZeroLoading(false);
    }
  }, [day0, isComparisonMode, isAiDayZeroLoading, aiDayZeroInsights, profile, firestore, user]);

  useEffect(() => {
    if (day0 && !isComparisonMode && !aiDayZeroInsights && !isAiDayZeroLoading) {
      fetchAiDayZeroInsights();
    }
  }, [day0, isComparisonMode, aiDayZeroInsights, isAiDayZeroLoading, fetchAiDayZeroInsights]);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const handleReflectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setReflectionLoading(true);

    const reflectionRef = doc(firestore, "users", user.uid, "reflections", isComparisonMode ? "week2" : "week1");
    const profileRef = doc(firestore, "users", user.uid);

    setDocumentNonBlocking(reflectionRef, {
      userId: user.uid,
      ...reflectionForm,
      completedAt: serverTimestamp()
    }, { merge: true });

    updateDocumentNonBlocking(profileRef, {
      [isComparisonMode ? "isWeek2ReflectionComplete" : "isWeek1ReflectionComplete"]: true,
      updatedAt: serverTimestamp()
    });

    setIsReflectionOpen(false);
    setReflectionLoading(false);
  };

  const getTier = (score: number) => {
    if (score >= 7) return { label: 'High Burnout', dot: 'bg-red-500', hex: '#ef4444', desc: 'significant depletion' };
    if (score >= 4) return { label: 'Moderate Burnout', dot: 'bg-amber-500', hex: '#f59e0b', desc: 'moderate load' };
    return { label: 'Low Burnout', dot: 'bg-emerald-500', hex: '#22c55e', desc: 'relatively preserved' };
  };

  const getTierColor = (score: number) => {
    if (score >= 7) return 'text-red-500';
    if (score >= 4) return 'text-amber-500';
    return 'text-green-500';
  };

  const chartData = useMemo(() => {
    const domains = ['Emotional', 'Cognitive', 'Motivation', 'Relational'];
    return domains.map(domain => {
      const key = domain.toLowerCase() as 'emotional' | 'cognitive' | 'motivation' | 'relational';
      return {
        domain,
        d0: day0 ? Number(day0[key] || 0) : 0,
        d14: day14 ? Number(day14[key] || 0) : 0,
      };
    });
  }, [day0, day14]);

  const chartColor = '#B5956A';

  const domainCompletionStats = useMemo(() => {
    const stats: Record<string, { total: number; unique: Set<string> }> = {
      Emotional: { total: 0, unique: new Set() },
      Cognitive: { total: 0, unique: new Set() },
      Motivation: { total: 0, unique: new Set() },
      Relational: { total: 0, unique: new Set() }
    };
    completions?.forEach((c: any) => {
      if (c.domain && stats[c.domain]) {
        stats[c.domain].total++;
        if (c.exerciseId) stats[c.domain].unique.add(c.exerciseId);
      }
    });
    return stats;
  }, [completions]);


  const rawBaselineDate = day0?.timestamp || profile?.day0CompletedAt || profile?.baselineDate;
  const rawFollowUpDate = day14?.timestamp;

  const baselineDate = toSafeDate(rawBaselineDate);
  const followUpDate = toSafeDate(rawFollowUpDate);

  if (isUserLoading || isProfileLoading || isAssessmentsLoading || isCompletionsLoading || !hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const unlockDate = toSafeDate(profile?.day14UnlockDate);
  const isDay14Locked = unlockDate ? !isAfter(new Date(), unlockDate) : true;
  const isDay14Available = profile?.isDay0Complete && !isDay14Locked;
  const isReflectionComplete = isComparisonMode ? profile?.isWeek2ReflectionComplete : profile?.isWeek1ReflectionComplete;

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex items-center justify-between border-b pb-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold">J</div>
            <span className="text-xl font-bold font-headline">JIT</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full"><LogOut className="w-5 h-5" /></Button>
          </div>
        </header>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black font-headline tracking-tight">
              {isComparisonMode ? "Your JIT Progress Report" : "Your Burnout Prevention Dashboard"}
            </h1>
            <p className="text-lg font-medium text-primary/70">
              {isComparisonMode ? (
                <>Day 0 · {baselineDate ? format(baselineDate, 'd MMMM yyyy') : ''} to Day 14 · {followUpDate ? format(followUpDate, 'd MMMM yyyy') : ''}</>
              ) : (
                <>Your JIT baseline — Day 0 · {baselineDate ? format(baselineDate, 'd MMMM yyyy') : ''}</>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Sheet open={isReflectionOpen} onOpenChange={setIsReflectionOpen}>
              <SheetTrigger asChild>
                <Button
                  variant={isReflectionComplete ? "outline" : "default"}
                  disabled={isReflectionComplete}
                  className={cn(
                    "rounded-full px-10 h-12 font-bold shadow-lg transition-all",
                    isReflectionComplete && "border-emerald-200 bg-emerald-50 text-emerald-600 opacity-100"
                  )}
                >
                  {isReflectionComplete ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Reflection Complete</>
                  ) : (
                    <><ClipboardCheck className="w-4 h-4 mr-2" /> {isComparisonMode ? "Week 2 Reflection" : "Week 1 Reflection"}</>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xl p-0 overflow-y-auto border-none shadow-2xl">
                <div className="p-8 bg-primary/5 border-b">
                  <SheetHeader className="text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">Pilot Milestone</span>
                    </div>
                    <SheetTitle className="text-3xl font-black font-headline tracking-tight">{isComparisonMode ? "Week 2 Reflection" : "Week 1 Reflection"}</SheetTitle>
                    <SheetDescription className="text-muted-foreground font-medium text-base">A brief check-in at Day {isComparisonMode ? "14" : "7"} of your JIT journey.</SheetDescription>
                  </SheetHeader>
                </div>
                <div className="p-8">
                  <form onSubmit={handleReflectionSubmit} className="space-y-8">
                    <div className="space-y-4">
                      <Label className="text-base font-bold">Overall, how has your week felt?</Label>
                      <div className="grid grid-cols-10 gap-1.5 pt-2">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setReflectionForm(prev => ({ ...prev, weeklyScore: val }))}
                            className={cn(
                              "h-10 rounded-lg text-sm font-black transition-all border-2",
                              reflectionForm.weeklyScore === val ? "bg-primary border-primary text-white scale-110" : "border-slate-200 text-muted-foreground hover:border-muted bg-white"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label className="text-base font-bold">Biggest drain on your energy this week?</Label>
                      <Textarea value={reflectionForm.biggestDrain} onChange={(e) => setReflectionForm(p => ({ ...p, biggestDrain: e.target.value }))} required />
                    </div>
                    <div className="space-y-4">
                      <Label className="text-base font-bold">Most useful exercise so far?</Label>
                      <Textarea value={reflectionForm.mostUsefulExercise} onChange={(e) => setReflectionForm(p => ({ ...p, mostUsefulExercise: e.target.value }))} required />
                    </div>
                    <Button type="submit" disabled={reflectionLoading} className="w-full h-14 rounded-full font-black text-lg">
                      {reflectionLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <CheckCircle2 className="w-5 h-5 mr-3" />}
                      Save Reflection
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>

            {!day14 && (
              <Button asChild={isDay14Available} disabled={!isDay14Available} className="rounded-full px-10 h-12 font-bold shadow-lg">
                {isDay14Available ? <Link href="/assessment">Complete Follow-up</Link> : <span><Lock className="w-4 h-4 mr-2 inline" /> Follow-up unlocks {unlockDate ? format(unlockDate, 'd MMMM yyyy') : ''}</span>}
              </Button>
            )}

            {day14 && (
              <Button
                asChild={!profile?.isExitComplete}
                variant={profile?.isExitComplete ? "outline" : "default"}
                disabled={profile?.isExitComplete}
                className={cn("rounded-full px-10 h-12 font-bold shadow-lg transition-all", profile?.isExitComplete && "border-emerald-200 bg-emerald-50 text-emerald-600 opacity-100")}
              >
                {profile?.isExitComplete ? <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2" /> Exit Survey Complete</span> : <Link href="/exit">Exit Survey <ArrowRight className="w-4 h-4 ml-2" /></Link>}
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 space-y-8">
            <Card className="rounded-[2.5rem] shadow-xl border-none bg-white p-6">
              <div className="h-[400px] w-full">
                {hasMounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="60%" data={chartData}>
                      <PolarGrid stroke="#f1f5f9" strokeWidth={2} />
                      <PolarAngleAxis dataKey="domain" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis domain={[0, 10]} axisLine={false} tick={false} />
                      <Radar name="Day 0" dataKey="d0" stroke="#94a3b8" strokeWidth={2} fill="#94a3b8" fillOpacity={isComparisonMode ? 0.15 : 0} strokeOpacity={isComparisonMode ? 1 : 0} />
                      <Radar name="Day 14" dataKey={isComparisonMode ? "d14" : "d0"} stroke={chartColor} strokeWidth={4} fill={chartColor} fillOpacity={0.35} />
                      {isComparisonMode && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <ProgressRoadmap
              profile={profile}
              day0={day0}
              day14={day14}
              unlockDate={unlockDate}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {['Emotional', 'Cognitive', 'Motivation', 'Relational'].map((domainName, i) => {
                const iconMap = { Emotional: Waves, Cognitive: Brain, Motivation: Compass, Relational: HeartHandshake };
                const Icon = iconMap[domainName as keyof typeof iconMap];
                const d0Score = Number((day0 as any)?.[domainName.toLowerCase()] || 0);
                const d14Score = Number((day14 as any)?.[domainName.toLowerCase()] || 0);
                const delta = d0Score - d14Score;
                const currentScore = isComparisonMode ? d14Score : d0Score;
                const tier = getTier(currentScore);
                const scoreColor = getTierColor(currentScore);

                return (
                  <Link key={i} href={`/exercises?domain=${domainName}`} className="block transition-transform hover:scale-[1.02] cursor-pointer">
                    <Card className="rounded-3xl border-none shadow-sm p-4 flex flex-col items-center text-center gap-2 h-full">
                      <div className={cn("p-2 rounded-xl bg-slate-50", tier.dot.replace('bg-', 'text-'))}><Icon className="w-5 h-5" /></div>
                      <div className="space-y-0.5 w-full">
                        <p className="text-[9px] font-black text-muted-foreground leading-tight">{domainName}</p>
                        {isComparisonMode ? (
                          <div className="space-y-1">
                            <p className={cn("text-lg font-black", scoreColor)}>{d0Score} to {d14Score}</p>
                            <div className={cn("flex items-center justify-center text-[10px] font-bold uppercase gap-1", delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : "text-slate-400")}>
                              {delta > 0 ? <ArrowDown className="w-3 h-3" /> : delta < 0 ? <ArrowUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {Math.abs(delta)} Point{Math.abs(delta) === 1 ? '' : 's'}
                            </div>
                          </div>
                        ) : (
                          <><p className={cn("text-xl font-black", scoreColor)}>{d0Score}/10</p><p className={cn("text-[9px] font-bold uppercase", scoreColor)}>{tier.label}</p></>
                        )}
                        <p className="text-[9px] font-bold text-primary/60 mt-2 uppercase tracking-tight">{domainCompletionStats[domainName].total} Completion{domainCompletionStats[domainName].total === 1 ? '' : 's'}</p>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          <Card className="lg:col-span-5 rounded-[2.5rem] shadow-lg border-none bg-white p-8 space-y-8">
            <h2 className="text-2xl font-black font-headline flex items-center gap-2">
              {isComparisonMode ? <><Sparkles className="w-6 h-6 text-primary" /> Personalised Progress Narrative</> : "What your scores suggest"}
            </h2>
            {isComparisonMode ? (
              <div className="space-y-8">
                {isAiLoading ? (
                  <div className="space-y-4 animate-pulse"><div className="h-4 bg-slate-100 rounded-full w-full"></div><div className="h-4 bg-slate-100 rounded-full w-5/6"></div><div className="h-4 bg-slate-100 rounded-full w-4/6"></div></div>
                ) : aiNarrative ? (
                  <p className="text-lg leading-relaxed text-foreground/80">{aiNarrative}</p>
                ) : (
                  <div className="text-center py-8"><p className="text-muted-foreground">Unable to generate narrative.</p><Button variant="ghost" size="sm" onClick={fetchAiNarrative} className="mt-2">Try Again</Button></div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {isAiDayZeroLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-5/6"></div>
                    <div className="h-4 bg-slate-100 rounded-full w-4/6"></div>
                  </div>
                ) : aiDayZeroInsights ? (
                  <>
                    <p className="text-lg leading-relaxed text-foreground/80">{aiDayZeroInsights.summary}</p>
                    {aiDayZeroInsights.insights && (
                      <p className="text-sm leading-relaxed text-foreground/60">{aiDayZeroInsights.insights}</p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to generate profile.</p>
                    <Button variant="ghost" size="sm" onClick={fetchAiDayZeroInsights} className="mt-2">Try Again</Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
      <NEUYChat participantContext={`
Domain Burnout Profile scores at Day 0:
Emotional: ${day0?.emotional ?? 'not yet assessed'}
Cognitive: ${day0?.cognitive ?? 'not yet assessed'}
Motivation: ${day0?.motivation ?? 'not yet assessed'}
Relational: ${day0?.relational ?? 'not yet assessed'}

WRS friction points: ${(profile?.entranceData?.workloadFrictionPoints as string[] | undefined)?.join(', ') ?? 'not recorded'}
Relational sub-domain: ${profile?.relationalSubdomain ?? 'not recorded'}
Current intervention day: ${profile?.isDay0Complete ? 'Active intervention' : 'Pre-assessment'}
Week 1 reflection complete: ${profile?.isWeek1ReflectionComplete ? 'Yes' : 'No'}
Day 14 scores available: ${day14 ? 'Yes' : 'No'}
`} />
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-12 h-12 animate-spin text-primary" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}