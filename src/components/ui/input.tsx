import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm bg-surface-2 px-3 font-mono text-sm text-fg shadow-[var(--shadow-border)] outline-none placeholder:text-subtle transition-[box-shadow] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus:shadow-[var(--shadow-border-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        className,
      )}
      {...props}
    />
  );
}
