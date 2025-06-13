
export interface Domain {
  id: string;
  name: string;
  addedDate: string;
  status: 'verified' | 'pending' | 'error';
  firebaseConfig: FirebaseConfig;
  verificationToken?: string; // For DNS verification
  lastVerificationAttempt?: string; // Optional: To track last attempt
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

export interface Subscriber {
  id: string;
  token: string; // FCM token
  domainName: string; // The domain they subscribed from
  subscribedAt: string; // ISO date string
  userAgent?: string; // Optional: browser/OS info captured from client
}

export interface Campaign {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  domainId: string; // ID of the domain this campaign targets
  domainName: string; // Name of the domain for display
  sentAt: string; // ISO date string
  status: 'sent' | 'draft' | 'failed'; // 'draft' and 'failed' could be future features
  recipients: number; // Placeholder for now, actual count would require backend logic
}
