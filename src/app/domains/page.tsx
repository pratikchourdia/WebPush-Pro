
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Code2, CheckCircle, AlertTriangle, Clock, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import type { Domain, FirebaseConfig } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { useToast } from '@/hooks/use-toast';

const initialDomains: Domain[] = [];

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
  const [domains, setDomains] = useState<Domain[]>(initialDomains);
  const [newDomainName, setNewDomainName] = useState('');
  const [newFirebaseConfig, setNewFirebaseConfig] = useState<FirebaseConfig>(initialFirebaseConfig);
  const [selectedDomainForScript, setSelectedDomainForScript] = useState<Domain | null>(null);
  const { toast } = useToast();

  const handleFirebaseConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewFirebaseConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleAddDomain = (e: React.FormEvent) => {
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

    const newDomain: Domain = {
      id: String(Date.now()),
      name: newDomainName,
      addedDate: new Date().toISOString().split('T')[0],
      status: 'pending', 
      firebaseConfig: { ...newFirebaseConfig }
    };
    setDomains(prev => [newDomain, ...prev]);
    setNewDomainName('');
    setNewFirebaseConfig(initialFirebaseConfig);
    toast({ title: "Success", description: `Domain ${newDomainName} added (pending verification).` });
  };
  
  const getStatusIcon = (status: Domain['status']) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
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

            <Button type="submit" className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-5 w-5" /> Add Domain
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {domains.length === 0 ? (
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
              <CardFooter className="flex justify-end gap-2">
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
                        <DialogFooter>
                           <Button onClick={() => {
                              navigator.clipboard.writeText(generateFirebaseScript(selectedDomainForScript.firebaseConfig, selectedDomainForScript.name));
                              toast({ title: "Copied!", description: "Script copied to clipboard."});
                           }}>Copy Script</Button>
                          <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    )}
                  </Dialog>
                )}
                 {domain.status === 'pending' && (
                    <Button variant="outline" size="sm" disabled>Verification Pending</Button>
                  )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

