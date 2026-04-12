import { cn } from "../cn";

interface SparklineProps {
  className?: string;
  data: readonly number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
}

const Sparkline = ({
  className,
  data,
  width = 100,
  height = 28,
  strokeWidth = 1
}: SparklineProps) => {
  if (data.length === 0) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const pad = strokeWidth;
  const usableHeight = height - pad * 2;

  const points = data
    .map((value, index) => {
      const x = index * stepX;
      const y = pad + usableHeight - ((value - min) / range) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
      height={height}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};

export type { SparklineProps };
export { Sparkline };
