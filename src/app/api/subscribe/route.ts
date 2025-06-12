
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { Subscriber } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, domainName, userAgent } = body;

    if (!token || !domainName) {
      return NextResponse.json({ error: 'Missing token or domainName' }, { status: 400 });
    }

    const newSubscriber: Omit<Subscriber, 'id' | 'subscribedAt'> & { subscribedAt: Timestamp } = {
      token,
      domainName,
      userAgent: userAgent || request.headers.get('user-agent') || 'Unknown',
      subscribedAt: serverTimestamp() as Timestamp, // Firestore will set this
    };

    const docRef = await addDoc(collection(db, 'subscribers'), newSubscriber);
    
    return NextResponse.json({ message: 'Subscriber added successfully', id: docRef.id }, { status: 201 });

  } catch (error) {
    console.error('Error adding subscriber:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: 'Failed to add subscriber', details: errorMessage }, { status: 500 });
  }
}
