
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
  // domainId: string; // Consider adding this for more robust querying
  subscribedAt: string; // ISO date string
  userAgent?: string; // Optional: browser/OS info captured from client
}

export interface CampaignSentStats {
  successCount: number;
  failureCount: number;
}

export interface Campaign {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  domainId: string; // ID of the domain this campaign targets
  domainName: string; // Name of the domain for display
  sentAt: string; // ISO date string when it was marked to be sent or processing started
  processedAt?: string; // ISO date string when processing by FCM API finished
  status: 'pending_send' | 'sending' | 'processed' | 'failed_to_send_trigger' | 'processed_no_subscribers' | 'processed_no_valid_tokens' | 'failed_processing' | 'draft';
  recipients: number; // Total number of subscribers targeted initially
  sentStats?: CampaignSentStats; // Breakdown of sent, failed
}
