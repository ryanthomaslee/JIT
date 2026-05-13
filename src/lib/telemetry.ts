import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

/**
 * Supported event types for the pilot study passive data collection.
 * Extend this union as new trackable actions are added.
 *
 * NOTE: 'recovery_email_sent' is written server-side by the cron job (firebase-admin)
 * and intentionally absent here — it bypasses this client-side helper entirely.
 */
export type TelemetryEventType =
  | 'chat_session_started'
  | 'tool_selected'
  | 'module_completed'
  | 'exercise_started'
  | 'exercise_completed'
  | 'reflection_submitted';

/**
 * Silently logs a telemetry event to the user's `activity_logs` subcollection.
 * Never throws — failures are swallowed so tracking never disrupts the UX.
 *
 * @param firestore  - Firestore instance from useFirestore()
 * @param userId     - The authenticated user's UID
 * @param eventType  - A TelemetryEventType string identifying what happened
 * @param eventData  - Arbitrary key/value payload describing the event detail
 */
export async function logEvent(
  firestore: Firestore,
  userId: string,
  eventType: TelemetryEventType,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const logsRef = collection(firestore, 'users', userId, 'activity_logs');
    await addDoc(logsRef, {
      eventType,
      eventData,
      timestamp: serverTimestamp(),
    });
  } catch {
    // Silent failure — telemetry must never break or block the user experience
  }
}
