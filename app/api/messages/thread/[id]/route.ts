import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

// Clear chat (safe): deletes only messages SENT by the current user to the given recipient.
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const otherId = params.id;
    if (!otherId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const result = await prisma.message.deleteMany({
      where: {
        senderId: session.user.id,
        recipientId: otherId,
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    console.error('Error clearing thread:', error);
    return NextResponse.json({ error: 'Failed to clear thread' }, { status: 500 });
  }
}
