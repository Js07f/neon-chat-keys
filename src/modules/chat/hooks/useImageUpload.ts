import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatImage {
  id: string;
  preview: string;
  base64: string;
  size: number;
  uploading: boolean;
  url?: string;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 2048;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);

      const quality = file.size > MAX_IMAGE_SIZE ? 0.7 : 0.85;
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Falha ao carregar imagem"));
    };
    img.src = url;
  });
}

async function uploadToStorage(base64: string, id: string): Promise<string> {
  const response = await fetch(base64);
  const blob = await response.blob();
  const path = `${Date.now()}-${id}.jpg`;

  const { error } = await supabase.storage
    .from("chat-images")
    .upload(path, blob, { contentType: "image/jpeg" });

  if (error) throw error;

  const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
  return data.publicUrl;
}

export function useImageUpload() {
  const [images, setImages] = useState<ChatImage[]>([]);

  const processFile = useCallback(async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) return;

    const id = generateId();
    const preview = URL.createObjectURL(file);

    setImages((prev) => [
      ...prev,
      { id, preview, base64: "", size: file.size, uploading: true },
    ]);

    try {
      const base64 = await compressImage(file);
      const url = await uploadToStorage(base64, id);

      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, base64, url, uploading: false } : img
        )
      );
    } catch {
      setImages((prev) => prev.filter((img) => img.id !== id));
    }
  }, []);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      Array.from(files).forEach(processFile);
    },
    [processFile]
  );

  const addFromClipboard = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) processFile(file);
        }
      }
    },
    [processFile]
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearImages = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
  }, [images]);

  const getImageUrls = useCallback(() => {
    return images
      .filter((img) => !img.uploading && img.url)
      .map((img) => img.url!);
  }, [images]);

  const isUploading = images.some((img) => img.uploading);

  return {
    images,
    addFiles,
    addFromClipboard,
    removeImage,
    clearImages,
    getImageUrls,
    isUploading,
  };
}
