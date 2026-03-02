import { useState, useRef, useCallback } from "react";

interface ScreenCaptureHook {
  isSharing: boolean;
  lastFrame: string | null;
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  captureFrame: () => string | null;
}

export function useScreenCapture(): ScreenCaptureHook {
  const [isSharing, setIsSharing] = useState(false);
  const [lastFrame, setLastFrame] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const startSharing = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 1 },
        audio: false,
      });

      streamRef.current = stream;

      // Create hidden video element
      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      videoRef.current = video;

      // Create canvas for frame capture
      const canvas = document.createElement("canvas");
      canvasRef.current = canvas;

      setIsSharing(true);

      // Handle user stopping sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setIsSharing(false);
        streamRef.current = null;
        videoRef.current = null;
      };
    } catch (err) {
      console.error("Screen sharing error:", err);
      setIsSharing(false);
    }
  }, []);

  const stopSharing = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
    setIsSharing(false);
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isSharing) return null;

    canvas.width = Math.min(video.videoWidth, 1280);
    canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setLastFrame(dataUrl);
    return dataUrl;
  }, [isSharing]);

  return { isSharing, lastFrame, startSharing, stopSharing, captureFrame };
}
