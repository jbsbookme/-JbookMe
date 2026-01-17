'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowUpCircle, Camera, Images, Video, X, Loader2, ArrowLeft } from 'lucide-react';
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Validate size + duration (keeps uploads lightweight)
      if (isVideoFile) {
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error(
            `Video too large (max ${(MAX_VIDEO_BYTES / (1024 * 1024)).toFixed(0)}MB): ${file.name}`
          );
          continue;
        }

        const durationSeconds = await getVideoDurationSeconds(file);
        if (typeof durationSeconds === 'number' && durationSeconds > MAX_VIDEO_SECONDS) {
          toast.error(`Video too long (max ${MAX_VIDEO_SECONDS}s): ${file.name}`);
          continue;
        }
      } else {
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(
            `Photo too large (max ${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)}MB): ${file.name}`
          );
          continue;
        }
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
              <ArrowUpCircle className="w-6 h-6 text-cyan-400" />
              Publicar (Simple)
            </CardTitle>
            <p className="text-gray-400 text-sm mt-2">
              Comparte tus mejores trabajos con la comunidad
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Límites: fotos (máx 15MB) • videos (máx 60MB / 60s) • hasta {MAX_FILES} archivos.
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
                  <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-6 ring-1 ring-inset ring-white/5 hover:ring-cyan-500/20 transition">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-inset ring-cyan-500/20 flex items-center justify-center">
                        <ArrowUpCircle className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-white">Publicar</p>
                            <p className="mt-1 text-xs text-zinc-400">Elige una opción para agregar tu contenido.</p>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Button
                            type="button"
                            className="h-auto w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                            onClick={() => {
                              cameraInputRef.current?.click();
                            }}
                            disabled={isUploading}
                          >
                            <span className="flex w-full flex-col items-center gap-0.5">
                              <Camera className="h-4 w-4" />
                              <span className="text-[13px] font-semibold">Photo</span>
                              <span className="text-[10px] text-white/80">Camera</span>
                            </span>
                          </Button>

                          <Button
                            type="button"
                            className="h-auto w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                            onClick={() => {
                              videoInputRef.current?.click();
                            }}
                            disabled={isUploading}
                          >
                            <span className="flex w-full flex-col items-center gap-0.5">
                              <Video className="h-4 w-4" />
                              <span className="text-[13px] font-semibold">Video</span>
                              <span className="text-[10px] text-white/80">Record</span>
                            </span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            className="h-auto w-full py-3 border-white/10 bg-white/5 text-white hover:bg-white/10"
                            onClick={() => galleryInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <span className="flex w-full flex-col items-center gap-0.5">
                              <Images className="h-4 w-4" />
                              <span className="text-[13px] font-semibold">Gallery</span>
                              <span className="text-[10px] text-white/70">Select</span>
                            </span>
                          </Button>
                        </div>
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
                    <ArrowUpCircle className="w-5 h-5 mr-2" />
                    Publicar
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
