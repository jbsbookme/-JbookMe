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

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: params.id
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.postLike.delete({
        where: {
          id: existingLike.id
        }
      });

      // Decrement like count and get updated post
      const updatedPost = await prisma.post.update({
        where: { id: params.id },
        data: {
          likes: {
            decrement: 1
          }
        }
      });

      return NextResponse.json({ 
        liked: false,
        likes: updatedPost.likes,
        message: 'Post unliked'
      });
    } else {
      // Like
      await prisma.postLike.create({
        data: {
          userId: session.user.id,
          postId: params.id
        }
      });

      // Increment like count and get updated post
      const updatedPost = await prisma.post.update({
        where: { id: params.id },
        data: {
          likes: {
            increment: 1
          }
        }
      });

      // Create notification for post author (if not self-like)
      if (post.authorId !== session.user.id) {
        const notification = await prisma.notification.create({
          data: {
            userId: post.authorId,
            type: 'POST_LIKE',
            title: '❤️ Nuevo Like',
            message: `${session.user.name} le dio like a tu publicación`,
            link: `/feed`,
            postId: post.id
          }
        });
        console.log('✅ Notificación creada:', {
          id: notification.id,
          userId: post.authorId,
          message: notification.message
        });
      }

      return NextResponse.json({ 
        liked: true,
        likes: updatedPost.likes,
        message: 'Post liked'
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle like' },
      { status: 500 }
    );
  }
}
