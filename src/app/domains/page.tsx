

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

const SCRIPT_VERSION = "2.2.0"; // Updated version

// Pre-construct log prefixes
let clientLogTag = '';
let swLogTag = '';
let phpApiLogTag = '';

// Client-side log message strings (pre-constructed)
let clientLogInitializing = '';
let clientLogFirebaseConfigLog = '';
let clientLogVapidKeyLog = '';
let clientLogUsingNamedApp = '';
let clientLogFirebaseLibNotFound = '';
let clientLogMessagingSupported = '';
let clientLogMessagingInstanceCreatedLog = '';
let clientLogMessagingInitError = '';
let clientLogMessagingNotSupported = '';
let clientLogMessagingLibNotFound = '';
let clientLogFirebaseAppNotAvailable = '';
let clientLogSwApiSupported = '';
let clientLogSwRegistering = '';
let clientLogSwRegisteredSuccess = '';
let clientLogSwRegFailed = '';
let clientLogSwUsing = '';
let clientLogSwUseSwError = '';
let clientLogCritErrUseSwUndefined = '';
let clientLogCritErrUseSwTroubleshooting = '';
let clientLogSwWaiting = '';
let clientLogSwReady = '';
let clientLogSwProceeding = '';
let clientLogSwReadyError = '';
let clientLogSwNotSupported = '';
let clientLogFirebaseOrMsgNotInit = '';
let clientLogVapidMissing = '';
let clientLogRequestingPermission = '';
let clientLogPermissionStatus = '';
let clientLogPermGranted = '';
let clientLogTokenObtained = '';
let clientLogSendingSubscriber = '';
let clientLogApiResponseStatus = '';
let clientLogApiSubSuccess = '';
let clientLogApiSubError = '';
let clientLogApiFetchError = '';
let clientLogNoToken = '';
let clientLogTokenError = '';
let clientLogPermNotGranted = '';
let clientLogPermRequestError = '';

// Service Worker log message strings (pre-constructed)
let swLogExecuting = '';
let swLogConfigLog = '';
let swLogAppInit = '';
let swLogAppInitError = '';
let swLogFirebaseCoreNotAvailable = '';
let swLogMessagingInstanceCreated = '';
let swLogMessagingOptionalHandler = '';
let swLogMessagingError = '';
let swLogAppOrMessagingNotAvailable = '';
let swLogSetupComplete = '';


function initializeLogStrings(domainName: string) {
    clientLogTag = `[WebPushPro Client v${SCRIPT_VERSION}]`;
    swLogTag = `[WebPushPro SW v${SCRIPT_VERSION}]`;
    phpApiLogTag = `[WebPushPro PHP API v${SCRIPT_VERSION}]`;

    clientLogInitializing = `${clientLogTag} Initializing for ${domainName}.`;
    clientLogFirebaseConfigLog = `${clientLogTag} Firebase Config for ${domainName}:`;
    clientLogVapidKeyLog = `${clientLogTag} VAPID Key for ${domainName} (first 10 chars):`;
    clientLogUsingNamedApp = `${clientLogTag} Firebase app instance initialized/retrieved:`;
    clientLogFirebaseLibNotFound = `${clientLogTag} CRITICAL: Firebase library (firebase or firebase.initializeApp) not found. Ensure firebase-app-compat.js is loaded BEFORE this script.`;
    
    clientLogMessagingSupported = `${clientLogTag} Firebase Messaging is supported.`;
    clientLogMessagingInstanceCreatedLog = `${clientLogTag} Firebase Messaging service initialized.`;
    clientLogMessagingInitError = `${clientLogTag} Error initializing Firebase Messaging:`;
    clientLogMessagingNotSupported = `${clientLogTag} Firebase Messaging not supported by this browser.`;
    clientLogMessagingLibNotFound = `${clientLogTag} CRITICAL: Firebase Messaging library (firebase.messaging) not found or not a function. Ensure firebase-messaging-compat.js is loaded BEFORE this script and AFTER firebase-app-compat.js.`;
    clientLogFirebaseAppNotAvailable = `${clientLogTag} Firebase app not available. Skipping messaging init.`;

    clientLogSwApiSupported = `${clientLogTag} Service Worker API supported.`;
    clientLogSwRegistering = `${clientLogTag} Registering /firebase-messaging-sw.js for ${domainName}...`;
    clientLogSwRegisteredSuccess = `${clientLogTag} Service Worker registered successfully. Scope:`;
    clientLogSwRegFailed = `${clientLogTag} Service Worker registration failed for ${domainName}:`;
    clientLogSwUsing = `${clientLogTag} Firebase Messaging is using service worker.`;
    clientLogSwUseSwError = `${clientLogTag} Error calling messaging.useServiceWorker():`;
    clientLogCritErrUseSwUndefined = `${clientLogTag} CRITICAL ERROR: messaging.useServiceWorker is NOT a function.`;
    clientLogCritErrUseSwTroubleshooting = `This usually means firebase-messaging-compat.js did not load or execute correctly BEFORE this script on your website (${domainName}).
    TROUBLESHOOTING:
    1. SCRIPT ORDER: Ensure <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script> and then <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script> are in your HTML, loaded *BEFORE* this WebPushPro script.
    2. NO ASYNC/DEFER: Remove 'async' or 'defer' from Firebase SDK script tags.
    3. CONSOLE ERRORS: Check browser console for errors *before* this message. An error in Firebase SDKs can prevent them from initializing fully.
    4. NETWORK TAB: Verify firebase-app-compat.js and firebase-messaging-compat.js downloaded with HTTP 200 OK and their content is valid JavaScript.
    5. GLOBAL FIREBASE: The 'firebase' global object or 'firebase.messaging' might be missing or incomplete.`;
    clientLogSwWaiting = `${clientLogTag} Waiting for Service Worker to be ready...`;
    clientLogSwReady = `${clientLogTag} Service Worker is ready. Registration:`;
    clientLogSwProceeding = `${clientLogTag} Proceeding to request permission and get token.`;
    clientLogSwReadyError = `${clientLogTag} Service Worker .ready() promise rejected:`;
    clientLogSwNotSupported = `${clientLogTag} Service workers not supported. Push notifications unavailable.`;
    clientLogFirebaseOrMsgNotInit = `${clientLogTag} Firebase app or messaging not initialized. Operations skipped.`;

    clientLogVapidMissing = `${clientLogTag} VAPID_KEY is missing. Cannot get FCM token.`;
    clientLogRequestingPermission = `${clientLogTag} Requesting notification permission...`;
    clientLogPermissionStatus = `${clientLogTag} Notification permission status:`;
    clientLogPermGranted = `${clientLogTag} Permission granted. Getting FCM token with VAPID (first 10):`;
    clientLogTokenObtained = `${clientLogTag} FCM Token obtained (first 20 chars):`;
    clientLogSendingSubscriber = `${clientLogTag} Sending subscriber data to /subscribe.php on ${domainName}:`;
    clientLogApiResponseStatus = `${clientLogTag} /subscribe.php response status:`;
    clientLogApiSubSuccess = `${clientLogTag} /subscribe.php success. Subscriber ID:`;
    clientLogApiSubError = `${clientLogTag} /subscribe.php error. Status:`;
    clientLogApiFetchError = `${clientLogTag} /subscribe.php fetch error:`;
    clientLogNoToken = `${clientLogTag} No FCM token obtained.`;
    clientLogTokenError = `${clientLogTag} Error getting FCM token:`;
    clientLogPermNotGranted = `${clientLogTag} Permission not granted:`;
    clientLogPermRequestError = `${clientLogTag} Error requesting permission:`;

    // Service Worker logs
    swLogExecuting = `${swLogTag} firebase-messaging-sw.js executing for ${domainName}.`;
    swLogConfigLog = `${swLogTag} Firebase Config for SW on ${domainName}:`;
    swLogAppInit = `${swLogTag} Firebase app initialized/retrieved in SW.`;
    swLogAppInitError = `${swLogTag} Error initializing Firebase app in SW:`;
    swLogFirebaseCoreNotAvailable = `${swLogTag} Firebase Core SDK (firebase.initializeApp) not available in SW. importScripts failed?`;
    swLogMessagingInstanceCreated = `${swLogTag} Firebase Messaging service instance created in SW.`;
    swLogMessagingOptionalHandler = `${swLogTag} Optional: Received background message for ${domainName}:`;
    swLogMessagingError = `${swLogTag} Error creating Firebase Messaging service instance in SW:`;
    swLogAppOrMessagingNotAvailable = `${swLogTag} Firebase app in SW not initialized or firebase.messaging not available. SW messaging setup failed.`;
    swLogSetupComplete = `${swLogTag} SW setup attempt complete for ${domainName}.`;
}

function generateFirebaseScripts(config: FirebaseConfig, domainName: string): GeneratedScripts {
  const clientAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app';
  const swAppName = domainName.replace(/[^a-zA-Z0-9]/g, '') + '-firebase-app-sw';
  
  initializeLogStrings(domainName);

  const clientScript = `
/*
  WebPush Pro - Client Integration Script for ${domainName}
  Version: ${SCRIPT_VERSION}
  
  CRITICAL PREREQUISITES - CHECK THESE ON YOUR WEBSITE (${domainName}):
  1. Firebase SDKs MUST be loaded BEFORE this script in your HTML:
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"><\/script>
     <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"><\/script>
     (Ensure no 'async' or 'defer' attributes on these Firebase SDK script tags)
  2. This script sends subscription data to '/subscribe.php' on YOUR domain (${domainName}).
     Ensure the "Server-Side API (PHP)" script is correctly set up at that location.
*/
(function() {
  console.log('${clientLogInitializing}');

  const firebaseConfig = ${JSON.stringify(config, null, 2)};
  const VAPID_KEY = '${config.vapidKey || ""}';
  const CLIENT_APP_NAME = '${clientAppName}';
  const DOMAIN_NAME = '${domainName}'; // Used for sending to subscribe.php
  const SUBSCRIBE_API_PATH = '/subscribe.php'; // Relative path on your domain

  console.log('${clientLogFirebaseConfigLog}', firebaseConfig);
  console.log('${clientLogVapidKeyLog}', VAPID_KEY ? VAPID_KEY.substring(0, 10) + '...' : 'NOT PROVIDED - ESSENTIAL!');

  let firebaseApp = null;
  let messaging = null;

  if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
    console.error('${clientLogFirebaseLibNotFound}');
    return;
  }

  try {
    const existingApp = firebase.apps.find(app => app.name === CLIENT_APP_NAME);
    firebaseApp = existingApp || firebase.initializeApp(firebaseConfig, CLIENT_APP_NAME);
    console.log('${clientLogUsingNamedApp}', CLIENT_APP_NAME);
  } catch (initError) {
    console.error(\`${clientLogTag} Error initializing Firebase app (\${CLIENT_APP_NAME}):\`, initError);
    return;
  }

  if (!firebaseApp) {
    console.error('${clientLogFirebaseAppNotAvailable}');
    return;
  }

  if (typeof firebase.messaging !== 'function' || typeof firebase.messaging.isSupported !== 'function') {
    console.error('${clientLogMessagingLibNotFound}');
    return;
  }
  
  if (firebase.messaging.isSupported()) {
    console.log('${clientLogMessagingSupported}');
    try {
      messaging = firebase.messaging(firebaseApp);
      console.log('${clientLogMessagingInstanceCreatedLog}');
    } catch (messagingError) {
      console.error('${clientLogMessagingInitError}', messagingError);
      return;
    }
  } else {
    console.warn('${clientLogMessagingNotSupported}');
    return; 
  }

  function requestAndSendToken() {
    if (!messaging) {
      console.error(\`${clientLogTag} Messaging service not available for token request.\`);
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
              
              console.log(\`${clientLogSendingSubscriber}\`, subscriberData);
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
          });
      } else {
        console.warn('${clientLogPermNotGranted}', permission);
      }
    }).catch(err => {
      console.error('${clientLogPermRequestError}', err);
    });
  }

  if (!firebaseApp || !messaging) {
    console.warn('${clientLogFirebaseOrMsgNotInit}');
    return;
  }

  if ('serviceWorker' in navigator) {
    console.log('${clientLogSwApiSupported}');
    console.log('${clientLogSwRegistering}');
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(function(registration) {
        console.log('${clientLogSwRegisteredSuccess}', registration.scope);
        
        if (typeof messaging.useServiceWorker !== 'function') {
            console.error('${clientLogCritErrUseSwUndefined}');
            console.error('${clientLogCritErrUseSwTroubleshooting}');
            return; 
        }
        try {
            messaging.useServiceWorker(registration);
            console.log('${clientLogSwUsing}');
        } catch (useSwErr) {
            console.error('${clientLogSwUseSwError}', useSwErr);
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
      });
  } else {
    console.warn('${clientLogSwNotSupported}');
  }
})();
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

console.log('${swLogExecuting}');

const firebaseConfigSW = ${JSON.stringify(config, null, 2)};
const SW_APP_NAME_INTERNAL = '${swAppName}'; 
console.log('${swLogConfigLog}', firebaseConfigSW);

let firebaseAppSW = null;

if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
  console.error('${swLogFirebaseCoreNotAvailable}');
} else {
  try {
    const existingSwApp = firebase.apps.find(app => app.name === SW_APP_NAME_INTERNAL);
    firebaseAppSW = existingSwApp || firebase.initializeApp(firebaseConfigSW, SW_APP_NAME_INTERNAL);
    console.log('${swLogAppInit}');
  } catch (e) {
    console.error('${swLogAppInitError}', e);
  }
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
    //     icon: payload.notification?.icon || '/default-icon.png' // Provide a default icon
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

  const serverApiScriptPHP = `<?php
// File: subscribe.php (Place this in the ROOT of your website: ${domainName}/subscribe.php)
// WebPush Pro - Server-Side Subscription Handler (No Composer / REST API Version) for ${domainName}
// Version: ${SCRIPT_VERSION}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Allow all origins for this script, as it's self-hosted.
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (strtoupper($_SERVER['REQUEST_METHOD']) === 'OPTIONS') {
    http_response_code(204); // No Content for preflight
    exit;
}

// Enable error reporting for debugging. Comment out or set to 0 in production.
error_reporting(E_ALL);
ini_set('display_errors', '1'); 
ini_set('log_errors', '1');
// Ensure 'error_log' in php.ini is set to a writable file path for production logging.

// --- CONFIGURATION ---
// IMPORTANT: Securely store your Firebase Admin SDK service account JSON key on your server (e.g., outside the web root).
// Update this path to the correct location of your service account key file.
$serviceAccountPath = getenv('FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH') ?: 'firebase.json'; // Default: firebase.json in the same directory.
$firebaseProjectId = '${config.projectId}'; 
$expectedDomainName = '${domainName}';
$phpApiLogTag = "${phpApiLogTag}"; // Use pre-defined log tag

// --- Helper Functions ---
function get_google_oauth2_access_token($serviceAccountFile, $projectId, $logTag) {
    if (!file_exists($serviceAccountFile)) {
        error_log("{$logTag} Service account file not found: " . $serviceAccountFile);
        return null;
    }

    $serviceAccountJson = file_get_contents($serviceAccountFile);
    if ($serviceAccountJson === false) {
        error_log("{$logTag} Could not read service account file: " . $serviceAccountFile);
        return null;
    }
    $serviceAccount = json_decode($serviceAccountJson, true);
    if (!$serviceAccount || !isset($serviceAccount['client_email']) || !isset($serviceAccount['private_key'])) {
        error_log("{$logTag} Invalid JSON or missing keys in service account file: " . $serviceAccountFile . " - JSON error: " . json_last_error_msg());
        return null;
    }

    $jwtHeader = rtrim(strtr(base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT'])), '+/', '-_'), '=');
    $now = time();
    $expiry = $now + 3600; 

    $jwtClaimSet = rtrim(strtr(base64_encode(json_encode([
        'iss' => $serviceAccount['client_email'],
        'scope' => 'https://www.googleapis.com/auth/datastore', // Firestore scope
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $expiry,
        'iat' => $now
    ])), '+/', '-_'), '=');

    $signingString = $jwtHeader . '.' . $jwtClaimSet;
    $signature = '';
    if (!openssl_sign($signingString, $signature, $serviceAccount['private_key'], 'sha256')) {
        error_log("{$logTag} Failed to sign JWT: " . openssl_error_string());
        return null;
    }
    $signedJwt = $signingString . '.' . rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

    $tokenUrl = 'https://oauth2.googleapis.com/token';
    $postData = http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $signedJwt
    ]);
    
    // Using file_get_contents (ensure allow_url_fopen is On in php.ini)
    // For cURL, you'd replace this block.
    $options = [
        'http' => [
            'header' => "Content-Type: application/x-www-form-urlencoded\\r\\n",
            'method' => 'POST',
            'content' => $postData,
            'ignore_errors' => true // To get response body on error
        ]
    ];
    $context = stream_context_create($options);
    $response = file_get_contents($tokenUrl, false, $context);
    
    if ($response === false) {
        error_log("{$logTag} file_get_contents failed for token exchange. Check allow_url_fopen in php.ini and network connectivity.");
        return null;
    }
    
    $responseData = json_decode($response, true);

    if (isset($responseData['access_token'])) {
        return $responseData['access_token'];
    } else {
        error_log("{$logTag} Failed to get access token. Response: " . $response);
        return null;
    }
}

function save_or_update_subscriber($projectId, $accessToken, $subscriberData, $logTag) {
    $timestamp = gmdate("Y-m-d\\TH:i:s\\Z");
    $token = $subscriberData['token'];
    // Create a consistent document ID based on the token to enable upsert behavior with PATCH.
    // Firestore document IDs must not contain '/'
    $docId = preg_replace('/[^a-zA-Z0-9_-]/', '_', hash('sha256', $token)); 

    // Construct the Firestore REST API URL for a specific document (for PATCH to work as upsert)
    $url = "https://firestore.googleapis.com/v1/projects/{$projectId}/databases/(default)/documents/subscribers/{$docId}";

    $document = [
        'fields' => [
            'token' => ['stringValue' => $subscriberData['token']],
            'domainName' => ['stringValue' => $subscriberData['domainName']],
            'userAgent' => ['stringValue' => $subscriberData['userAgent']],
            'subscribedAt' => ['timestampValue' => $timestamp]
            // You can add more fields here, e.g., 'updatedAt'
        ]
    ];
    $jsonData = json_encode($document);

    // Using file_get_contents
    $options = [
        'http' => [
            'header' => "Authorization: Bearer {$accessToken}\\r\\n" .
                        "Content-Type: application/json\\r\\n" .
                        "Accept: application/json\\r\\n",
            'method' => 'PATCH', // Use PATCH for creating or updating
            'content' => $jsonData,
            'ignore_errors' => true
        ]
    ];
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    
    if ($response === false) {
        error_log("{$logTag} file_get_contents failed for Firestore PATCH. Check allow_url_fopen and network.");
        return ['error' => 'file_get_contents failed for Firestore operation.'];
    }

    $responseData = json_decode($response, true);

    // A successful PATCH (create or update) returns the document resource.
    if (isset($responseData['name'])) {
        $parts = explode('/', $responseData['name']);
        return ['id' => end($parts), 'data' => $responseData]; // Return the actual document ID from Firestore.
    } else {
        error_log("{$logTag} Firestore save/update error: " . $response);
        return ['error' => 'Failed to save/update subscriber.', 'details' => $responseData];
    }
}


// --- Input Validation & Processing ---
if (strtoupper($_SERVER['REQUEST_METHOD']) !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Invalid request method. Only POST is accepted.']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON payload. Error: ' . json_last_error_msg()]);
    exit;
}

$token = $input['token'] ?? null;
$receivedDomainName = $input['domainName'] ?? null;
$userAgent = $input['userAgent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';

if (empty($token) || empty($receivedDomainName)) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Missing token or domainName.']);
    exit;
}

if ($receivedDomainName !== $expectedDomainName) {
    error_log("{$phpApiLogTag} Domain mismatch. Expected: {$expectedDomainName}, Received: {$receivedDomainName}");
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Domain mismatch.']);
    exit;
}

// --- Main Logic ---
// Check for required PHP extensions
if (!function_exists('openssl_sign')) {
    error_log("{$phpApiLogTag} PHP openssl extension missing. It's required for JWT signing.");
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Server configuration error: PHP openssl extension missing.']);
    exit;
}
if (!ini_get('allow_url_fopen')) {
     error_log("{$phpApiLogTag} allow_url_fopen is disabled in php.ini. It's required by this script for HTTP requests.");
     // Consider adding instructions for cURL as an alternative if this is a common issue for users.
}


$accessToken = get_google_oauth2_access_token($serviceAccountPath, $firebaseProjectId, $phpApiLogTag);

if (!$accessToken) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Failed to obtain Firebase access token. Check server logs.']);
    exit;
}

$subscriberData = [
    'token' => $token,
    'domainName' => $receivedDomainName,
    'userAgent' => $userAgent,
];

$result = save_or_update_subscriber($firebaseProjectId, $accessToken, $subscriberData, $phpApiLogTag);

if (isset($result['id'])) {
    http_response_code(200); // OK (201 for Created, but 200 for "created or updated" is fine)
    echo json_encode(['message' => 'Subscriber saved or updated successfully.', 'id' => $result['id']]);
} else {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Failed to save subscriber to Firestore.', 'details' => $result['details'] ?? 'Unknown Firestore error. Check server logs.']);
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
                          <TabsList className="grid w-full grid-cols-3"> {/* Updated to 3 columns */}
                            <TabsTrigger value="client-script">Client-Side Script (HTML)</TabsTrigger>
                            <TabsTrigger value="sw-script">Service Worker (JS)</TabsTrigger>
                            <TabsTrigger value="server-api-php">Server API (PHP)</TabsTrigger> {/* Renamed Tab */}
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
                           <TabsContent value="server-api-php" className="flex-grow overflow-auto p-1 mt-0"> {/* Renamed Tab value */}
                             <div className="rounded-md border bg-muted p-4">
                              <p className="text-sm text-muted-foreground mb-1">
                                Create a file named <code className="font-mono bg-background px-1 rounded-sm">subscribe.php</code> in the
                                ROOT directory of your website <code className="font-mono bg-background px-1 rounded-sm">({domain.name}/subscribe.php)</code> and paste this content into it.
                                This version does NOT require Composer and uses Firebase REST APIs directly.
                              </p>
                              <strong className="text-sm text-destructive">IMPORTANT SETUP REQUIRED:</strong>
                              <ul className="text-xs text-muted-foreground list-disc list-inside my-2 space-y-0.5">
                                 <li>Requires PHP <code className="font-mono bg-background px-1 rounded-sm">openssl</code> extension for JWT signing (very common).</li>
                                 <li>Requires PHP <code className="font-mono bg-background px-1 rounded-sm">allow_url_fopen</code> to be enabled in your php.ini for making HTTP requests (or modify script to use cURL).</li>
                                <li>Download your Firebase Admin SDK service account JSON key from Firebase Console (Project settings &gt; Service accounts).</li>
                                <li>Securely store this JSON key file on your server (e.g., outside the web root, or named <code className="font-mono bg-background px-1 rounded-sm">firebase.json</code> in the same directory as <code className="font-mono bg-background px-1 rounded-sm">subscribe.php</code> if you use the default path).</li>
                                <li>Update the <code className="font-mono bg-background px-1 rounded-sm">$serviceAccountPath</code> variable in the PHP script if you store the JSON key elsewhere or with a different name.</li>
                                <li>Ensure your PHP error logging is configured to catch any issues during execution.</li>
                              </ul>
                              <pre className="text-xs whitespace-pre-wrap break-all">
                                <code>{selectedScripts.serverApiScriptPHP}</code>
                              </pre>
                              <Button 
                                onClick={() => copyToClipboard(selectedScripts.serverApiScriptPHP, "Server-Side API (PHP) script copied.")} 
                                size="sm" 
                                className="mt-2"
                              >
                                <Copy className="mr-2 h-4 w-4" /> Copy PHP Script
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
    

    


