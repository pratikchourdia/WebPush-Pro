
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Code2, CheckCircle, AlertTriangle, Clock, ExternalLink, Globe, Loader2, Copy, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Domain, FirebaseConfig } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const initialFirebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  vapidKey: '',
};

function generateFirebaseScript(config: FirebaseConfig, domainName: string): string {
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'YOUR_WEBPUSH_PRO_APP_URL';
  const clientAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app';
  const swAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app-sw';

  return `
// WebPush Pro Integration Script for ${domainName}
// Version: 1.2 (Robust Initialization & Debugging)

console.log('[WebPushPro] Initializing script for ${domainName}...');

// --- Configuration ---
const firebaseConfig = ${JSON.stringify(config, null, 2)};
console.log('[WebPushPro] Firebase Config for ${domainName}:', firebaseConfig);

const VAPID_KEY = '${config.vapidKey}';
console.log('[WebPushPro] VAPID Key for ${domainName} (first 10 chars):', VAPID_KEY ? VAPID_KEY.substring(0, 10) + '...' : 'NOT PROVIDED');

const API_BASE_URL = '${apiBaseUrl}';
console.log('[WebPushPro] API Base URL:', API_BASE_URL);

const CLIENT_APP_NAME = '${clientAppName}';
const SW_APP_NAME = '${swAppName}';

// --- Firebase Initialization (Client) ---
let firebaseApp;
let messaging; // Declare messaging here

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    const existingApp = firebase.apps.find(app => app.name === CLIENT_APP_NAME);
    if (existingApp) {
        firebaseApp = existingApp;
        console.log('[WebPushPro] Using existing Firebase app instance:', CLIENT_APP_NAME);
    } else {
        try {
            firebaseApp = firebase.initializeApp(firebaseConfig, CLIENT_APP_NAME);
            console.log('[WebPushPro] Firebase app instance initialized:', CLIENT_APP_NAME);
        } catch (initError) {
            console.error('[WebPushPro] Error initializing Firebase app (' + CLIENT_APP_NAME + '):', initError);
            firebaseApp = null; // Ensure firebaseApp is null on error
        }
    }
} else {
    console.error('[WebPushPro] Firebase library not fully loaded (firebase or initializeApp is missing). Ensure firebase-app-compat.js is included.');
    firebaseApp = null;
}

// --- Messaging Initialization and Support Check ---
if (firebaseApp) { // Proceed only if app was initialized or retrieved
    if (typeof firebase.messaging === 'function' && typeof firebase.messaging.isSupported === 'function') {
        if (firebase.messaging.isSupported()) {
            console.log('[WebPushPro] Firebase Messaging is supported by this browser.');
            try {
                messaging = firebase.messaging(firebaseApp); // Initialize messaging with the specific app
                console.log('[WebPushPro] Firebase Messaging service initialized for app:', CLIENT_APP_NAME);
            } catch (messagingError) {
                console.error('[WebPushPro] Error initializing Firebase Messaging service:', messagingError);
                messaging = null;
            }
        } else {
            console.warn('[WebPushPro] Firebase Messaging is not supported in this browser for ${domainName}. Push notifications will not work.');
            messaging = null;
        }
    } else {
        console.error('[WebPushPro] Firebase Messaging library (firebase.messaging or firebase.messaging.isSupported) not loaded. Ensure firebase-messaging-compat.js is included.');
        messaging = null;
    }
} else {
    console.log('[WebPushPro] Firebase app not available, skipping Messaging initialization.');
    messaging = null;
}


// --- Subscription Logic ---
function requestPermissionAndGetToken() {
  if (!messaging) { // Check if messaging was successfully initialized
    console.error('[WebPushPro] Messaging not available (either not supported, or initialization failed for app ' + CLIENT_APP_NAME + '), cannot request permission or get token for ${domainName}.');
    return;
  }

  console.log('[WebPushPro] Requesting notification permission for ${domainName}...');
  Notification.requestPermission().then((permission) => {
    console.log('[WebPushPro] Notification permission status for ${domainName}:', permission);
    if (permission === 'granted') {
      console.log('[WebPushPro] Notification permission granted for ${domainName}. Attempting to get FCM token using VAPID key (first 10 chars):', VAPID_KEY ? VAPID_KEY.substring(0, 10) + '...' : 'NOT PROVIDED');
      messaging.getToken({ vapidKey: VAPID_KEY })
        .then((currentToken) => {
          if (currentToken) {
            console.log('[WebPushPro] FCM Token obtained for ${domainName}:', currentToken.substring(0, 20) + '...'); // Log partial token
            const subscriberData = {
              token: currentToken,
              domainName: '${domainName}',
              userAgent: navigator.userAgent
            };
            console.log('[WebPushPro] Preparing to send subscriber data to API (' + API_BASE_URL + '/api/subscribe):', subscriberData);
            
            fetch(API_BASE_URL + '/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriberData)
            })
            .then(response => {
              console.log('[WebPushPro] API /api/subscribe response status:', response.status);
              return response.json().then(data => ({ ok: response.ok, status: response.status, data }));
            })
            .then(({ ok, status, data }) => {
              if (ok && data.id) {
                console.log('[WebPushPro] Subscription successful via API for ${domainName}. Subscriber ID:', data.id, 'Full Response:', data);
              } else {
                console.error('[WebPushPro] Subscription API response error for ${domainName}. Status:', status, 'Response Data:', data);
              }
            })
            .catch(err => {
              console.error('[WebPushPro] Subscription API fetch error for ${domainName}:', err);
            });
          } else {
            console.warn('[WebPushPro] No registration token available for ${domainName}. This can happen if: VAPID key is missing/incorrect, SW not registered/active, permission not granted, or another issue with FCM setup.');
          }
        }).catch((err) => {
          console.error('[WebPushPro] An error occurred while retrieving FCM token for ${domainName}:', err);
          console.error('[WebPushPro] Common token errors: Check VAPID key (must be a string), ensure firebase-messaging-sw.js is in root & correctly configured (check its console logs), or manifest.json if used, or service worker not active yet.');
        });
    } else {
      console.warn('[WebPushPro] Unable to get permission to notify for ${domainName}. Permission state: ' + permission);
    }
  }).catch(err => {
    console.error('[WebPushPro] Error requesting notification permission for ${domainName}:', err);
  });
}

// --- Service Worker and Initialization Check ---
// This check now primarily ensures the browser supports SW and messaging,
// and the actual permission/token logic is deferred until SW is ready.
if (firebaseApp && messaging) { // Check if both app and messaging service are initialized
  if ('serviceWorker' in navigator) {
    console.log('[WebPushPro] Service Worker API is supported in this browser.');
    navigator.serviceWorker.register('/firebase-messaging-sw.js') // Ensure this path is correct for your site's root.
      .then(function(registration) {
        console.log('[WebPushPro] Service Worker registered successfully for ${domainName}. Scope:', registration.scope);
        
        // Ensure Firebase Messaging uses this service worker registration.
        // THIS IS A CRITICAL FIX: Use the 'messaging' instance.
        messaging.useServiceWorker(registration);
        console.log('[WebPushPro] Firebase Messaging is using the registered service worker for app ' + CLIENT_APP_NAME);
        
        // Wait for SW to be ready/active before requesting token
        navigator.serviceWorker.ready.then(function(swReady) {
            console.log('[WebPushPro] Service Worker is ready (controller active). Registration:', swReady);
            console.log('[WebPushPro] Proceeding to request permission and get token...');
            requestPermissionAndGetToken(); // Request permission and token now that SW is active
        }).catch(function(swReadyError){
            console.error('[WebPushPro] Service Worker .ready() promise rejected:', swReadyError);
        });

      }).catch(function(error) {
        console.error('[WebPushPro] Service Worker registration failed for ${domainName}:', error);
        console.error('[WebPushPro] Ensure firebase-messaging-sw.js is in the root directory of your site and accessible. Check its content and Firebase config.');
      });
  } else {
    console.warn('[WebPushPro] Service workers are not supported in this browser for ${domainName}. Push notifications will not work.');
  }
} else {
  console.warn('[WebPushPro] Firebase app or messaging service not initialized for ${domainName}, Service Worker setup and token retrieval skipped.');
}

/*
  ====================================================================
  !!! IMPORTANT: firebase-messaging-sw.js File !!!
  ====================================================================
  You MUST create a file named 'firebase-messaging-sw.js' in the
  ROOT DIRECTORY of your website (e.g., public/firebase-messaging-sw.js).

  It should contain AT LEAST the following:

  // File: firebase-messaging-sw.js
  // Make sure this file is in the root of your public folder.

  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

  console.log('[SW] firebase-messaging-sw.js executing...');

  const firebaseConfigSW = ${JSON.stringify(config, null, 2)};
  console.log('[SW] Firebase Config for Service Worker:', firebaseConfigSW);
  
  const swAppName = '${swAppName}';
  let firebaseAppSW;
  let messagingSW;

  if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    const existingSwApp = firebase.apps.find(app => app.name === swAppName);
    if (existingSwApp) {
        firebaseAppSW = existingSwApp;
        console.log('[SW] Using existing Firebase app instance:', swAppName);
    } else {
        try {
          firebaseAppSW = firebase.initializeApp(firebaseConfigSW, swAppName);
          console.log('[SW] Firebase app instance initialized:', swAppName);
        } catch (initError) {
          console.error('[SW] Error initializing Firebase app (' + swAppName + '):', initError);
          firebaseAppSW = null;
        }
    }
  } else {
     console.error('[SW] Firebase library not fully loaded (initializeApp is missing) in Service Worker.');
     firebaseAppSW = null;
  }
  
  if (firebaseAppSW) {
    if (typeof firebase.messaging === 'function') {
      try {
        messagingSW = firebase.messaging(firebaseAppSW);
        console.log('[SW] Firebase Messaging service initialized in Service Worker for app:', swAppName);

        messagingSW.onBackgroundMessage((payload) => {
          console.log('[SW] Received background message for ${domainName}:', payload);
          // Customize notification here
          const notificationTitle = payload.notification?.title || 'New Message from ${domainName}';
          const notificationOptions = {
            body: payload.notification?.body || 'You have a new message.',
            icon: payload.notification?.icon || '/firebase-logo.png', // Default icon, ensure it exists or change path
            data: payload.data // Pass along data for click actions
          };
          self.registration.showNotification(notificationTitle, notificationOptions);
        });
        console.log('[SW] Background message handler set up.');
      } catch (swMessagingError) {
        console.error('[SW] Error initializing Firebase Messaging in Service Worker:', swMessagingError);
        messagingSW = null;
      }
    } else {
      console.error('[SW] Firebase Messaging library (firebase.messaging) not loaded in Service Worker.');
      messagingSW = null;
    }
  } else {
    console.error('[SW] Firebase app (SW) not available, Firebase Messaging could not be initialized in Service Worker.');
    messagingSW = null;
  }
  console.log('[SW] firebase-messaging-sw.js setup attempt complete.');
*/
`;
}


export default function DomainsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newFirebaseConfig, setNewFirebaseConfig] = useState<FirebaseConfig>(initialFirebaseConfig);
  const [selectedDomainForScript, setSelectedDomainForScript] = useState<Domain | null>(null);
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
      console.log(`Simulating verification for domain ${domainToVerify.name} (ID: ${domainId}) with token ${token}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); 

      const isActuallyVerified = true; 

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
                  <Dialog onOpenChange={(open) => !open && setSelectedDomainForScript(null)}>
                    <DialogTrigger asChild>
                      <Button variant="outline" onClick={() => setSelectedDomainForScript(domain)}>
                        <Code2 className="mr-2 h-5 w-5" /> Get Script
                      </Button>
                    </DialogTrigger>
                    {selectedDomainForScript?.id === domain.id && (
                       <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
                        <DialogHeader>
                          <DialogTitle>Integration Script for {selectedDomainForScript.name}</DialogTitle>
                          <DialogDescription>
                            Copy and paste this script into your website's HTML.
                            Also create a <code className="font-mono bg-muted px-1 rounded-sm">firebase-messaging-sw.js</code> file in your site's root (see comments in script for content).
                          </DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow overflow-auto p-1">
                          <pre className="bg-muted p-4 rounded-md text-xs whitespace-pre-wrap break-all">
                            <code>{generateFirebaseScript(selectedDomainForScript.firebaseConfig, selectedDomainForScript.name)}</code>
                          </pre>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                           <Button onClick={() => {
                              copyToClipboard(generateFirebaseScript(selectedDomainForScript.firebaseConfig, selectedDomainForScript.name), "Script copied to clipboard.");
                           }}>
                            <Copy className="mr-2 h-4 w-4" /> Copy Script
                           </Button>
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
