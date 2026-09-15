import { cn } from "@/lib/utils";

const PALETTE: Record<string, string> = {
  ".": "transparent",
  K: "#14161a",
  B: "#3a3f48",
  H: "#6f7572",
  S: "#7d9a8a",
  W: "#eceae4",
};

function PixelGrid({
  rows,
  className,
  title,
}: {
  rows: readonly string[];
  className?: string;
  title?: string;
}) {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("block", className)}
      shapeRendering="crispEdges"
      aria-hidden={!title}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {rows.map((row, y) =>
        Array.from(row).map((cell, x) => {
          const fill = PALETTE[cell];
          if (!fill || fill === "transparent") return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={fill}
            />
          );
        }),
      )}
    </svg>
  );
}

const MASCOT = [
  "....................",
  ".......KKKKKK.......",
  "......KBBBBBBK......",
  ".....KBBBBBBBBK.....",
  ".....KBWSWBWSBK.....",
  ".....KBBBBBBBBK.....",
  "......KBBBBBBK......",
  ".....KKBBBBBBKK.....",
  "....KBBBBBBBBBBK....",
  "....KBBHBBBBHBBK....",
  "....KBBBBBBBBBBK....",
  "....KBBBBKKBBBBK....",
  ".....KKBBBBBBKK.....",
  "......KBBBBBBK......",
  "......KKBKKBKK......",
  ".......K....K.......",
  ".......K....K.......",
  "......KK....KK......",
  "....................",
  "....................",
] as const;

const MARK = [
  "KKKKKKK",
  "K.....K",
  "K.KKK.K",
  "K.KSK.K",
  "K.KKK.K",
  "K.....K",
  "KKKKKKK",
] as const;

export function PixelMascot({ className }: { className?: string }) {
  return (
    <PixelGrid rows={MASCOT} className={className} title="PIXELPIT mascot" />
  );
}

export function PixelMark({ className }: { className?: string }) {
  return <PixelGrid rows={MARK} className={className} title="PIXELPIT" />;
}

export function PixelBars({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 7 5"
      className={cn("block", className)}
      shapeRendering="crispEdges"
      aria-hidden
    >
      <rect x="0" y="0" width="7" height="1" fill="currentColor" />
      <rect x="0" y="2" width="7" height="1" fill="currentColor" />
      <rect x="0" y="4" width="7" height="1" fill="currentColor" />
    </svg>
  );
}

export function PitWell({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-square w-full max-w-[22rem]",
        className,
      )}
    >
      <div className="absolute inset-0 rounded-sm shadow-[var(--shadow-border)]" />
      <div className="absolute inset-[8%] rounded-sm bg-surface shadow-[var(--shadow-border)]" />
      <div className="absolute inset-[18%] rounded-xs bg-surface-2 shadow-[var(--shadow-border)]" />
      <div className="absolute inset-[30%] bg-bg shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
      <div className="absolute inset-[42%] bg-bg" />
      <div className="mascot-bob absolute inset-x-0 top-[6%] flex justify-center">
        <PixelMascot className="h-[78%] w-[78%]" />
      </div>
    </div>
  );
}
