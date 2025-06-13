
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Subscriber } from '@/lib/types';

// Helper function to create CORS headers
function getCorsHeaders(requestOrigin: string | null) {
  const headers = new Headers();
  // Dynamically set Allow-Origin to the request's origin if it exists, otherwise '*'
  // For production, you might want a more restrictive list based on verified domains.
  headers.set('Access-Control-Allow-Origin', requestOrigin || '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Added Authorization for potential future use
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight request for 1 day
  return headers;
}

// Handler for OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  console.log('[API /api/subscribe] Received POST request');
  const requestOrigin = request.headers.get('origin');
  const corsHeaders = getCorsHeaders(requestOrigin);

  try {
    const body = await request.json();
    console.log('[API /api/subscribe] Request body:', body);
    const { token, domainName, userAgent } = body;

    if (!token || !domainName) {
      console.warn('[API /api/subscribe] Missing token or domainName in request body');
      return NextResponse.json({ error: 'Missing token or domainName' }, { status: 400, headers: corsHeaders });
    }

    const newSubscriber: Omit<Subscriber, 'id' | 'subscribedAt'> & { subscribedAt: Timestamp } = {
      token,
      domainName,
      userAgent: userAgent || request.headers.get('user-agent') || 'Unknown',
      subscribedAt: serverTimestamp() as Timestamp, // Firestore will set this
    };

    console.log('[API /api/subscribe] Attempting to add subscriber to Firestore:', newSubscriber);
    const docRef = await addDoc(collection(db, 'subscribers'), newSubscriber);
    console.log('[API /api/subscribe] Subscriber added successfully to Firestore with ID:', docRef.id);
    
    return NextResponse.json({ message: 'Subscriber added successfully', id: docRef.id }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('[API /api/subscribe] Error adding subscriber:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to add subscriber', details: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
