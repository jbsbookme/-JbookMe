import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await firestore.collection('test_connection').add({
      message: 'Firestore connection OK',
      timestamp: new Date(),
    });

    return NextResponse.json({ message: 'Firestore test successful' });
  } catch (error) {
    console.error('Firestore test failed:', error);
    return NextResponse.json({ error: 'Firestore test failed' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const snapshot = await firestore.collection('test_connection').get();
    const batch = firestore.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    return NextResponse.json({ message: 'Firestore test collection cleared' });
  } catch (error) {
    console.error('Firestore test cleanup failed:', error);
    return NextResponse.json({ error: 'Firestore test cleanup failed' }, { status: 500 });
  }
}
