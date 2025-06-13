
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Code2, CheckCircle, AlertTriangle, Clock, ExternalLink, Loader2, Copy, RefreshCw, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Domain, FirebaseConfig } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const initialFirebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  vapidKey: '',
};

interface GeneratedScripts {
  clientScript: string;
  serviceWorkerScript: string;
  serverApiScriptPHP: string;
}

const SCRIPT_VERSION = "2.0.0"; // Major version change due to new PHP API option

function generateFirebaseScripts(config: FirebaseConfig, domainName: string): GeneratedScripts {
  const clientAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app';
  const swAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app-sw';

  const clientLogTag = `[WebPushPro Client v${SCRIPT_VERSION}]`;
  const swLogTag = `[WebPushPro SW v${SCRIPT_VERSION}]`;

  // Client-side script: Will now call a local /subscribe.php
  const clientScript = `
/*
  WebPush Pro - Client Integration Script for ${domainName}
  Version: ${SCRIPT_VERSION}
  
  CRITICAL PREREQUISITES - CHECK THESE ON YOUR WEBSITE (${domainName}):
  1. Firebase SDKs MUST be loaded BEFORE this script. Add these to your <head> or before this script tag:
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"><\/script>
  2. This script now sends subscription data to '/subscribe.php' on YOUR domain. 
     Ensure the "Server-Side API (PHP)" script is correctly set up at that location on your server.
*/
console.log('${clientLogTag} Initializing for ${domainName}.');

// --- Configuration ---
const firebaseConfig = ${JSON.stringify(config, null, 2)};
const VAPID_KEY = '${config.vapidKey || ""}';
const CLIENT_APP_NAME = '${clientAppName}';
const DOMAIN_NAME = '${domainName}';
const SUBSCRIBE_API_PATH = '/subscribe.php'; // Path to your server-side PHP script

let firebaseApp = null;
let messaging = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  try {
    const existingApp = firebase.apps.find(app => app.name === CLIENT_APP_NAME);
    if (existingApp) {
      firebaseApp = existingApp;
    } else {
      firebaseApp = firebase.initializeApp(firebaseConfig, CLIENT_APP_NAME);
    }
    console.log('${clientLogTag} Firebase app (' + CLIENT_APP_NAME + ') initialized/retrieved.');
  } catch (initError) {
    console.error('${clientLogTag} Error initializing Firebase app (' + CLIENT_APP_NAME + '):', initError);
  }
} else {
  console.error('${clientLogTag} Firebase library (firebase.initializeApp) not found. Ensure firebase-app-compat.js is loaded BEFORE this script.');
}

if (firebaseApp) {
  if (typeof firebase.messaging === 'function' && typeof firebase.messaging.isSupported === 'function') {
    if (firebase.messaging.isSupported()) {
      try {
        messaging = firebase.messaging(firebaseApp);
        console.log('${clientLogTag} Firebase Messaging service instance created for app: ' + CLIENT_APP_NAME);
      } catch (messagingError) {
        console.error('${clientLogTag} Error creating Firebase Messaging service instance:', messagingError);
      }
    } else {
      console.warn('${clientLogTag} Firebase Messaging is not supported by this browser.');
    }
  } else {
    console.error('${clientLogTag} Firebase Messaging (firebase.messaging or firebase.messaging.isSupported) not found. Ensure firebase-messaging-compat.js loaded BEFORE this script.');
  }
}

function requestAndSendToken() {
  if (!messaging) {
    console.error('${clientLogTag} Messaging service not available. Cannot get token.');
    return;
  }
  if (!VAPID_KEY) {
    console.error('${clientLogTag} VAPID_KEY is missing. Cannot get FCM token.');
    return;
  }

  Notification.requestPermission().then((permission) => {
    if (permission === 'granted') {
      console.log('${clientLogTag} Notification permission granted.');
      messaging.getToken({ vapidKey: VAPID_KEY })
        .then((currentToken) => {
          if (currentToken) {
            console.log('${clientLogTag} FCM Token obtained (first 20 chars):', currentToken.substring(0,20) + '...');
            const subscriberData = { token: currentToken, domainName: DOMAIN_NAME, userAgent: navigator.userAgent };
            
            console.log('${clientLogTag} Preparing to send subscriber data to ' + SUBSCRIBE_API_PATH + ' on your server:', subscriberData);
            fetch(SUBSCRIBE_API_PATH, { // Calls your local PHP script
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriberData)
            })
            .then(response => response.json().then(data => ({ok: response.ok, status: response.status, data })))
            .then(({ok, status, data}) => {
              if (ok) console.log('${clientLogTag} Subscription API (your server) success:', data);
              else console.error('${clientLogTag} Subscription API (your server) error. Status:', status, 'Response:', data);
            })
            .catch(err => console.error('${clientLogTag} Subscription API (your server) fetch error:', err));
          } else {
            console.warn('${clientLogTag} No FCM registration token available. Ensure SW is active, VAPID key is correct, and site is HTTPS.');
          }
        }).catch((err) => {
          console.error('${clientLogTag} Error retrieving FCM token:', err);
        });
    } else {
      console.warn('${clientLogTag} Notification permission not granted:', permission);
    }
  }).catch(err => {
    console.error('${clientLogTag} Error requesting notification permission:', err);
  });
}

if (firebaseApp && messaging) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js') // Standard path for FCM
      .then(function(registration) {
        console.log('${clientLogTag} Service Worker registered. Scope:', registration.scope);
        
        if (typeof messaging.useServiceWorker === 'function') {
          messaging.useServiceWorker(registration);
          console.log('${clientLogTag} Firebase Messaging is now using the Service Worker.');
          navigator.serviceWorker.ready.then(function(swReady) {
            console.log('${clientLogTag} Service Worker is ready. Attempting to get token.');
            requestAndSendToken();
          }).catch(swReadyErr => console.error('${clientLogTag} SW .ready() error:', swReadyErr));
        } else {
          console.error(
            '${clientLogTag} CRITICAL ERROR: messaging.useServiceWorker is NOT a function.\\n' +
            'This means firebase-messaging-compat.js did not load or execute correctly *BEFORE* this script, OR it failed to augment the Firebase messaging service.\\n' +
            'TROUBLESHOOTING ON YOUR WEBSITE (' + DOMAIN_NAME + '):\\n' +
            '1. VERIFY SCRIPT TAGS IN HTML: <script src="...firebase-app-compat.js"><\\/script> THEN <script src="...firebase-messaging-compat.js"><\\/script> MUST appear BEFORE this WebPushPro script.\\n' +
            '2. NO ASYNC/DEFER: Remove async/defer from Firebase SDK script tags for simplest loading order.\\n' +
            '3. CHECK CONSOLE: Look for errors from firebase-app-compat.js or firebase-messaging-compat.js themselves.\\n'
          );
        }
      }).catch(function(error) {
        console.error('${clientLogTag} Service Worker registration failed:', error);
      });
  } else {
    console.warn('${clientLogTag} Service workers are not supported in this browser.');
  }
} else {
  console.warn('${clientLogTag} Firebase app or messaging service not initialized. Skipping SW setup and token retrieval.');
}
`;

  const serviceWorkerScript = `
/*
  WebPush Pro - Service Worker Script for ${domainName}
  File: firebase-messaging-sw.js (Place this in the ROOT of your website)
  Version: ${SCRIPT_VERSION}
*/

// These scripts are REQUIRED for the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

console.log('${swLogTag} firebase-messaging-sw.js executing for ${domainName}.');

const firebaseConfigSW = ${JSON.stringify(config, null, 2)};
const SW_APP_NAME_INTERNAL = '${swAppName}'; 

let firebaseAppSW = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  try {
    const existingSwApp = firebase.apps.find(app => app.name === SW_APP_NAME_INTERNAL);
    if (existingSwApp) {
      firebaseAppSW = existingSwApp;
    } else {
      firebaseAppSW = firebase.initializeApp(firebaseConfigSW, SW_APP_NAME_INTERNAL);
    }
    console.log('${swLogTag} Firebase app (' + SW_APP_NAME_INTERNAL + ') initialized/retrieved in SW.');
  } catch (e) {
    console.error('${swLogTag} Error initializing Firebase app in SW:', e);
  }
} else {
  console.error('${swLogTag} Firebase Core SDK (firebase.initializeApp) not available in SW. importScripts failed?');
}

if (firebaseAppSW && typeof firebase.messaging === 'function') {
  try {
    const messagingSW = firebase.messaging(firebaseAppSW);
    console.log('${swLogTag} Firebase Messaging service instance created in SW for app: ' + SW_APP_NAME_INTERNAL);

    // Optional: Handle background messages here
    // messagingSW.onBackgroundMessage(function(payload) {
    //   console.log('${swLogTag} Received background message for ${domainName}:', payload);
    //   const notificationTitle = payload.notification?.title || 'Background Message';
    //   const notificationOptions = {
    //     body: payload.notification?.body || 'Received a message.',
    //     icon: payload.notification?.icon || '/default-icon.png' // Consider a default icon
    //   };
    //   return self.registration.showNotification(notificationTitle, notificationOptions);
    // });
  } catch (e) {
    console.error('${swLogTag} Error creating Firebase Messaging service instance in SW:', e);
  }
} else {
  console.error('${swLogTag} Firebase app in SW not initialized or firebase.messaging not available. Cannot setup SW messaging.');
}
console.log('${swLogTag} SW setup attempt complete for ${domainName}.');
`;

  const serverApiScriptPHP = `<?php
// File: subscribe.php
// WebPush Pro - Server-Side Subscription Handler for ${domainName}
// Version: ${SCRIPT_VERSION}

header('Content-Type: application/json');
error_reporting(0); // Suppress errors from being sent in HTTP response in prod; log them instead.

// --- IMPORTANT: Firebase Admin SDK Setup ---
// 1. Install kreait/firebase-php on your server:
//    composer require kreait/firebase-php
//
// 2. Ensure Composer's autoloader is included. Adjust the path if this script
//    is not in the same directory as your 'vendor' folder.
//    require __DIR__ . '/vendor/autoload.php';
//
// 3. Securely store your Firebase Admin SDK service account JSON key file on your server.
//    DO NOT commit this file to public repositories or expose it via web.
//    Download it from Firebase Console: Project settings > Service accounts > Generate new private key.
//
// 4. Set the correct path to your service account key file below.
//    Using an environment variable is recommended for production.
//
// --- CONFIGURATION ---
$serviceAccountPath = getenv('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH') ?: '/path/to/your/webpush-pro-service-account.json'; // !!! REPLACE THIS PATH !!!
$firebaseProjectId = '${config.projectId}'; // Inferred from your Firebase config

// --- Input Validation & Processing ---
if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Invalid request method. Only POST is allowed.']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

$token = $input['token'] ?? null;
$receivedDomainName = $input['domainName'] ?? null;
$userAgent = $input['userAgent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

if (empty($token) || empty($receivedDomainName)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Missing token or domainName in request body.']);
    exit;
}

// Security: Verify the received domainName matches the domain this script is intended for.
$expectedDomainName = '${domainName}';
if ($receivedDomainName !== $expectedDomainName) {
    error_log("[WebPushPro PHP API] Domain mismatch. Expected: {$expectedDomainName}, Received: {$receivedDomainName}");
    http_response_code(400);
    echo json_encode(['error' => 'Domain mismatch. Subscription rejected.']);
    exit;
}

// --- Firebase Admin SDK Initialization & Firestore Interaction ---
// Ensure you have included the Composer autoloader as mentioned above.
// For example: require_once __DIR__ . '/vendor/autoload.php';

use Kreait\\FirebaseFactory;
use Kreait\\Firebase\\Exception\\FirebaseException;
use Google\\Cloud\\Firestore\\Timestamp; // For Firestore Timestamp

if (!class_exists(FirebaseFactory::class)) {
    error_log("[WebPushPro PHP API] FirebaseFactory class not found. Is kreait/firebase-php installed and autoloaded?");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Firebase Admin SDK library not found.']);
    exit;
}

if (!file_exists($serviceAccountPath)) {
    error_log("[WebPushPro PHP API] Service account file not found at: {$serviceAccountPath}. Please check the path.");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Firebase service account file not found.']);
    exit;
}

try {
    $firebaseFactory = (new FirebaseFactory())->withServiceAccount($serviceAccountPath);
    $firestore = $firebaseFactory->createFirestore();
    $db = $firestore->database(); // Firestore client

    $subscribersCollection = $db->collection('subscribers');
    
    // Check if token already exists for this domain to prevent duplicates (optional but good practice)
    $query = $subscribersCollection->where('token', '==', $token)->where('domainName', '==', $receivedDomainName);
    $existingSubscribers = $query->documents();

    if (!$existingSubscribers->isEmpty()) {
        // Token already exists, perhaps update subscribedAt or just return success
        $existingDocId = $existingSubscribers->rows()[0]->id();
        // $subscribersCollection->document($existingDocId)->set(['subscribedAt' => new Timestamp(new \\DateTimeImmutable())], ['merge' => true]);
        http_response_code(200); // OK
        echo json_encode([
            'message' => 'Subscriber token already exists for this domain.',
            'id' => $existingDocId
        ]);
        exit;
    }
    
    // Add new subscriber
    $newSubscriberRef = $subscribersCollection->add([
        'token' => $token,
        'domainName' => $receivedDomainName,
        'userAgent' => $userAgent,
        'subscribedAt' => new Timestamp(new \\DateTimeImmutable()),
    ]);

    http_response_code(201); // Created
    echo json_encode([
        'message' => 'Subscriber added successfully.',
        'id' => $newSubscriberRef->id(),
    ]);

} catch (FirebaseException $e) {
    error_log("[WebPushPro PHP API] Firestore Error (FirebaseException): " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add subscriber to database.', 'details' => $e->getMessage()]);
    exit;
} catch (\\Exception $e) {
    error_log("[WebPushPro PHP API] General Error: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'An unexpected error occurred.', 'details' => $e->getMessage()]);
    exit;
}

?>`;

  return { clientScript, serviceWorkerScript, serverApiScriptPHP };
}


export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newFirebaseConfig, setNewFirebaseConfig] = useState<FirebaseConfig>(initialFirebaseConfig);
  const [selectedScripts, setSelectedScripts] = useState<GeneratedScripts | null>(null);
  const [selectedDomainNameForScript, setSelectedDomainNameForScript] = useState<string | null>(null);
  const { toast } = useToast();
  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDomains = async () => {
      setIsLoadingDomains(true);
      try {
        const domainsCollection = collection(db, 'domains');
        const q = query(domainsCollection, orderBy('addedDate', 'desc'));
        const querySnapshot = await getDocs(q);
        const domainsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            addedDate: data.addedDate instanceof Timestamp ? data.addedDate.toDate().toISOString().split('T')[0] : data.addedDate,
            lastVerificationAttempt: data.lastVerificationAttempt instanceof Timestamp ? data.lastVerificationAttempt.toDate().toISOString() : data.lastVerificationAttempt,
          } as Domain;
        });
        setDomains(domainsData);
      } catch (error) {
        console.error("Error fetching domains: ", error);
        toast({ title: "Error", description: "Could not fetch domains from database.", variant: "destructive" });
      } finally {
        setIsLoadingDomains(false);
      }
    };
    fetchDomains();
  }, [toast]);

  const handleFirebaseConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFirebaseConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomainName.trim()) {
      toast({ title: "Error", description: "Domain name cannot be empty.", variant: "destructive" });
      return;
    }
    for (const key in newFirebaseConfig) {
      if (!newFirebaseConfig[key as keyof FirebaseConfig]?.trim()) {
        toast({ title: "Error", description: `Firebase ${key.replace(/([A-Z])/g, ' $1').trim()} cannot be empty.`, variant: "destructive" });
        return;
      }
    }

    setIsAddingDomain(true);
    let verificationToken = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      verificationToken = window.crypto.randomUUID();
    } else {
      verificationToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    try {
      const newDomainData: Omit<Domain, 'id' | 'addedDate' | 'lastVerificationAttempt'> & { addedDate: Timestamp, lastVerificationAttempt: Timestamp | null } = {
        name: newDomainName,
        status: 'pending' as Domain['status'],
        firebaseConfig: { ...newFirebaseConfig },
        verificationToken: verificationToken,
        addedDate: Timestamp.fromDate(new Date()),
        lastVerificationAttempt: null,
      };

      const docRef = await addDoc(collection(db, 'domains'), newDomainData);
      setDomains(prev => [{
        id: docRef.id,
        ...newDomainData,
        addedDate: newDomainData.addedDate.toDate().toISOString().split('T')[0],
        lastVerificationAttempt: null,
       } as Domain, ...prev]);
      setNewDomainName('');
      setNewFirebaseConfig(initialFirebaseConfig);
      toast({ title: "Success", description: `Domain ${newDomainName} added. Please verify ownership.` });
    } catch (error) {
      console.error("Error adding domain: ", error);
      toast({ title: "Error", description: "Could not save domain to database.", variant: "destructive" });
    } finally {
      setIsAddingDomain(false);
    }
  };

  const handleVerifyDomain = async (domainId: string, token?: string) => {
    const domainToVerify = domains.find(d => d.id === domainId);
    if (!domainToVerify) {
      toast({ title: "Error", description: "Domain not found.", variant: "destructive" });
      return;
    }
    if (!token) {
      toast({ title: "Error", description: "Verification token not found for this domain.", variant: "destructive" });
      return;
    }

    setVerifyingDomainId(domainId);
    const newVerificationTime = Timestamp.fromDate(new Date());
    try {
      // Simulate verification - in a real app, you'd query DNS or a verification endpoint
      console.log(`Simulating verification for domain ${domainToVerify.name} (ID: ${domainId}) with token ${token}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      const isActuallyVerified = true; // Replace with actual verification logic

      const domainRef = doc(db, "domains", domainId);

      if (isActuallyVerified) {
        await updateDoc(domainRef, {
          status: 'verified',
          lastVerificationAttempt: newVerificationTime,
        });
        setDomains(prevDomains =>
          prevDomains.map(d =>
            d.id === domainId ? { ...d, status: 'verified', lastVerificationAttempt: newVerificationTime.toDate().toISOString() } : d
          )
        );
        toast({ title: "Verification Successful", description: `Domain ${domainToVerify.name} is now verified.` });
      } else {
        await updateDoc(domainRef, {
          status: 'error',
          lastVerificationAttempt: newVerificationTime,
        });
        setDomains(prevDomains =>
          prevDomains.map(d =>
            d.id === domainId ? { ...d, status: 'error', lastVerificationAttempt: newVerificationTime.toDate().toISOString() } : d
          )
        );
        toast({ title: "Verification Failed", description: `Could not verify ${domainToVerify.name}. Please ensure the TXT record is correctly set up and has propagated.`, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error verifying domain: ", error);
      const domainRef = doc(db, "domains", domainId);
      try {
        await updateDoc(domainRef, {
          lastVerificationAttempt: newVerificationTime,
          status: 'error',
        });
        setDomains(prevDomains =>
          prevDomains.map(d =>
            d.id === domainId ? { ...d, status: 'error', lastVerificationAttempt: newVerificationTime.toDate().toISOString() } : d
          )
        );
      } catch (updateError) {
        console.error("Error updating domain after verification failure: ", updateError);
      }
      toast({ title: "Verification Error", description: `An error occurred while trying to verify ${domainToVerify.name}.`, variant: "destructive" });
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const getStatusIcon = (status: Domain['status']) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: message });
    }).catch(err => {
      toast({ title: "Failed to copy", description: "Could not copy to clipboard.", variant: "destructive"});
      console.error('Failed to copy: ', err);
    });
  };

  const handleOpenGetScriptDialog = (domain: Domain) => {
    const scripts = generateFirebaseScripts(domain.firebaseConfig, domain.name);
    setSelectedScripts(scripts);
    setSelectedDomainNameForScript(domain.name);
  };


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Manage Domains"
        description="Add and verify your domains to start sending push notifications."
      />

      <Card className="mb-8 shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle>Add New Domain</CardTitle>
          <CardDescription>Enter the domain you want to enable push notifications for, along with its Firebase configuration.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="space-y-6">
            <div>
              <Label htmlFor="domainName">Domain Name</Label>
              <Input
                id="domainName"
                type="text"
                placeholder="e.g., example.com (without https://)"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value.replace(/^https?:\/\//, '').replace(/\/$/, ''))}
                className="text-base"
                required
              />
            </div>

            <fieldset className="space-y-4 p-4 border rounded-md">
              <legend className="text-sm font-medium text-muted-foreground px-1">Firebase Configuration</legend>
              <p className="text-xs text-muted-foreground mb-3 px-1">
                Need help finding these values? Refer to the
                <a
                  href="https://firebase.google.com/docs/web/setup#config-object"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center ml-1"
                >
                  Firebase documentation <ExternalLink className="h-3 w-3 ml-1" />
                </a>.
                 Ensure this Firebase project is set up for Web Push (FCM) and you have the VAPID key (Public Key from Cloud Messaging settings).
              </p>
              {(Object.keys(newFirebaseConfig) as Array<keyof FirebaseConfig>).map((key) => (
                <div key={key}>
                  <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <Input
                    id={key}
                    name={key}
                    type={(key.includes('Key') || key.includes('Id')) && key !== 'vapidKey' ? 'password' : 'text'}
                    placeholder={`Firebase ${key.replace(/([A-Z])/g, ' $1').trim()}`}
                    value={newFirebaseConfig[key]}
                    onChange={handleFirebaseConfigChange}
                    required
                    className="text-base"
                  />
                   {key === 'vapidKey' && <p className="text-xs text-muted-foreground mt-1">This is the "Public key" or "Web push certificate (key pair)" from Firebase Project Settings &gt; Cloud Messaging.</p>}
                </div>
              ))}
            </fieldset>

            <Button type="submit" className="w-full sm:w-auto" disabled={isAddingDomain}>
              {isAddingDomain ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <PlusCircle className="mr-2 h-5 w-5" />}
              {isAddingDomain ? "Adding..." : "Add Domain"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {isLoadingDomains ? (
          <>
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </>
        ) : domains.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-xl font-semibold">No domains added yet.</p>
            <p>Add your first domain to get started!</p>
          </div>
        ) : (
          domains.map((domain) => (
            <Card key={domain.id} className="shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-headline">{domain.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {getStatusIcon(domain.status)}
                    <span className="capitalize">{domain.status}</span>
                  </div>
                </div>
                <CardDescription>
                  Added: {new Date(domain.addedDate).toLocaleDateString()}
                  {domain.lastVerificationAttempt && (
                     ` | Last verification: ${new Date(domain.lastVerificationAttempt).toLocaleString()}`
                  )}
                </CardDescription>
              </CardHeader>
              {domain.status === 'pending' && domain.verificationToken && (
                <CardContent className="pt-0">
                  <div className="bg-muted/50 p-4 rounded-md border border-dashed">
                    <p className="text-sm font-medium text-foreground mb-2">Verify Domain Ownership</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      To verify <strong>{domain.name}</strong>, add this TXT record to your DNS settings:
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside mb-3 space-y-0.5">
                      <li><strong>Type:</strong> TXT</li>
                      <li><strong>Name/Host:</strong> @ (or your domain name, e.g., {domain.name})</li>
                      <li><strong>Value/Content:</strong> (Click to copy)</li>
                    </ul>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                       <Input
                          readOnly
                          value={`webpush-pro-verification=${domain.verificationToken}`}
                          className="text-xs flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 cursor-pointer"
                          onClick={() => copyToClipboard(`webpush-pro-verification=${domain.verificationToken!}`, "Verification TXT record value copied.")}
                        />
                       <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(`webpush-pro-verification=${domain.verificationToken!}`, "Verification TXT record value copied.")}
                        >
                         <Copy className="h-3 w-3" />
                       </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      DNS changes can take time to propagate (up to 48 hours, but often much faster). Click "Verify Domain" after adding the record.
                    </p>
                  </div>
                </CardContent>
              )}
              <CardFooter className="flex flex-wrap justify-end gap-2">
                {(domain.status === 'pending' || domain.status === 'error') && (
                  <Button
                    variant="default"
                    onClick={() => handleVerifyDomain(domain.id, domain.verificationToken)}
                    disabled={verifyingDomainId === domain.id}
                  >
                    {verifyingDomainId === domain.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {verifyingDomainId === domain.id ? "Verifying..." : (domain.status === 'error' ? "Retry Verification" : "Verify Domain")}
                  </Button>
                )}
                {domain.status === 'verified' && (
                  <Dialog onOpenChange={(open) => !open && setSelectedScripts(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => handleOpenGetScriptDialog(domain)}>
                        <Code2 className="mr-2 h-5 w-5" /> Get Scripts
                      </Button>
                    </DialogTrigger>
                    {selectedScripts && selectedDomainNameForScript === domain.name && (
                       <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Integration Scripts for {selectedDomainNameForScript}</DialogTitle>
                          <DialogDescription>
                            Use these scripts to integrate WebPush Pro with your website. Version: {SCRIPT_VERSION}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Tabs defaultValue="client-script" className="flex-grow flex flex-col overflow-hidden">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="client-script">Client-Side Script (HTML)</TabsTrigger>
                            <TabsTrigger value="sw-script">Service Worker (JS)</TabsTrigger>
                            <TabsTrigger value="server-api-php">Server-Side API (PHP)</TabsTrigger>
                          </TabsList>
                          <TabsContent value="client-script" className="flex-grow overflow-auto p-1 mt-0">
                            <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-2">
                                Place this script in your website's HTML, ideally before the closing <code className="font-mono bg-background px-1 rounded-sm">&lt;/body&gt;</code> tag.
                                Ensure Firebase SDKs (<code className="font-mono">firebase-app-compat.js</code>, <code className="font-mono">firebase-messaging-compat.js</code>) are loaded before this script.
                              </p>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.clientScript}</code>
                              </pre>
                               <Button 
                                onClick={() => copyToClipboard(selectedScripts.clientScript, "Client-side script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy Client Script
                              </Button>
                            </div>
                          </TabsContent>
                          <TabsContent value="sw-script" className="flex-grow overflow-auto p-1 mt-0">
                             <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-2">
                                Create a file named <code className="font-mono bg-background px-1 rounded-sm">firebase-messaging-sw.js</code> in the
                                ROOT directory of your website and paste this content into it.
                              </p>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.serviceWorkerScript}</code>
                              </pre>
                              <Button 
                                onClick={() => copyToClipboard(selectedScripts.serviceWorkerScript, "Service Worker script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy Service Worker Script
                              </Button>
                            </div>
                          </TabsContent>
                           <TabsContent value="server-api-php" className="flex-grow overflow-auto p-1 mt-0">
                             <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-1">
                                Create a file named <code className="font-mono bg-background px-1 rounded-sm">subscribe.php</code> in the
                                ROOT directory of your website <code className="font-mono bg-background px-1 rounded-sm">({domain.name}/subscribe.php)</code> and paste this content into it.
                              </p>
                              <strong className="text-sm text-destructive">IMPORTANT SETUP REQUIRED:</strong>
                              <ul className="text-xs text-muted-foreground list-disc list-inside my-2 space-y-0.5">
                                <li>Install <code className="font-mono bg-background px-1 rounded-sm">kreait/firebase-php</code> via Composer: <code className="font-mono">composer require kreait/firebase-php</code> on your server.</li>
                                <li>Ensure Composer's autoloader is included in the PHP script (e.g., <code className="font-mono">require __DIR__ . '/vendor/autoload.php';</code>).</li>
                                <li>Download your Firebase Admin SDK service account JSON key from Firebase Console (Project settings &gt; Service accounts).</li>
                                <li>Securely store this JSON key file on your server (e.g., outside the web root).</li>
                                <li>Update the <code className="font-mono bg-background px-1 rounded-sm">$serviceAccountPath</code> variable in the PHP script to the correct path of your service account key file.</li>
                              </ul>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.serverApiScriptPHP}</code>
                              </pre>
                              <Button 
                                onClick={() => copyToClipboard(selectedScripts.serverApiScriptPHP, "Server-Side API (PHP) script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy PHP API Script
                              </Button>
                            </div>
                          </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-4 pt-4 border-t">
                          <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
    

    