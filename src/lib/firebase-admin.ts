/**
 * Server-side Firebase Admin SDK initialisation.
 *
 * Required environment variable (add to .env.local and your deployment secrets):
 *
 *   APP_SERVICE_ACCOUNT_JSON=<base64-encoded service account JSON>
 *
 * To generate:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. base64 encode the downloaded file:
 *        macOS/Linux: cat serviceAccount.json | base64 | pbcopy
 *   3. Paste the result as the env var value.
 */

import * as admin from 'firebase-admin';

function initAdmin(): admin.app.App {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const encoded = process.env.APP_SERVICE_ACCOUNT_JSON;
  if (!encoded) {
    throw new Error(
      'APP_SERVICE_ACCOUNT_JSON is not set. ' +
      'See src/lib/firebase-admin.ts for setup instructions.'
    );
  }

  const serviceAccount = JSON.parse(
    Buffer.from(encoded, 'base64').toString('utf-8')
  ) as admin.ServiceAccount;

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminApp = initAdmin();
export const adminDb = admin.firestore(adminApp);
