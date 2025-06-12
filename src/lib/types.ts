
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
  domainId: string;
  domainName: string;
  subscribedAt: string;
  userAgent?: string; // Optional: browser/OS info
}

export interface Campaign {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  sentAt: string;
  status: 'sent' | 'draft' | 'failed';
  recipients: number;
}
