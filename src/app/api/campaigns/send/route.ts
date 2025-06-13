
import { type NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging, admin } from '@/lib/firebase-admin'; // Server-side admin SDK
import type { Campaign, Subscriber } from '@/lib/types';
import type { Message, MulticastMessage } from 'firebase-admin/messaging';


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
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400, headers: corsHeaders });
    }

    // 1. Fetch Campaign Details
    const campaignDoc = await adminDb.collection('campaigns').doc(campaignId).get();
    if (!campaignDoc.exists) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404, headers: corsHeaders });
    }
    const campaign = campaignDoc.data() as Campaign;

    // 2. Fetch Subscribers for the campaign's domain
    // Assuming campaign.domainName is the field to match on subscribers.
    // Ideally, campaign would have domainId and subscribers would have domainId for a more robust match.
    const subscribersSnapshot = await adminDb.collection('subscribers')
      .where('domainName', '==', campaign.domainName)
      .get();

    if (subscribersSnapshot.empty) {
      await adminDb.collection('campaigns').doc(campaignId).update({
        recipients: 0,
        status: 'processed_no_subscribers', // Or similar status
        sentStats: { successCount: 0, failureCount: 0 },
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
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
      await adminDb.collection('campaigns').doc(campaignId).update({
        recipients: 0,
        status: 'processed_no_valid_tokens',
        sentStats: { successCount: 0, failureCount: 0 },
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ message: 'No valid subscriber tokens found.', campaignId, sentCount: 0 }, { status: 200, headers: corsHeaders });
    }

    // 3. Construct and Send Messages
    // FCM allows up to 500 tokens per sendMulticast/sendEachForMulticast call
    const fcmMessages: Message[] = subscriberTokens.map(token => ({
      token: token,
      notification: {
        title: campaign.title,
        body: campaign.body,
      },
      webpush: {
        notification: {
          // Use campaign.imageUrl if available, otherwise FCM might use a default or what's in manifest
          ...(campaign.imageUrl && { image: campaign.imageUrl }),
          // You can add an icon URL here if you have one specifically for notifications
          // icon: campaign.iconUrl || '/default-notification-icon.png', 
        },
        fcmOptions: {
          // Link to open when the notification is clicked.
          // Fallback to the domain itself if targetUrl is not set.
          link: campaign.targetUrl || `https://${campaign.domainName}`,
        },
      },
    }));
    
    // Using sendEachForMulticast as it's simpler if you have many messages structured correctly.
    // For large numbers of tokens, chunking into batches of 500 is necessary.
    // For simplicity here, we'll assume subscriberTokens.length is manageable or do one batch.
    // A more robust solution would loop and batch.
    
    let successCount = 0;
    let failureCount = 0;
    const tokensToDelete: string[] = [];

    // Batch sending (FCM limit is 500 tokens per request for sendEachForMulticast)
    const batchSize = 500;
    for (let i = 0; i < fcmMessages.length; i += batchSize) {
        const batch = fcmMessages.slice(i, i + batchSize);
        if (batch.length === 0) continue;

        const multicastMessage: MulticastMessage = {
          tokens: batch.map(m => m.token as string), // Extract tokens for MulticastMessage
          notification: batch[0].notification, // Common notification part
          webpush: batch[0].webpush, // Common webpush part
          // data: batch[0].data, // Common data part if any
        };

        try {
            const response = await adminMessaging.sendEachForMulticast(multicastMessage);
            successCount += response.successCount;
            failureCount += response.failureCount;

            response.responses.forEach((resp, idx) => {
              if (!resp.success) {
                const failedToken = batch[idx].token as string;
                console.warn(`Failed to send to token: ${failedToken}`, resp.error);
                // Handle specific errors, e.g., 'messaging/registration-token-not-registered'
                if (resp.error && (resp.error.code === 'messaging/registration-token-not-registered' || 
                                   resp.error.code === 'messaging/invalid-registration-token')) {
                  tokensToDelete.push(failedToken);
                }
              }
            });
        } catch (error) {
            console.error('Error sending batch messages:', error);
            // Assuming all in this batch failed if adminMessaging.sendEachForMulticast throws
            failureCount += batch.length; 
        }
    }


    // 4. Optionally, remove invalid tokens from Firestore
    if (tokensToDelete.length > 0) {
      console.log(`Attempting to delete ${tokensToDelete.length} invalid tokens.`);
      const deletePromises: Promise<any>[] = [];
      // This requires querying for the subscriber documents by their tokens to get their IDs for deletion.
      // This is less efficient. It's better to store doc ID with token if frequent deletions are needed.
      // For now, simple approach:
      const subscribersCol = adminDb.collection('subscribers');
      for (const token of tokensToDelete) {
        const snapshot = await subscribersCol.where('token', '==', token).limit(1).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            console.log(`Deleting subscriber doc: ${doc.id} for token: ${token}`);
            deletePromises.push(doc.ref.delete());
          });
        }
      }
      await Promise.allSettled(deletePromises)
        .then(results => {
            results.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Failed to delete token ${tokensToDelete[index]}:`, result.reason);
                }
            });
        });
    }

    // 5. Update Campaign Status
    await adminDb.collection('campaigns').doc(campaignId).update({
      recipients: subscriberTokens.length, // Total potential recipients
      status: 'processed',
      sentStats: { successCount, failureCount },
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ 
      message: 'Campaign processing attempted.', 
      campaignId, 
      totalSubscribers: subscriberTokens.length,
      successCount, 
      failureCount 
    }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('[API /api/campaigns/send POST] Error processing campaign:', error);
    return NextResponse.json({ error: 'Failed to process campaign', details: error.message }, { status: 500, headers: corsHeaders });
  }
}
