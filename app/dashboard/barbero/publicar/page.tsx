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
import { upload } from '@vercel/blob/client';

export default function BarberUploadPage() {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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

    const validFiles: File[] = [];
    for (const file of files) {
      // Validate file type
      const isImageFile =
        file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
      const isVideoFile =
        file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(file.name);

      if (!isImageFile && !isVideoFile) {
        toast.error(`Unsupported file: ${file.name}`);
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
    }

    if (validFiles.length === 0) return;

    setSelectedFiles(validFiles);

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
    setSelectedFiles([]);
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
      const isBatch = selectedFiles.length > 1;
      let lastFileUrl: string | null = null;
      let lastFile: File | null = null;
      let successCount = 0;
      let failedCount = 0;

      for (let idx = 0; idx < selectedFiles.length; idx++) {
        const file = selectedFiles[idx];
        setUploadingFileIndex(idx + 1);
        setUploadingFileLabel(file.name);
        setUploadProgressPct(0);

        // Upload directly to Vercel Blob (avoids serverless upload hangs)
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

        // Create post record
        const formData = new FormData();
        if (caption.trim()) {
          formData.append('caption', caption.trim());
        }
        formData.append('cloud_storage_path', cloud_storage_path);

        const res = await fetch('/api/posts', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          let payload: unknown = null;
          try {
            payload = await res.json();
          } catch {
            payload = { error: await res.text() };
          }
          failedCount += 1;

          const payloadObj =
            payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
          const payloadCode = payloadObj && typeof payloadObj.code === 'string' ? payloadObj.code : null;
          const payloadError =
            payloadObj && typeof payloadObj.error === 'string' ? payloadObj.error : null;
          const payloadMessage =
            payloadObj && typeof payloadObj.message === 'string' ? payloadObj.message : null;
          const baseMessage = payloadMessage ?? payloadError;

          toast.error(
            baseMessage
              ? payloadCode
                ? `${baseMessage} (${payloadCode})`
                : baseMessage
              : `Failed to upload post: ${file.name}`
          );
          continue;
        }

        successCount += 1;
        lastFileUrl = blob.url;
        lastFile = file;
      }

      if (successCount === 0) {
        toast.error('Failed to upload posts');
        return;
      }

      if (isBatch) {
        toast.success(`✅ Published ${successCount} post(s).${failedCount ? ` Failed: ${failedCount}.` : ''}`);
      } else {
        toast.success('✅ Published successfully. Preparing to share...');

        const fileUrl = lastFileUrl as string;
        const uploadedFile = lastFile as File;

        // Auto-share after successful upload (single file only)
        const trimmedCaption = caption.trim();
        const text = trimmedCaption
          ? `${trimmedCaption}\n\nJb Barbershop • BookMe\nBook your appointment: https://www.jbsbookme.com`
          : `Jb Barbershop • BookMe\nBook your appointment: https://www.jbsbookme.com`;
        const isVideoUpload =
          uploadedFile.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(uploadedFile.name);

        // Try Web Share API first (works on mobile with image)
        if (navigator.share && navigator.canShare) {
          try {
            // For videos, avoid re-downloading the entire file just to attach it.
            // Share text + link instead.
            if (isVideoUpload) {
              await navigator.share({ text, url: fileUrl });
            } else {
              const response = await fetch(fileUrl);
              const blob = await response.blob();
              const file = new File([blob], 'jbookme-work.jpg', { type: blob.type });

              const shareData = {
                text: text,
                files: [file],
              };

              if (navigator.canShare(shareData)) {
                await navigator.share(shareData);
              } else {
                await navigator.share({ text, url: fileUrl });
              }
            }
          } catch (error) {
            console.log('Web Share failed, using fallback');
            // Fallback: copy text and download image
            await navigator.clipboard.writeText(text);
            const a = document.createElement('a');
            a.href = fileUrl;
            a.download = 'jbookme-work.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.info('📋 Texto copiado e imagen descargada');
          }
        } else {
          // Desktop fallback
          await navigator.clipboard.writeText(text);
          const a = document.createElement('a');
          a.href = fileUrl;
          a.download = 'jbookme-work.jpg';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          toast.info('📋 Text copied and image downloaded');
        }
      }
      
      // Reset form
      handleRemoveFile();
      setCaption('');
      
      // Redirect to dashboard after sharing / batch upload
      setTimeout(() => {
        router.push('/dashboard/barbero');
      }, 1500);

    } catch (error: unknown) {
      console.error('Upload error:', error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || 'Failed to upload post');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black pb-32">

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Link href="/dashboard/barbero">
          <Button variant="ghost" className="mb-4 text-gray-400 hover:text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Publicar
            </CardTitle>
            <p className="text-zinc-400 text-sm">Comparte fotos o videos de tus trabajos.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Límites: fotos (máx 15MB) • videos (máx 60MB / 60s) • hasta {MAX_FILES} archivos.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* File Upload Area */}
              <div>
                <Label>Media</Label>
                {selectedFiles.length === 0 ? (
                  <div
                    onClick={() => galleryInputRef.current?.click()}
                    className="mt-2 cursor-pointer"
                  >
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
                              className="h-auto w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                              onClick={(ev) => {
                                ev.stopPropagation();
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
                              onClick={(ev) => {
                                ev.stopPropagation();
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
                              onClick={(ev) => {
                                ev.stopPropagation();
                                galleryInputRef.current?.click();
                              }}
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
                  </div>
                ) : (
                  <div className="mt-2 relative">
                    <div className="w-full rounded-lg overflow-hidden bg-zinc-800 border-2 border-cyan-500/30 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center">
                          {fileType === 'video' ? (
                            <Video className="w-5 h-5 text-purple-400" />
                          ) : (
                            <Camera className="w-5 h-5 text-pink-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white font-semibold truncate">
                            {selectedFiles.length > 1 ? `${selectedFiles.length} files selected` : selectedFiles[0]?.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {selectedFiles.length === 1 && selectedFiles[0]
                              ? `${(selectedFiles[0].size / (1024 * 1024)).toFixed(2)} MB`
                              : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={handleRemoveFile}
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Caption */}
              <div>
                <Label htmlFor="caption">Caption</Label>
                <Textarea
                  id="caption"
                  placeholder="Describe your work... (e.g., 'Fresh fade with beard lineup')"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="mt-2 bg-zinc-800 border-zinc-700 min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  {caption.length}/500 characters
                </p>
              </div>

              {isUploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
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

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUploading || selectedFiles.length === 0}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="w-4 h-4 mr-2" />
                      Publicar
                    </>
                  )}
                </Button>
              </div>

              {/* Info Box */}
              <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-cyan-400 mb-2">Posting Guidelines</h4>
                <ul className="text-xs text-zinc-400 space-y-1">
                  <li>Only upload your own work</li>
                  <li>Photos/videos should be clear and well-lit</li>
                  <li>Avoid personal information in photos</li>
                  <li>Your post appears in the feed after publishing</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
