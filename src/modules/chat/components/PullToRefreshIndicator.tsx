import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  refreshing: boolean;
  triggered: boolean;
}

export default function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  triggered,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null;

  const opacity = Math.min(pullDistance / 60, 1);
  const scale = 0.5 + Math.min(pullDistance / 120, 0.5);

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
      style={{ height: `${pullDistance}px` }}
    >
      <div
        className="text-primary transition-transform duration-200"
        style={{ opacity, transform: `scale(${scale})` }}
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ArrowDown
            className="w-5 h-5 transition-transform duration-200"
            style={{
              transform: triggered ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        )}
      </div>
    </div>
  );
}
