
import * as admin from 'firebase-admin';

// Ensure this file is only run on the server
if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK should not be imported on the client.');
}

if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    console.log('[Firebase Admin] Initializing with explicit credentials from env vars.');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('[Firebase Admin] Initializing with GOOGLE_APPLICATION_CREDENTIALS.');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } else {
    try {
      // Attempt auto-initialization if in a known Firebase environment
      console.log('[Firebase Admin] Attempting auto-initialization (e.g., Firebase Hosting, Cloud Functions).');
      admin.initializeApp();
      console.log('[Firebase Admin] SDK initialized automatically.');
    } catch (e: any) {
      console.error(
        '[Firebase Admin] SDK auto-initialization failed. ' +
        'Ensure credentials are set via environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) ' +
        'or GOOGLE_APPLICATION_CREDENTIALS, or the app is running in a Firebase environment that supports auto-initialization. Error: ',
        e.message
      );
      // It's critical that admin is initialized. If it fails here and there's no fallback,
      // subsequent calls to adminDb or adminMessaging will fail.
      // Consider if you want to throw here or let it fail downstream.
      // For now, we log the error, and it will fail later if not initialized.
    }
  }
} else {
    console.log('[Firebase Admin] SDK already initialized.');
}

let adminDb: admin.firestore.Firestore;
let adminMessaging: admin.messaging.Messaging;

try {
  adminDb = admin.firestore();
  adminMessaging = admin.messaging();
} catch (e: any) {
  console.error("[Firebase Admin] Failed to get Firestore or Messaging service. SDK might not be initialized.", e.message);
  // @ts-ignore
  if (!adminDb) adminDb = {} as admin.firestore.Firestore; // Avoid crashing if accessed before init
  // @ts-ignore
  if (!adminMessaging) adminMessaging = {} as admin.messaging.Messaging; // Avoid crashing
}


export { admin, adminDb, adminMessaging };
