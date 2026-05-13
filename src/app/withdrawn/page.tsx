import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

export default function WithdrawnPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-6">

        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            JIT · JAI Behavioural
          </p>
          <h1 className="text-3xl font-black font-headline tracking-tight">
            Thank you for participating.
          </h1>
        </div>

        <p className="text-base text-muted-foreground leading-relaxed">
          Your withdrawal has been recorded. You will no longer receive program communications
          and your participation has ended.
        </p>

        <div className="rounded-2xl bg-white border shadow-sm p-5 text-sm text-left space-y-2 text-muted-foreground">
          <p className="font-semibold text-foreground">What happens next</p>
          <p className="leading-relaxed">
            Your data collected up to this point is retained but will not be included in
            the final analysis. If you would like your data deleted entirely, please email{' '}
            <a href="mailto:ryan@jaibehavioural.com" className="font-bold text-primary underline underline-offset-2">
              ryan@jaibehavioural.com
            </a>{' '}
            with the subject line <em>"Data Deletion Request — JIT P2"</em>.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Your contribution to this research — however brief — is genuinely appreciated.
        </p>

        <Link
          href="/"
          className="inline-block text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Return to homepage
        </Link>

        <p className="text-xs text-muted-foreground pt-4">
          JAI Behavioural · 2026
        </p>

      </div>
    </div>
  );
}
