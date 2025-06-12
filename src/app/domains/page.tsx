
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
import { collection, addDoc, getDocs, Timestamp, query, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
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
  return `
<!-- Add this to your website's <head> or before </body> -->
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js"></script>

<script>
  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "${config.apiKey}",
    authDomain: "${config.authDomain}",
    projectId: "${config.projectId}",
    storageBucket: "${config.storageBucket}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  function requestPermissionAndGetToken() {
    console.log('Requesting permission...');
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        // Get registration token. Initially this makes a network call, once retrieved
        // subsequent calls to getToken will return from cache.
        messaging.getToken({ vapidKey: '${config.vapidKey}' })
          .then((currentToken) => {
            if (currentToken) {
              console.log('FCM Token:', currentToken);
              // TODO: Send this token to your server to store against the user for ${domainName}
              // Example:
              // fetch('https://YOUR_WEBPUSH_PRO_SERVER/api/subscribe', {
              //   method: 'POST',
              //   headers: { 'Content-Type': 'application/json' },
              //   body: JSON.stringify({ token: currentToken, domain: '${domainName}' })
              // });
              alert('Subscription successful! Token: ' + currentToken);
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }).catch((err) => {
            console.log('An error occurred while retrieving token. ', err);
          });
      } else {
        console.log('Unable to get permission to notify.');
      }
    });
  }

  // Example: Trigger subscription on a button click
  // document.getElementById('subscribeButton').addEventListener('click', requestPermissionAndGetToken);
</script>

<!-- 
  REMEMBER: You also need a firebase-messaging-sw.js file in your public/root directory.
  It should contain at least:

  importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "${config.apiKey}",
    authDomain: "${config.authDomain}",
    projectId: "${config.projectId}",
    storageBucket: "${config.storageBucket}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}"
  });
  
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
      body: payload.notification.body,
      icon: payload.notification.icon, // Ensure this icon exists
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
      // Fallback for environments where crypto.randomUUID is not available (e.g. older Node server-side during SSR, though less likely here)
      verificationToken = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    try {
      const newDomainData: Omit<Domain, 'id'> = {
        name: newDomainName,
        addedDate: new Date().toISOString().split('T')[0],
        status: 'pending' as Domain['status'], 
        firebaseConfig: { ...newFirebaseConfig },
        verificationToken: verificationToken,
        lastVerificationAttempt: new Date().toISOString(),
      };
      // Use setDoc with a specific ID if you want to control it, or addDoc for auto-generated ID.
      // For simplicity, using addDoc.
      const docRef = await addDoc(collection(db, 'domains'), newDomainData);
      setDomains(prev => [{ id: docRef.id, ...newDomainData }, ...prev]);
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
    if (!token) {
      toast({ title: "Error", description: "Verification token not found.", variant: "destructive" });
      return;
    }
    setVerifyingDomainId(domainId);
    try {
      // In a real application, this would trigger a backend check (e.g., a Genkit flow)
      // that queries DNS for the TXT record with the provided token.
      // For this example, we'll simulate a successful verification.
      console.log(`Simulating verification for domain ${domainId} with token ${token}`);
      
      const domainRef = doc(db, "domains", domainId);
      await updateDoc(domainRef, {
        status: 'verified',
        lastVerificationAttempt: new Date().toISOString(),
      });

      setDomains(prevDomains => 
        prevDomains.map(d => 
          d.id === domainId ? { ...d, status: 'verified', lastVerificationAttempt: new Date().toISOString() } : d
        )
      );
      toast({ title: "Verification Successful", description: `Domain ${domains.find(d=>d.id === domainId)?.name} is now verified.` });
    } catch (error) {
      console.error("Error verifying domain: ", error);
      toast({ title: "Verification Failed", description: "Could not verify domain. Please try again.", variant: "destructive" });
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
                placeholder="e.g., example.com"
                value={newDomainName}
                onChange={(e) => setNewDomainName(e.target.value)}
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
              </p>
              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <Input id="apiKey" name="apiKey" type="text" placeholder="Firebase API Key" value={newFirebaseConfig.apiKey} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="authDomain">Auth Domain</Label>
                <Input id="authDomain" name="authDomain" type="text" placeholder="your-project.firebaseapp.com" value={newFirebaseConfig.authDomain} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="projectId">Project ID</Label>
                <Input id="projectId" name="projectId" type="text" placeholder="your-project-id" value={newFirebaseConfig.projectId} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="storageBucket">Storage Bucket</Label>
                <Input id="storageBucket" name="storageBucket" type="text" placeholder="your-project.appspot.com" value={newFirebaseConfig.storageBucket} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="messagingSenderId">Messaging Sender ID</Label>
                <Input id="messagingSenderId" name="messagingSenderId" type="text" placeholder="1234567890" value={newFirebaseConfig.messagingSenderId} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="appId">App ID</Label>
                <Input id="appId" name="appId" type="text" placeholder="1:123...:web:..." value={newFirebaseConfig.appId} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
              <div>
                <Label htmlFor="vapidKey">VAPID Key (Public Key)</Label>
                <Input id="vapidKey" name="vapidKey" type="text" placeholder="Your Firebase Cloud Messaging public VAPID key" value={newFirebaseConfig.vapidKey} onChange={handleFirebaseConfigChange} required className="text-base"/>
              </div>
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
                <CardDescription>Added on: {new Date(domain.addedDate).toLocaleDateString()}</CardDescription>
              </CardHeader>
              {domain.status === 'pending' && domain.verificationToken && (
                <CardContent className="pt-0">
                  <div className="bg-muted/50 p-4 rounded-md border border-dashed">
                    <p className="text-sm font-medium text-foreground mb-2">Verify Domain Ownership</p>
                    <p className="text-xs text-muted-foreground mb-1">
                      To verify your domain, add the following TXT record to your DNS settings for <strong>{domain.name}</strong>:
                    </p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside mb-3 space-y-0.5">
                      <li><strong>Type:</strong> TXT</li>
                      <li><strong>Name/Host:</strong> @ (or your domain name, e.g., {domain.name})</li>
                      <li><strong>Value/Content:</strong></li>
                    </ul>
                    <div className="flex items-center gap-2 bg-background p-2 rounded-md border">
                       <Input 
                          readOnly 
                          value={domain.verificationToken} 
                          className="text-xs flex-grow bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
                        />
                       <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(domain.verificationToken!, "Verification token copied.")}
                        >
                         <Copy className="h-3 w-3" />
                       </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      DNS changes can take some time to propagate (up to 48 hours, but often much faster).
                    </p>
                  </div>
                </CardContent>
              )}
              <CardFooter className="flex justify-end gap-2">
                {domain.status === 'pending' && (
                  <Button 
                    variant="default" 
                    onClick={() => handleVerifyDomain(domain.id, domain.verificationToken)}
                    disabled={verifyingDomainId === domain.id}
                  >
                    {verifyingDomainId === domain.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    {verifyingDomainId === domain.id ? "Verifying..." : "Verify Domain"}
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
                            You'll also need to create a <code className="font-mono bg-muted px-1 rounded-sm">firebase-messaging-sw.js</code> file.
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
                 {domain.status === 'error' && (
                    <Badge variant="destructive">Verification Error</Badge> 
                  )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

