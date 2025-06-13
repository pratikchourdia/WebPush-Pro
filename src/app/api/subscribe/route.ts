
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Subscriber } from '@/lib/types';

// Helper function to create CORS headers
function getCorsHeaders(requestOrigin: string | null) {
  const headers = new Headers();
  // If requestOrigin is null or an empty string, fallback to '*'
  // Otherwise, use the specific origin from the request.
  headers.set('Access-Control-Allow-Origin', requestOrigin && requestOrigin !== 'null' ? requestOrigin : '*');
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Allowing Content-Type and potentially Authorization
  headers.set('Access-Control-Max-Age', '86400'); // Cache preflight request for 1 day
  return headers;
}

// Handler for OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  console.log(`[API /api/subscribe OPTIONS] Request Origin header: ${requestOrigin}`);
  const corsHeaders = getCorsHeaders(requestOrigin);
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Handler for POST requests
export async function POST(request: NextRequest) {
  const requestOrigin = request.headers.get('origin');
  console.log(`[API /api/subscribe POST] Request Origin header: ${requestOrigin}`);
  // Get CORS headers for this specific request origin
  const corsHeaders = getCorsHeaders(requestOrigin);

  try {
    const body = await request.json();
    console.log('[API /api/subscribe POST] Request body:', body);
    const { token, domainName, userAgent } = body;

    if (!token || !domainName) {
      console.warn('[API /api/subscribe POST] Missing token or domainName in request body');
      return NextResponse.json({ error: 'Missing token or domainName' }, { status: 400, headers: corsHeaders });
    }

    const newSubscriber: Omit<Subscriber, 'id' | 'subscribedAt'> & { subscribedAt: Timestamp } = {
      token,
      domainName,
      userAgent: userAgent || request.headers.get('user-agent') || 'Unknown',
      subscribedAt: serverTimestamp() as Timestamp, // Firestore will set this
    };

    console.log('[API /api/subscribe POST] Attempting to add subscriber to Firestore:', newSubscriber);
    const docRef = await addDoc(collection(db, 'subscribers'), newSubscriber);
    console.log('[API /api/subscribe POST] Subscriber added successfully to Firestore with ID:', docRef.id);
    
    return NextResponse.json({ message: 'Subscriber added successfully', id: docRef.id }, { status: 201, headers: corsHeaders });

  } catch (error) {
    console.error('[API /api/subscribe POST] Error adding subscriber:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to add subscriber', details: errorMessage }, { status: 500, headers: corsHeaders });
  }
}
