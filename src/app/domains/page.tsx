
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
  serverApiScriptPHPComposer: string;
  serverApiScriptPHPNoComposer: string;
}

const SCRIPT_VERSION = "2.1.0"; // Major version change due to new PHP API option & No Composer option

// Pre-construct log prefixes to ensure SCRIPT_VERSION is evaluated during generation
const clientLogTag = `[WebPushPro Client v${SCRIPT_VERSION}]`;
const swLogTag = `[WebPushPro SW v${SCRIPT_VERSION}]`;
const phpApiLogTag = `[WebPushPro PHP API v${SCRIPT_VERSION}]`;

function generateFirebaseScripts(config: FirebaseConfig, domainName: string): GeneratedScripts {
  const clientAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app';
  const swAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app-sw';
  
  // Client script log messages
  const clientLogInitializing = `${clientLogTag} Initializing for ${domainName}.`;
  const clientLogFirebaseConfig = `${clientLogTag} Firebase Config for ${domainName}:`;
  const clientLogVapidKey = `${clientLogTag} VAPID Key for ${domainName} (first 10 chars):`;
  const clientLogExistingApp = `${clientLogTag} Using existing Firebase app instance: ${clientAppName}`;
  const clientLogAppInitialized = `${clientLogTag} Firebase app instance initialized: ${clientAppName}`;
  const clientLogAppInitError = `${clientLogTag} Error initializing Firebase app (${clientAppName}):`;
  const clientLogFirebaseLibNotFound = `${clientLogTag} Firebase library not fully loaded (firebase or initializeApp is missing).`;
  const clientLogAppAvailableMsgCheck = `${clientLogTag} Firebase app (${clientAppName}) is available. Proceeding with Messaging checks.`;
  const clientLogMessagingSupported = `${clientLogTag} Firebase Messaging is supported by this browser.`;
  const clientLogMessagingInstanceCreated = `${clientLogTag} Firebase Messaging service initialized for app: ${clientAppName}`;
  const clientLogMessagingInitError = `${clientLogTag} Error initializing Firebase Messaging service:`;
  const clientLogMessagingNotSupported = `${clientLogTag} Firebase Messaging is not supported in this browser for ${domainName}.`;
  const clientLogMessagingLibNotFound = `${clientLogTag} Firebase Messaging library (firebase.messaging or firebase.messaging.isSupported) not loaded.`;
  const clientLogAppNotAvailableSkipMsg = `${clientLogTag} Firebase app (${clientAppName}) not available, skipping Messaging initialization.`;
  const clientLogMessagingNotAvailable = `${clientLogTag} Messaging not available for app ${clientAppName}, cannot request permission or get token for ${domainName}.`;
  const clientLogVapidMissing = `${clientLogTag} VAPID_KEY is missing for ${domainName}. Cannot get FCM token.`;
  const clientLogRequestingPermission = `${clientLogTag} Requesting notification permission for ${domainName}...`;
  const clientLogPermissionStatus = `${clientLogTag} Notification permission status for ${domainName}:`;
  const clientLogPermGranted = `${clientLogTag} Notification permission granted for ${domainName}. Attempting to get FCM token using VAPID key (first 10 chars):`;
  const clientLogTokenObtained = `${clientLogTag} FCM Token obtained for ${domainName} (first 20 chars):`;
  const clientLogSendingSubscriber = `${clientLogTag} Preparing to send subscriber data to /subscribe.php on your server (${domainName}):`;
  const clientLogApiResponseStatus = `${clientLogTag} Subscription API (your server /subscribe.php) response status:`;
  const clientLogApiSubSuccess = `${clientLogTag} Subscription API (your server /subscribe.php) success. Subscriber ID:`;
  const clientLogApiSubError = `${clientLogTag} Subscription API (your server /subscribe.php) error. Status:`;
  const clientLogApiFetchError = `${clientLogTag} Subscription API (your server /subscribe.php) fetch error:`;
  const clientLogNoToken = `${clientLogTag} No registration token available for ${domainName}.`;
  const clientLogTokenError = `${clientLogTag} An error occurred while retrieving FCM token for ${domainName}:`;
  const clientLogTokenErrorCommon = `${clientLogTag} Common token errors: Check VAPID key, ensure firebase-messaging-sw.js is in root & correctly configured (check its console logs), or service worker not active yet.`;
  const clientLogPermNotGranted = `${clientLogTag} Unable to get permission to notify for ${domainName}. Permission state:`;
  const clientLogPermRequestError = `${clientLogTag} Error requesting notification permission for ${domainName}:`;
  const clientLogSwApiSupported = `${clientLogTag} Service Worker API is supported. Attempting to register /firebase-messaging-sw.js`;
  const clientLogSwRegistered = `${clientLogTag} Service Worker registered successfully for ${domainName}. Scope:`;
  const clientLogDiagAboutToCallUseSw = `${clientLogTag} DIAGNOSTIC: About to call useServiceWorker.`;
  const clientLogDiagMessagingObject = `${clientLogTag} DIAGNOSTIC: Current messaging object:`;
  const clientLogDiagTypeOfUseSw = `${clientLogTag} DIAGNOSTIC: typeof messaging.useServiceWorker:`;
  const clientLogDiagGlobalFirebase = `${clientLogTag} DIAGNOSTIC: Global firebase object state:`;
  const clientLogDiagGlobalMessaging = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging state:`;
  const clientLogDiagGlobalMessagingUseSw = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging() instance typeof useServiceWorker:`;
  const clientLogDiagCouldNotGetGlobalMessaging = `${clientLogTag} DIAGNOSTIC: Could not get global firebase.messaging() instance to check its useServiceWorker type. This is usually fine if a named app is used.`;
  const clientLogDiagGlobalMessagingNotFunction = `${clientLogTag} DIAGNOSTIC: Global firebase.messaging is not a function or firebase object is not fully available.`;
  const clientLogMessagingUsingSw = `${clientLogTag} Firebase Messaging is using the registered service worker for app ${clientAppName}`;
  const clientLogDiagUseSwIsFunction = `${clientLogTag} DIAGNOSTIC: messaging.useServiceWorker IS a function.`;
  const clientLogDiagUseSwNotFunctionCritical = `${clientLogTag} CRITICAL ERROR: messaging.useServiceWorker is NOT a function.`;
  const clientLogDiagUseSwTroubleshooting = `This almost always means the Firebase Messaging Compat library (firebase-messaging-compat.js) was not loaded or did not execute correctly on your page *BEFORE* this script.
TROUBLESHOOTING STEPS (RE-CHECK CAREFULLY ON YOUR WEBSITE ${domainName}):
1. CHECK CONSOLE FOR OTHER ERRORS: Look for any errors that occurred *before* this one, especially errors originating from firebase-app-compat.js or firebase-messaging-compat.js.
2. VERIFY SCRIPT ORDER AND LOADING IN YOUR WEBSITE'S HTML:
   - Ensure <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script> AND <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"><\/script> tags are in your HTML.
   - They ABSOLUTELY MUST appear *before* this WebPush Pro script tag.
   - NO ASYNC/DEFER: Remove 'async' or 'defer' attributes from Firebase SDK script tags. Plain script tags ensure sequential loading.
3. CHECK NETWORK TAB (Developer Tools F12):
   - Confirm firebase-app-compat.js and firebase-messaging-compat.js downloaded with HTTP 200 OK.
   - Verify their content is actual Firebase SDK code (not an error page or empty).
4. INSPECT LOGS ABOVE: The "DIAGNOSTIC" logs show the state of your 'messaging' object. If 'useServiceWorker' is undefined, it means the compat script hasn't augmented it.
Current messaging object (logged just before this error):`;
  const clientLogSwWaiting = `${clientLogTag} Waiting for Service Worker to be ready (controller active)...`;
  const clientLogSwReady = `${clientLogTag} Service Worker is ready. Registration:`;
  const clientLogSwProceeding = `${clientLogTag} Proceeding to request permission and get token...`;
  const clientLogSwReadyError = `${clientLogTag} Service Worker .ready() promise rejected:`;
  const clientLogSwRegFailed = `${clientLogTag} SW registration failed for ${domainName}:`;
  const clientLogSwRegFailedCommon = `${clientLogTag} Ensure firebase-messaging-sw.js is in the root directory of your site and accessible. Check its content and Firebase config.`;
  const clientLogSwNotSupported = `${clientLogTag} Service workers are not supported in this browser for ${domainName}. Push notifications will not work.`;
  const clientLogFirebaseOrMsgNotInit = `${clientLogTag} Firebase app or messaging service not successfully initialized for ${domainName}. Service Worker setup and token retrieval skipped.`;


  // Client-side script: Will now call a local /subscribe.php
  const clientScript = `
/*
  WebPush Pro - Client Integration Script for ${domainName}
  Version: ${SCRIPT_VERSION}
  
  CRITICAL PREREQUISITES - CHECK THESE ON YOUR WEBSITE (${domainName}):
  1. Firebase SDKs MUST be loaded BEFORE this script. Add these to your <head> or before this script tag:
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"><\/script>
  2. This script sends subscription data to '/subscribe.php' on YOUR domain (${domainName}).
     Ensure the "Server-Side API (PHP)" script (either Composer or No-Composer version) is correctly set up at that location.
*/
console.log('${clientLogInitializing}');

// --- Configuration ---
const firebaseConfig = ${JSON.stringify(config, null, 2)};
const VAPID_KEY = '${config.vapidKey || ""}';
const CLIENT_APP_NAME = '${clientAppName}';
const DOMAIN_NAME = '${domainName}';
const SUBSCRIBE_API_PATH = '/subscribe.php'; // Path to your server-side PHP script

console.log('${clientLogFirebaseConfig}', firebaseConfig);
console.log('${clientLogVapidKey}', VAPID_KEY ? VAPID_KEY.substring(0, 10) + '...' : 'NOT PROVIDED - ESSENTIAL!');

let firebaseApp = null;
let messaging = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  try {
    const existingApp = firebase.apps.find(app => app.name === CLIENT_APP_NAME);
    if (existingApp) {
      firebaseApp = existingApp;
      console.log('${clientLogExistingApp}');
    } else {
      firebaseApp = firebase.initializeApp(firebaseConfig, CLIENT_APP_NAME);
      console.log('${clientLogAppInitialized}');
    }
  } catch (initError) {
    console.error('${clientLogAppInitError}', initError);
  }
} else {
  console.error('${clientLogFirebaseLibNotFound}');
}

if (firebaseApp) {
  console.log('${clientLogAppAvailableMsgCheck}');
  if (typeof firebase.messaging === 'function' && typeof firebase.messaging.isSupported === 'function') {
    if (firebase.messaging.isSupported()) {
      console.log('${clientLogMessagingSupported}');
      try {
        messaging = firebase.messaging(firebaseApp);
        console.log('${clientLogMessagingInstanceCreated}', messaging);
      } catch (messagingError) {
        console.error('${clientLogMessagingInitError}', messagingError);
      }
    } else {
      console.warn('${clientLogMessagingNotSupported}');
    }
  } else {
    console.error('${clientLogMessagingLibNotFound}');
  }
} else {
  console.log('${clientLogAppNotAvailableSkipMsg}');
}

function requestAndSendToken() {
  if (!messaging) {
    console.error('${clientLogMessagingNotAvailable}');
    return;
  }
  if (!VAPID_KEY) {
    console.error('${clientLogVapidMissing}');
    return;
  }

  console.log('${clientLogRequestingPermission}');
  Notification.requestPermission().then((permission) => {
    console.log('${clientLogPermissionStatus}', permission);
    if (permission === 'granted') {
      console.log('${clientLogPermGranted}', VAPID_KEY.substring(0, 10) + '...');
      messaging.getToken({ vapidKey: VAPID_KEY })
        .then((currentToken) => {
          if (currentToken) {
            console.log('${clientLogTokenObtained}', currentToken.substring(0,20) + '...');
            const subscriberData = { token: currentToken, domainName: DOMAIN_NAME, userAgent: navigator.userAgent };
            
            console.log('${clientLogSendingSubscriber}', subscriberData);
            fetch(SUBSCRIBE_API_PATH, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscriberData)
            })
            .then(response => {
              console.log('${clientLogApiResponseStatus}', response.status);
              return response.json().then(data => ({ok: response.ok, status: response.status, data }));
            })
            .then(({ok, status, data}) => {
              if (ok && data.id) {
                 console.log('${clientLogApiSubSuccess}', data.id, 'Full Response:', data);
              } else {
                console.error('${clientLogApiSubError}', status, 'Response Data:', data);
              }
            })
            .catch(err => console.error('${clientLogApiFetchError}', err));
          } else {
            console.warn('${clientLogNoToken}');
          }
        }).catch((err) => {
          console.error('${clientLogTokenError}', err);
          console.error('${clientLogTokenErrorCommon}');
        });
    } else {
      console.warn('${clientLogPermNotGranted}', permission);
    }
  }).catch(err => {
    console.error('${clientLogPermRequestError}', err);
  });
}

if (firebaseApp && messaging) {
  if ('serviceWorker' in navigator) {
    console.log('${clientLogSwApiSupported}');
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(function(registration) {
        console.log('${clientLogSwRegistered}', registration.scope);
        
        console.log('${clientLogDiagAboutToCallUseSw}');
        console.log('${clientLogDiagMessagingObject}', messaging);
        console.log('${clientLogDiagTypeOfUseSw}', typeof messaging.useServiceWorker);

        if (typeof messaging.useServiceWorker === 'function') {
            console.log('${clientLogDiagUseSwIsFunction}');
            messaging.useServiceWorker(registration);
            console.log('${clientLogMessagingUsingSw}');
        } else {
            console.error('${clientLogDiagUseSwNotFunctionCritical}');
            console.error('${clientLogDiagUseSwTroubleshooting}', messaging);
            return; 
        }

        console.log('${clientLogSwWaiting}');
        navigator.serviceWorker.ready.then(function(swReady) {
            console.log('${clientLogSwReady}', swReady);
            console.log('${clientLogSwProceeding}');
            requestAndSendToken();
        }).catch(swReadyErr => console.error('${clientLogSwReadyError}', swReadyErr));

      }).catch(function(error) {
        console.error('${clientLogSwRegFailed}', error);
        console.error('${clientLogSwRegFailedCommon}');
      });
  } else {
    console.warn('${clientLogSwNotSupported}');
  }
} else {
  console.warn('${clientLogFirebaseOrMsgNotInit}');
}
`;

  // Service Worker script log messages
  const swLogExecuting = `${swLogTag} firebase-messaging-sw.js executing for ${domainName}.`;
  const swLogConfig = `${swLogTag} Firebase Config for SW on ${domainName}:`;
  const swLogAppInit = `${swLogTag} Firebase app (${swAppName}) initialized/retrieved in SW.`;
  const swLogAppInitError = `${swLogTag} Error initializing Firebase app in SW:`;
  const swLogFirebaseCoreNotAvailable = `${swLogTag} Firebase Core SDK (firebase.initializeApp) not available in SW. importScripts failed?`;
  const swLogMessagingInstanceCreated = `${swLogTag} Firebase Messaging service instance created in SW for app: ${swAppName}`;
  const swLogMessagingOptionalHandler = `${swLogTag} Received background message for ${domainName}:`;
  const swLogMessagingError = `${swLogTag} Error creating Firebase Messaging service instance in SW:`;
  const swLogAppOrMessagingNotAvailable = `${swLogTag} Firebase app in SW not initialized or firebase.messaging not available. Cannot setup SW messaging.`;
  const swLogSetupComplete = `${swLogTag} SW setup attempt complete for ${domainName}.`;


  const serviceWorkerScript = `
/*
  WebPush Pro - Service Worker Script for ${domainName}
  File: firebase-messaging-sw.js (Place this in the ROOT of your website)
  Version: ${SCRIPT_VERSION}
*/

// These scripts are REQUIRED for the service worker.
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

console.log('${swLogExecuting}');

const firebaseConfigSW = ${JSON.stringify(config, null, 2)};
const SW_APP_NAME_INTERNAL = '${swAppName}'; 
console.log('${swLogConfig}', firebaseConfigSW);

let firebaseAppSW = null;

if (typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
  try {
    const existingSwApp = firebase.apps.find(app => app.name === SW_APP_NAME_INTERNAL);
    if (existingSwApp) {
      firebaseAppSW = existingSwApp;
    } else {
      firebaseAppSW = firebase.initializeApp(firebaseConfigSW, SW_APP_NAME_INTERNAL);
    }
    console.log('${swLogAppInit}');
  } catch (e) {
    console.error('${swLogAppInitError}', e);
  }
} else {
  console.error('${swLogFirebaseCoreNotAvailable}');
}

if (firebaseAppSW && typeof firebase.messaging === 'function') {
  try {
    const messagingSW = firebase.messaging(firebaseAppSW);
    console.log('${swLogMessagingInstanceCreated}');

    // Optional: Handle background messages here
    // messagingSW.onBackgroundMessage(function(payload) {
    //   console.log('${swLogMessagingOptionalHandler}', payload);
    //   const notificationTitle = payload.notification?.title || 'Background Message';
    //   const notificationOptions = {
    //     body: payload.notification?.body || 'Received a message.',
    //     icon: payload.notification?.icon || '/default-icon.png' // Consider a default icon
    //   };
    //   return self.registration.showNotification(notificationTitle, notificationOptions);
    // });
  } catch (e) {
    console.error('${swLogMessagingError}', e);
  }
} else {
  console.error('${swLogAppOrMessagingNotAvailable}');
}
console.log('${swLogSetupComplete}');
`;

  const serverApiScriptPHPComposer = `<?php
// File: subscribe.php
// WebPush Pro - Server-Side Subscription Handler (Composer Version) for ${domainName}
// Version: ${SCRIPT_VERSION}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow all origins for simplicity, tighten in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (strtoupper($_SERVER['REQUEST_METHOD']) == 'OPTIONS') {
    http_response_code(204); // No Content for preflight
    exit;
}
error_reporting(0); // Suppress errors from being sent in HTTP response in prod; log them instead.

// --- IMPORTANT: Firebase Admin SDK Setup (Composer) ---
// 1. Install kreait/firebase-php on your server:
//    composer require kreait/firebase-php
//
// 2. Ensure Composer's autoloader is included. Adjust the path if this script
//    is not in the same directory as your 'vendor' folder.
//    require __DIR__ . '/vendor/autoload.php'; // UNCOMMENT AND ADJUST PATH
//
// 3. Securely store your Firebase Admin SDK service account JSON key file on your server.
//    DO NOT commit this file to public repositories or expose it via web.
//    Download it from Firebase Console: Project settings > Service accounts > Generate new private key.
//
// 4. Set the correct path to your service account key file below.
//    Using an environment variable is recommended for production.
//
// --- CONFIGURATION ---
// !!! REPLACE THIS PATH with the actual path to your service account JSON key file !!!
$serviceAccountPath = getenv('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH') ?: '/path/to/your/webpush-pro-service-account.json'; 
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

$expectedDomainName = '${domainName}';
if ($receivedDomainName !== $expectedDomainName) {
    error_log("${phpApiLogTag} Domain mismatch. Expected: {$expectedDomainName}, Received: {$receivedDomainName}");
    http_response_code(400);
    echo json_encode(['error' => 'Domain mismatch. Subscription rejected.']);
    exit;
}

// --- Firebase Admin SDK Initialization & Firestore Interaction ---
// Ensure you have:
// 1. Uncommented: require __DIR__ . '/vendor/autoload.php'; (adjust path if needed)
// 2. Corrected: $serviceAccountPath above.

/* // UNCOMMENT THIS BLOCK AFTER CONFIGURING AUTOLOADER AND SERVICE ACCOUNT PATH
use Kreait\\FirebaseFactory;
use Kreait\\Firebase\\Exception\\FirebaseException;
use Google\\Cloud\\Firestore\\Timestamp; 

if (!class_exists(FirebaseFactory::class)) {
    error_log("${phpApiLogTag} FirebaseFactory class not found. Is kreait/firebase-php installed and autoloaded? Have you uncommented the 'require vendor/autoload.php' line?");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Firebase Admin SDK library not found.']);
    exit;
}

if (!file_exists($serviceAccountPath)) {
    error_log("${phpApiLogTag} Service account file not found at: {$serviceAccountPath}. Please check the path set in this script.");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Firebase service account file not found.']);
    exit;
}

try {
    $firebaseFactory = (new FirebaseFactory())->withServiceAccount($serviceAccountPath);
    $firestore = $firebaseFactory->createFirestore();
    $db = $firestore->database(); 

    $subscribersCollection = $db->collection('subscribers');
    
    $query = $subscribersCollection->where('token', '==', $token)->where('domainName', '==', $receivedDomainName);
    $existingSubscribers = $query->documents();

    if (!$existingSubscribers->isEmpty()) {
        $existingDocId = $existingSubscribers->rows()[0]->id();
        http_response_code(200); 
        echo json_encode([
            'message' => 'Subscriber token already exists for this domain.',
            'id' => $existingDocId
        ]);
        exit;
    }
    
    $newSubscriberRef = $subscribersCollection->add([
        'token' => $token,
        'domainName' => $receivedDomainName,
        'userAgent' => $userAgent,
        'subscribedAt' => new Timestamp(new \\DateTimeImmutable()),
    ]);

    http_response_code(201); 
    echo json_encode([
        'message' => 'Subscriber added successfully.',
        'id' => $newSubscriberRef->id(),
    ]);

} catch (FirebaseException $e) {
    error_log("${phpApiLogTag} Firestore Error (FirebaseException): " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add subscriber to database.', 'details' => $e->getMessage()]);
    exit;
} catch (\\Exception $e) {
    error_log("${phpApiLogTag} General Error: " . $e->getMessage() . " | Trace: " . $e->getTraceAsString());
    http_response_code(500);
    echo json_encode(['error' => 'An unexpected error occurred.', 'details' => $e->getMessage()]);
    exit;
}
*/ // END OF COMPOSER-BASED BLOCK

// Fallback message if the Composer block is not uncommented/configured
echo json_encode([
    'error' => 'PHP API script (Composer version) not fully configured. Please uncomment and setup the Firebase Admin SDK block in subscribe.php.',
    'note' => 'This is a placeholder response because the Firebase Admin SDK integration part is commented out in the PHP script.'
]);
?>`;

  const serverApiScriptPHPNoComposer = `<?php
// File: subscribe.php
// WebPush Pro - Server-Side Subscription Handler (No Composer / REST API Version) for ${domainName}
// Version: ${SCRIPT_VERSION}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow all origins for simplicity, tighten in production
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (strtoupper($_SERVER['REQUEST_METHOD']) == 'OPTIONS') {
    http_response_code(204); // No Content for preflight
    exit;
}
error_reporting(E_ALL); // Report all errors for debugging, set to 0 in production
ini_set('display_errors', '1'); // Display errors for debugging, set to '0' in production
ini_set('log_errors', '1');
// Ensure error_log path is writable by the web server in php.ini or via ini_set('error_log', '/path/to/your/php-errors.log');

// --- IMPORTANT: Firebase Admin SDK Service Account Setup (No Composer) ---
// 1. Securely store your Firebase Admin SDK service account JSON key file on your server.
//    DO NOT commit this file to public repositories or expose it via web.
//    Download it from Firebase Console: Project settings > Service accounts > Generate new private key.
//
// 2. Set the correct path to your service account key file below.
//    Using an environment variable is recommended for production.
//
// 3. This script requires PHP's openssl extension for JWT signing and
//    either curl extension or allow_url_fopen=On in php.ini for HTTP requests.
//
// --- CONFIGURATION ---
// !!! REPLACE THIS PATH with the actual path to your service account JSON key file !!!
$serviceAccountPath = getenv('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH') ?: '/path/to/your/webpush-pro-service-account.json';
$firebaseProjectId = '${config.projectId}'; // Inferred from your Firebase config

// --- Helper Functions ---
function base64url_encode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function get_google_oauth2_access_token($serviceAccountFile, $projectId) {
    global ${phpApiLogTag};
    if (!file_exists($serviceAccountFile)) {
        error_log("${phpApiLogTag} Service account file not found: " . $serviceAccountFile);
        return null;
    }
    $serviceAccount = json_decode(file_get_contents($serviceAccountFile), true);
    if (!$serviceAccount) {
        error_log("${phpApiLogTag} Could not parse service account file: " . $serviceAccountFile);
        return null;
    }

    $jwtHeader = base64url_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $now = time();
    $expiry = $now + 3600; // 1 hour

    $jwtClaimSet = base64url_encode(json_encode([
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore', // Firestore scope
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $expiry,
        'iat' => $now
    ]));

    $signingString = $jwtHeader . '.' . $jwtClaimSet;
    $signature = '';
    if (!openssl_sign($signingString, $signature, $serviceAccount['private_key'], 'sha256')) {
        error_log("${phpApiLogTag} Failed to sign JWT: " . openssl_error_string());
        return null;
    }
    $signedJwt = $signingString . '.' . base64url_encode($signature);

    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $signedJwt
    ]);

    $options = [
        'http' => [
            'header' => "Content-Type: application/x-www-form-urlencoded\\r\\n",
            'method' => 'POST',
            'content' => $postData,
            'ignore_errors' => true // To capture error response bodies
        ]
    ];
    $context = stream_context_create($options);
    $response = file_get_contents($tokenUrl, false, $context);
    $responseData = json_decode($response, true);

    if (isset($responseData['access_token'])) {
        return $responseData['access_token'];
    } else {
        error_log("${phpApiLogTag} Failed to get access token. Response: " . $response);
        return null;
    }
}

function add_subscriber_to_firestore($projectId, $accessToken, $subscriberData) {
    global ${phpApiLogTag};
    $firestoreUrl = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/subscribers";
    
    // Check for existing subscriber (optional, to prevent duplicates)
    // This requires constructing a structured query, which is more complex via REST.
    // For simplicity, this example directly adds, which might create duplicates if token is re-submitted.
    // A robust solution would query first or use the token as document ID if unique.

    $isoTimestamp = gmdate("Y-m-d\\TH:i:s\\Z"); // Firestore timestamp format

    $document = [
        'fields' => [
            'token' => ['stringValue' => $subscriberData['token']],
            'domainName' => ['stringValue' => $subscriberData['domainName']],
            'userAgent' => ['stringValue' => $subscriberData['userAgent']],
            'subscribedAt' => ['timestampValue' => $isoTimestamp]
        ]
    ];
    $jsonData = json_encode($document);

    $options = [
        'http' => [
            'header' => "Authorization: Bearer {$accessToken}\\r\\n" .
                        "Content-Type: application/json\\r\\n" .
                        "Accept: application/json\\r\\n",
            'method' => 'POST',
            'content' => $jsonData,
            'ignore_errors' => true
        ]
    ];
    $context = stream_context_create($options);
    $response = file_get_contents($firestoreUrl, false, $context);
    $responseData = json_decode($response, true);

    // Check HTTP status code from $http_response_header
    // Example: $status_line = $http_response_header[0]; preg_match('{HTTP\/\S*\s(\d{3})}', $status_line, $match); $status = $match[1];
    // For simplicity, we check if 'name' (document path) is in response for success
    if (isset($responseData['name'])) { 
        // Extract document ID from name: projects/{projectId}/databases/(default)/documents/subscribers/{documentId}
        $parts = explode('/', $responseData['name']);
        return ['id' => end($parts), 'data' => $responseData];
    } else {
        error_log("${phpApiLogTag} Firestore error. Request: {$jsonData} Response: " . $response);
        return ['error' => 'Failed to add to Firestore.', 'details' => $responseData];
    }
}

// --- Input Validation & Processing ---
if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Invalid request method. Only POST is allowed.']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload.']);
    exit;
}

$token = $input['token'] ?? null;
$receivedDomainName = $input['domainName'] ?? null;
$userAgent = $input['userAgent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

if (empty($token) || empty($receivedDomainName)) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing token or domainName.']);
    exit;
}

$expectedDomainName = '${domainName}';
if ($receivedDomainName !== $expectedDomainName) {
    error_log("${phpApiLogTag} Domain mismatch. Expected: {$expectedDomainName}, Received: {$receivedDomainName}");
    http_response_code(400);
    echo json_encode(['error' => 'Domain mismatch. Rejected.']);
    exit;
}

// --- Main Logic ---
if (!file_exists($serviceAccountPath)) {
    error_log("${phpApiLogTag} Service account file not found at: {$serviceAccountPath}. Please check the path set in this script.");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: Firebase service account file not found. Script cannot proceed.']);
    exit;
}
if (!function_exists('openssl_sign')) {
    error_log("${phpApiLogTag} PHP openssl extension is not available or openssl_sign function not found. It is required for JWT signing.");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: PHP openssl extension is missing.']);
    exit;
}
if (!ini_get('allow_url_fopen') && !function_exists('curl_init')) {
    error_log("${phpApiLogTag} PHP allow_url_fopen is disabled and curl extension is not available. One is required for HTTP requests.");
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration error: PHP allow_url_fopen is off and curl is not available.']);
    exit;
}


$accessToken = get_google_oauth2_access_token($serviceAccountPath, $firebaseProjectId);

if (!$accessToken) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to obtain Firebase access token. Check server logs.']);
    exit;
}

$subscriberData = [
    'token' => $token,
    'domainName' => $receivedDomainName,
    'userAgent' => $userAgent,
];

$result = add_subscriber_to_firestore($firebaseProjectId, $accessToken, $subscriberData);

if (isset($result['id'])) {
    http_response_code(201);
    echo json_encode(['message' => 'Subscriber added successfully (via REST).', 'id' => $result['id']]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to add subscriber.', 'details' => $result['details'] ?? 'Unknown Firestore error. Check server logs.']);
}
?>`;

  return { clientScript, serviceWorkerScript, serverApiScriptPHPComposer, serverApiScriptPHPNoComposer };
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
                          <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="client-script">Client-Side Script (HTML)</TabsTrigger>
                            <TabsTrigger value="sw-script">Service Worker (JS)</TabsTrigger>
                            <TabsTrigger value="server-api-php-composer">Server API (PHP - Composer)</TabsTrigger>
                            <TabsTrigger value="server-api-php-no-composer">Server API (PHP - No Composer)</TabsTrigger>
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
                           <TabsContent value="server-api-php-composer" className="flex-grow overflow-auto p-1 mt-0">
                             <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-1">
                                Create a file named <code className="font-mono bg-background px-1 rounded-sm">subscribe.php</code> in the
                                ROOT directory of your website <code className="font-mono bg-background px-1 rounded-sm">({domain.name}/subscribe.php)</code> and paste this content into it.
                                This version requires <strong className="text-foreground">Composer</strong> and the <code className="font-mono bg-background px-1 rounded-sm">kreait/firebase-php</code> package.
                              </p>
                              <strong className="text-sm text-destructive">IMPORTANT SETUP REQUIRED (Composer Version):</strong>
                              <ul className="text-xs text-muted-foreground list-disc list-inside my-2 space-y-0.5">
                                <li>Install <code className="font-mono bg-background px-1 rounded-sm">kreait/firebase-php</code> via Composer: <code className="font-mono">composer require kreait/firebase-php</code> on your server.</li>
                                <li>Ensure Composer's autoloader is included in the PHP script (e.g., <code className="font-mono">require __DIR__ . '/vendor/autoload.php';</code>).</li>
                                <li>Download your Firebase Admin SDK service account JSON key from Firebase Console (Project settings &gt; Service accounts).</li>
                                <li>Securely store this JSON key file on your server (e.g., outside the web root).</li>
                                <li>Update the <code className="font-mono bg-background px-1 rounded-sm">$serviceAccountPath</code> variable in the PHP script to the correct path of your service account key file.</li>
                                <li>Uncomment the main PHP block in the script to enable Firebase integration.</li>
                              </ul>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.serverApiScriptPHPComposer}</code>
                              </pre>
                              <Button 
                                onClick={() => copyToClipboard(selectedScripts.serverApiScriptPHPComposer, "Server-Side API (PHP - Composer) script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy PHP Script (Composer)
                              </Button>
                            </div>
                          </TabsContent>
                           <TabsContent value="server-api-php-no-composer" className="flex-grow overflow-auto p-1 mt-0">
                             <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-1">
                                Create a file named <code className="font-mono bg-background px-1 rounded-sm">subscribe.php</code> in the
                                ROOT directory of your website <code className="font-mono bg-background px-1 rounded-sm">({domain.name}/subscribe.php)</code> and paste this content into it.
                                This version <strong className="text-foreground">does NOT require Composer</strong> but is more complex. It directly uses Firebase REST APIs.
                              </p>
                              <strong className="text-sm text-destructive">IMPORTANT SETUP REQUIRED (No Composer Version):</strong>
                              <ul className="text-xs text-muted-foreground list-disc list-inside my-2 space-y-0.5">
                                 <li>Requires PHP <code className="font-mono bg-background px-1 rounded-sm">openssl</code> extension for JWT signing (very common).</li>
                                 <li>Requires PHP <code className="font-mono bg-background px-1 rounded-sm">allow_url_fopen=On</code> in php.ini OR the <code className="font-mono bg-background px-1 rounded-sm">curl</code> extension for making HTTP requests.</li>
                                <li>Download your Firebase Admin SDK service account JSON key from Firebase Console (Project settings &gt; Service accounts).</li>
                                <li>Securely store this JSON key file on your server (e.g., outside the web root).</li>
                                <li>Update the <code className="font-mono bg-background px-1 rounded-sm">$serviceAccountPath</code> variable in the PHP script to the correct path of your service account key file.</li>
                                <li>Ensure your PHP error logging is configured to catch any issues during execution.</li>
                              </ul>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.serverApiScriptPHPNoComposer}</code>
                              </pre>
                              <Button 
                                onClick={() => copyToClipboard(selectedScripts.serverApiScriptPHPNoComposer, "Server-Side API (PHP - No Composer) script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy PHP Script (No Composer)
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
    

    
