"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function PublicarPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isVideo = !!selectedFile?.type?.startsWith("video/");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isImageFile = file.type.startsWith("image/");
      const isVideoFile = file.type.startsWith("video/");

      if (!isImageFile && !isVideoFile) {
        toast.error("Por favor selecciona una imagen o video válido");
        return;
      }

      // Keep parity with /api/posts/upload-blob (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error("El archivo no debe superar los 50MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveMedia = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Por favor selecciona una imagen o video");
      return;
    }

    if (!caption.trim()) {
      toast.error("Por favor agrega una descripción");
      return;
    }

    setIsUploading(true);

    try {
      // Step 1: Upload file to Vercel Blob
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);

      const uploadResponse = await fetch("/api/posts/upload-blob", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || "Error al subir archivo");
      }

      const uploadData = await uploadResponse.json();
      const cloudPath = uploadData.cloud_storage_path || uploadData.fileUrl;

      if (!cloudPath) {
        throw new Error("No se recibió URL del archivo");
      }

      // Step 2: Create post record with Vercel Blob URL
      const postFormData = new FormData();
      postFormData.append("cloud_storage_path", cloudPath);
      postFormData.append("caption", caption.trim());
      postFormData.append("hashtags", hashtags.trim());

      const postResponse = await fetch("/api/posts", {
        method: "POST",
        body: postFormData,
      });

      if (!postResponse.ok) {
        const error = await postResponse.json();
        throw new Error(error.message || "Error al crear la publicación");
      }

      // Show success message
      toast.success("¡Publicación creada exitosamente!");

      // Clean up and redirect
      handleRemoveMedia();
      setCaption("");
      setHashtags("");
      
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
        </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <Card className="glass border-cyan-500/20">
          <CardContent className="pt-6">
            {!previewUrl ? (
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-cyan-500/30 rounded-lg cursor-pointer bg-gradient-to-br from-zinc-900/80 to-black/60 hover:from-zinc-800/80 hover:to-black/80 transition-all duration-300"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 mb-4 text-cyan-400" />
                  <p className="mb-2 text-sm text-zinc-300">
                    <span className="font-semibold">Click para subir</span> o
                    arrastra y suelta
                  </p>
                  <p className="text-xs text-zinc-500">
                    Imágenes o videos (máx 50MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            ) : (
              <div className="relative">
                {isVideo ? (
                  <video
                    src={previewUrl}
                    className="w-full h-auto rounded-lg"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-auto rounded-lg"
                  />
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caption Section */}
        <div className="space-y-2">
          <label htmlFor="caption" className="text-sm font-medium text-white">
            Descripción
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

        {/* Hashtags Section */}
        <div className="space-y-2">
          <label htmlFor="hashtags" className="text-sm font-medium text-white">
            Hashtags
          </label>
          <Input
            id="hashtags"
            placeholder="#viajes #fotografia #naturaleza"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            className="bg-black/40 border-zinc-700 text-white placeholder:text-zinc-500"
            disabled={isUploading}
          />
          <p className="text-xs text-zinc-500">
            Separa los hashtags con espacios
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold"
            disabled={isUploading || !selectedFile || !caption.trim()}
          >
            {isUploading ? (
              <>
                <Upload className="mr-2 h-4 w-4 animate-spin" />
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
