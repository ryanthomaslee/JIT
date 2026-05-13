import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ParticipantInfoPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="w-full max-w-2xl mx-auto space-y-6">

        {/* Back link */}
        <Link
          href="/consent"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Consent
        </Link>

        {/* Header */}
        <div className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">
            Participant Information Sheet
          </p>
          <h1 className="text-2xl font-black font-headline tracking-tight leading-snug">
            JIT: A Neuroscience-Based Burnout Prevention Pilot
          </h1>
          <p className="text-sm text-muted-foreground pt-1">
            Please read this sheet carefully before providing consent.
          </p>
        </div>

        {/* Study Title */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Study Title
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            JIT: A Neuroscience-Based Burnout Prevention Pilot.
          </p>
        </section>

        {/* Lead Researcher */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Lead Researcher
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            Ryan Lee, Founder — JAI Behavioural.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            This pilot is an independent professional programme conducted by JAI Behavioural. While the lead researcher holds postgraduate qualifications from King's College London, this pilot is not affiliated with, endorsed by, or conducted under the auspices of King's College London.
          </p>
        </section>

        {/* Purpose */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Purpose
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            This program evaluates a <strong>14-day neurodevelopmental intervention</strong> designed
            to reduce occupational burnout and cognitive depletion. The{' '}
            <strong>JIT (Just-In-Time)</strong> programme targets four domains — Cognitive,
            Emotional, Motivational, and Relational — using neuroscience-informed exercises and
            the NEUY AI coach.
          </p>
        </section>

        {/* Target Audience */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Target Audience
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            This pilot is open to professionals across various sectors looking to manage
            depletion and performance.
          </p>
        </section>

        {/* Data Privacy */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Data Privacy
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            All data is encrypted and stored on secure Firebase servers. Identifiable
            information is used only for account management and is never shared.
          </p>
        </section>

        {/* Voluntary Participation */}
        <section className="rounded-3xl bg-white border shadow-sm p-6 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Voluntary Participation
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            You may withdraw at any time without reason or penalty. To withdraw, use the{' '}
            <strong>'Withdraw from Study'</strong> button in your dashboard. You will be asked
            whether you wish to delete all personal data or keep your data in a fully
            anonymised state for research.
          </p>
        </section>

        {/* Footer CTA */}
        <div className="text-center space-y-3 pb-8">
          <Link
            href="/consent"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-black text-sm px-8 py-3 rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Consent Form
          </Link>
          <p className="text-xs text-muted-foreground">
            JAI Behavioural · 2026
          </p>
        </div>

      </div>
    </div>
  );
}
