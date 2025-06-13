
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, PlusCircle, AlertCircle, CheckCircle2, ListFilter, Send, Loader2, Globe } from "lucide-react";
import type { Campaign } from '@/lib/types';
import { PageHeader } from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = React.useState<Record<Campaign['status'], boolean>>({
    sent: true,
    draft: true,
    failed: true,
  });

  useEffect(() => {
    const fetchCampaigns = async () => {
      setIsLoading(true);
      try {
        const campaignsCollection = collection(db, 'campaigns');
        const q = query(campaignsCollection, orderBy('sentAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const campaignsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Ensure sentAt is handled correctly if it's a Firestore Timestamp
          let sentAtISO = data.sentAt;
          if (data.sentAt instanceof Timestamp) {
            sentAtISO = data.sentAt.toDate().toISOString();
          } else if (typeof data.sentAt?.seconds === 'number') { // Handle plain object Timestamps
             sentAtISO = new Timestamp(data.sentAt.seconds, data.sentAt.nanoseconds).toDate().toISOString();
          }

          return {
            id: doc.id,
            ...data,
            sentAt: sentAtISO, // Ensure it's a string for consistency with type
          } as Campaign;
        });
        setCampaigns(campaignsData);
      } catch (error) {
        console.error("Error fetching campaigns: ", error);
        toast({ title: "Error", description: "Could not fetch campaigns from database.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, [toast]);

  const toggleStatusFilter = (status: Campaign['status']) => {
    setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }));
  };
  
  const activeFilters = Object.entries(statusFilter)
    .filter(([,isActive]) => isActive)
    .map(([status]) => status as Campaign['status']);

  const filteredCampaigns = campaigns.filter(campaign => activeFilters.includes(campaign.status));

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" />Sent</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <PageHeader
          title="Campaigns"
          description="View your past and draft web push notification campaigns."
          actions={
            <Link href="/campaigns/new" passHref>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> Create New Campaign
              </Button>
            </Link>
          }
        />
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
             <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-9 w-32" />
             </div>
          </CardHeader>
          <CardContent>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border-b">
                <Skeleton className="h-6 flex-grow" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
                 <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-28" />
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
        title="Campaigns"
        description="View your past and draft web push notification campaigns."
        actions={
          <Link href="/campaigns/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Create New Campaign
            </Button>
          </Link>
        }
      />

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Campaign History ({filteredCampaigns.length})</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filter Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(['sent', 'draft', 'failed'] as Campaign['status'][]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter[status]}
                    onCheckedChange={() => toggleStatusFilter(status)}
                    className="capitalize"
                  >
                    {status}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground">
                <Send className="mx-auto h-12 w-12 mb-4" />
                <p className="text-xl font-semibold">
                  {campaigns.length === 0 ? "No campaigns created yet." : "No campaigns match your filters."}
                </p>
                <p>
                  {campaigns.length === 0 ? "Create your first campaign to get started!" : "Try adjusting your filters or create a new campaign."}
                </p>
             </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium max-w-xs truncate" title={campaign.title}>{campaign.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />
                        {campaign.domainName}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{campaign.status !== 'draft' && campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{campaign.recipients > 0 ? campaign.recipients.toLocaleString() : '0'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild disabled> {/* View/Edit disabled for now */}
                      <Link href={`/campaigns/${campaign.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> View/Edit
                      </Link>
                    </Button>
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
