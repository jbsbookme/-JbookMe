import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { publishLinkToFacebookPage } from '@/lib/facebook';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 401 }
      );
    }

    const { action, reason } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: true
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const wasApproved = post.status === 'APPROVED';

    // Update post status
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'reject' ? reason : null
      }
    });

    // If we just transitioned into APPROVED, create an admin notification to share it.
    if (action === 'approve' && !wasApproved) {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      if (admins.length > 0) {
        const shareLink = `/feed?post=${post.id}`;

        await prisma.notification.createMany({
          data: admins.map((u) => ({
            userId: u.id,
            type: 'POST_APPROVED',
            title: 'Listo para compartir / Ready to share',
            message: 'Abrí el post y compártelo en Facebook/Instagram/WhatsApp. / Open the post and share it to Facebook/Instagram/WhatsApp.',
            link: shareLink,
            postId: post.id,
          })),
        });
      }
    }

    // Optional: auto-publish to Facebook only when transitioning into APPROVED.
    if (action === 'approve' && !wasApproved) {
      try {
        const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.jbsbookme.com';
        const publicLink = `${origin.replace(/\/$/, '')}/p/${post.id}`;
        const message = (post.caption || 'New post').slice(0, 1900);

        const fbResult = await publishLinkToFacebookPage({
          message,
          link: publicLink,
        });

        if (!fbResult.ok) {
          console.log('[POST /api/posts/[id]/approve] Facebook publish skipped/failed:', fbResult.error);
        } else {
          console.log('[POST /api/posts/[id]/approve] Facebook publish ok:', fbResult.id);
        }
      } catch (error) {
        console.log('[POST /api/posts/[id]/approve] Facebook publish unexpected error:', error);
      }
    }

    // Create notification for author
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: action === 'approve' ? 'POST_APPROVED' : 'POST_REJECTED',
        title: action === 'approve'
          ? 'Publicación aprobada / Post approved'
          : 'Publicación rechazada / Post rejected',
        message: action === 'approve'
          ? 'Tu publicación fue aprobada y ya es visible para todos. / Your post was approved and is now visible to everyone.'
          : `Tu publicación no fue aprobada. ${reason || 'Sin motivo.'} / Your post was not approved. ${reason || 'No reason provided.'}`,
        link: `/feed`,
        postId: post.id
      }
    });

    return NextResponse.json({ 
      post: updatedPost,
      message: `Post ${action}d successfully`
    });
  } catch (error) {
    console.error('Error approving/rejecting post:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}
