"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * URL-param filter select. On change, updates the current path's query
 * string (`?<param>=<value>`) via `router.push`. Pass `value=""` or the
 * sentinel `"__all__"` to clear the param entirely.
 *
 * Preserves all other existing search params — so combining this with a
 * `q` text input in the same form doesn't clobber the user's query.
 *
 * Drop-in replacement for the native `<select>` filters we had in
 * panolar/genel, panolar/grup and yonetim/loglar.
 */

// Radix Select forbids `value=""` on items, so we use a sentinel for the
// "all" / "no filter" row. The sentinel never hits the URL.
const ALL_SENTINEL = "__all__";

type Option = { value: string; label: string };

type FilterSelectProps = {
  param: string;
  value?: string;
  options: Option[];
  placeholder?: string;
  allLabel?: string;
  className?: string;
  ariaLabel?: string;
};

export function FilterSelect({
  param,
  value,
  options,
  placeholder,
  allLabel = "Tümü",
  className,
  ariaLabel,
}: FilterSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = React.useTransition();

  const current = value && value.length > 0 ? value : ALL_SENTINEL;

  function handleChange(next: string) {
    // Start from the current URL params. If the select lives inside a
    // `<form>`, overlay the form's current field values on top — this
    // preserves text that the user has typed into a sibling input
    // (e.g. `q`) but not yet submitted.
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const form = triggerRef.current?.closest("form");
    if (form) {
      const fd = new FormData(form);
      for (const [key, val] of fd.entries()) {
        if (key === param) continue; // handled below
        if (typeof val !== "string") continue;
        if (val) params.set(key, val);
        else params.delete(key);
      }
    }
    if (next === ALL_SENTINEL) {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <>
      <Select value={current} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger
          ref={triggerRef}
          className={cn("w-auto min-w-[180px]", className)}
          aria-label={ariaLabel}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SENTINEL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/*
        Hidden mirror input so the select value is included if the enclosing
        form is submitted by another control (e.g. pressing Enter in a sibling
        text input). Sentinel value is stripped so the param doesn't end up
        as `?tur=__all__` in the URL.
      */}
      <input type="hidden" name={param} value={current === ALL_SENTINEL ? "" : current} />
    </>
  );
}
