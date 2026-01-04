import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Auto-delete posts older than 30 days
export async function POST() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await prisma.post.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `Deleted ${result.count} posts older than 30 days`
    });
  } catch (error) {
    console.error('Error cleaning up old posts:', error);
    return NextResponse.json(
      { error: 'Failed to clean up old posts' },
      { status: 500 }
    );
  }
}
