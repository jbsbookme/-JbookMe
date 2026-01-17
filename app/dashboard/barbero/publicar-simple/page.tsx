'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Camera, Video, X, Upload, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';
import { upload } from '@vercel/blob/client';

export default function SimpleUploadPage() {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadingFileLabel, setUploadingFileLabel] = useState('');
  const [uploadingFileIndex, setUploadingFileIndex] = useState(0);
  const [uploadTotalFiles, setUploadTotalFiles] = useState(0);

  const MAX_FILES = 10;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      toast.error(`Please select up to ${MAX_FILES} files at a time`);
      return;
    }

    // Cleanup previous previews
    if (previewUrls.length > 0) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }

    const validFiles: File[] = [];
    const nextPreviews: string[] = [];

    for (const file of files) {
      // Validate file type
      const isImageFile =
        file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
      const isVideoFile =
        file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(file.name);

      if (!isImageFile && !isVideoFile) {
        toast.error(`Please select an image or video file: ${file.name}`);
        continue;
      }

      // Validate file size (200MB max)
      if (file.size > 200 * 1024 * 1024) {
        toast.error(`File size must be less than 200MB: ${file.name}`);
        continue;
      }

      validFiles.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }

    if (validFiles.length === 0) return;

    setSelectedFiles(validFiles);
    setPreviewUrls(nextPreviews);

    if (validFiles.length === 1) {
      const only = validFiles[0];
      const isVideoFile =
        only.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(only.name);
      setFileType(isVideoFile ? 'video' : 'image');
    } else {
      setFileType(null);
    }

    // Allow selecting the same file again.
    e.target.value = '';
  };

  const handleRemoveFile = () => {
    if (previewUrls.length > 0) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }
    setSelectedFiles([]);
    setPreviewUrls([]);
    setFileType(null);
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgressPct(0);
    setUploadingFileIndex(0);
    setUploadTotalFiles(selectedFiles.length);
    setUploadingFileLabel('');

    try {
      let successCount = 0;
      let failedCount = 0;

      for (let idx = 0; idx < selectedFiles.length; idx++) {
        const file = selectedFiles[idx];
        setUploadingFileIndex(idx + 1);
        setUploadingFileLabel(file.name);
        setUploadProgressPct(0);

        // Step 1: Upload file directly to Vercel Blob
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const pathname = `posts/barber_work/${Date.now()}-${idx}-${sanitizedFileName}`;

        const blob = await upload(pathname, file, {
          access: 'public',
          handleUploadUrl: '/api/blob/upload',
          onUploadProgress: (progressEvent: unknown) => {
            if (typeof progressEvent === 'number') {
              setUploadProgressPct(Math.max(0, Math.min(100, Number(progressEvent) || 0)));
              return;
            }

            if (typeof progressEvent === 'object' && progressEvent !== null) {
              const maybe = progressEvent as {
                percentage?: unknown;
                progress?: unknown;
                percent?: unknown;
              };
              const pct = Number(maybe.percentage ?? maybe.progress ?? maybe.percent ?? 0) || 0;
              setUploadProgressPct(Math.max(0, Math.min(100, pct)));
              return;
            }

            setUploadProgressPct(0);
          },
        });

        const cloud_storage_path = blob.url;

        // Step 2: Create post
        const postFormData = new FormData();
        if (caption.trim()) {
          postFormData.append('caption', caption.trim());
        }
        postFormData.append('cloud_storage_path', cloud_storage_path);

        const postRes = await fetch('/api/posts', {
          method: 'POST',
          body: postFormData,
        });

        if (!postRes.ok) {
          const errorData = await postRes.json().catch(() => ({}));
          failedCount += 1;
          toast.error(errorData.error || `Failed to create post: ${file.name}`);
          continue;
        }

        successCount += 1;
      }

      if (successCount === 0) {
        toast.error('Failed to upload posts');
        return;
      }

      toast.success(`✅ Published ${successCount} post(s).${failedCount ? ` Failed: ${failedCount}.` : ''}`);

      // Reset form
      handleRemoveFile();
      setCaption('');

      // Redirect
      setTimeout(() => {
        router.push('/feed');
      }, 1500);

    } catch (error: unknown) {
      console.error('Upload error:', error);

      let message: string | null = null;
      if (error && typeof error === 'object' && 'message' in error) {
        const maybe = (error as { message?: unknown }).message;
        if (typeof maybe === 'string') message = maybe;
      }
      toast.error(message || 'Failed to upload post');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-32">

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="mb-6">
          <Link href="/dashboard/barbero">
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="glass border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Upload className="w-6 h-6 text-cyan-400" />
              Publish New Post (Simple Upload)
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Share your best work with the community
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Input */}
              <div>
                <Label className="text-white mb-2 block">Media (Photo or Video)</Label>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input-gallery"
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input-camera"
                />

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input-video"
                />

                {selectedFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-cyan-500/30 rounded-lg bg-gradient-to-br from-zinc-900/80 to-black/60 px-4">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      {fileType === 'image' ? (
                        <Camera className="w-12 h-12 text-cyan-400 mb-3" />
                      ) : fileType === 'video' ? (
                        <Video className="w-12 h-12 text-pink-400 mb-3" />
                      ) : (
                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                      )}
                      <p className="mb-2 text-sm text-gray-300 font-semibold">Upload your post</p>
                      <p className="text-xs text-gray-500">Image or Video (MAX 200MB) • Up to {MAX_FILES} files</p>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-sm">
                        <Button
                          type="button"
                          className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
                          onClick={() => cameraInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          Take photo
                        </Button>

                        <Button
                          type="button"
                          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold"
                          onClick={() => videoInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          Record video
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full border-gray-700 text-white hover:bg-zinc-800"
                          onClick={() => galleryInputRef.current?.click()}
                          disabled={isUploading}
                        >
                          Gallery
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative w-full rounded-lg overflow-hidden bg-black border border-white/10 p-2">
                    {previewUrls.length === 1 ? (
                      <div className="relative w-full h-64 rounded-lg overflow-hidden bg-black">
                        {fileType === 'image' && previewUrls[0] ? (
                          <Image
                            src={previewUrls[0]}
                            alt="Preview"
                            fill
                            className="object-contain"
                          />
                        ) : fileType === 'video' && previewUrls[0] ? (
                          <video
                            src={previewUrls[0]}
                            className="w-full h-full object-contain"
                            controls
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {previewUrls.map((url, idx) => {
                          const f = selectedFiles[idx];
                          const isVideoItem =
                            !!f &&
                            (f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(f.name));
                          return (
                            <div
                              key={idx}
                              className="relative overflow-hidden rounded-lg bg-black/40 border border-white/10 aspect-square"
                            >
                              {isVideoItem ? (
                                <video
                                  src={url}
                                  className="h-full w-full object-cover"
                                  muted
                                  playsInline
                                  preload="metadata"
                                />
                              ) : (
                                <img
                                  src={url}
                                  alt={f?.name || 'Preview'}
                                  className="h-full w-full object-cover"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {previewUrls.length > 1 ? (
                      <div className="px-2 pb-2 text-xs text-gray-400">{previewUrls.length} files selected</div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption" className="text-white mb-2 block">
                  Caption
                </Label>

                {isUploading ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>
                        {uploadTotalFiles > 1
                          ? `Uploading ${uploadingFileIndex}/${uploadTotalFiles}: ${uploadingFileLabel}`
                          : 'Uploading media...'}
                      </span>
                      <span>{Math.round(uploadProgressPct)}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500"
                        style={{ width: `${uploadProgressPct}%` }}
                      />
                    </div>
                  </div>
                ) : null}
                <Textarea
                  id="caption"
                  placeholder="Write a caption..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="bg-black/40 border-gray-700 text-white placeholder:text-gray-500 min-h-[100px]"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={selectedFiles.length === 0 || isUploading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-6 text-lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Publish Post
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
