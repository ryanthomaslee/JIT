'use client';

import { useEffect, useRef, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const ACTIVITY_DEBOUNCE_MS = 5 * 60 * 1000; // write at most once every 5 minutes

const PUBLIC_ROUTES = ["/", "/auth"];
// These routes are accessible to everyone regardless of auth or journey state
const OPEN_ROUTES = ["/info", "/withdrawn"];
const ADMIN_EMAIL = "ryanthomaslee93@gmail.com";
const isDev = process.env.NODE_ENV === "development";

function GuardContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading, isProfileLoading, profile } = useUser();
  const lastWriteRef = useRef<number>(0);

  const handleEscapeSignOut = async () => {
    await signOut(auth);
    router.replace("/auth");
  };

  // Debounced lastActiveAt heartbeat — at most one Firestore write per 5 minutes
  useEffect(() => {
    if (!user || user.email === ADMIN_EMAIL) return;
    const now = Date.now();
    if (now - lastWriteRef.current < ACTIVITY_DEBOUNCE_MS) return;
    lastWriteRef.current = now;
    console.log('Heartbeat: Updating lastActiveAt');
    setDoc(doc(firestore, 'users', user.uid), {
      lastActiveAt: serverTimestamp(),
    }, { merge: true }).catch((err: unknown) => console.error('Heartbeat write failed:', err));
  }, [pathname, user, firestore]);

  useEffect(() => {
    // --- Admin route bifurcation ---
    // Only needs auth resolution; profile state is irrelevant for coordinators.
    if (pathname.startsWith("/admin")) {
      if (isUserLoading) return;
      if (!user) router.replace("/auth");
      else if (user.email !== ADMIN_EMAIL) router.replace("/auth");
      return;
    }

    // Open routes are always accessible — skip all gates
    if (OPEN_ROUTES.includes(pathname)) return;

    // --- Participant routes ---
    if (isUserLoading || isProfileLoading) return;
    // Auth resolved but Firestore profile hasn't arrived yet — hold until it does
    // so we never act on profile=null and misfire a /consent redirect.
    if (user && !profile) return;
    const isPublic = PUBLIC_ROUTES.includes(pathname);

    console.log('Auth State:', user?.email ?? 'unauthenticated', '| path:', pathname, '| profileLoading:', isProfileLoading);

    if (!user) {
      if (!isPublic) router.replace("/auth");
      return;
    }

    // Admin user is exempt from all participant journey gates
    if (user.email === ADMIN_EMAIL) {
      if (pathname === "/auth") router.replace("/");
      return;
    }

    const consentGiven = profile?.consentGiven ?? false;
    const isDay0Complete = profile?.isDay0Complete ?? false;
    const isEntranceComplete = profile?.isEntranceComplete ?? false;
    const isTierOrientationComplete = profile?.isTierOrientationComplete ?? isDay0Complete;
    const isReadinessComplete = profile?.isReadinessComplete ?? isDay0Complete;
    const isSubdomainComplete = profile?.isSubdomainComplete ?? true;
    const isProtocolSeen = profile?.isProtocolSeen ?? false;
    const isDay14AssessmentComplete = profile?.isDay14AssessmentComplete ?? false;
    const isExitComplete = profile?.isExitComplete ?? false;
    const isWaitlisted = profile?.status === 'waitlist';

    // Waitlist users may not access protocol content or exercises — but they
    // must still complete the onboarding/baseline journey (tier-orientation,
    // readiness, entrance survey, Day 0 assessment) so baseline data is captured.
    const WAITLISTED_BLOCKED = ['/protocol', '/exercises'];
    if (isWaitlisted && WAITLISTED_BLOCKED.some(r => pathname.startsWith(r))) {
      router.replace('/dashboard');
      return;
    }

    // Helper: redirect to the first incomplete step after consent
    const redirectToCurrentStep = () => {
      if (!isTierOrientationComplete) router.replace("/tier-orientation");
      else if (!isReadinessComplete) router.replace("/readiness");
      else if (!isEntranceComplete) router.replace("/onboarding");
      else if (!isDay0Complete) router.replace("/assessment");
      else if (!isSubdomainComplete) router.replace("/subdomain");
      // Waitlisted users skip the protocol screen and land on dashboard to wait
      else if (!isProtocolSeen && !isWaitlisted) router.replace("/protocol");
      else router.replace("/dashboard");
    };

    if (pathname === "/") {
      if (!consentGiven) router.replace("/consent");
      else redirectToCurrentStep();
      return;
    }
    // Pre-consent users may stay on /auth so they can sign out and re-register
    // with a corrected email address. Only redirect away once consent is given.
    if (pathname === "/auth") {
      if (consentGiven) redirectToCurrentStep();
      return;
    }

    if (!isPublic) {
      // Step 0: consent gate — must be accepted before any participant route
      if (!consentGiven) {
        if (pathname !== "/consent") router.replace("/consent");
        return;
      }
      // Prevent revisiting consent once given
      if (pathname === "/consent") {
        redirectToCurrentStep();
        return;
      }

      if (!isTierOrientationComplete) {
        if (pathname !== "/tier-orientation") router.replace("/tier-orientation");
        return;
      }
      if (!isReadinessComplete) {
        if (pathname !== "/readiness") router.replace("/readiness");
        return;
      }
      if (!isEntranceComplete) {
        if (pathname !== "/onboarding") router.replace("/onboarding");
        return;
      }
      if (!isDay0Complete) {
        if (pathname !== "/assessment") router.replace("/assessment");
        return;
      }
      if (!isSubdomainComplete) {
        if (pathname !== "/subdomain") router.replace("/subdomain");
        return;
      }
      if (!isProtocolSeen && !isWaitlisted) {
        if (pathname !== "/protocol") router.replace("/protocol");
        return;
      }
      // /exit requires Day 14 assessment to be submitted
      if (pathname === "/exit" && !isDay14AssessmentComplete && !isExitComplete && !isDev) {
        router.replace("/dashboard");
        return;
      }
    }

    if (pathname === "/tier-orientation" && isTierOrientationComplete) {
      router.replace("/readiness");
      return;
    }
    if (pathname === "/readiness" && isReadinessComplete) {
      router.replace("/onboarding");
      return;
    }
    if (pathname === "/onboarding" && isEntranceComplete) {
      router.replace("/assessment");
      return;
    }
    if (pathname === "/subdomain" && isSubdomainComplete) {
      router.replace("/protocol");
      return;
    }
  }, [user, isUserLoading, isProfileLoading, profile, pathname, router]);

  const isAuthorized = (() => {
    // Admin routes only need auth — do not gate on profile loading.
    if (pathname.startsWith("/admin")) {
      if (isUserLoading) return false;
      return !!user && user.email === ADMIN_EMAIL;
    }

    // Open routes bypass all auth and journey gates
    if (OPEN_ROUTES.includes(pathname)) return true;

    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (isUserLoading || isProfileLoading) return false;
    // Same gap guard as the redirect effect — hold the spinner rather than
    // computing isAuthorized against a null profile and flashing /consent.
    if (user && !profile) return false;
    if (!user) return isPublic;

    // Admin user is exempt from all participant journey gates
    if (user.email === ADMIN_EMAIL) return true;
    // Pre-consent users are allowed on /auth so they can sign out and fix their email
    const consentGiven = profile?.consentGiven ?? false;
    if (!consentGiven && pathname === "/auth") return true;
    if (isPublic && pathname !== "/") return false;
    const isDay0Complete = profile?.isDay0Complete ?? false;
    const isEntranceComplete = profile?.isEntranceComplete ?? false;
    const isTierOrientationComplete = profile?.isTierOrientationComplete ?? isDay0Complete;
    const isReadinessComplete = profile?.isReadinessComplete ?? isDay0Complete;
    const isSubdomainComplete = profile?.isSubdomainComplete ?? true;
    const isProtocolSeen = profile?.isProtocolSeen ?? false;
    const isDay14AssessmentComplete = profile?.isDay14AssessmentComplete ?? false;
    const isExitComplete = profile?.isExitComplete ?? false;
    const isWaitlisted = profile?.status === 'waitlist';

    // Waitlist gate — protocol content and exercises require active status.
    // Onboarding/baseline steps (/tier-orientation, /readiness, etc.) remain
    // accessible so baseline data can be collected before promotion.
    const WAITLISTED_BLOCKED = ['/protocol', '/exercises'];
    if (isWaitlisted && WAITLISTED_BLOCKED.some(r => pathname.startsWith(r))) return false;

    // Step 0: without consent the only authorised non-public route is /consent itself
    if (!consentGiven) return pathname === "/consent";
    // Once consented, block revisiting /consent
    if (pathname === "/consent") return false;

    if (!isTierOrientationComplete && pathname !== "/tier-orientation") return false;
    if (isTierOrientationComplete && !isReadinessComplete && pathname !== "/readiness") return false;
    if (isReadinessComplete && !isEntranceComplete && pathname !== "/onboarding") return false;
    if (isEntranceComplete && !isDay0Complete && pathname !== "/assessment") return false;
    if (isDay0Complete && !isSubdomainComplete && pathname !== "/subdomain") return false;
    // Waitlisted users skip the protocol screen — they land on /dashboard to wait for promotion
    if (isDay0Complete && isSubdomainComplete && !isProtocolSeen && !isWaitlisted && pathname !== "/protocol") return false;
    if (!isDev && pathname === "/exit" && !isDay14AssessmentComplete && !isExitComplete) return false;
    if (!isDev && isDay0Complete && isSubdomainComplete && (isProtocolSeen || isWaitlisted) && (
      pathname === "/onboarding" ||
      pathname === "/tier-orientation" ||
      pathname === "/readiness" ||
      pathname === "/subdomain"
    )) return false;
    return true;
  })();

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">
          Synchronising Journey...
        </p>
        {user && (
          <button
            onClick={handleEscapeSignOut}
            className="mt-4 text-[11px] text-muted-foreground/60 hover:text-muted-foreground underline underline-offset-4 transition-colors"
          >
            Use a different account
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

export function RouteGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <GuardContent>{children}</GuardContent>
    </Suspense>
  );
}
