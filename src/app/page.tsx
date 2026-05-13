'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Waves, Compass, HeartHandshake, FlaskConical, Brain } from 'lucide-react';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';

const ADMIN_EMAIL = 'ryanthomaslee93@gmail.com';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const isAdmin = !isUserLoading && user?.email === ADMIN_EMAIL;

  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="flex flex-col bg-background">
      <header className="px-6 h-16 flex items-center justify-between border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center">
          <Image
            src="/logo1.jpg"
            alt="JIT"
            height={48}
            width={48}
            className="rounded-lg object-cover"
            priority
          />
        </div>
        <nav className="flex items-center">
          {!user ? (
            <div className="flex gap-3 sm:gap-6 items-center">
              <Link href="/auth" className="text-sm font-bold hover:text-primary transition-colors">
                Login
              </Link>
              <Button asChild className="rounded-full px-4 sm:px-6 shadow-sm font-bold shrink-0">
                <Link href="/auth?mode=signup">Sign Up</Link>
              </Button>
            </div>
          ) : (
            <button 
              onClick={handleSignOut}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
            >
              Sign Out
            </button>
          )}
        </nav>
      </header>
      
      <main>

        {/* Coordinator banner — only visible to admin */}
        {isAdmin && (
          <div className="border-b border-slate-200 bg-slate-900 text-white">
            <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="w-4 h-4 text-slate-300" />
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-slate-400 font-mono">
                    JAI Behavioural
                  </p>
                  <p className="text-sm font-semibold text-white mt-0.5">
                    Coordinator access detected
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-white text-slate-900 hover:bg-slate-100 font-semibold text-sm px-5 h-9 rounded shrink-0"
              >
                <Link href="/admin">Enter Research Dashboard →</Link>
              </Button>
            </div>
          </div>
        )}

        <section className="px-6 pt-10 pb-6 text-center max-w-2xl mx-auto flex flex-col items-center">

          {/* JIT text logo */}
          <Image
            src="/logo.png"
            alt="JIT"
            width={300}
            height={120}
            className="w-48 sm:w-56 md:w-[300px] object-contain"
            priority
          />

          {/* Headline */}
          <h1 className="mt-10 text-4xl md:text-5xl font-extrabold tracking-tight font-headline text-foreground leading-[1.15]">
            Know your capacity. Build your reserves. Stay ahead of burnout.
          </h1>

          {/* Description */}
          <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-lg">
            JIT is a neuroscience-based burnout prevention framework. Measure your capacity across four key domains, receive matched interventions, and track your recovery over 14 days.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center w-full sm:w-auto">
            {!user ? (
              <Button size="lg" className="rounded-full px-10 h-12 text-base font-bold shadow-lg shadow-primary/10" asChild>
                <Link href="/auth?mode=signup">Get Started</Link>
              </Button>
            ) : isAdmin ? null : (
              <Button size="lg" className="rounded-full px-10 h-12 text-base font-bold shadow-lg shadow-primary/10" asChild>
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            )}
          </div>

        </section>

        <section className="py-20 bg-white/30 border-y">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/80 border shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Brain className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-headline">Cognitive</h3>
              <p className="text-sm text-muted-foreground">Monitor working memory load, attentional capacity, and decision-making clarity.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/80 border shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-4 text-accent-foreground">
                <Waves className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-headline">Emotional</h3>
              <p className="text-sm text-muted-foreground">Track your ability to regulate stress responses and recover from difficult interactions.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/80 border shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-headline">Motivation</h3>
              <p className="text-sm text-muted-foreground">Measure approach motivation, sense of purpose, and your connection to meaningful work.</p>
            </div>
            <div className="flex flex-col items-center text-center p-8 rounded-3xl bg-white/80 border shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
              <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center mb-4 text-accent-foreground">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 font-headline">Relational</h3>
              <p className="text-sm text-muted-foreground">Assess whether your professional relationships are restoring or depleting your energy.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 py-8 px-6 border-t text-center space-y-1.5">
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
    </div>
  );
}
