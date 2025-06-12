
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, UsersRound, Send, BarChart3, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

interface Stat {
  title: string;
  value: string;
  icon: React.ElementType;
  change: string;
  isLoading?: boolean;
}

const initialStats: Stat[] = [
  { title: "Registered Domains", value: "0", icon: Globe, change: "Verified domains", isLoading: true },
  { title: "Total Subscribers", value: "0", icon: UsersRound, change: "Across all domains", isLoading: true },
  { title: "Campaigns Sent", value: "0", icon: Send, change: "No data yet", isLoading: false }, // Will remain static for now
  { title: "Avg. Click Rate", value: "N/A", icon: BarChart3, change: "No data yet", isLoading: false }, // Will remain static for now
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stat[]>(initialStats);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Fetch verified domains count
        const domainsQuery = query(collection(db, 'domains'), where('status', '==', 'verified'));
        const domainsSnapshot = await getCountFromServer(domainsQuery);
        const verifiedDomainsCount = domainsSnapshot.data().count;

        // Fetch total subscribers count
        const subscribersQuery = query(collection(db, 'subscribers'));
        const subscribersSnapshot = await getCountFromServer(subscribersQuery);
        const totalSubscribersCount = subscribersSnapshot.data().count;

        setStats(prevStats => prevStats.map(stat => {
          if (stat.title === "Registered Domains") {
            return { ...stat, value: verifiedDomainsCount.toString(), isLoading: false };
          }
          if (stat.title === "Total Subscribers") {
            return { ...stat, value: totalSubscribersCount.toString(), isLoading: false };
          }
          return stat;
        }));

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Update stats to reflect error or keep loading:
        setStats(prevStats => prevStats.map(stat => ({ ...stat, value: "Error", isLoading: false, change: "Failed to load" })));
      } finally {
        setIsLoading(false); // Overall loading for the page
         // Ensure individual loading states are also false
        setStats(prevStats => prevStats.map(stat => ({ ...stat, isLoading: false })));
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="container mx-auto">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of your WebPush Pro activity."
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              {stat.isLoading ? <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" /> : <stat.icon className="h-5 w-5 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              {stat.isLoading ? (
                <Skeleton className="h-8 w-1/2 my-1" />
              ) : (
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              )}
              <p className="text-xs text-muted-foreground pt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-3/4"/> : <p className="text-muted-foreground">No recent campaign activity to display yet.</p>}
            {/* Placeholder for recent activity feed */}
          </CardContent>
        </Card>
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/campaigns/new" className="block text-primary hover:underline">Create New Campaign</a>
            <a href="/domains" className="block text-primary hover:underline">Manage Domains</a>
            <a href="/subscribers" className="block text-primary hover:underline">View Subscribers</a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    