
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, PlusCircle, AlertCircle, CheckCircle2, ListFilter, Send, Loader2, Globe, Clock, MessageSquareWarning, Users } from "lucide-react";
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
import { collection, getDocs, query, orderBy, Timestamp, onSnapshot, Unsubscribe, doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';


export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const initialStatusFilter: Record<Campaign['status'], boolean> = {
    pending_send: true,
    sending: true,
    processed: true,
    failed_to_send_trigger: true,
    processed_no_subscribers: true,
    processed_no_valid_tokens: true,
    failed_processing: true,
    draft: true, 
  };
  const [statusFilter, setStatusFilter] = React.useState<Record<Campaign['status'], boolean>>(initialStatusFilter);


  useEffect(() => {
    setIsLoading(true);
    const campaignsCollection = collection(db, 'campaigns');
    const q = query(campaignsCollection, orderBy('sentAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const campaignsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let sentAtISO = data.sentAt;
        if (data.sentAt instanceof Timestamp) {
          sentAtISO = data.sentAt.toDate().toISOString();
        } else if (typeof data.sentAt?.seconds === 'number') {
           sentAtISO = new Timestamp(data.sentAt.seconds, data.sentAt.nanoseconds).toDate().toISOString();
        }

        let processedAtISO = data.processedAt;
        if (data.processedAt instanceof Timestamp) {
          processedAtISO = data.processedAt.toDate().toISOString();
        } else if (typeof data.processedAt?.seconds === 'number') {
           processedAtISO = new Timestamp(data.processedAt.seconds, data.processedAt.nanoseconds).toDate().toISOString();
        }


        return {
          id: doc.id,
          ...data,
          sentAt: sentAtISO,
          processedAt: processedAtISO,
        } as Campaign;
      });
      setCampaigns(campaignsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching campaigns in real-time: ", error);
      toast({ title: "Error", description: "Could not fetch campaigns from database.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe(); 
  }, [toast]);

  const toggleStatusFilter = (status: Campaign['status']) => {
    setStatusFilter(prev => ({ ...prev, [status]: !prev[status] }));
  };
  
  const activeFilters = Object.entries(statusFilter)
    .filter(([,isActive]) => isActive)
    .map(([status]) => status as Campaign['status']);

  const filteredCampaigns = campaigns.filter(campaign => activeFilters.includes(campaign.status));

  const getStatusBadge = (campaign: Campaign) => {
    let statusText = campaign.status.replace(/_/g, ' ');
    let tooltipContent = `Status: ${statusText}`;
    
    switch (campaign.status) {
      case 'processed':
        statusText = `Sent (${campaign.sentStats?.successCount || 0}/${campaign.recipients || 0})`;
        if (campaign.sentStats && campaign.sentStats.failureCount > 0) {
            statusText += `, ${campaign.sentStats.failureCount} failed`;
            tooltipContent = `Successfully sent to ${campaign.sentStats.successCount} of ${campaign.recipients} subscribers. ${campaign.sentStats.failureCount} failed.`;
        } else if (campaign.sentStats) {
             tooltipContent = `Successfully sent to ${campaign.sentStats.successCount} of ${campaign.recipients} subscribers.`;
        }
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600 capitalize"><CheckCircle2 className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'pending_send':
        tooltipContent = "This campaign is queued and will be processed shortly.";
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500 capitalize"><Clock className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'sending':
         tooltipContent = "This campaign is currently being sent to subscribers.";
         return <Badge variant="outline" className="text-blue-600 border-blue-500 capitalize"><Loader2 className="mr-1 h-3 w-3 animate-spin" />{statusText}</Badge>;
      case 'failed_to_send_trigger':
        tooltipContent = "An error occurred while attempting to initiate the sending process for this campaign.";
        return <Badge variant="destructive" className="capitalize"><AlertCircle className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'failed_processing':
        tooltipContent = "An error occurred during the processing or sending of this campaign after it was initiated.";
        return <Badge variant="destructive" className="capitalize"><AlertCircle className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'processed_no_subscribers':
         tooltipContent = "The campaign was processed, but no subscribers were found for the targeted domain at that time.";
         return <Badge variant="secondary" className="capitalize"><Users className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'processed_no_valid_tokens':
         tooltipContent = "The campaign was processed, but no valid FCM tokens were found for the subscribers of the targeted domain.";
         return <Badge variant="secondary" className="capitalize"><MessageSquareWarning className="mr-1 h-3 w-3" />{statusText}</Badge>;
      case 'draft':
        tooltipContent = "This campaign is a draft and has not been sent yet.";
        return <Badge variant="secondary" className="capitalize">{statusText}</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{statusText}</Badge>;
    }
  };


  if (isLoading && campaigns.length === 0) { 
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
    <TooltipProvider>
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
                {(Object.keys(initialStatusFilter) as Campaign['status'][]).map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter[status]}
                    onCheckedChange={() => toggleStatusFilter(status)}
                    className="capitalize"
                  >
                    {status.replace(/_/g, ' ')}
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
                <TableHead>Delivery</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Processed At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium max-w-xs truncate">
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <span className="cursor-default">{campaign.title}</span>
                        </TooltipTrigger>
                        <TooltipContent><p>{campaign.title}</p></TooltipContent>
                     </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-default">
                                <Globe className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{campaign.domainName}</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent><p>{campaign.domainName}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-default">{getStatusBadge(campaign)}</div>
                        </TooltipTrigger>
                        <TooltipContent><p>
                            Status: {campaign.status.replace(/_/g, ' ')}
                            {campaign.status === 'processed' && campaign.sentStats && ` (Success: ${campaign.sentStats.successCount}, Failed: ${campaign.sentStats.failureCount})`}
                            {campaign.status === 'sending' && ` (Targeting ${campaign.recipients || 0} subscribers)`}
                        </p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {campaign.status.startsWith('processed') || campaign.status === 'sending' ? 
                        (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                <span className="text-xs cursor-default">
                                    {campaign.sentStats ? 
                                        `${campaign.sentStats.successCount || 0} sent / ${campaign.sentStats.failureCount || 0} (of ${campaign.recipients || 0})` 
                                        : (campaign.recipients > 0 ? `${campaign.recipients.toLocaleString()} targeted` : (campaign.status === 'sending' ? 'Calculating...' : '0 targeted'))}
                                </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Targeted: {campaign.recipients || 0}</p>
                                    {campaign.sentStats && <>
                                        <p>Successful: {campaign.sentStats.successCount || 0}</p>
                                        <p>Failed: {campaign.sentStats.failureCount || 0}</p>
                                    </>}
                                </TooltipContent>
                            </Tooltip>
                        )
                        : <span className="text-xs text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-xs cursor-default">{campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'N/A'}</span>
                        </TooltipTrigger>
                        <TooltipContent><p>Created: {campaign.sentAt ? new Date(campaign.sentAt).toLocaleString() : 'Not available'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                     <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="text-xs cursor-default">{campaign.processedAt ? new Date(campaign.processedAt).toLocaleString() : (campaign.status === "pending_send" || campaign.status === "sending" ? "Processing..." : "N/A")}</span>
                        </TooltipTrigger>
                        <TooltipContent><p>Processed: {campaign.processedAt ? new Date(campaign.processedAt).toLocaleString() : 'Not yet processed'}</p></TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button variant="outline" size="sm" disabled={true}>
                       <Eye className="mr-2 h-4 w-4" /> View
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
    </TooltipProvider>
  );
}
