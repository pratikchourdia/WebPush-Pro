
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Edit3, Send, Eye, Image as ImageIcon, Globe, Loader2, CheckCircle } from "lucide-react";
import Image from 'next/image';
import { PageHeader } from '@/components/shared/PageHeader';
import { generateNotificationContent, GenerateNotificationContentInput, GenerateNotificationContentOutput } from '@/ai/flows/generate-notification-content';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc } from 'firebase/firestore';
import type { Domain, Campaign } from '@/lib/types';

interface NotificationFormData {
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
  domainId: string;
}

const initialFormData: NotificationFormData = {
  title: '',
  body: '',
  imageUrl: '',
  targetUrl: '',
  domainId: '',
};

export default function NewCampaignPage() {
  const [formData, setFormData] = useState<NotificationFormData>(initialFormData);
  const [pageContent, setPageContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("ai-composer");
  const { toast } = useToast();
  const [verifiedDomains, setVerifiedDomains] = useState<Domain[]>([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(true);

  useEffect(() => {
    const fetchVerifiedDomains = async () => {
      setIsLoadingDomains(true);
      try {
        const domainsCollection = collection(db, 'domains');
        const q = query(domainsCollection, where('status', '==', 'verified'));
        const querySnapshot = await getDocs(q);
        const domainsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Domain));
        setVerifiedDomains(domainsData);
      } catch (error) {
        console.error("Error fetching verified domains: ", error);
        toast({ title: "Error", description: "Could not fetch verified domains.", variant: "destructive" });
      } finally {
        setIsLoadingDomains(false);
      }
    };
    fetchVerifiedDomains();
  }, [toast]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDomainChange = (value: string) => {
    setFormData(prev => ({ ...prev, domainId: value }));
  };

  const handleGenerateWithAI = async () => {
    if (!pageContent.trim()) {
      toast({ title: "Error", description: "Page content cannot be empty for AI generation.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const input: GenerateNotificationContentInput = { pageContent };
      const result: GenerateNotificationContentOutput = await generateNotificationContent(input);
      setFormData(prev => ({
        ...prev,
        title: result.title,
        body: result.body,
        imageUrl: result.imageUrl || prev.imageUrl,
      }));
      toast({ title: "AI Generation Successful", description: "Notification content has been generated." });
    } catch (error) {
      console.error("AI generation failed:", error);
      toast({ title: "AI Generation Failed", description: "Could not generate notification content. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.domainId) {
      toast({ title: "Error", description: "Please select a target domain for the campaign.", variant: "destructive" });
      return;
    }
    if (!formData.title.trim() || !formData.body.trim()) {
      toast({ title: "Error", description: "Title and body cannot be empty.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const selectedDomain = verifiedDomains.find(d => d.id === formData.domainId);
    if (!selectedDomain) {
      toast({ title: "Error", description: "Selected domain not found.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    let campaignDocId = '';
    try {
      const campaignData: Omit<Campaign, 'id'> = {
        title: formData.title,
        body: formData.body,
        imageUrl: formData.imageUrl || '',
        targetUrl: formData.targetUrl || '',
        domainId: selectedDomain.id,
        domainName: selectedDomain.name,
        sentAt: new Date().toISOString(), 
        status: 'pending_send', 
        recipients: 0, 
        sentStats: { successCount: 0, failureCount: 0 },
      };
      
      const docRef = await addDoc(collection(db, 'campaigns'), campaignData);
      campaignDocId = docRef.id;
      toast({ 
        title: "Campaign Saved!", 
        description: `Campaign "${formData.title}" queued for sending. Processing in background.`, 
        variant: "default" 
      });
      setFormData(initialFormData); 
      setPageContent('');

      // Trigger the sending API in a "fire-and-forget" manner
      fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaignDocId }),
      })
      .then(async sendResponse => {
        if (!sendResponse.ok) {
          const sendResult = await sendResponse.json().catch(() => ({error: 'Failed to trigger campaign send, unknown API error.'}));
          // Log error, maybe update campaign status to 'failed_to_send_trigger' from client (though ideally server does this)
          console.error("Error triggering campaign send API:", sendResult.error || sendResponse.statusText);
          toast({ 
            title: "Send Trigger Failed", 
            description: `Could not initiate sending for campaign ${campaignDocId}. Error: ${sendResult.error || 'Server error'}`, 
            variant: "destructive" 
          });
          // Optionally update campaign status here if API call fails to even start
           try {
              const campaignRef = doc(db, 'campaigns', campaignDocId);
              await updateDoc(campaignRef, { status: 'failed_to_send_trigger' });
           } catch (updateError) {
              console.error("Failed to update campaign status to failed_to_send_trigger:", updateError);
           }
        }
        // Success of triggering the API doesn't mean success of sending all messages.
        // The backend will update status. Client doesn't need to do much more here.
      })
      .catch(error => {
        console.error("Fetch error for /api/campaigns/send:", error);
        toast({ 
          title: "Network Error", 
          description: `Could not connect to campaign sending API for ${campaignDocId}.`, 
          variant: "destructive" 
        });
         try {
            const campaignRef = doc(db, 'campaigns', campaignDocId);
            updateDoc(campaignRef, { status: 'failed_to_send_trigger' });
         } catch (updateError) {
            console.error("Failed to update campaign status to failed_to_send_trigger after network error:", updateError);
         }
      });

    } catch (error: any) {
      console.error("Error creating campaign: ", error);
      toast({ 
        title: "Campaign Creation Error", 
        description: `Failed: ${error.message || 'Could not save campaign.'}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (formData.imageUrl && formData.imageUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
      setPreviewImageUrl(formData.imageUrl);
    } else if (formData.imageUrl) { 
      setPreviewImageUrl(`https://placehold.co/300x200.png`);
    } else {
      setPreviewImageUrl(null);
    }
  }, [formData.imageUrl]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Create New Campaign"
        description="Compose and send a new web push notification to subscribers of a selected domain."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <form onSubmit={handleSubmit} className="md:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai-composer"><Sparkles className="mr-2 h-4 w-4" />AI Composer</TabsTrigger>
              <TabsTrigger value="manual-composer"><Edit3 className="mr-2 h-4 w-4" />Manual Composer</TabsTrigger>
            </TabsList>
            <TabsContent value="ai-composer">
              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                  <CardTitle>AI-Powered Notification Composer</CardTitle>
                  <CardDescription>Paste page content to let AI generate an engaging notification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="pageContent">Page Content</Label>
                    <Textarea
                      id="pageContent"
                      name="pageContent"
                      placeholder="Paste the content of the web page you want to promote..."
                      value={pageContent}
                      onChange={(e) => setPageContent(e.target.value)}
                      rows={8}
                      className="text-base"
                    />
                  </div>
                  <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating || isSubmitting || !pageContent.trim()} className="w-full sm:w-auto">
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Sparkles className="mr-2 h-4 w-4" /> Generate with AI</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="manual-composer">
              <Card className="shadow-lg rounded-lg">
                <CardHeader>
                  <CardTitle>Manual Notification Composer</CardTitle>
                  <CardDescription>Manually craft your notification content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">Use the "Notification Details" section below to compose your message manually.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle>Notification Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {isLoadingDomains ? (
                 <div><Label>Target Domain</Label><Skeleton className="h-10 w-full" /></div>
               ) : (
                <div>
                    <Label htmlFor="domainId">Target Domain</Label>
                    <Select value={formData.domainId} onValueChange={handleDomainChange} name="domainId" required disabled={isSubmitting}>
                      <SelectTrigger className="w-full text-base">
                        <SelectValue placeholder="Select a verified domain" />
                      </SelectTrigger>
                      <SelectContent>
                        {verifiedDomains.length === 0 && <SelectItem value="no-domains" disabled>No verified domains found</SelectItem>}
                        {verifiedDomains.map(domain => (
                          <SelectItem key={domain.id} value={domain.id} className="text-base">
                            {domain.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
               )}

               {(isGenerating && activeTab === 'ai-composer') ? (
                <>
                  <div><Label>Title</Label><Skeleton className="h-10 w-full" /></div>
                  <div><Label>Body</Label><Skeleton className="h-20 w-full" /></div>
                  <div><Label>Image URL (Optional)</Label><Skeleton className="h-10 w-full" /></div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Notification Title" required className="text-base" disabled={isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="body">Body</Label>
                    <Textarea id="body" name="body" value={formData.body} onChange={handleInputChange} placeholder="Notification body content..." required rows={3} className="text-base" disabled={isSubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                    <Input id="imageUrl" name="imageUrl" type="url" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://example.com/image.png" className="text-base" disabled={isSubmitting}/>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="targetUrl">Target URL (Optional)</Label>
                <Input id="targetUrl" name="targetUrl" type="url" value={formData.targetUrl} onChange={handleInputChange} placeholder="https://example.com/target-page" className="text-base" disabled={isSubmitting}/>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isGenerating || isSubmitting || isLoadingDomains || !formData.domainId}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {isSubmitting ? "Saving & Queuing..." : "Save & Queue Notification"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg rounded-lg sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center"><Eye className="mr-2 h-5 w-5" /> Notification Preview</CardTitle>
              <CardDescription>This is how your notification might look on a device for domain: {verifiedDomains.find(d => d.id === formData.domainId)?.name || "N/A"}.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg shadow-inner min-h-[150px]">
                <div className="flex items-start space-x-3">
                  {previewImageUrl ? (
                     <Image
                        src={previewImageUrl}
                        alt="Notification image preview"
                        width={64}
                        height={64}
                        className="rounded-md object-cover w-16 h-16"
                        data-ai-hint="notification icon"
                        onError={() => setPreviewImageUrl('https://placehold.co/64x64.png?text=Error')}
                      />
                  ) : (
                    <div className="w-16 h-16 bg-muted/80 rounded-md flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground break-words">{formData.title || "Notification Title"}</h3>
                    <p className="text-xs text-muted-foreground break-words">{formData.body || "Notification body will appear here. Keep it concise and engaging!"}</p>
                    {formData.targetUrl && <p className="text-xs text-blue-500 truncate mt-1">{formData.targetUrl.replace(/^https?:\/\//, '')}</p>}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">Actual appearance may vary by device and OS.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
