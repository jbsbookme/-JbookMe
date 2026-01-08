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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor selecciona una imagen válida");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error("La imagen no debe superar los 10MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      toast.error("Por favor selecciona una imagen");
      return;
    }

    if (!caption.trim()) {
      toast.error("Por favor agrega una descripción");
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData with file and post data
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("caption", caption.trim());
      formData.append("hashtags", hashtags.trim());

      // POST directly to /api/posts
      const response = await fetch("/api/posts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al crear la publicación");
      }

      const result = await response.json();

      // Show success message
      toast.success("¡Publicación creada exitosamente!");

      // Clean up and redirect
      handleRemoveImage();
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
    <div className="container max-w-2xl mx-auto p-6 pb-32">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Crear Publicación</h1>
        <p className="text-muted-foreground">
          Comparte tus momentos con la comunidad
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload Section */}
        <Card>
          <CardContent className="pt-6">
            {!previewUrl ? (
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-semibold">Click para subir</span> o
                    arrastra y suelta
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG, GIF hasta 10MB
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />
              </label>
            ) : (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-auto rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveImage}
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
          <label htmlFor="caption" className="text-sm font-medium">
            Descripción
          </label>
          <Textarea
            id="caption"
            placeholder="Escribe una descripción para tu publicación..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="min-h-[100px]"
            disabled={isUploading}
          />
        </div>

        {/* Hashtags Section */}
        <div className="space-y-2">
          <label htmlFor="hashtags" className="text-sm font-medium">
            Hashtags
          </label>
          <Input
            id="hashtags"
            placeholder="#viajes #fotografia #naturaleza"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            disabled={isUploading}
          />
          <p className="text-xs text-muted-foreground">
            Separa los hashtags con espacios
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            className="flex-1"
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
            onClick={() => router.push("/feed")}
            disabled={isUploading}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
