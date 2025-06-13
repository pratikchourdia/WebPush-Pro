
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Search, UserX, Globe } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Subscriber, Domain } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('all'); // Filter by domain name
  const { toast } = useToast();
  const [allDomains, setAllDomains] = useState<Domain[]>([]); // To populate filter dropdown

  useEffect(() => {
    const fetchSubscribersAndDomains = async () => {
      setIsLoading(true);
      try {
        // Fetch domains for the filter dropdown
        const domainsCollection = collection(db, 'domains');
        const domainsSnapshot = await getDocs(query(domainsCollection, orderBy('name')));
        const domainsData = domainsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Domain));
        setAllDomains(domainsData);

        // Fetch subscribers
        const subscribersCollection = collection(db, 'subscribers');
        const q = query(subscribersCollection, orderBy('subscribedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const subscribersData = querySnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          let subscribedAtStr: string;
          if (data.subscribedAt instanceof Timestamp) {
            subscribedAtStr = data.subscribedAt.toDate().toISOString();
          } else if (typeof data.subscribedAt === 'string') {
            subscribedAtStr = data.subscribedAt; // Already a string
          } else if (data.subscribedAt && typeof data.subscribedAt.seconds === 'number' && typeof data.subscribedAt.nanoseconds === 'number') {
            // Handle cases where it might be a plain object from Firestore (less common with serverTimestamp)
            subscribedAtStr = new Timestamp(data.subscribedAt.seconds, data.subscribedAt.nanoseconds).toDate().toISOString();
          }
          else {
            // Fallback for unexpected format
            subscribedAtStr = new Date().toISOString(); 
            console.warn(`Subscriber ${docSnapshot.id} has unexpected subscribedAt format:`, data.subscribedAt);
          }
          return {
            id: docSnapshot.id,
            ...data,
            subscribedAt: subscribedAtStr,
          } as Subscriber;
        });
        setSubscribers(subscribersData);

      } catch (error) {
        console.error("Error fetching data: ", error);
        toast({ title: "Error", description: "Could not fetch subscribers or domains.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscribersAndDomains();
  }, [toast]);

  const handleDeleteSubscriber = async (subscriberId: string) => {
    try {
      await deleteDoc(doc(db, 'subscribers', subscriberId));
      setSubscribers(prev => prev.filter(sub => sub.id !== subscriberId));
      toast({ title: "Success", description: "Subscriber removed successfully." });
    } catch (error) {
      console.error("Error deleting subscriber: ", error);
      toast({ title: "Error", description: "Could not remove subscriber.", variant: "destructive" });
    }
  };

  const filteredSubscribers = useMemo(() => {
    return subscribers.filter(sub => {
      const searchTermLower = searchTerm.toLowerCase();
      const matchesSearch = sub.token.toLowerCase().includes(searchTermLower) ||
                            sub.domainName.toLowerCase().includes(searchTermLower) ||
                            (sub.userAgent && sub.userAgent.toLowerCase().includes(searchTermLower));
      const matchesDomain = selectedDomainFilter === 'all' || sub.domainName === selectedDomainFilter;
      return matchesSearch && matchesDomain;
    });
  }, [subscribers, searchTerm, selectedDomainFilter]);
  
  const uniqueDomainNamesForFilter = useMemo(() => {
    const names = allDomains.filter(d => d.status === 'verified').map(d => d.name);
    return ['all', ...Array.from(new Set(names))];
  }, [allDomains]);


  if (isLoading) {
    return (
      <div className="container mx-auto">
        <PageHeader
          title="Manage Subscribers"
          description="View and manage users who have subscribed to push notifications."
        />
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-[180px]" />
            </div>
          </CardHeader>
          <CardContent>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border-b">
                <Skeleton className="h-6 flex-grow" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Manage Subscribers"
        description="View and manage users who have subscribed to push notifications from your verified domains."
      />

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-xl">Subscriber List ({filteredSubscribers.length})</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search token, domain, user agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs text-base pl-10"
                />
              </div>
              <Select value={selectedDomainFilter} onValueChange={setSelectedDomainFilter}>
                <SelectTrigger className="w-full sm:w-[200px] text-base">
                  <SelectValue placeholder="Filter by domain" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDomainNamesForFilter.map(domainName => (
                    <SelectItem key={domainName} value={domainName} className="text-base">
                      {domainName === 'all' ? 'All Verified Domains' : domainName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSubscribers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <UserX className="mx-auto h-12 w-12 mb-4" />
              <p className="text-xl font-semibold">No subscribers match your current filters.</p>
              {subscribers.length === 0 && searchTerm === '' && selectedDomainFilter === 'all' ? (
                 <p>Once users subscribe to notifications on your verified domains, they will appear here.</p>
              ) : (
                <p>Try adjusting your search or filter, or check if users have subscribed yet.</p>
              )}
               {allDomains.filter(d => d.status === 'verified').length === 0 && (
                <div className="mt-4 p-4 bg-muted/50 rounded-md border border-dashed">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                        <Globe className="h-5 w-5"/>
                        <span>You don't have any verified domains yet.</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        Please add and verify a domain on the <a href="/domains" className="text-primary hover:underline">Domains page</a> to start collecting subscribers.
                    </p>
                </div>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token (Partial)</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Subscribed At</TableHead>
                  <TableHead>User Agent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium" title={subscriber.token}>
                      {subscriber.token.substring(0, 15)}...{subscriber.token.slice(-5)}
                    </TableCell>
                    <TableCell>{subscriber.domainName}</TableCell>
                    <TableCell>{new Date(subscriber.subscribedAt).toLocaleString()}</TableCell>
                    <TableCell className="max-w-xs truncate" title={subscriber.userAgent || 'N/A'}>{subscriber.userAgent || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently remove the subscriber ({subscriber.token.substring(0,10)}...) and they will no longer receive notifications.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSubscriber(subscriber.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
