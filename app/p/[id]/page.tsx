import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth/auth-options';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type Params = {
  params: Promise<{ id: string }>;
};

function isVideoPath(value: string) {
  return /\.(mp4|mov|webm|m4v)(\?.*)?$/i.test(value);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  const base = new URL(process.env.NEXTAUTH_URL || 'https://www.jbsbookme.com');

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      caption: true,
      cloud_storage_path: true,
      isPublic: true,
      isActive: true,
      status: true,
      author: { select: { name: true } },
      barber: { select: { user: { select: { name: true } } } },
    },
  });

  if (!post || !post.isPublic || !post.isActive || post.status !== 'APPROVED') {
    return {
      metadataBase: base,
      title: "JB's Barbershop",
      description: 'Discover styles and work on JBookMe.',
      openGraph: {
        type: 'website',
        title: "JB's Barbershop",
        description: 'Discover styles and work on JBookMe.',
        url: new URL('/p/' + id, base).toString(),
        images: ['/og-image.png'],
      },
      twitter: {
        card: 'summary_large_image',
        title: "JB's Barbershop",
        description: 'Discover styles and work on JBookMe.',
        images: ['/og-image.png'],
      },
    };
  }

  const authorName = post.barber?.user?.name || post.author?.name || "JB's Barbershop";
  const title = `Post by ${authorName}`;
  const description = post.caption?.trim() ? post.caption.slice(0, 160) : 'See this post on JBookMe.';
  const isVideo = isVideoPath(post.cloud_storage_path);
  const mediaPath = `/api/posts/${post.id}/media`;

  return {
    metadataBase: base,
    title,
    description,
    openGraph: {
      type: 'website',
      title,
      description,
      url: new URL('/p/' + post.id, base).toString(),
      images: isVideo ? ['/og-image.png'] : [mediaPath],
      ...(isVideo ? { videos: [{ url: mediaPath }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: isVideo ? ['/og-image.png'] : [mediaPath],
    },
  };
}

export default async function PublicPostPage({ params }: Params) {
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (session) {
    redirect(`/feed?post=${encodeURIComponent(id)}`);
  }

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      caption: true,
      cloud_storage_path: true,
      isPublic: true,
      isActive: true,
      status: true,
      createdAt: true,
      author: { select: { name: true } },
      barber: { select: { user: { select: { name: true } } } },
    },
  });

  if (!post || !post.isPublic || !post.isActive || post.status !== 'APPROVED') {
    notFound();
  }

  const authorName = post.barber?.user?.name || post.author?.name || "JB's Barbershop";
  const mediaUrl = `/api/posts/${post.id}/media`;
  const isVideo = isVideoPath(post.cloud_storage_path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="text-sm text-gray-300 hover:text-white">
            Back
          </Link>
          <Link href="/feed" className="text-sm text-cyan-300 hover:text-cyan-200">
            Open JBookMe
          </Link>
        </div>

        <Card className="bg-white/5 border-white/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="w-full bg-black/40">
              {isVideo ? (
                <video
                  src={mediaUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full max-h-[70vh] object-contain bg-black"
                />
              ) : (
                // Use plain img to avoid remote image config issues.
                <img
                  src={mediaUrl}
                  alt={post.caption || `Post by ${authorName}`}
                  className="w-full max-h-[70vh] object-contain"
                />
              )}
            </div>

            <div className="p-5 space-y-4">
              <div>
                <div className="text-sm text-gray-400">{authorName}</div>
                {post.caption ? (
                  <div className="mt-2 text-white text-base leading-relaxed">{post.caption}</div>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild className="w-full sm:w-auto">
                  <Link href={`/reservar`}>Book appointment</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link href={`/feed?post=${post.id}`}>View in feed</Link>
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                Share this link to view without logging in.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
