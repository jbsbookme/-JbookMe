import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { prisma } from '@/lib/db';
import { deleteFile, getFileUrl } from '@/lib/s3';

// GET - Fetch single post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        barber: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        },
        comments: {
          include: {
            author: {
              select: {
                name: true,
                image: true
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    name: true,
                    image: true
                  }
                }
              }
            }
          },
          where: {
            parentId: null // Only top-level comments
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            comments: true,
            likedBy: true
          }
        }
      }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Get signed URL for the image
    const imageUrl = await getFileUrl(post.cloud_storage_path, post.isPublic);

    // Increment view count
    await prisma.post.update({
      where: { id: params.id },
      data: {
        viewCount: {
          increment: 1
        }
      }
    });

    return NextResponse.json({ post: { ...post, imageUrl } });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch post' },
      { status: 500 }
    );
  }
}

// DELETE - Delete post
export async function DELETE(
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
      where: { id: params.id }
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Only author or admin can delete
    if (post.authorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Soft delete: solo marca isActive=false
    await prisma.post.update({
      where: { id: params.id },
      data: { isActive: false }
    });

    return NextResponse.json({ message: 'Post marked as deleted (soft delete)' });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
