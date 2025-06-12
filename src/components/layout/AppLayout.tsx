"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/config/nav";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rocket } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen">
        <Sidebar className="border-r bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2">
              <Rocket className="h-7 w-7 text-primary" />
              <h1 className="text-xl font-semibold font-headline text-primary">WebPush Pro</h1>
            </Link>
          </SidebarHeader>
          <SidebarContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <SidebarMenu className="px-2 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <SidebarMenuItem key={link.href}>
                    <Link href={link.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        className={cn(
                          "w-full justify-start",
                          pathname === link.href && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                          pathname !== link.href && "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          link.disabled && "cursor-not-allowed opacity-50"
                        )}
                        disabled={link.disabled}
                        aria-disabled={link.disabled}
                        tabIndex={link.disabled ? -1 : undefined}
                        isActive={pathname === link.href}
                      >
                        <link.icon className="h-5 w-5 mr-2" />
                        {link.label}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </ScrollArea>
          </SidebarContent>
          <SidebarFooter className="p-4 border-t">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} WebPush Pro
            </p>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex-1 bg-background">
          <header className="sticky top-0 z-10 flex items-center justify-between h-16 px-6 bg-background/80 backdrop-blur-sm border-b">
            <div className="flex items-center">
               <SidebarTrigger className="md:hidden mr-2" />
               {/* Current Page Title can go here */}
            </div>
            <div>
              {/* User Avatar / Actions can go here */}
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
