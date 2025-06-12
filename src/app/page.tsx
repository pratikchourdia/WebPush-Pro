"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, UsersRound, Send, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";

const stats = [
  { title: "Registered Domains", value: "5", icon: Globe, change: "+2 this month" },
  { title: "Total Subscribers", value: "1,250", icon: UsersRound, change: "+150 this week" },
  { title: "Campaigns Sent", value: "32", icon: Send, change: "+5 last 7 days" },
  { title: "Avg. Click Rate", value: "12.5%", icon: BarChart3, change: "-0.5% vs last campaign" },
];

export default function DashboardPage() {
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
              <stat.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
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
            <p className="text-muted-foreground">No recent activity to display yet.</p>
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
