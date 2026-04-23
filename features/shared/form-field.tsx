"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string[];
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelSuffix?: React.ReactNode;
};

export function Field({
  name,
  label,
  hint,
  error,
  required,
  children,
  className,
  labelSuffix,
}: FieldProps) {
  const hasError = !!error?.length;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={name} className={cn(hasError && "text-destructive")}>
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {labelSuffix}
      </div>
      {children}
      {hint && !hasError ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      {hasError ? (
        <p className="text-[11px] text-destructive" role="alert">
          {error![0]}
        </p>
      ) : null}
    </div>
  );
}
