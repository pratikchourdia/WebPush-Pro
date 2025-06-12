"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Edit3, Send, Eye, Image as ImageIcon } from "lucide-react";
import Image from 'next/image';
import { PageHeader } from '@/components/shared/PageHeader';
import { generateNotificationContent, GenerateNotificationContentInput, GenerateNotificationContentOutput } from '@/ai/flows/generate-notification-content';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationFormData {
  title: string;
  body: string;
  imageUrl?: string;
  targetUrl?: string;
}

const initialFormData: NotificationFormData = {
  title: '',
  body: '',
  imageUrl: '',
  targetUrl: '',
};

export default function NewCampaignPage() {
  const [formData, setFormData] = useState<NotificationFormData>(initialFormData);
  const [pageContent, setPageContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("ai-composer");
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
        imageUrl: result.imageUrl || prev.imageUrl, // Keep existing image if AI doesn't provide one
      }));
      toast({ title: "AI Generation Successful", description: "Notification content has been generated." });
    } catch (error) {
      console.error("AI generation failed:", error);
      toast({ title: "AI Generation Failed", description: "Could not generate notification content. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock sending notification
    console.log("Sending notification:", formData);
    toast({ title: "Campaign Sent (Mock)", description: `Title: ${formData.title}` });
    setFormData(initialFormData); // Reset form
    setPageContent('');
  };

  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (formData.imageUrl && formData.imageUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
      setPreviewImageUrl(formData.imageUrl);
    } else if (formData.imageUrl) { // If it's a placeholder or invalid, try to use placehold.co
      setPreviewImageUrl(`https://placehold.co/300x200.png`);
    } else {
      setPreviewImageUrl(null);
    }
  }, [formData.imageUrl]);


  return (
    <div className="container mx-auto">
      <PageHeader
        title="Create New Campaign"
        description="Compose and send a new web push notification to your subscribers."
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
                  <Button type="button" onClick={handleGenerateWithAI} disabled={isGenerating || !pageContent.trim()} className="w-full sm:w-auto">
                    {isGenerating ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" /> Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" /> Generate with AI
                      </>
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
                  {/* Form fields will be outside tabs but content might be cleared/set by AI */}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle>Notification Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               {isGenerating && activeTab === 'ai-composer' ? (
                <>
                  <div><Label>Title</Label><Skeleton className="h-10 w-full" /></div>
                  <div><Label>Body</Label><Skeleton className="h-20 w-full" /></div>
                  <div><Label>Image URL (Optional)</Label><Skeleton className="h-10 w-full" /></div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" value={formData.title} onChange={handleInputChange} placeholder="Notification Title" required className="text-base"/>
                  </div>
                  <div>
                    <Label htmlFor="body">Body</Label>
                    <Textarea id="body" name="body" value={formData.body} onChange={handleInputChange} placeholder="Notification body content..." required rows={3} className="text-base"/>
                  </div>
                  <div>
                    <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                    <Input id="imageUrl" name="imageUrl" type="url" value={formData.imageUrl} onChange={handleInputChange} placeholder="https://example.com/image.png" className="text-base"/>
                  </div>
                </>
              )}
              <div>
                <Label htmlFor="targetUrl">Target URL (Optional)</Label>
                <Input id="targetUrl" name="targetUrl" type="url" value={formData.targetUrl} onChange={handleInputChange} placeholder="https://example.com/target-page" className="text-base"/>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full sm:w-auto" disabled={isGenerating}>
                <Send className="mr-2 h-4 w-4" /> Send Notification
              </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="md:col-span-1 space-y-6">
          <Card className="shadow-lg rounded-lg sticky top-24"> {/* Sticky preview */}
            <CardHeader>
              <CardTitle className="flex items-center"><Eye className="mr-2 h-5 w-5" /> Notification Preview</CardTitle>
              <CardDescription>This is how your notification might look on a device.</CardDescription>
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
                    <div className="w-16 h-16 bg-gray-300 rounded-md flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-500" />
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
