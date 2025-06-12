
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
  // Determine the base URL for the API. In a real deployment, you might get this from an env variable.
  // For simplicity, we'll use a relative path if on the same origin, or prompt user to configure if needed.
  const apiBaseUrl = typeof window !== 'undefined' ? window.location.origin : 'YOUR_WEBPUSH_PRO_APP_URL';

  return `
<!-- Add this to your website's <head> or before </body> -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js"></script>

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
    console.log('Requesting permission for ${domainName}...');
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        console.log('Notification permission granted for ${domainName}.');
        // Get registration token.
        messaging.getToken({ vapidKey: '${config.vapidKey}' })
          .then((currentToken) => {
            if (currentToken) {
              console.log('FCM Token for ${domainName}:', currentToken);
              const subscriberData = {
                token: currentToken,
                domainName: '${domainName}',
                userAgent: navigator.userAgent // Capture userAgent on client
              };
              // Send this token to your server
              fetch('${apiBaseUrl}/api/subscribe', { // Use the determined API base URL
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscriberData)
              })
              .then(response => response.json())
              .then(data => {
                if (data.id) {
                  console.log('Subscription successful for ${domainName}:', data);
                  alert('Successfully subscribed to notifications for ${domainName}!');
                } else {
                  console.error('Subscription API response error for ${domainName}:', data);
                  alert('Subscription to ${domainName} failed. Details: ' + (data.details || data.error || 'Unknown error'));
                }
              })
              .catch(err => {
                console.error('Subscription API fetch error for ${domainName}:', err);
                alert('Subscription to ${domainName} encountered a network error.');
              });
            } else {
              console.log('No registration token available for ${domainName}. Request permission to generate one.');
              alert('Could not get token for ${domainName}. Please ensure notifications are enabled and try again.');
            }
          }).catch((err) => {
            console.log('An error occurred while retrieving token for ${domainName}. ', err);
            alert('Error getting token for ${domainName}: ' + err.message);
          });
      } else {
        console.log('Unable to get permission to notify for ${domainName}.');
        alert('Permission for notifications was denied for ${domainName}.');
      }
    });
  }

  // Example: Trigger subscription on a button click
  // Consider adding a button with id="subscribeButton-${domainName.replace(/\\./g, '-')}"
  // and uncommenting the line below.
  // document.getElementById('subscribeButton-${domainName.replace(/\\./g, '-')}')?.addEventListener('click', requestPermissionAndGetToken);

  // Or, you might want to call requestPermissionAndGetToken() automatically under certain conditions,
  // e.g., after a user logs in or completes a specific action.
</script>

<!-- 
  REMEMBER: You also need a firebase-messaging-sw.js file in your public/root directory of ${domainName}.
  It should contain at least:

  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

  // Initialize Firebase with the same config used in your web page
  firebase.initializeApp({
    apiKey: "${config.apiKey}",
    authDomain: "${config.authDomain}",
    projectId: "${config.projectId}",
    storageBucket: "${config.storageBucket}",
    messagingSenderId: "${config.messagingSenderId}",
    appId: "${config.appId}"
  });
  
  const messaging = firebase.messaging();

  // Optional: Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message for ${domainName}', payload);
    // Customize notification here
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: payload.notification?.icon || '/default-icon.png', // Ensure this icon exists
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
      const newDomainData: Omit<Domain, 'id' | 'addedDate' | 'lastVerificationAttempt'> & { addedDate: Timestamp, lastVerificationAttempt: Timestamp } = {
        name: newDomainName,
        status: 'pending' as Domain['status'], 
        firebaseConfig: { ...newFirebaseConfig },
        verificationToken: verificationToken,
        addedDate: Timestamp.fromDate(new Date()),
        lastVerificationAttempt: Timestamp.fromDate(new Date()),
      };
      
      const docRef = await addDoc(collection(db, 'domains'), newDomainData);
      setDomains(prev => [{ 
        id: docRef.id, 
        ...newDomainData, 
        addedDate: newDomainData.addedDate.toDate().toISOString().split('T')[0],
        lastVerificationAttempt: newDomainData.lastVerificationAttempt.toDate().toISOString(),
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
    try {
      // In a real application, this would trigger a backend check.
      // For this example, we simulate a successful verification.
      // IMPORTANT: Replace this with actual DNS check logic in a production environment.
      console.log(`Simulating verification for domain ${domainToVerify.name} (ID: ${domainId}) with token ${token}`);
      
      // Simulate a delay for verification
      await new Promise(resolve => setTimeout(resolve, 1500));

      const domainRef = doc(db, "domains", domainId);
      const newVerificationTime = Timestamp.fromDate(new Date());
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
    } catch (error) {
      console.error("Error verifying domain: ", error);
      const domainName = domains.find(d => d.id === domainId)?.name || 'the domain';
      toast({ title: "Verification Failed", description: `Could not verify ${domainName}. Please ensure the TXT record is correctly set up and has propagated.`, variant: "destructive" });
      
      // Optionally update status to error or keep as pending
      const domainRef = doc(db, "domains", domainId);
      const newVerificationTime = Timestamp.fromDate(new Date());
      await updateDoc(domainRef, {
        // status: 'error', // Or keep as 'pending'
        lastVerificationAttempt: newVerificationTime,
      });
       setDomains(prevDomains => 
        prevDomains.map(d => 
          d.id === domainId ? { ...d, /* status: 'error', */ lastVerificationAttempt: newVerificationTime.toDate().toISOString() } : d
        )
      );
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
                 Ensure this Firebase project is set up for Web Push (FCM).
              </p>
              {(Object.keys(newFirebaseConfig) as Array<keyof FirebaseConfig>).map((key) => (
                <div key={key}>
                  <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <Input 
                    id={key} 
                    name={key} 
                    type={key.includes('Key') || key.includes('Id') ? 'password' : 'text'} 
                    placeholder={`Firebase ${key.replace(/([A-Z])/g, ' $1').trim()}`} 
                    value={newFirebaseConfig[key]} 
                    onChange={handleFirebaseConfigChange} 
                    required 
                    className="text-base"
                  />
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
                            Also create a <code className="font-mono bg-muted px-1 rounded-sm">firebase-messaging-sw.js</code> file in your site's root (see comments in script).
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
                     <Badge variant="destructive" className="flex items-center gap-1">
                       <AlertTriangle className="h-3 w-3" /> Verification Error 
                       <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 h-auto text-xs text-destructive-foreground hover:text-destructive-foreground/80"
                          onClick={() => handleVerifyDomain(domain.id, domain.verificationToken)}
                          disabled={verifyingDomainId === domain.id}
                        >
                          (Retry?)
                        </Button>
                     </Badge>
                  )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
