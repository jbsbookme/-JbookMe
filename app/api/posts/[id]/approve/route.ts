import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

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

    // Update post status
    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: {
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        rejectionReason: action === 'reject' ? reason : null
      }
    });

    // Create notification for author
    await prisma.notification.create({
      data: {
        userId: post.authorId,
        type: action === 'approve' ? 'POST_APPROVED' : 'POST_REJECTED',
        title: action === 'approve' ? 'Post Approved! 🎉' : 'Post Not Approved',
        message: action === 'approve' 
          ? 'Your post has been approved and is now visible to everyone!'
          : `Your post was not approved. ${reason || 'No reason provided'}`,
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
