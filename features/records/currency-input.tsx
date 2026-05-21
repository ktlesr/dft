"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CURRENCY_CODES, type CurrencyCode } from "./schemas";

/* ──────────────────────────────────────────────────────────────
 * Para birimi sembolleri ve etiketleri. Detay sayfasında ortak
 * kullanılabilir diye burada export ediliyor — yeni bir constants
 * dosyası açmak yerine kayıt formu yakınında tutuldu.
 * ────────────────────────────────────────────────────────────── */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: "₺",
  EUR: "€",
  USD: "$",
};

/** "10000" → "10.000", "10000.5" → "10.000,5". Boş input boş döner. */
export function formatCurrencyDisplay(raw: string): string {
  if (!raw) return "";
  // Sadece rakam, virgül ve nokta tut. Negatif desteklemiyoruz.
  const cleaned = raw.replace(/[^\d.,]/g, "");
  // İlk virgül VEYA noktayı ondalık ayracı olarak kabul et.
  const firstSep = cleaned.search(/[.,]/);
  const intPart = firstSep < 0 ? cleaned : cleaned.slice(0, firstSep);
  const decPart = firstSep < 0 ? "" : cleaned.slice(firstSep + 1).replace(/[.,]/g, "");
  if (!intPart) return "";
  // İnt kısmı: binlik için 3'lü gruplamayla nokta yerleştir (TR locale).
  const intGrouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decPart ? `${intGrouped},${decPart}` : intGrouped;
}

/** Display string'i ham (server tarafına gönderilecek) decimal'a çevir.
 *  "10.000,5" → "10000.5"; "10000" → "10000"; "" → "". */
function toRawDecimal(display: string): string {
  if (!display) return "";
  const noThousands = display.replace(/\./g, "");
  return noThousands.replace(/,/g, ".");
}

/**
 * Bütçe / parasal alanlar için tek dosya kontrolsüz bileşen.
 *  - Kullanıcı yazarken anlık binlik ayraçlı (TR locale) gösterim
 *  - Form submit'inde `name` ile gönderilen değer **ham decimal**
 *    (örn. "10000.50") — server tarafındaki `optionalDecimal` regex'i
 *    bunu zaten kabul ediyor → backend kontratı bozulmadı.
 *  - Suffix olarak seçili para birimi sembolü (₺/€/$) gösterilir.
 *
 * Currency selector ayrı bileşen ([CurrencySelect](./CurrencySelect)) —
 * forma tek seçici konup birden çok input'a `currency` prop ile
 * geçirildiğinde aynı sembol her input'ta görünür.
 */
export function CurrencyInput({
  name,
  id,
  defaultValue = "",
  placeholder,
  currency = "TRY",
  className,
}: {
  name: string;
  id?: string;
  defaultValue?: string;
  placeholder?: string;
  currency?: CurrencyCode;
  className?: string;
}) {
  const [display, setDisplay] = React.useState<string>(() =>
    formatCurrencyDisplay(defaultValue),
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplay(formatCurrencyDisplay(e.target.value));
  };

  const symbol = CURRENCY_SYMBOLS[currency];

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={onChange}
        className="pr-10"
      />
      {/* Sembol input'un sağında — tıklanmaz, yalnızca görsel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground"
      >
        {symbol}
      </span>
      {/* Form submit'inde sunucuya giden ham değer. `name` prop'u burada
          kullanılır — gözle görünen input form alanına dahil değildir. */}
      <input type="hidden" name={name} value={toRawDecimal(display)} readOnly />
    </div>
  );
}

/**
 * Para birimi seçici. Form içinde tek instance — birden çok bütçe alanı
 * varsa hepsi aynı currency state'ini paylaşır.
 */
export function CurrencySelect({
  name = "currency",
  value,
  onChange,
  id,
}: {
  name?: string;
  value: CurrencyCode;
  onChange: (next: CurrencyCode) => void;
  id?: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)} name={name}>
      <SelectTrigger id={id} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCY_CODES.map((c) => (
          <SelectItem key={c} value={c}>
            {CURRENCY_SYMBOLS[c]} {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
