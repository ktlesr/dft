import { cn } from "@/lib/utils";

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const TRAILING_PUNCTUATION = /[),.;:!?]+$/;

function splitTrailingPunctuation(value: string) {
  const trailing = value.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return {
    url: trailing ? value.slice(0, -trailing.length) : value,
    trailing,
  };
}

export function displayUrl(value: string, maxLength = 64): string {
  try {
    const url = new URL(value);
    const path = url.pathname === "/" ? "" : url.pathname;
    const suffix = url.search || url.hash ? "…" : "";
    const label = `${url.hostname}${path}${suffix}`;
    return label.length > maxLength ? `${label.slice(0, maxLength - 1)}…` : label;
  } catch {
    return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
  }
}

export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const index = match.index ?? 0;
    const { url, trailing } = splitTrailingPunctuation(raw);
    parts.push(text.slice(lastIndex, index));
    parts.push(
      <a
        key={`${index}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url}
        className="break-all text-primary underline-offset-2 hover:underline"
      >
        {displayUrl(url)}
      </a>,
    );
    parts.push(trailing);
    lastIndex = index + raw.length;
  }

  parts.push(text.slice(lastIndex));

  return (
    <p className={cn("whitespace-pre-wrap break-words [overflow-wrap:anywhere]", className)}>
      {parts}
    </p>
  );
}
