"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GROUP_LABELS } from "@/lib/constants";
import type { GroupCode } from "@prisma/client";

/**
 * Group selector for the admin "change user group" form.
 *
 * Radix Select forbids empty-string item values, so the UI uses a
 * `__NONE__` sentinel for "no group". A sibling hidden input mirrors the
 * selection as the exact value the server action expects (`""` for
 * unassigned, otherwise the `GroupCode`).
 */

const NONE = "__NONE__";
const GROUP_CODES: GroupCode[] = ["UAK", "E2SC", "DFSF", "PGD", "PA"];

type Props = {
  name: string;
  defaultCode?: GroupCode | null;
};

export function GroupSelect({ name, defaultCode }: Props) {
  const [value, setValue] = React.useState<string>(defaultCode ?? NONE);

  return (
    <>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="Çalışma grubu">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Grup atanmamış —</SelectItem>
          {GROUP_CODES.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="font-medium">{c}</span>{" "}
              <span className="text-muted-foreground">· {GROUP_LABELS[c].description}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value === NONE ? "" : value} />
    </>
  );
}
