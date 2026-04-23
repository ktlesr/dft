import { cn } from "@/lib/utils";

export function FieldError({ messages, className }: { messages?: string[]; className?: string }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className={cn("text-xs text-destructive", className)} role="alert">
      {messages[0]}
    </p>
  );
}
