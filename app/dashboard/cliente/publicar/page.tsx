"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ArrowUpCircle, Camera, Images, Image as ImageIcon, Loader2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function PublicarPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressPct, setUploadProgressPct] = useState(0);
  const [uploadingFileLabel, setUploadingFileLabel] = useState<string>("");
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

  const isFirstPreviewVideo =
    !!selectedFiles[0] &&
    (selectedFiles[0].type.startsWith('video/') ||
      /\.(mp4|mov|m4v|webm|ogg)$/i.test(selectedFiles[0].name));

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length > MAX_FILES) {
      toast.error(`Puedes seleccionar máximo ${MAX_FILES} archivos a la vez`);
      return;
    }

    // Cleanup previous previews
    if (previewUrls.length > 0) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }

    const validFiles: File[] = [];
    const nextPreviews: string[] = [];

    for (const file of files) {
      const isImageFile =
        file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(file.name);
      const isVideoFile =
        file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(file.name);

      if (!isImageFile && !isVideoFile) {
        toast.error(`Archivo no soportado: ${file.name}`);
        continue;
      }

      // Keep uploads light (also enforced by /api/blob/upload)
      if (isVideoFile) {
        if (file.size > MAX_VIDEO_BYTES) {
          toast.error(
            `El video no debe superar ${(MAX_VIDEO_BYTES / (1024 * 1024)).toFixed(0)}MB: ${file.name}`
          );
          continue;
        }

        const durationSeconds = await getVideoDurationSeconds(file);
        if (typeof durationSeconds === 'number' && durationSeconds > MAX_VIDEO_SECONDS) {
          toast.error(`El video no debe durar más de ${MAX_VIDEO_SECONDS}s: ${file.name}`);
          continue;
        }
      } else {
        if (file.size > MAX_IMAGE_BYTES) {
          toast.error(
            `La foto no debe superar ${(MAX_IMAGE_BYTES / (1024 * 1024)).toFixed(0)}MB: ${file.name}`
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

    // Allow selecting the same file again.
    event.target.value = "";
  };

  const handleRemoveMedia = () => {
    if (previewUrls.length > 0) {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    }
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFiles.length === 0) {
      toast.error("Por favor selecciona una imagen o video");
      return;
    }

    setIsUploading(true);
    setUploadProgressPct(0);
    setUploadingFileIndex(0);
    setUploadTotalFiles(selectedFiles.length);
    setUploadingFileLabel("");

    try {
      let successCount = 0;
      let failedCount = 0;

      for (let idx = 0; idx < selectedFiles.length; idx++) {
        const file = selectedFiles[idx];
        setUploadingFileIndex(idx + 1);
        setUploadingFileLabel(file.name);
        setUploadProgressPct(0);

        // Step 1: Upload file directly to Vercel Blob (prevents serverless upload hangs)
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const pathname = `posts/client_share/${Date.now()}-${idx}-${sanitizedFileName}`;

        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/blob/upload",
          onUploadProgress: (progressEvent: unknown) => {
            if (typeof progressEvent === "number") {
              setUploadProgressPct(Math.max(0, Math.min(100, Number(progressEvent) || 0)));
              return;
            }

            if (typeof progressEvent === "object" && progressEvent !== null) {
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

        const cloudPath = blob.url;

        // Step 2: Create post record with Vercel Blob URL
        const postFormData = new FormData();
        postFormData.append("cloud_storage_path", cloudPath);
        if (caption.trim()) {
          postFormData.append("caption", caption.trim());
        }

        const postController = new AbortController();
        const postTimeout = setTimeout(() => postController.abort(), 60_000);

        const postResponse = await fetch("/api/posts", {
          method: "POST",
          body: postFormData,
          signal: postController.signal,
        }).finally(() => clearTimeout(postTimeout));

        if (!postResponse.ok) {
          let payload: unknown = null;
          try {
            payload = await postResponse.json();
          } catch {
            payload = { error: await postResponse.text() };
          }
          failedCount += 1;
          const payloadObj =
            payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
          const payloadMessage =
            payloadObj && typeof payloadObj.message === 'string' ? payloadObj.message : null;
          const payloadError =
            payloadObj && typeof payloadObj.error === 'string' ? payloadObj.error : null;
          toast.error(payloadMessage || payloadError || `Error al crear la publicación: ${file.name}`);
          continue;
        }

        successCount += 1;
      }

      if (successCount > 0 && failedCount === 0) {
        toast.success(`¡${successCount} publicación(es) creada(s) exitosamente!`);
      } else if (successCount > 0) {
        toast.success(`Se crearon ${successCount} publicación(es). Fallaron ${failedCount}.`);
      } else {
        toast.error('No se pudo crear ninguna publicación');
        return;
      }

      // Clean up and redirect
      handleRemoveMedia();
      setCaption("");
      
      // Redirect to feed
      router.push("/feed");
    } catch (error) {
      console.error("Error uploading post:", error);

      toast.error(
        error instanceof Error ? error.message : "Error al subir la publicación"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="container max-w-2xl mx-auto p-6 pb-32">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-white">Crear Publicación</h1>
          <p className="text-zinc-400">
            Comparte tus momentos con la comunidad
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Límites: fotos (máx 15MB) • videos (máx 60MB / 60s) • hasta {MAX_FILES} archivos.
          </p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <Card className="glass border-cyan-500/20">
          <CardContent className="pt-6">
            {previewUrls.length === 0 ? (
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
                        className="h-auto w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                        onClick={() => {
                          cameraInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <span className="flex w-full flex-col items-center gap-0.5">
                          <Camera className="h-4 w-4" />
                          <span className="text-xs font-semibold">Foto</span>
                          <span className="text-[9px] text-white/80">Cámara</span>
                        </span>
                      </Button>

                      <Button
                        type="button"
                        className="h-auto w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                        onClick={() => {
                          videoInputRef.current?.click();
                        }}
                        disabled={isUploading}
                      >
                        <span className="flex w-full flex-col items-center gap-0.5">
                          <Video className="h-4 w-4" />
                          <span className="text-xs font-semibold">Video</span>
                          <span className="text-[9px] text-white/80">Grabar</span>
                        </span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto w-full py-2.5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        <span className="flex w-full flex-col items-center gap-0.5">
                          <Images className="h-4 w-4" />
                          <span className="text-xs font-semibold">Galería</span>
                          <span className="text-[9px] text-white/70">Seleccionar</span>
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile-friendly inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />

                <input
                  ref={videoInputRef}
                  type="file"
                  className="hidden"
                  accept="video/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />

                <input
                  ref={galleryInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </div>
            ) : (
              <div className="relative">
                {previewUrls.length === 1 ? (
                  isFirstPreviewVideo ? (
                    <video
                      src={previewUrls[0]}
                      className="w-full h-auto rounded-lg"
                      controls
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={previewUrls[0]}
                      alt="Preview"
                      className="w-full h-auto rounded-lg"
                    />
                  )
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {previewUrls.map((url, idx) => {
                      const f = selectedFiles[idx];
                      const isVideoItem =
                        !!f &&
                        (f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg)$/i.test(f.name));
                      return (
                        <div key={idx} className="relative overflow-hidden rounded-lg bg-black/40 border border-white/10 aspect-square">
                          {isVideoItem ? (
                            <video
                              src={url}
                              className="h-full w-full object-cover"
                              muted
                              playsInline
                              preload="metadata"
                            />
                          ) : (
                            <img src={url} alt={f?.name || 'Preview'} className="h-full w-full object-cover" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveMedia}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
                {previewUrls.length > 1 ? (
                  <div className="mt-3 text-xs text-zinc-400">{previewUrls.length} archivos seleccionados</div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caption Section */}
        <div className="space-y-2">
          <label htmlFor="caption" className="text-sm font-medium text-white">
            Descripción (opcional)
          </label>
          <Textarea
            id="caption"
            placeholder="Escribe una descripción para tu publicación..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px] bg-black/40 border-zinc-700 text-white placeholder:text-zinc-500"
            disabled={isUploading}
          />
        </div>

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {uploadTotalFiles > 1
                  ? `Subiendo ${uploadingFileIndex}/${uploadTotalFiles}: ${uploadingFileLabel}`
                  : 'Subiendo archivo...'}
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

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <ImageIcon className="mr-2 h-4 w-4" />
                Publicar
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 text-white hover:bg-zinc-800"
            onClick={() => router.push("/feed")}
            disabled={isUploading}
          >
            Cancelar
          </Button>
        </div>
      </form>
      </div>
    </div>
  );
}
