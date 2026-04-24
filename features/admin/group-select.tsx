"use client";

import * as React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Group selector for the admin "change user group" form.
 *
 * Radix Select forbids empty-string item values, so the UI uses a
 * `__NONE__` sentinel for "no group". A sibling hidden input mirrors the
 * selection as the exact value the server action expects (`""` for
 * unassigned, otherwise the `code`).
 *
 * Faz 7: `groups` is now a runtime prop fetched from the DB (admin-managed
 * groups) instead of a hardcoded enum.
 */

const NONE = "__NONE__";

export type GroupOption = {
  code: string;
  description: string | null;
};

type Props = {
  name: string;
  defaultCode?: string | null;
  groups: GroupOption[];
};

export function GroupSelect({ name, defaultCode, groups }: Props) {
  const [value, setValue] = React.useState<string>(defaultCode ?? NONE);

  return (
    <>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="Çalışma grubu">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Grup atanmamış —</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.code} value={g.code}>
              <span className="font-medium">{g.code}</span>
              {g.description ? (
                <span className="text-muted-foreground"> · {g.description}</span>
              ) : null}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input type="hidden" name={name} value={value === NONE ? "" : value} />
    </>
  );
}
