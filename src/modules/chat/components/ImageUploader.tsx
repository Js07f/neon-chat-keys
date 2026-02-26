import { useRef, useCallback } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageUploaderProps {
  onFiles: (files: FileList | File[]) => void;
  disabled?: boolean;
}

export default function ImageUploader({ onFiles, disabled }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        onFiles(e.target.files);
        e.target.value = "";
      }
    },
    [onFiles]
  );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11 shrink-0 text-muted-foreground hover:text-primary"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        <ImagePlus className="w-5 h-5" />
      </Button>
    </>
  );
}
