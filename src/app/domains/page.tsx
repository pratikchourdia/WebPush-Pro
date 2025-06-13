
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
}

const SCRIPT_VERSION = "1.8.3"; // Keep version updated if changes are made

function generateFirebaseScripts(config: FirebaseConfig, domainName: string): GeneratedScripts {
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'YOUR_WEBPUSH_PRO_APP_URL';
  const clientAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app';
  const swAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app-sw';

  // Pre-baked log prefixes for Client Script (SCRIPT_VERSION is resolved here)
  const clientLogTag = `[WebPushPro Client v${SCRIPT_VERSION}]`;
  const clientLogInitializing = `${clientLogTag} Initializing script for ${domainName}...`;
  const clientLogFirebaseConfig = `${clientLogTag} Firebase Config for ${domainName}:`;
  const clientLogVapidKey = `${clientLogTag} VAPID Key for ${domainName} (first 10 chars):`;
  const clientLogApiBaseUrl = `${clientLogTag} API Base URL:`;
  const clientLogUsingExistingApp = `${clientLogTag} Using existing Firebase app instance:`;
  const clientLogAppInitialized = `${clientLogTag} Firebase app instance initialized:`;
  const clientLogErrorInitApp = `${clientLogTag} Error initializing Firebase app (${clientAppName}):`;
  const clientLogFirebaseLibNotLoaded = `${clientLogTag} Firebase library not fully loaded (firebase or initializeApp is missing). Ensure firebase-app-compat.js is included on your page BEFORE this script. Check for errors from firebase-app-compat.js itself.`;
  const clientLogAppAvailable = `${clientLogTag} Firebase app (${clientAppName}) is available. Proceeding with Messaging checks.`;
  const clientLogMessagingSupported = `${clientLogTag} Firebase Messaging is supported by this browser.`;
  const clientLogMessagingInit = `${clientLogTag} Firebase Messaging service initialized for app: ${clientAppName}. Messaging object:`;
  const clientLogErrorMessagingInit = `${clientLogTag} Error initializing Firebase Messaging service:`;
  const clientLogMessagingNotSupported = `${clientLogTag} Firebase Messaging is not supported in this browser for ${domainName}. Push notifications will not work. This might be due to an insecure context (HTTP instead of HTTPS), running in an iframe, or browser settings.`;
  const clientLogMessagingLibNotLoaded = `${clientLogTag} Firebase Messaging library (firebase.messaging or firebase.messaging.isSupported) not loaded. Ensure firebase-messaging-compat.js is included on your page BEFORE this script. Check global firebase object:`;
  const clientLogAppNotAvailable = `${clientLogTag} Firebase app (${clientAppName}) not available, skipping Messaging initialization.`;
  const clientLogMessagingUnavailableForPerm = `${clientLogTag} Messaging not available for app ${clientAppName}, cannot request permission or get token for ${domainName}. Check previous logs for initialization errors.`;
  const clientLogVapidMissingForPerm = `${clientLogTag} VAPID_KEY is missing for ${domainName}. Cannot get FCM token. Please configure it in WebPush Pro settings for this domain.`;
  const clientLogRequestingPerm = `${clientLogTag} Requesting notification permission for ${domainName}...`;
  const clientLogPermStatus = `${clientLogTag} Notification permission status for ${domainName}:`;
  const clientLogPermGranted = `${clientLogTag} Notification permission granted for ${domainName}. Attempting to get FCM token using VAPID key (first 10 chars):`;
  const clientLogTokenObtained = `${clientLogTag} FCM Token obtained for ${domainName}:`;
  const clientLogSendingSubscriber = `${clientLogTag} Preparing to send subscriber data to API (${apiBaseUrl}/api/subscribe):`;
  const clientLogApiResponseStatus = `${clientLogTag} API /api/subscribe response status:`;
  const clientLogApiSubSuccess = `${clientLogTag} Subscription successful via API for ${domainName}. Subscriber ID:`;
  const clientLogApiSubError = `${clientLogTag} Subscription API response error for ${domainName}. Status:`;
  const clientLogApiFetchError = `${clientLogTag} Subscription API fetch error for ${domainName}:`;
  const clientLogNoToken = `${clientLogTag} No registration token available for ${domainName}. Check VAPID key, SW registration/activation, permission status, or FCM setup. Ensure your site is HTTPS.`;
  const clientLogErrorGetToken = `${clientLogTag} An error occurred while retrieving FCM token for ${domainName}:`;
  const clientLogCommonTokenErrors = `${clientLogTag} Common token errors: Check VAPID key, ensure firebase-messaging-sw.js is in root & correctly configured (check its console logs), or service worker not active yet.`;
  const clientLogUnableToGetPerm = `${clientLogTag} Unable to get permission to notify for ${domainName}. Permission state: `;
  const clientLogErrorRequestPerm = `${clientLogTag} Error requesting notification permission for ${domainName}:`;
  const clientLogSwApiSupported = `${clientLogTag} Service Worker API is supported. Attempting to register /firebase-messaging-sw.js`;
  const clientLogSwRegistered = `${clientLogTag} SW registered for ${domainName}. Scope:`;
  const clientLogSwRegObject = `${clientLogTag} Registration object:`;
  const clientLogAboutToUseSw = `${clientLogTag} About to call useServiceWorker. Current messaging object:`;
  const clientLogTypeOfUseSw = `${clientLogTag} Type of messaging.useServiceWorker:`;
  const clientLogGlobalFbState = `${clientLogTag} Global firebase object state: `;
  const clientLogGlobalFbMessagingState = `${clientLogTag} Global firebase.messaging state: `;
  const clientLogGlobalFbMessagingInstanceType = `${clientLogTag} Global firebase.messaging() instance type of useServiceWorker:`;
  const clientLogCouldNotGetGlobalMessaging = `${clientLogTag} Could not get global firebase.messaging() instance to check its useServiceWorker type.`;
  const clientLogGlobalMessagingNotFunction = `${clientLogTag} Global firebase.messaging is not a function or firebase object is not fully available.`;
  const clientLogUsingSw = `${clientLogTag} Firebase Messaging is using the registered service worker for app ${clientAppName}`;
  const clientLogCriticalUseSwMissing = `${clientLogTag} CRITICAL ERROR: messaging.useServiceWorker is not a function. \nThis almost always means the Firebase Messaging Compat library (firebase-messaging-compat.js) was not loaded or did not execute correctly on your page *BEFORE* this script. \nTROUBLESHOOTING STEPS (RE-CHECK CAREFULLY): \n1. CHECK CONSOLE FOR OTHER ERRORS: Look for any errors that occurred *before* this one, especially errors originating from firebase-app-compat.js or firebase-messaging-compat.js. These earlier errors can prevent subsequent scripts from working. \n2. VERIFY SCRIPT ORDER AND LOADING IN YOUR WEBSITE'S HTML: \n   - Ensure <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"> AND <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"> tags are in your HTML. \n   - They ABSOLUTELY MUST appear *before* this WebPush Pro script tag. \n   - Check for \`async\` or \`defer\` attributes on these Firebase SDK script tags. If present, they WILL LIKELY cause this script to run too early. Remove them, or ensure this WebPush Pro script is also deferred AND loaded after them. Plain script tags without async/defer are the safest way to ensure order. \n3. CHECK NETWORK TAB: In your browser's developer tools: \n   - Confirm firebase-app-compat.js and firebase-messaging-compat.js downloaded with HTTP 200 OK. \n   - Verify their content looks like valid Firebase SDK code (not an error page or empty file). \n4. INSPECT LOGS ABOVE: Review the "Global firebase object state", "Global firebase.messaging state", "Type of messaging.useServiceWorker" and "Current messaging object" logs. This shows that your specific \`messaging\` object lacks the \`useServiceWorker\` method. \nMessaging object causing the error:`;
  const clientLogWaitingSwReady = `${clientLogTag} Waiting for Service Worker to be ready (controller active)...`;
  const clientLogSwReady = `${clientLogTag} Service Worker is ready. Registration:`;
  const clientLogProceedingReqPerm = `${clientLogTag} Proceeding to request permission and get token...`;
  const clientLogSwReadyError = `${clientLogTag} Service Worker .ready() promise rejected:`;
  const clientLogSwRegFailed = `${clientLogTag} SW registration failed for ${domainName}:`;
  const clientLogSwRegFailedHelp = `${clientLogTag} Ensure firebase-messaging-sw.js is in the root directory of your site and accessible. Check its content and Firebase config.`;
  const clientLogSwNotSupported = `${clientLogTag} Service workers are not supported in this browser for ${domainName}. Push notifications will not work.`;
  const clientLogFbOrMessagingNotInit = `${clientLogTag} Firebase app or messaging service not successfully initialized for ${domainName}. Service Worker setup and token retrieval skipped. Check previous logs for errors (e.g., missing Firebase SDK script includes on your page).`;
  const clientLogFoundGlobalFirebase = `${clientLogTag} Found global firebase object. firebase.SDK_VERSION:`;
  const clientLogFirebaseMessagingAvailable = `${clientLogTag} firebase.messaging is available. firebase.messaging.SDK_VERSION:`;
  const clientLogFirebaseMessagingNotFullyAvailable = `${clientLogTag} firebase.messaging is NOT fully available or firebase.messaging.SDK_VERSION is missing. Ensure firebase-messaging-compat.js loaded AFTER firebase-app-compat.js and BEFORE this script.`;
  const clientLogGlobalFirebaseNotFound = `${clientLogTag} Global firebase object NOT FOUND or firebase.SDK_VERSION is missing. Ensure firebase-app-compat.js is loaded on your page BEFORE this script.`;
  const clientLogDiagnosticUseSwOnMessaging = `${clientLogTag} DIAGNOSTIC: Keys in current messaging instance:`;
  const clientLogDiagnosticErrorIteratingMessaging = `${clientLogTag} DIAGNOSTIC: Error iterating messaging keys:`;
  const clientLogDiagnosticUseSwExists = `${clientLogTag} DIAGNOSTIC: Does 'useServiceWorker' method exist and is a function on messaging instance (iterated)? `;
  const clientLogDiagnosticTypeOfUseSw = `${clientLogTag} DIAGNOSTIC: typeof messaging.useServiceWorker: `;
  const clientLogDiagnosticMessagingInstanceNull = `${clientLogTag} DIAGNOSTIC: Messaging instance is null or undefined before checking useServiceWorker.`;
  const clientLogDiagnosticGlobalMessagingFactory = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging (factory function):`;
  const clientLogDiagnosticGlobalMessagingIsSupportedExists = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging.isSupported exists.`;
  const clientLogDiagnosticGlobalMessagingIsSupportedNotExists = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging.isSupported does NOT exist.`;
  const clientLogDiagnosticGlobalMessagingFactoryNotAvailable = `${clientLogTag} DIAGNOSTIC: Global firebase or firebase.messaging (factory) not available for diagnostics.`;
  const clientLogCriticalUseSwCheck = `${clientLogTag} CRITICAL (useServiceWorker-check): 'messaging.useServiceWorker' is NOT a function. This is the primary failure point.\n    - Local 'messaging' object type: `;


  // Pre-baked log prefixes for Service Worker Script (SCRIPT_VERSION is resolved here)
  const swLogTag = `[WebPushPro SW v${SCRIPT_VERSION}]`;
  const swLogExecuting = `${swLogTag} firebase-messaging-sw.js executing for ${domainName}...`;
  const swLogInitialized = `${swLogTag} Firebase app initialized in SW:`;
  const swLogErrorInitApp = `${swLogTag} Error initializing Firebase app in SW:`;
  const swLogUsingExisting = `${swLogTag} Using existing Firebase app in SW:`;
  const swLogCoreSdkMissing = `${swLogTag} Firebase core SDK (firebase-app-compat.js) not imported or available in SW.`;
  const swLogMessagingInit = `${swLogTag} Firebase Messaging service initialized in SW for app:`;
  const swLogErrorMessagingInit = `${swLogTag} Error initializing Firebase Messaging in SW:`;
  const swLogMessagingSdkMissing = `${swLogTag} Firebase Messaging SDK or Firebase App SW not available for SW Messaging init.`;
  const swLogSetupComplete = `${swLogTag} SW setup attempt complete for ${domainName}.`;
  const swOnBackgroundMessageLogPrefix = `${swLogTag} Received background message:`;


  const clientScript = `
/*
  WebPush Pro - Client Integration Script for ${domainName}
  Version: ${SCRIPT_VERSION}
  
  CRITICAL PREREQUISITES - CHECK THESE ON YOUR WEBSITE (${domainName}):
  1. Firebase SDKs MUST be loaded BEFORE this script. Add these to your <head> or before this script tag:
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"><\/script>
  2. NO ASYNC/DEFER on Firebase SDKs: Ensure these Firebase SDK script tags DO NOT have 'async' or 'defer' attributes.
     If they do, this WebPushPro script may run too early. Remove those attributes, or ensure this script is
     also comparably deferred AND loaded AFTER them. Plain script tags are safest.
  3. CHECK NETWORK TAB: In your browser's developer tools, confirm both Firebase SDKs download with HTTP 200 (OK)
     and their content appears to be valid Firebase JavaScript.
  4. CHECK CONSOLE FOR EARLIER ERRORS: Any errors from 'firebase-app-compat.js' or 'firebase-messaging-compat.js'
     themselves will prevent them from working.
*/
console.log(${JSON.stringify(clientLogInitializing)});
if (typeof firebase !== 'undefined' && firebase.SDK_VERSION) {
    console.log(${JSON.stringify(clientLogFoundGlobalFirebase)}, firebase.SDK_VERSION);
    if (firebase.messaging && typeof firebase.messaging.isSupported === 'function' && firebase.messaging.SDK_VERSION) { 
        console.log(${JSON.stringify(clientLogFirebaseMessagingAvailable)}, firebase.messaging.SDK_VERSION);
    } else {
        console.warn(${JSON.stringify(clientLogFirebaseMessagingNotFullyAvailable)});
    }
} else {
    console.error(${JSON.stringify(clientLogGlobalFirebaseNotFound)});
}

// --- Configuration ---
const firebaseConfig = ${JSON.stringify(config, null, 2)};
console.log(${JSON.stringify(clientLogFirebaseConfig)}, firebaseConfig);

const VAPID_KEY = '${config.vapidKey || ""}';
console.log(${JSON.stringify(clientLogVapidKey)}, VAPID_KEY ? VAPID_KEY.substring(0, 10) + '...' : 'NOT PROVIDED - ESSENTIAL FOR FCM TOKEN');

const API_BASE_URL = '${apiBaseUrl}';
console.log(${JSON.stringify(clientLogApiBaseUrl)}, API_BASE_URL);

const CLIENT_APP_NAME = '${clientAppName}';

// --- Firebase Initialization (Client) ---
let firebaseApp = null;
let messaging = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    const existingApp = firebase.apps.find(app => app.name === CLIENT_APP_NAME);
    if (existingApp) {
        firebaseApp = existingApp;
        console.log(${JSON.stringify(clientLogUsingExistingApp)}, CLIENT_APP_NAME);
    } else {
        try {
            firebaseApp = firebase.initializeApp(firebaseConfig, CLIENT_APP_NAME);
            console.log(${JSON.stringify(clientLogAppInitialized)}, CLIENT_APP_NAME);
        } catch (initError) {
            console.error(${JSON.stringify(clientLogErrorInitApp)}, initError);
        }
    }
} else {
    console.error(${JSON.stringify(clientLogFirebaseLibNotLoaded)});
}

// --- Messaging Initialization and Support Check (strictly conditional on firebaseApp) ---
if (firebaseApp) {
    console.log(${JSON.stringify(clientLogAppAvailable)});
    if (typeof firebase.messaging === 'function' && typeof firebase.messaging.isSupported === 'function') {
        if (firebase.messaging.isSupported()) {
            console.log(${JSON.stringify(clientLogMessagingSupported)});
            try {
                messaging = firebase.messaging(firebaseApp); 
                console.log(${JSON.stringify(clientLogMessagingInit)}, messaging);
            } catch (messagingError) {
                console.error(${JSON.stringify(clientLogErrorMessagingInit)}, messagingError);
            }
        } else {
            console.warn(${JSON.stringify(clientLogMessagingNotSupported)});
        }
    } else {
        console.error(${JSON.stringify(clientLogMessagingLibNotLoaded)}, window.firebase, 'and look for errors from firebase-messaging-compat.js itself.');
    }
} else {
    console.log(${JSON.stringify(clientLogAppNotAvailable)});
}


// --- Subscription Logic ---
function requestPermissionAndGetToken() {
  if (!messaging) {
    console.error(${JSON.stringify(clientLogMessagingUnavailableForPerm)});
    return;
  }
  if (!VAPID_KEY) {
    console.error(${JSON.stringify(clientLogVapidMissingForPerm)});
    return;
  }

  console.log(${JSON.stringify(clientLogRequestingPerm)});
  Notification.requestPermission().then((permission) => {
    console.log(${JSON.stringify(clientLogPermStatus)}, permission);
    if (permission === 'granted') {
      console.log(${JSON.stringify(clientLogPermGranted)}, VAPID_KEY.substring(0, 10) + '...');
      messaging.getToken({ vapidKey: VAPID_KEY })
        .then((currentToken) => {
          if (currentToken) {
            console.log(${JSON.stringify(clientLogTokenObtained)}, currentToken.substring(0, 20) + '...');
            const subscriberData = {
              token: currentToken,
              domainName: '${domainName}',
              userAgent: navigator.userAgent
            };
            console.log(${JSON.stringify(clientLogSendingSubscriber)}, subscriberData);

            fetch(API_BASE_URL + '/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriberData)
            })
            .then(response => {
              console.log(${JSON.stringify(clientLogApiResponseStatus)}, response.status);
              return response.json().then(data => ({ ok: response.ok, status: response.status, data }));
            })
            .then(({ ok, status, data }) => {
              if (ok && data.id) {
                console.log(${JSON.stringify(clientLogApiSubSuccess)}, data.id, 'Full Response:', data);
              } else {
                console.error(${JSON.stringify(clientLogApiSubError)}, status, 'Response Data:', data);
              }
            })
            .catch(err => {
              console.error(${JSON.stringify(clientLogApiFetchError)}, err);
            });
          } else {
            console.warn(${JSON.stringify(clientLogNoToken)});
          }
        }).catch((err) => {
          console.error(${JSON.stringify(clientLogErrorGetToken)}, err);
          console.error(${JSON.stringify(clientLogCommonTokenErrors)});
        });
    } else {
      console.warn(\`\${${JSON.stringify(clientLogUnableToGetPerm)}}\` + permission);
    }
  }).catch(err => {
    console.error(${JSON.stringify(clientLogErrorRequestPerm)}, err);
  });
}

// --- Service Worker Registration and Token Retrieval ---
if (firebaseApp && messaging) {
  if ('serviceWorker' in navigator) {
    console.log(${JSON.stringify(clientLogSwApiSupported)});
    navigator.serviceWorker.register('/firebase-messaging-sw.js') 
      .then(function(registration) {
        console.log(${JSON.stringify(clientLogSwRegistered)}, registration.scope);
        console.log(${JSON.stringify(clientLogSwRegObject)}, registration);
        
        console.log(${JSON.stringify(clientLogAboutToUseSw)}, messaging);
        console.log(${JSON.stringify(clientLogTypeOfUseSw)}, typeof messaging.useServiceWorker);
        console.log(${JSON.stringify(clientLogGlobalFbState)}, window.firebase);

        if (window.firebase && typeof window.firebase.messaging === 'function') {
            console.log(${JSON.stringify(clientLogGlobalFbMessagingState)}, window.firebase.messaging);
            try { 
                const globalMessagingInstance = window.firebase.messaging();
                console.log(${JSON.stringify(clientLogGlobalFbMessagingInstanceType)}, typeof globalMessagingInstance.useServiceWorker);
            } catch(e_diag_global_messaging) { 
                console.warn(${JSON.stringify(clientLogCouldNotGetGlobalMessaging)}, e_diag_global_messaging);
            }
        } else {
             console.log(${JSON.stringify(clientLogGlobalMessagingNotFunction)});
        }

        if (messaging) {
            try {
                let keys = Object.keys(messaging);
                console.log(${JSON.stringify(clientLogDiagnosticUseSwOnMessaging)}, keys.join(', '));
                let hasMethod = keys.includes('useServiceWorker') && typeof messaging.useServiceWorker === 'function';
                console.log(${JSON.stringify(clientLogDiagnosticUseSwExists)}\`\${hasMethod}\`);
            } catch (e_iter) {
                console.error(${JSON.stringify(clientLogDiagnosticErrorIteratingMessaging)}, e_iter);
            }
            console.log(${JSON.stringify(clientLogDiagnosticTypeOfUseSw)}\`\${typeof messaging.useServiceWorker}\`);
        } else {
            console.warn(${JSON.stringify(clientLogDiagnosticMessagingInstanceNull)});
        }
        
        if (messaging && typeof messaging.useServiceWorker === 'function') {
            messaging.useServiceWorker(registration);
            console.log(${JSON.stringify(clientLogUsingSw)});
            
            navigator.serviceWorker.ready.then(function(swReady) {
                console.log(${JSON.stringify(clientLogSwReady)}, swReady);
                console.log(${JSON.stringify(clientLogProceedingReqPerm)});
                requestPermissionAndGetToken();
            }).catch(function(swReadyError){
                console.error(${JSON.stringify(clientLogSwReadyError)}, swReadyError);
            });

        } else {
            let errorDetail = \`\${typeof messaging}\\n\`;
            if (messaging) {
              errorDetail += \`    - Local 'messaging.useServiceWorker' type: \${typeof messaging.useServiceWorker}\\n\`;
            } else {
              errorDetail += \`    - Local 'messaging' object is null/undefined.\\n\`;
            }
            console.error(\`\${${JSON.stringify(clientLogCriticalUseSwCheck)}}\${errorDetail}\`, messaging);
            return;
        }
      }).catch(function(error) {
        console.error(${JSON.stringify(clientLogSwRegFailed)}, error);
        console.error(${JSON.stringify(clientLogSwRegFailedHelp)});
      });
  } else {
    console.warn(${JSON.stringify(clientLogSwNotSupported)});
  }
} else {
  console.warn(${JSON.stringify(clientLogFbOrMessagingNotInit)});
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

console.log(${JSON.stringify(swLogExecuting)});

const firebaseConfigSW = ${JSON.stringify(config, null, 2)};
const SW_APP_NAME_INTERNAL = '${swAppName}';

let firebaseAppSW = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  const existingSwApp = firebase.apps.find(app => app.name === SW_APP_NAME_INTERNAL);
  if (existingSwApp) {
      firebaseAppSW = existingSwApp;
      console.log(${JSON.stringify(swLogUsingExisting)}, SW_APP_NAME_INTERNAL);
  } else {
      try {
        firebaseAppSW = firebase.initializeApp(firebaseConfigSW, SW_APP_NAME_INTERNAL);
        console.log(${JSON.stringify(swLogInitialized)}, SW_APP_NAME_INTERNAL);
      } catch (e) {
        console.error(${JSON.stringify(swLogErrorInitApp)}, e);
      }
  }
} else {
   console.error(${JSON.stringify(swLogCoreSdkMissing)});
}

if (firebaseAppSW && typeof firebase.messaging === 'function') {
  try {
    const messagingSW = firebase.messaging(firebaseAppSW);
    console.log(${JSON.stringify(swLogMessagingInit)}, SW_APP_NAME_INTERNAL);

    // Optional: Handle background messages here
    // messagingSW.onBackgroundMessage(function(payload) {
    //   console.log(${JSON.stringify(swOnBackgroundMessageLogPrefix)}, payload); 
    //   const notificationTitle = payload.notification?.title || 'New Message';
    //   const notificationOptions = {
    //     body: payload.notification?.body || 'You have a new message.',
    //     icon: payload.notification?.icon || '/firebase-logo.png' // Consider a default icon you host
    //   };
    //   return self.registration.showNotification(notificationTitle, notificationOptions);
    // });
  } catch (e) {
    console.error(${JSON.stringify(swLogErrorMessagingInit)}, e);
  }
} else {
  console.error(${JSON.stringify(swLogMessagingSdkMissing)});
}

console.log(${JSON.stringify(swLogSetupComplete)});
`;

  return { clientScript, serviceWorkerScript };
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
      // For testing, make it take a moment and then succeed/fail randomly or based on a condition
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
      // Attempt to update status to error even if verification logic itself threw an error
      const domainRef = doc(db, "domains", domainId);
      try {
        await updateDoc(domainRef, {
          lastVerificationAttempt: newVerificationTime,
          status: 'error', // Ensure status reflects an attempt was made and failed
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
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="client-script">Client-Side Script (for HTML)</TabsTrigger>
                            <TabsTrigger value="sw-script">Service Worker Script (for firebase-messaging-sw.js)</TabsTrigger>
                          </TabsList>
                          <TabsContent value="client-script" className="flex-grow overflow-auto p-1 mt-0">
                            <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-2">
                                Place this script in your website's HTML, ideally before the closing <code className="font-mono bg-background px-1 rounded-sm">&lt;/body&gt;</code> tag.
                                Ensure Firebase SDKs are loaded before this script (see comments within).
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
                        </Tabs>

                        <DialogFooter className="mt-4">
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

    

    
