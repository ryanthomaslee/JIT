"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, ArrowLeft, PartyPopper } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ExitSurveyPage() {
  const router = useRouter();
  const { user, isUserLoading, profile, isProfileLoading } = useUser();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    experienceChangeScore: 5,
    interventionUtilityScore: 5,
    continueUsageLikelihood: 5,
    workloadChange: "",
    impactfulPart: "",
    programmeChange: "",
    specificAnecdote: "",
    wantFullToolkit: "",
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/auth");
    }
  }, [user, isUserLoading, router]);

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    setLoading(true);
    const userRef = doc(firestore, "users", user.uid);

    setDocumentNonBlocking(userRef, {
      exitData: formData,
      isExitComplete: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setSubmitted(true);
    setLoading(false);
  };

  const Scale10 = ({ label, value, field, leftLabel, rightLabel }: any) => (
    <div className="space-y-4">
      <Label className="block text-base font-bold leading-tight">{label}</Label>
      <div className="grid grid-cols-10 gap-1.5 pt-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => updateField(field, val)}
            className={cn(
              "h-10 rounded-lg text-sm font-black transition-all border-2",
              value === val 
                ? "border-primary bg-primary text-white scale-110" 
                : "border-slate-100 text-muted-foreground hover:border-muted"
            )}
          >
            {val}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest px-1 font-bold">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-5 text-center">

          <div className="w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mx-auto">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">JIT Program Complete</p>
            <h2 className="text-3xl font-black font-headline tracking-tight">You did it.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Your 14-day JIT journey is complete. Thank you for your commitment — the data you have contributed will directly inform the next iteration of this programme.
            </p>
          </div>

          <div className="rounded-3xl bg-white border shadow-sm p-6 text-left space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Data</p>
            <p className="text-sm text-foreground leading-relaxed">
              Your responses have been securely stored and <strong>anonymised using your participant code</strong>. No personally identifiable information is retained beyond what is required for programme delivery. Your email address will not be used for any future communications.
            </p>
          </div>

          <Button asChild className="w-full rounded-full h-14 font-bold text-lg shadow-xl shadow-primary/20">
            <Link href="/dashboard">View Your Progress Report</Link>
          </Button>

          <p className="text-xs text-muted-foreground">JAI Behavioural · 2026</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pb-24">
      <div className="max-w-2xl w-full space-y-8 pt-10">
        <div className="space-y-4">
          <Link href="/dashboard" className="text-xs font-black text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">J</div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Pilot Exit Survey</h1>
          </div>
          <p className="text-muted-foreground">Final reflection on your 14-day JIT journey.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 bg-primary/5">
              <CardTitle className="text-xl font-bold font-headline text-primary">Quantitative Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <Scale10 
                label="Overall, how much has your experience of work changed over the 14 days?"
                value={formData.experienceChangeScore}
                field="experienceChangeScore"
                leftLabel="No change"
                rightLabel="Significant change"
              />
              <Scale10 
                label="How useful was your assigned intervention?"
                value={formData.interventionUtilityScore}
                field="interventionUtilityScore"
                leftLabel="Not useful"
                rightLabel="Very useful"
              />
              <Scale10 
                label="How likely are you to continue using it?"
                value={formData.continueUsageLikelihood}
                field="continueUsageLikelihood"
                leftLabel="Unlikely"
                rightLabel="Very likely"
              />
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 bg-primary/5">
              <CardTitle className="text-xl font-bold font-headline text-primary">Qualitative Feedback</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-3">
                <Label className="font-bold leading-tight">What has changed most about how you experience your workload?</Label>
                <Textarea 
                  value={formData.workloadChange} 
                  onChange={(e) => updateField("workloadChange", e.target.value)} 
                  placeholder="Your reflections..."
                  className="min-h-[100px] bg-slate-50/50"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="font-bold leading-tight">Which part of the programme had the most impact and why?</Label>
                <Textarea 
                  value={formData.impactfulPart} 
                  onChange={(e) => updateField("impactfulPart", e.target.value)} 
                  placeholder="Identify the most effective element..."
                  className="min-h-[100px] bg-slate-50/50"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="font-bold leading-tight">What would you change about the 14-day programme?</Label>
                <Textarea 
                  value={formData.programmeChange} 
                  onChange={(e) => updateField("programmeChange", e.target.value)} 
                  placeholder="Help us improve the pilot..."
                  className="min-h-[100px] bg-slate-50/50"
                  required
                />
              </div>
              <div className="space-y-3 pt-4 border-t">
                <Label className="font-bold leading-tight text-primary">Optional: Is there a specific moment where you noticed a difference?</Label>
                <Textarea 
                  value={formData.specificAnecdote} 
                  onChange={(e) => updateField("specificAnecdote", e.target.value)} 
                  placeholder="Share a story or 'aha' moment..."
                  className="min-h-[100px] bg-slate-50/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 bg-primary/5">
              <CardTitle className="text-xl font-bold font-headline text-primary">The Future</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <Label className="text-base font-bold block">Would you want to see the full JIT Toolkit?</Label>
              <RadioGroup 
                value={formData.wantFullToolkit} 
                onValueChange={(val) => updateField("wantFullToolkit", val)} 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                required
              >
                {["Yes", "No", "Maybe"].map(v => (
                  <div key={v} className={cn(
                    "flex items-center space-x-2 p-4 border-2 rounded-2xl transition-all cursor-pointer",
                    formData.wantFullToolkit === v ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 hover:border-slate-200"
                  )}>
                    <RadioGroupItem value={v} id={`final-${v}`} />
                    <Label htmlFor={`final-${v}`} className="text-base font-bold cursor-pointer">{v}</Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            disabled={loading || !formData.wantFullToolkit} 
            className="w-full rounded-full h-16 font-black text-xl shadow-2xl shadow-primary/20"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <CheckCircle2 className="w-6 h-6 mr-3" />}
            Submit & Complete Pilot
          </Button>
        </form>
      </div>
    </div>
  );
}
