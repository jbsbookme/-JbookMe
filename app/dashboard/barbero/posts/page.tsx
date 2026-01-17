'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowUpCircle,
  Camera,
  Images,
  Video,
  X,
  Upload,
  Heart,
  Trash2,
  Plus,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { resolvePublicMediaUrl } from '@/lib/utils';
import { upload } from '@vercel/blob/client';

interface Post {
  id: string;
  cloud_storage_path: string;
  caption?: string;
  likes: number;
  createdAt: string;
}

export default function BarberPostsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
    // Keep uploads light and fast (also enforced server-side by /api/blob/upload)
    const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15MB
    const MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB
    const MAX_VIDEO_SECONDS = 60; // 1 minute

    const getVideoDurationSeconds = (file: File): Promise<number | null> =>
      new Promise((resolve) => {
        try {
          const url = URL.createObjectURL(file);
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            const d = Number.isFinite(video.duration) ? video.duration : NaN;
            URL.revokeObjectURL(url);
            resolve(Number.isFinite(d) ? d : null);
          };
          video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
          };
          video.src = url;
        } catch {
          resolve(null);
        }
      });
  const [uploadFileType, setUploadFileType] = useState<'image' | 'video' | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const userId = session?.user?.id;
      const res = await fetch(userId ? `/api/posts?authorId=${userId}` : '/api/posts');
      const data = await res.json();

      if (res.ok && data.posts) {
        setPosts(data.posts);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Error loading posts');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth');
      return;
    }

    // Permitir CLIENT, BARBER y STYLIST
    const role = session?.user?.role ?? '';
    if (status === 'authenticated' && !['BARBER', 'STYLIST', 'CLIENT'].includes(role)) {
      router.push('/inicio');
      return;
    }

    if (status === 'authenticated') {
      fetchPosts();
    }
  }, [session, status, router, fetchPosts]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImageFile =
      file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
    const isVideoFile =
      file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(file.name);

    if (!isImageFile && !isVideoFile) {
      toast.error('Please select an image or video file');
      return;
    }

    if (isVideoFile) {
      if (file.size > MAX_VIDEO_BYTES) {
        toast.error(`Video too large (max ${(MAX_VIDEO_BYTES / (1024 * 1024)).toFixed(0)}MB)`);
        return;
      }

      const durationSeconds = await getVideoDurationSeconds(file);
      if (typeof durationSeconds === 'number' && durationSeconds > MAX_VIDEO_SECONDS) {
        toast.error(`Video too long (max ${MAX_VIDEO_SECONDS}s)`);
        return;
      }
    } else {
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`Photo too large (max ${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)}MB)`);
        return;
      }
    }

    // Avoid FileReader.readAsDataURL for videos (can freeze the UI).
    if (uploadPreview) {
      URL.revokeObjectURL(uploadPreview);
    }

    setUploadFile(file);
    setUploadFileType(isVideoFile ? 'video' : 'image');
    setUploadPreview(URL.createObjectURL(file));

    // Allow selecting the same file again.
    e.target.value = '';
  };

  const handleCreatePost = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);

      const sanitizedFileName = uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const pathname = `posts/barber_work/${Date.now()}-${sanitizedFileName}`;

      const blob = await upload(pathname, uploadFile, {
        access: 'public',
        handleUploadUrl: '/api/blob/upload',
      });

      // Create post
      const postFormData = new FormData();
      postFormData.append('cloud_storage_path', blob.url);
      if (caption?.trim()) {
        postFormData.append('caption', caption.trim());
      }

      const postRes = await fetch('/api/posts', {
        method: 'POST',
        body: postFormData,
      });

      if (!postRes.ok) {
        throw new Error('Failed to create post');
      }

      toast.success('Post created successfully!');
      setShowCreateModal(false);

      if (uploadPreview) {
        URL.revokeObjectURL(uploadPreview);
      }

      setUploadFile(null);
      setUploadPreview(null);
      setUploadFileType(null);
      setCaption('');
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Error creating post');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Post deleted successfully');
        fetchPosts();
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting post');
    }
  };

  const getMediaUrl = (cloud_storage_path: string) => {
    return resolvePublicMediaUrl(cloud_storage_path);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00f0ff]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/barbero">
            <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Posts</h1>
              <p className="text-gray-400">Share your work and showcase your talent</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-[#00f0ff] to-purple-500 hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Post
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-900/50 border-gray-800 p-6">
            <p className="text-gray-400 text-sm mb-2">Total Posts</p>
            <p className="text-4xl font-bold text-[#00f0ff]">{posts.length}</p>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800 p-6">
            <p className="text-gray-400 text-sm mb-2">Total Likes</p>
            <p className="text-4xl font-bold text-[#ffd700]">
              {posts.reduce((sum, post) => sum + post.likes, 0)}
            </p>
          </Card>
          <Card className="bg-gray-900/50 border-gray-800 p-6">
            <p className="text-gray-400 text-sm mb-2">Average Likes</p>
            <p className="text-4xl font-bold text-purple-500">
              {posts.length > 0 ? Math.round(posts.reduce((sum, post) => sum + post.likes, 0) / posts.length) : 0}
            </p>
          </Card>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <Camera className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No posts yet</h2>
            <p className="text-gray-400 mb-6">Start sharing your work with your clients!</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#00f0ff] hover:bg-[#00d0df] text-black"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Post
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-gray-900/50 border-gray-800 hover:border-[#00f0ff] transition-all overflow-hidden group">
                  <div className="relative aspect-square bg-gray-800">
                    <Image
                      src={getMediaUrl(post.cloud_storage_path)}
                      alt={post.caption || 'Post'}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePost(post.id)}
                        className="bg-red-500/80 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4">
                    {post.caption && (
                      <p className="text-gray-300 text-sm mb-3">{post.caption}</p>
                    )}
                    <div className="flex items-center gap-4 text-gray-400 text-sm">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes}</span>
                      </div>
                      <p className="text-xs">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create New Post</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* File Upload */}
                <div>
                  <label className="block text-white mb-2">Photo/Video *</label>
                  {uploadPreview ? (
                    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
                      {uploadFileType === 'video' ? (
                        <video
                          src={uploadPreview}
                          className="w-full h-full object-contain"
                          controls
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <Image
                          src={uploadPreview}
                          alt="Preview"
                          fill
                          className="object-contain"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (uploadPreview) {
                            URL.revokeObjectURL(uploadPreview);
                          }
                          setUploadFile(null);
                          setUploadPreview(null);
                          setUploadFileType(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 ring-1 ring-inset ring-white/5 hover:ring-[#00f0ff]/20 transition">
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 shrink-0 rounded-xl bg-[#00f0ff]/10 text-[#00f0ff] ring-1 ring-inset ring-[#00f0ff]/20 flex items-center justify-center">
                              <ArrowUpCircle className="h-6 w-6" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-base font-semibold text-white">Publicar</p>
                              <p className="mt-1 text-xs text-gray-400">Elige una opción para agregar tu contenido.</p>
                            </div>
                          </div>

                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <Button
                              type="button"
                              className="h-auto w-full py-2.5 bg-gradient-to-r from-[#00f0ff] to-[#00c2ff] hover:from-[#00d6e6] hover:to-[#00a8ff] text-black font-semibold"
                              onClick={() => {
                                cameraInputRef.current?.click();
                              }}
                              disabled={uploading}
                            >
                              <span className="flex w-full flex-col items-center gap-0.5">
                                <Camera className="h-4 w-4" />
                                <span className="text-xs font-semibold">Photo</span>
                                <span className="text-[9px] opacity-80">Camera</span>
                              </span>
                            </Button>

                            <Button
                              type="button"
                              className="h-auto w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                              onClick={() => {
                                videoInputRef.current?.click();
                              }}
                              disabled={uploading}
                            >
                              <span className="flex w-full flex-col items-center gap-0.5">
                                <Video className="h-4 w-4" />
                                <span className="text-xs font-semibold">Video</span>
                                <span className="text-[9px] text-white/80">Record</span>
                              </span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              className="h-auto w-full py-2.5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                              onClick={() => galleryInputRef.current?.click()}
                              disabled={uploading}
                            >
                              <span className="flex w-full flex-col items-center gap-0.5">
                                <Images className="h-4 w-4" />
                                <span className="text-xs font-semibold">Gallery</span>
                                <span className="text-[9px] text-white/70">Select</span>
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>

                      <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />

                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />

                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                      />
                    </div>
                  )}
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-white mb-2">Caption (Optional)</label>
                  <Textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption to your post..."
                    rows={4}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setShowCreateModal(false)}
                    variant="outline"
                    className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreatePost}
                    disabled={!uploadFile || uploading}
                    className="flex-1 bg-gradient-to-r from-[#00f0ff] to-purple-500 text-white"
                  >
                    {uploading ? 'Creating...' : 'Create Post'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
