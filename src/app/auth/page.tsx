
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useUser } from "@/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from "next/image";
import { Loader2, MailCheck } from "lucide-react";

type View = "auth" | "reset";

function mapFirebaseError(message: string): string {
  if (
    message.includes("user-not-found") ||
    message.includes("invalid-credential") ||
    message.includes("wrong-password")
  )
    return "Incorrect details. If you usually sign in with Google, use the 'Continue with Google' button above.";
  if (message.includes("invalid-email"))
    return "Please enter a valid email address.";
  if (message.includes("too-many-requests"))
    return "Too many attempts. Please wait a moment and try again.";
  if (message.includes("email-already-in-use"))
    return "An account with this email already exists.";
  if (message.includes("weak-password"))
    return "Password must be at least 6 characters.";
  return "An error occurred. Please try again.";
}

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "signup";
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  // If the user is already authenticated, skip the auth page entirely.
  // This kills the back-button sync-wheel loop.
  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, isUserLoading, router]);

  const [view, setView] = useState<View>("auth");
  const [isSignUp, setIsSignUp] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isSignUp) {
        if (inviteCode) window.localStorage.setItem('jai_invite_code', inviteCode.trim());
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      setError(mapFirebaseError(raw));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      if (isSignUp && inviteCode) window.localStorage.setItem('jai_invite_code', inviteCode.trim());
      await signInWithPopup(auth, new GoogleAuthProvider());
      router.replace("/");
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "";
      setError(mapFirebaseError(raw));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setResetSent(true);
      }
    } catch {
      setError("Could not send reset email. Please check your connection.");
    } finally {
      setResetLoading(false);
    }
  };

  const enterResetView = () => {
    setResetEmail(email); // pre-fill if user already typed their email
    setError("");
    setResetSent(false);
    setView("reset");
  };

  const exitResetView = () => {
    setError("");
    setResetSent(false);
    setView("auth");
  };

  // ─── Reset password view ──────────────────────────────────────────────────
  if (view === "reset") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-5">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo1.jpg" alt="JIT brain graphic" width={140} height={140} className="rounded-2xl" priority />
          <Image src="/logo.png" alt="JIT" width={72} height={28} className="object-contain" />
        </div>
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary rounded-2xl">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-headline font-bold">Reset Password</CardTitle>
            <CardDescription>
              Enter your email and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {resetSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MailCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-foreground">Check your inbox</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A reset link has been sent to <span className="font-medium text-foreground">{resetEmail}</span>.
                    <br />It may take a minute to arrive.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetLoading}
                    className="bg-muted/30"
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full font-bold h-11" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center">
            <button
              onClick={exitResetView}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to sign in
            </button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ─── Auth view (sign in / sign up) ────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 gap-5">
      <div className="flex flex-col items-center gap-3">
        <Image src="/logo1.jpg" alt="JIT brain graphic" width={160} height={160} className="rounded-2xl" priority />
        <Image src="/logo.png" alt="JIT" width={80} height={32} className="object-contain" />
      </div>
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary rounded-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-headline font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Start your burnout prevention journey today" : "Sign in to access your assessment data"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Google sign-in */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-semibold"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={enterResetView}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || googleLoading}
                  className="bg-muted/30"
                />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">Invite Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="Enter code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    disabled={loading || googleLoading}
                    className="bg-muted/30 font-mono tracking-widest uppercase"
                  />
                </div>
              )}
              <Button type="submit" className="w-full font-bold h-11" disabled={loading || googleLoading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSignUp ? "Sign Up" : "Sign In"}
              </Button>
            </form>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
              className="text-primary font-semibold hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
