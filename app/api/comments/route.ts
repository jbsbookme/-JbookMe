import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';

// POST - Create new comment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId, content, parentId } = await request.json();

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'Post ID and content are required' },
        { status: 400 }
      );
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
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

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: session.user.id,
        content,
        parentId: parentId || null
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        }
      }
    });

    // Create notification for post author (if not self-comment)
    if (post.authorId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: post.authorId,
          type: parentId ? 'COMMENT_REPLY' : 'NEW_COMMENT',
          title: parentId ? 'New Reply 💬' : 'New Comment 💬',
          message: `${session.user.name} ${parentId ? 'replied to' : 'commented on'} your post`,
          link: `/feed`,
          postId: post.id,
          commentId: comment.id
        }
      });
    }

    // If it's a reply, also notify the parent comment author
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });

      if (parentComment && parentComment.authorId !== session.user.id && parentComment.authorId !== post.authorId) {
        await prisma.notification.create({
          data: {
            userId: parentComment.authorId,
            type: 'COMMENT_REPLY',
            title: 'New Reply 💬',
            message: `${session.user.name} replied to your comment`,
            link: `/feed`,
            postId: post.id,
            commentId: comment.id
          }
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
