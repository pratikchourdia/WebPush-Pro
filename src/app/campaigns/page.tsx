"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, PlusCircle, AlertCircle, CheckCircle2, ListFilter } from "lucide-react";
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
} from "@/components/ui/dropdown-menu"

const initialCampaigns: Campaign[] = [
  { id: 'camp1', title: '🎉 New Feature Alert!', body: 'Check out our amazing new AI-powered editor.', sentAt: '2023-12-01', status: 'sent', recipients: 1200, targetUrl: '/features/ai-editor', imageUrl: 'https://placehold.co/100x100.png' },
  { id: 'camp2', title: '🎁 Holiday Special Offer', body: 'Get 50% off all plans this week only!', sentAt: '2023-12-10', status: 'sent', recipients: 1150, targetUrl: '/pricing' },
  { id: 'camp3', title: 'Reminder: Webinar Tomorrow', body: 'Join our free webinar on maximizing productivity.', sentAt: '2023-12-14', status: 'failed', recipients: 0, targetUrl: '/webinars/productivity' },
  { id: 'camp4', title: 'Draft: Q1 Newsletter', body: 'Coming soon: exciting updates for the new year!', sentAt: '2023-12-15', status: 'draft', recipients: 0 },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [statusFilter, setStatusFilter] = React.useState<Record<Campaign['status'], boolean>>({
    sent: true,
    draft: true,
    failed: true,
  });

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
            <CardTitle>Campaign History</CardTitle>
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
                <p className="text-xl font-semibold">No campaigns match your filters.</p>
                <p>Try adjusting your filters or create a new campaign.</p>
             </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
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
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{campaign.status !== 'draft' ? new Date(campaign.sentAt).toLocaleString() : 'N/A'}</TableCell>
                  <TableCell>{campaign.recipients > 0 ? campaign.recipients.toLocaleString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/campaigns/${campaign.id}`}> {/* Placeholder for view/edit campaign details */}
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
