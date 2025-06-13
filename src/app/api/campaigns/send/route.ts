
import { type NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging, admin } from '@/lib/firebase-admin'; // Server-side admin SDK
import type { Campaign, Subscriber } from '@/lib/types';
import type { Message, MulticastMessage } from 'firebase-admin/messaging';
import { FieldValue } from 'firebase-admin/firestore';


// Helper function to create CORS headers
function getCorsHeaders(requestOrigin: string | null) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', requestOrigin && requestOrigin !== 'null' ? requestOrigin : '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  let campaignId: string | null = null; // Keep track of campaignId for error status updates

  if (!admin.apps.length) {
    console.error('[API /api/campaigns/send POST] Firebase Admin SDK not initialized.');
    return NextResponse.json({ error: 'Firebase Admin SDK not initialized. Check server logs.' }, { status: 500, headers: corsHeaders });
  }
  if (!adminDb || typeof adminDb.collection !== 'function') {
     console.error('[API /api/campaigns/send POST] Firestore service (adminDb) not available from Admin SDK.');
     return NextResponse.json({ error: 'Firestore service not available. Check server logs.' }, { status: 500, headers: corsHeaders });
  }
   if (!adminMessaging || typeof adminMessaging.sendEachForMulticast !== 'function') {
     console.error('[API /api/campaigns/send POST] Messaging service (adminMessaging) not available from Admin SDK.');
     return NextResponse.json({ error: 'Messaging service not available. Check server logs.' }, { status: 500, headers: corsHeaders });
  }


  try {
    const body = await request.json();
    campaignId = body.campaignId; // Assign campaignId here

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400, headers: corsHeaders });
    }

    // 0. Update Campaign Status to 'sending'
    const campaignRef = adminDb.collection('campaigns').doc(campaignId);
    await campaignRef.update({ 
      status: 'sending',
      // sentAt could also be updated here to reflect actual processing start if different from creation
    });

    // 1. Fetch Campaign Details
    const campaignDoc = await campaignRef.get();
    if (!campaignDoc.exists) {
      await campaignRef.update({ status: 'failed_processing', processedAt: FieldValue.serverTimestamp(), recipients: 0, sentStats: { successCount: 0, failureCount: 0 } });
      return NextResponse.json({ error: 'Campaign not found after attempting to set to sending' }, { status: 404, headers: corsHeaders });
    }
    const campaign = campaignDoc.data() as Campaign;

    // 2. Fetch Subscribers for the campaign's domain
    const subscribersSnapshot = await adminDb.collection('subscribers')
      .where('domainName', '==', campaign.domainName)
      .get();

    if (subscribersSnapshot.empty) {
      await campaignRef.update({
        recipients: 0,
        status: 'processed_no_subscribers', 
        sentStats: { successCount: 0, failureCount: 0 },
        processedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ message: 'No subscribers found for this domain.', campaignId, sentCount: 0 }, { status: 200, headers: corsHeaders });
    }

    const subscriberTokens: string[] = [];
    subscribersSnapshot.forEach(doc => {
      const subscriber = doc.data() as Subscriber;
      if (subscriber.token) {
        subscriberTokens.push(subscriber.token);
      }
    });

    if (subscriberTokens.length === 0) {
      await campaignRef.update({
        recipients: 0,
        status: 'processed_no_valid_tokens',
        sentStats: { successCount: 0, failureCount: 0 },
        processedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ message: 'No valid subscriber tokens found.', campaignId, sentCount: 0 }, { status: 200, headers: corsHeaders });
    }

    // 3. Construct and Send Messages
    const fcmMessages: Message[] = subscriberTokens.map(token => ({
      token: token,
      notification: {
        title: campaign.title,
        body: campaign.body,
      },
      webpush: {
        notification: {
          ...(campaign.imageUrl && { image: campaign.imageUrl }),
        },
        fcmOptions: {
          link: campaign.targetUrl || `https://${campaign.domainName}`,
        },
      },
    }));
    
    let successCount = 0;
    let failureCount = 0;
    const tokensToDelete: string[] = [];

    const batchSize = 500;
    for (let i = 0; i < fcmMessages.length; i += batchSize) {
        const batch = fcmMessages.slice(i, i + batchSize);
        if (batch.length === 0) continue;

        const multicastMessage: MulticastMessage = {
          tokens: batch.map(m => m.token as string), 
          notification: batch[0].notification, 
          webpush: batch[0].webpush, 
        };

        try {
            const response = await adminMessaging.sendEachForMulticast(multicastMessage);
            successCount += response.successCount;
            failureCount += response.failureCount;

            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const failedToken = batch[idx].token as string;
                console.warn(`[API /api/campaigns/send POST] Failed to send to token: ${failedToken}`, resp.error);
                if (resp.error && (resp.error.code === 'messaging/registration-token-not-registered' || 
                                   resp.error.code === 'messaging/invalid-registration-token')) {
                  tokensToDelete.push(failedToken);
                }
              }
            });
        } catch (error) {
            console.error('[API /api/campaigns/send POST] Error sending batch messages:', error);
            failureCount += batch.length; 
        }
    }


    // 4. Optionally, remove invalid tokens from Firestore
    if (tokensToDelete.length > 0) {
      console.log(`[API /api/campaigns/send POST] Attempting to delete ${tokensToDelete.length} invalid tokens.`);
      const deletePromises: Promise<any>[] = [];
      const subscribersCol = adminDb.collection('subscribers');
      for (const token of tokensToDelete) {
        const snapshot = await subscribersCol.where('token', '==', token).limit(1).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            console.log(`[API /api/campaigns/send POST] Deleting subscriber doc: ${doc.id} for token: ${token}`);
            deletePromises.push(doc.ref.delete());
          });
        }
      }
      await Promise.allSettled(deletePromises)
        .then(results => {
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`[API /api/campaigns/send POST] Failed to delete token ${tokensToDelete[index]}:`, result.reason);
                }
            });
        });
    }

    // 5. Update Campaign Status to 'processed'
    await campaignRef.update({
      recipients: subscriberTokens.length, 
      status: 'processed',
      sentStats: { successCount, failureCount },
      processedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      message: 'Campaign processing completed.', 
      campaignId, 
      totalSubscribers: subscriberTokens.length,
      successCount, 
      failureCount 
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('[API /api/campaigns/send POST] Error processing campaign:', error);
    // Update campaign status to 'failed_processing' if an error occurs mid-process
    if (campaignId) {
      try {
        await adminDb.collection('campaigns').doc(campaignId).update({
          status: 'failed_processing',
          processedAt: FieldValue.serverTimestamp(),
          // Optionally log error details to the campaign document if desired
          // processingError: error.message 
        });
      } catch (statusUpdateError) {
        console.error(`[API /api/campaigns/send POST] Failed to update campaign ${campaignId} status to failed_processing:`, statusUpdateError);
      }
    }
    return NextResponse.json({ error: 'Failed to process campaign', details: error.message }, { status: 500, headers: corsHeaders });
  }
}
