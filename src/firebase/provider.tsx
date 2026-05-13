'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot, DocumentData, runTransaction, serverTimestamp } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface UserProfile extends DocumentData {
  id: string;
  participantId: string;
  email?: string;
  status?: 'active' | 'waitlist';
  isEntranceComplete: boolean;
  isDay0Complete: boolean;
  isExitComplete: boolean;
  isWeek1ReflectionComplete?: boolean;
  isSubdomainComplete?: boolean;
  isTierOrientationComplete?: boolean;
  isReadinessComplete?: boolean;
  isDay14AssessmentComplete?: boolean;
  isProtocolSeen?: boolean;
  isHighDepletion?: boolean;
  consentGiven?: boolean;
  consentedAt?: any;
  lastActiveAt?: any;
  day14UnlockDate?: any;
  baselineDate?: any;
  day0CompletedAt?: any;
  createdAt?: any;
  updatedAt?: any;
  entranceData?: Record<string, unknown>;
}

export interface FirebaseContextState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  profile: UserProfile | null;
  isUserLoading: boolean;
  isProfileLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * Atomically ensures a user profile document exists.
 * The existence check, counter increment, and document creation all happen
 * inside a single transaction — preventing duplicate participant IDs if
 * onAuthStateChanged fires more than once for the same user.
 */
const VIP_INVITE_CODE = 'JAI2026';

async function ensureUserProfile(
  firestore: Firestore,
  uid: string,
  email: string | null,
  inviteCode?: string,
): Promise<void> {
  const userRef = doc(firestore, 'users', uid);
  const counterRef = doc(firestore, 'meta', 'participantCounter');

  const roll = Math.floor(Math.random() * 6) + 1; // 1–6: roll === 1 (1-in-6) → waitlist
  const isWaitlisted = (inviteCode !== VIP_INVITE_CODE && roll === 1);
  const userStatus: 'active' | 'waitlist' = isWaitlisted ? 'waitlist' : 'active';

  await runTransaction(firestore, async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const existing = userSnap.exists() ? userSnap.data() : null;

    // Always proceed if participantId is missing — regardless of whether the
    // document exists. A page-level write (e.g. tier-orientation) can race
    // ahead and create the document before this transaction completes, leaving
    // participantId and status permanently absent.
    if (existing?.participantId) {
      // Document is fully initialised — only backfill email if missing.
      if (!existing.email && email) {
        transaction.set(userRef, { email, updatedAt: serverTimestamp() }, { merge: true });
      }
      return;
    }

    // participantId is absent (doc missing or partial) — claim the next counter slot.
    const counterSnap = await transaction.get(counterRef);
    const next = counterSnap.exists() ? (counterSnap.data().count as number) + 1 : 1;
    const participantId = `P2-${String(next).padStart(3, '0')}`;

    const updates: Record<string, unknown> = {
      participantId,
      status: userStatus,
      isWaitlistControl: isWaitlisted,
      waitlistedAt: isWaitlisted ? serverTimestamp() : null,
      email: email ?? existing?.email ?? null,
      updatedAt: serverTimestamp(),
    };

    // Only set createdAt if the document doesn't already have it.
    if (!existing?.createdAt) {
      updates.createdAt = serverTimestamp();
    }

    console.log('WRITING TO FIRESTORE:', { participantId, userStatus, isWaitlisted });

    transaction.set(counterRef, { count: next }, { merge: true });
    // merge: true — safe whether the document exists (partial) or not (new).
    transaction.set(userRef, updates, { merge: true });
  });
}

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [userError, setUserError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setIsUserLoading(false);
        if (!firebaseUser) {
          setProfile(null);
          setIsProfileLoading(false);
        }
      },
      (error) => {
        setUserError(error);
        setIsUserLoading(false);
      }
    );
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!user || !firestore) return;

    setIsProfileLoading(true);
    const docRef = doc(firestore, 'users', user.uid);

    // Atomically create profile (or backfill email) — safe against double-fire
    // Read invite code stored by the auth page (cleared after first use)
    const storedInviteCode = typeof window !== 'undefined'
      ? (window.localStorage.getItem('jai_invite_code') ?? undefined)
      : undefined;
    ensureUserProfile(firestore, user.uid, user.email ?? null, storedInviteCode).catch((err: unknown) => {
      console.error('Profile creation error:', err);
    });
    // Clear after use so it can't be replayed
    if (typeof window !== 'undefined') window.localStorage.removeItem('jai_invite_code');

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile({ ...snapshot.data(), id: snapshot.id } as UserProfile);
        } else {
          setProfile(null);
        }
        setIsProfileLoading(false);
      },
      (error) => {
        console.error("Profile sync error:", error);
        setIsProfileLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  const contextValue = useMemo(() => ({
    firebaseApp,
    firestore,
    auth,
    user,
    profile,
    isUserLoading,
    isProfileLoading,
    userError,
  }), [firebaseApp, firestore, auth, user, profile, isUserLoading, isProfileLoading, userError]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  return context;
};

export const useAuth = () => useFirebase().auth;
export const useFirestore = () => useFirebase().firestore;
export const useUser = () => {
  const { user, isUserLoading, userError, profile, isProfileLoading } = useFirebase();
  return { user, isUserLoading, userError, profile, isProfileLoading };
};