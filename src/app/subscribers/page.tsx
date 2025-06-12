"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Search, UserX } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Subscriber } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const initialSubscribers: Subscriber[] = [
  { id: 'sub1', token: 'cXVzaDo...YUd0', domainId: '1', domainName: 'example.com', subscribedAt: '2023-10-05', userAgent: 'Chrome on Windows' },
  { id: 'sub2', token: 'fJkLp9...zQxR2', domainId: '1', domainName: 'example.com', subscribedAt: '2023-10-08', userAgent: 'Firefox on macOS' },
  { id: 'sub3', token: 'eYpWd1...oPqM7', domainId: '2', domainName: 'another-site.net', subscribedAt: '2023-11-20', userAgent: 'Safari on iOS' },
];

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>(initialSubscribers);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const { toast } = useToast();

  const handleDeleteSubscriber = (subscriberId: string) => {
    // Mock deletion
    setSubscribers(prev => prev.filter(sub => sub.id !== subscriberId));
    toast({ title: "Success", description: "Subscriber removed successfully." });
  };

  const filteredSubscribers = subscribers.filter(sub => {
    const matchesSearch = sub.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sub.domainName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDomain = selectedDomain === 'all' || sub.domainName === selectedDomain;
    return matchesSearch && matchesDomain;
  });

  const uniqueDomains = ['all', ...Array.from(new Set(initialSubscribers.map(sub => sub.domainName)))];

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Manage Subscribers"
        description="View and manage users who have subscribed to push notifications."
      />

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <CardTitle className="text-xl">Subscriber List</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Input
                placeholder="Search token or domain..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs text-base"
                prependIcon={<Search className="h-4 w-4 text-muted-foreground" />}
              />
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger className="w-[180px] text-base">
                  <SelectValue placeholder="Filter by domain" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueDomains.map(domain => (
                    <SelectItem key={domain} value={domain} className="text-base">
                      {domain === 'all' ? 'All Domains' : domain}
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
              <p className="text-xl font-semibold">No subscribers found.</p>
              <p>Try adjusting your search or filter.</p>
            </div>
          ) : (
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
                  <TableCell className="font-medium">{subscriber.token.substring(0, 10)}...</TableCell>
                  <TableCell>{subscriber.domainName}</TableCell>
                  <TableCell>{new Date(subscriber.subscribedAt).toLocaleDateString()}</TableCell>
                  <TableCell>{subscriber.userAgent || 'N/A'}</TableCell>
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
                            This action cannot be undone. This will permanently remove the subscriber and they will no longer receive notifications.
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
