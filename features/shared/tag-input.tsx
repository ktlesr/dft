"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type TagInputProps = {
  /** Form field name — submitted as comma-joined string, parsed back to array by Zod. */
  name: string;
  id?: string;
  /** Initial tags (when re-rendering after server validation, e.g. error state). */
  defaultValue?: string[];
  placeholder?: string;
  /** Hard cap; matches the Zod `tagsArray` cap of 20. */
  max?: number;
  /** Per-tag character cap. */
  maxLength?: number;
  disabled?: boolean;
};

export function TagInput({
  name,
  id,
  defaultValue = [],
  placeholder = "Etiket yazın, virgül veya Enter ile ekleyin",
  max = 20,
  maxLength = 60,
  disabled,
}: TagInputProps) {
  const [tags, setTags] = React.useState<string[]>(() => dedupe(defaultValue));
  const [draft, setDraft] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const clean = raw.trim();
    if (!clean) return;
    if (tags.length >= max) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setDraft("");
      return;
    }
    setTags([...tags, clean.slice(0, maxLength)]);
    setDraft("");
  };

  const remove = (idx: number) => {
    setTags(tags.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "," || e.key === "Enter") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      remove(tags.length - 1);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // Yapıştırılan "a, b, c" gibi metni anında parçalara böl.
    if (v.includes(",")) {
      const parts = v.split(",");
      const last = parts.pop() ?? "";
      for (const p of parts) commit(p);
      setDraft(last);
      return;
    }
    setDraft(v);
  };

  const handleBlur = () => {
    if (draft.trim()) commit(draft);
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm",
        "focus-within:outline-none focus-within:ring-1 focus-within:ring-ring",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {tags.map((t, i) => (
        <span
          key={`${t}-${i}`}
          className="inline-flex items-center gap-1 rounded-md border border-transparent bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          {t}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              remove(i);
            }}
            className="-mr-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label={`${t} etiketini kaldır`}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id ?? name}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={tags.length === 0 ? placeholder : undefined}
        disabled={disabled || tags.length >= max}
        maxLength={maxLength}
        className="flex-1 min-w-[8ch] bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      {/* Server actions tarafına virgülle birleştirilmiş tek bir alan olarak yollanır. */}
      <input type="hidden" name={name} value={tags.join(",")} />
    </div>
  );
}

function dedupe(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const key = v.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v.trim());
  }
  return out;
}
