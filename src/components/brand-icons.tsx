import { cn } from "@/lib/utils";

export function XLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-4", className)}
      aria-hidden
      fill="currentColor"
    >
      <path d="M21.5 3.4 2.8 10.6c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 11.1-7c.5-.3 1-.1.6.2L9.9 14.9l-.3 4.8c .4 0 .6-.2.8-.4l2.1-2 4.4 3.2c.8.5 1.4.2 1.6-.7l2.9-13.8c.3-1.2-.5-1.8-1.9-1.6z" />
    </svg>
  );
}
