"use client";

import { useState, useMemo } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/features/shared/form-field";
import {
  FUND_CATEGORY_LABELS,
  FUND_SUBTYPES_BY_CATEGORY,
} from "@/lib/constants";

type FundCategoryCode = keyof typeof FUND_CATEGORY_LABELS;

/**
 * Kademeli "Fon Türü" seçici. Üst kategori (Ulusal / AB / Diğer Uluslararası)
 * seçildiğinde ikinci select ilgili alt tiplerle yeniden yüklenir. Sunucu
 * tarafında her iki alan da serbest string olarak saklanır; spec'teki sabit
 * listede olmayan değerler de tarihçe için kabul edilir.
 */
export function FundTypeFields({
  errors,
  defaultCategory,
  defaultSubType,
}: {
  errors?: Record<string, string[]>;
  defaultCategory?: string | null;
  defaultSubType?: string | null;
}) {
  const [category, setCategory] = useState<FundCategoryCode | "">(
    (defaultCategory as FundCategoryCode | undefined) ?? "",
  );

  const subTypes = useMemo(() => {
    if (!category) return [] as readonly string[];
    return FUND_SUBTYPES_BY_CATEGORY[category];
  }, [category]);

  return (
    <>
      <Field name="fundCategory" label="Fon türü" error={errors?.fundCategory}>
        <Select
          name="fundCategory"
          value={category}
          onValueChange={(v) => setCategory(v as FundCategoryCode)}
        >
          <SelectTrigger id="fundCategory">
            <SelectValue placeholder="Seçiniz" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(FUND_CATEGORY_LABELS) as [FundCategoryCode, string][]).map(
              ([code, label]) => (
                <SelectItem key={code} value={code}>
                  {label}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>
      </Field>

      <Field
        name="fundSubType"
        label="Alt fon tipi"
        hint={category ? undefined : "Önce üst kategori seçin."}
        error={errors?.fundSubType}
      >
        {subTypes.length > 0 ? (
          <Select name="fundSubType" defaultValue={defaultSubType ?? undefined}>
            <SelectTrigger id="fundSubType">
              <SelectValue placeholder="Seçiniz" />
            </SelectTrigger>
            <SelectContent>
              {subTypes.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="fundSubType"
            name="fundSubType"
            placeholder="—"
            disabled
            defaultValue=""
          />
        )}
      </Field>
    </>
  );
}
