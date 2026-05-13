'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore } from "@/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendWelcomeEmail } from "@/actions/sendWelcomeEmail";

// ---------------------------------------------------------------------------
// Sub-components defined OUTSIDE the page component so React never unmounts
// them on state updates. Defining components inside a render function creates
// a new reference each render, causing unmount → remount → browser scroll-to-
// focused-element on every click.
// ---------------------------------------------------------------------------

function ButtonSelector({ label, options, value, field, onUpdate }: {
  label: string;
  options: string[];
  value: string;
  field: string;
  onUpdate: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="block text-sm font-bold text-foreground/80">{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onUpdate(field, opt)}
            className={cn(
              "flex items-center justify-center p-3 rounded-xl border-2 transition-all text-xs font-bold",
              value === opt
                ? "border-primary bg-primary text-white shadow-md"
                : "border-slate-100 bg-slate-50 text-muted-foreground hover:border-slate-200"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function Scale10({ label, value, field, onUpdate }: {
  label: string;
  value: number;
  field: string;
  onUpdate: (field: string, value: number) => void;
}) {
  const getButtonColor = (val: number, isSelected: boolean) => {
    if (!isSelected) return "border-slate-100 text-muted-foreground hover:border-muted";
    if (val <= 3) return "bg-red-500 border-red-500 text-white scale-110 shadow-lg";
    if (val <= 6) return "bg-amber-500 border-amber-500 text-white scale-110 shadow-lg";
    return "bg-emerald-500 border-emerald-500 text-white scale-110 shadow-lg";
  };
  return (
    <div className="space-y-4">
      <Label className="block text-base font-bold leading-tight">{label}</Label>
      <div className="grid grid-cols-10 gap-1.5 pt-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => onUpdate(field, val)}
            className={cn(
              "h-10 rounded-lg text-sm font-black transition-all border-2",
              getButtonColor(val, value === val)
            )}
          >
            {val}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-center mt-2">
        1 = Not sustainable at all · 10 = Completely sustainable
      </p>
    </div>
  );
}

const FRICTION_POINTS = [
  "Duplicate data entry",
  "Too many platforms or tools",
  "Excessive admin or paperwork",
  "Last-minute requests",
  "Communication overload",
  "Behaviour or conflict management",
  "Meetings during focused work time",
  "Planning or preparation sprawl",
  "Duty or on-call overload",
  "Unclear expectations or processes",
  "Other"
];

const DURATION_OPTIONS = ["Less than 1 year", "1-2 years", "3-5 years", "5+ years"];
const HOURS_OPTIONS = ["Under 35hrs", "35-45hrs", "45-55hrs", "55hrs+"];
const BREAKS_OPTIONS = ["0-1", "2-3", "4-5", "5+"];
const FREQUENCY_OPTIONS = ["0–1 times", "2–3 times", "3–5 times", "5+ times"];

const SECTOR_OPTIONS = [
  "Education",
  "Healthcare",
  "Social Care",
  "Charity & Non-profit",
  "Government & Public Sector",
  "Financial Services",
  "Legal",
  "Consulting",
  "Technology",
  "Marketing & Communications",
  "Retail & Hospitality",
  "Creative Industries",
  "Other"
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isUserLoading, profile, isProfileLoading } = useUser();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Navigate only after the Firestore onSnapshot listener confirms
  // isEntranceComplete is true in local state, so RouteGuard never
  // evaluates a stale profile.
  useEffect(() => {
    if (submitted && profile?.isEntranceComplete) {
      router.push("/assessment");
    }
  }, [submitted, profile?.isEntranceComplete, router]);

  const [formData, setFormData] = useState({
    occupation: "",
    organisation: "",
    sector: "",
    inviteCode: "",
    durationInRole: "",
    workingHours: "",
    breaksPerDay: "",
    planningTimeLossPerWeek: "",
    taskParalysisPerWeek: "",
    sustainabilityBefore: 5,
    workloadFrictionPoints: [] as string[],
  });

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFrictionPoint = (point: string) => {
    setFormData((prev) => {
      const current = prev.workloadFrictionPoints;
      if (current.includes(point)) {
        return { ...prev, workloadFrictionPoints: current.filter(p => p !== point) };
      }
      if (current.length < 3) {
        return { ...prev, workloadFrictionPoints: [...current, point] };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !firestore || loading) return;

    if (formData.workloadFrictionPoints.length !== 3) return;

    setLoading(true);

    try {
      const userRef = doc(firestore, "users", user.uid);

      await setDoc(userRef, {
        entranceData: {
          occupation: formData.occupation.trim(),
          organisation: formData.organisation.trim(),
          sector: formData.sector,
          inviteCode: formData.inviteCode.trim().toUpperCase() || null,
          durationInRole: formData.durationInRole,
          workingHours: formData.workingHours,
          breaksPerDay: formData.breaksPerDay,
          planningTimeLossPerWeek: formData.planningTimeLossPerWeek,
          taskParalysisPerWeek: formData.taskParalysisPerWeek,
          sustainabilityBefore: formData.sustainabilityBefore,
          workloadFrictionPoints: formData.workloadFrictionPoints,
        },
        isEntranceComplete: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (user.email) {
        sendWelcomeEmail(user.email).catch((err) =>
          console.error('[JIT] Welcome email failed:', err)
        );
      }

      // Signal the useEffect to navigate once the profile snapshot confirms
      // isEntranceComplete — avoids the RouteGuard stale-profile bounce.
      setSubmitted(true);

    } catch (err) {
      console.error("Submission failed:", err);
      setLoading(false);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show the inbox check screen while we wait for Firestore to confirm
  // isEntranceComplete, then the useEffect above redirects to /assessment.
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg space-y-6">

          {/* Hero */}
          <div className="rounded-3xl bg-white border shadow-sm p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-black font-headline tracking-tight">Welcome to the JIT Program.</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your Day 0 materials have been sent to <span className="font-semibold text-foreground">{user?.email}</span>.
            </p>
          </div>

          {/* Spam warning */}
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 space-y-2">
            <p className="text-xs font-black uppercase tracking-widest text-amber-700">Important</p>
            <p className="text-sm text-amber-900 leading-relaxed">
              If you do not see the email within 2 minutes, please check your <strong>Junk / Spam</strong> folder.
              Marking it as <strong>&ldquo;Not Junk&rdquo;</strong> ensures you receive the daily exercises for the next 14 days.
            </p>
            <p className="text-xs text-amber-700 font-medium pt-1">
              Sender: <span className="font-mono">ryan@jaibehavioural.com</span>
            </p>
          </div>

          {/* Next steps */}
          <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">What happens next</p>
            <p className="text-sm text-foreground leading-relaxed">
              Your program starts today. Follow the instructions in your welcome email to complete your <strong>Day 0 baseline assessment</strong> — this unlocks your personalised 14-day exercise plan.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your NEUY coach will be available throughout. You will also receive a Day 7 check-in and a Day 14 follow-up prompt by email.
            </p>
          </div>

          {/* Loading indicator while waiting for Firestore */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Preparing your assessment&hellip;</span>
          </div>

        </div>
      </div>
    );
  }

  const isFormValid =
    formData.occupation.trim() !== "" &&
    formData.organisation.trim() !== "" &&
    formData.sector &&
    formData.durationInRole &&
    formData.workingHours &&
    formData.breaksPerDay &&
    formData.planningTimeLossPerWeek &&
    formData.taskParalysisPerWeek &&
    formData.workloadFrictionPoints.length === 3;

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center pb-24">
      <div className="max-w-2xl w-full space-y-8 pt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold">J</div>
            <h1 className="text-3xl font-black font-headline tracking-tight">Entrance Survey</h1>
          </div>
          <p className="text-muted-foreground">Complete this section to unlock your baseline assessment.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 bg-primary/5">
              <CardTitle className="text-xl font-bold font-headline text-primary">Professional Background</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">

              <div className="space-y-2">
                <Label>Occupation / Job Title</Label>
                <Input value={formData.occupation} onChange={(e) => updateField("occupation", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Organisation</Label>
                <Input value={formData.organisation} onChange={(e) => updateField("organisation", e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label>Sector</Label>
                <Select value={formData.sector} onValueChange={(val) => updateField("sector", val)}>
                  <SelectTrigger className="bg-slate-50/50">
                    <SelectValue placeholder="Select sector" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Invite Code <span className="text-muted-foreground font-normal">(optional — leave blank if you signed up independently)</span></Label>
                <Input
                  value={formData.inviteCode}
                  onChange={(e) => updateField("inviteCode", e.target.value)}
                  placeholder="e.g. SCHOOL01"
                  className="uppercase"
                />
              </div>

              <ButtonSelector
                label="How long have you been in your current role?"
                options={DURATION_OPTIONS}
                value={formData.durationInRole}
                field="durationInRole"
                onUpdate={updateField}
              />

              <ButtonSelector
                label="How many hours do you typically work per week?"
                options={HOURS_OPTIONS}
                value={formData.workingHours}
                field="workingHours"
                onUpdate={updateField}
              />

              <ButtonSelector
                label="How many breaks do you manage to take in an average working day?"
                options={BREAKS_OPTIONS}
                value={formData.breaksPerDay}
                field="breaksPerDay"
                onUpdate={updateField}
              />

              <ButtonSelector
                label="In a typical week, how often do you lose non-contact or planning time to unplanned tasks?"
                options={FREQUENCY_OPTIONS}
                value={formData.planningTimeLossPerWeek}
                field="planningTimeLossPerWeek"
                onUpdate={updateField}
              />

              <ButtonSelector
                label="In a typical week, how often do you experience task paralysis?"
                options={FREQUENCY_OPTIONS}
                value={formData.taskParalysisPerWeek}
                field="taskParalysisPerWeek"
                onUpdate={updateField}
              />

              <div className="pt-4 border-t">
                <Scale10
                  label="Before this pilot, how sustainable does your workload feel?"
                  value={formData.sustainabilityBefore}
                  field="sustainabilityBefore"
                  onUpdate={updateField}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-8 pb-4 bg-primary/5">
              <CardTitle className="text-xl font-bold font-headline text-primary">Workload Reality Scan (WRS)</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <p className="text-sm text-muted-foreground mb-6">Select your top 3 primary friction points.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FRICTION_POINTS.map((point) => (
                  <button
                    key={point}
                    type="button"
                    onClick={() => toggleFrictionPoint(point)}
                    className={cn(
                      "flex items-center justify-start p-4 rounded-2xl border-2 transition-all text-sm font-bold text-left",
                      formData.workloadFrictionPoints.includes(point)
                        ? "border-primary bg-primary text-white shadow-lg"
                        : "border-slate-100 bg-slate-50 text-muted-foreground"
                    )}
                  >
                    {point}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading || !isFormValid} className="w-full rounded-full h-16 font-black text-xl shadow-2xl shadow-primary/20">
            {loading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <CheckCircle2 className="w-6 h-6 mr-3" />}
            Complete & Start Baseline
          </Button>
        </form>
      </div>
    </div>
  );
}