import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { uploadFile, getFileUrl } from '@/lib/s3';

// GET - Fetch messages (inbox)
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'received' or 'sent'

    const messages = await prisma.message.findMany({
      where:
        type === 'sent'
          ? { senderId: session.user.id }
          : { recipientId: session.user.id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        appointment: {
          select: {
            id: true,
            date: true,
            time: true,
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get signed URLs for attachments
    const messagesWithUrls = await Promise.all(
      messages.map(async (message) => {
        let attachmentUrl = null;
        if (message.cloud_storage_path) {
          attachmentUrl = await getFileUrl(
            message.cloud_storage_path,
            message.isPublic
          );
        }
        return {
          ...message,
          attachmentUrl,
        };
      })
    );

    // Count unread messages
    const unreadCount = await prisma.message.count({
      where: {
        recipientId: session.user.id,
        isRead: false,
      },
    });

    return NextResponse.json({
      messages: messagesWithUrls,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST - Send a new message
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const recipientId = formData.get('recipientId') as string;
    const content = formData.get('content') as string;
    const subject = formData.get('subject') as string | null;
    const appointmentId = formData.get('appointmentId') as string | null;
    const attachment = formData.get('attachment') as File | null;

    if (!recipientId || !content) {
      return NextResponse.json(
        { error: 'Recipient and content are required' },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Handle attachment upload
    let cloud_storage_path = null;
    if (attachment) {
      const buffer = Buffer.from(await attachment.arrayBuffer());
      const fileName = `messages/${Date.now()}-${attachment.name}`;
      cloud_storage_path = await uploadFile(buffer, fileName, false); // Private file
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        recipientId,
        content,
        subject,
        appointmentId,
        cloud_storage_path,
        isPublic: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });

    // Create in-app notification
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'NEW_MESSAGE',
        title: 'New Message',
        message: `${session.user.name || 'Someone'} sent you a message`,
        link: '/inbox',
      },
    });

    // Send push notification if user has subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: recipientId },
    });

    // Note: Actual push sending would require web-push library
    // For now, we're just creating the subscription infrastructure
    console.log(
      `Would send push notification to ${subscriptions.length} devices`
    );

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
