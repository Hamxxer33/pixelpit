import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  return (
    <div
      className={cn("pit-layer", open && "pit-layer-open")}
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
    >
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        aria-label="Close menu"
        onClick={() => onOpenChange(false)}
        className="pit-overlay"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pit-sheet flex h-full flex-col bg-bg"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg px-4">
          <p className="font-display text-lg tracking-wide">{title}</p>
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            onClick={() => onOpenChange(false)}
            className="grid size-11 place-items-center text-muted transition-colors duration-[var(--motion-quick)] hover:text-fg"
            aria-label="Close menu"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-bg px-4 py-4">
          {children}
        </div>
      </aside>
    </div>
  );
}
