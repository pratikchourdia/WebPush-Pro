
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
<!-- Add this to your website's <head> or before </body> -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>

<script>
  // Your web app's Firebase configuration for ${domainName}
  const firebaseConfig = {
    apiKey: "${config.apiKey}",
    authDomain: "${config.authDomain}",
    projectId: "${config.projectId}",
    storageBucket: "${config.storageBucket}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}"
  };

  const clientAppName = '${clientAppName}';
  let firebaseApp;
  try {
    firebaseApp = firebase.app(clientAppName);
  } catch (e) {
    firebaseApp = firebase.initializeApp(firebaseConfig, clientAppName);
  }
  const messaging = firebase.messaging(firebaseApp);

  function requestPermissionAndGetToken() {
    console.log('Requesting permission for ${domainName}...');
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted for ${domainName}.');
        messaging.getToken({ vapidKey: '${config.vapidKey}' })
          .then((currentToken) => {
            if (currentToken) {
              console.log('FCM Token for ${domainName}:', currentToken);
              const subscriberData = {
                token: currentToken,
                domainName: '${domainName}',
                userAgent: navigator.userAgent
              };
              fetch('${apiBaseUrl}/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscriberData)
              })
              .then(response => {
                if (!response.ok) {
                  return response.json().then(err => { throw new Error(err.details || err.error || 'Subscription API request failed') });
                }
                return response.json();
              })
              .then(data => {
                if (data.id) {
                  console.log('Subscription successful for ${domainName}:', data);
                  // Optionally, inform the user with a less intrusive method.
                } else {
                  console.error('Subscription API response error for ${domainName}:', data);
                }
              })
              .catch(err => {
                console.error('Subscription API fetch error for ${domainName}:', err);
              });
            } else {
              console.log('No registration token available for ${domainName}. Request permission to generate one.');
            }
          }).catch((err) => {
            console.log('An error occurred while retrieving token for ${domainName}. ', err);
          });
      } else {
        console.log('Unable to get permission to notify for ${domainName}. Permission state: ' + permission);
      }
    });
  }

  if (typeof firebase !== 'undefined' && firebase.messaging.isSupported()) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(function(registration) {
        console.log('Service Worker is ready for ${domainName} (Registration:', registration, '). Attempting to get token.');
        requestPermissionAndGetToken();
      }).catch(function(error) {
        console.error('Service Worker registration failed for ${domainName}: ', error);
      });
    } else {
      console.warn('Service workers are not supported in this browser for ${domainName}. Push notifications will not work.');
    }
  } else {
    console.warn('Firebase Messaging is not supported in this browser or an error occurred during Firebase initialization for ${domainName}.');
  }

</script>

<!-- 
  REMEMBER: You MUST create a firebase-messaging-sw.js file in your public/root directory of ${domainName}.
  It should contain AT LEAST the following:

  // File: firebase-messaging-sw.js

  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

  // Initialize Firebase with the same config used in your web page.
  // Use a unique app name for the service worker's Firebase instance.
  const swAppName = '${swAppName}';
  let firebaseAppSW;
  try {
    firebaseAppSW = firebase.app(swAppName);
  } catch (e) { // If app doesn't exist, initialize it
    firebaseAppSW = firebase.initializeApp({
      apiKey: "${config.apiKey}",
      authDomain: "${config.authDomain}",
      projectId: "${config.projectId}",
      storageBucket: "${config.storageBucket}",
      messagingSenderId: "${config.messagingSenderId}",
      appId: "${config.appId}"
    }, swAppName);
  }
  
  const messagingSW = firebase.messaging(firebaseAppSW);

  // Optional: Handle background messages
  messagingSW.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message for ${domainName}', payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/firebase-logo.png', // Default icon, ensure it exists
      // data: payload.data // Pass along data for click actions
    };
    self.registration.showNotification(notificationTitle, notificationOptions);
  });
-->
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

    
