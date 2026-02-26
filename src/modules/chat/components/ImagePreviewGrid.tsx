import { X, Loader2 } from "lucide-react";
import type { ChatImage } from "../hooks/useImageUpload";

interface ImagePreviewGridProps {
  images: ChatImage[];
  onRemove: (id: string) => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function ImagePreviewGrid({ images, onRemove }: ImagePreviewGridProps) {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap px-1 pb-2">
      {images.map((img) => (
        <div
          key={img.id}
          className="relative group w-16 h-16 rounded-lg overflow-hidden neon-border"
        >
          <img
            src={img.preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {img.uploading && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          )}
          <button
            onClick={() => onRemove(img.id)}
            className="absolute top-0 right-0 p-0.5 bg-destructive text-destructive-foreground rounded-bl-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
          <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-background/80 text-muted-foreground font-mono">
            {formatSize(img.size)}
          </span>
        </div>
      ))}
    </div>
  );
}
