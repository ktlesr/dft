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
 * Para birimi sembolleri. Detay sayfasında ortak kullanılabilir
 * diye burada export ediliyor.
 * ────────────────────────────────────────────────────────────── */
export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: "₺",
  EUR: "€",
  USD: "$",
};

/* ──────────────────────────────────────────────────────────────
 * Helpers (saf, test edilebilir):
 *
 *   parseCurrencyInput(str)        → sadece rakamlardan integer üretir
 *   formatCurrencyInput(n, locale) → Intl.NumberFormat ile binlik ayraçlı
 *   calculateCursorPosition(...)   → format sonrası imlec konumu
 * ────────────────────────────────────────────────────────────── */

export function parseCurrencyInput(str: string): number {
  if (!str) return 0;
  const digitsOnly = str.replace(/\D/g, "");
  if (!digitsOnly) return 0;
  // parseInt baştaki sıfırları sessizce atar (007 → 7).
  const n = parseInt(digitsOnly, 10);
  return Number.isFinite(n) ? n : 0;
}

export function formatCurrencyInput(value: number, locale = "tr-TR"): string {
  // Boş / 0 → input boş kalsın ki placeholder görünsün.
  if (!value || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/**
 * `e.target.value`'da imleçten önceki rakam sayısını koru; formatlanmış
 * string'i baştan tarayıp aynı rakam sayısına ulaşılan index'e imleci taşı.
 */
export function calculateCursorPosition(
  rawAfterEdit: string,
  formattedNew: string,
  posInRaw: number,
): number {
  let digitsBefore = 0;
  for (let i = 0; i < Math.min(posInRaw, rawAfterEdit.length); i++) {
    if (rawAfterEdit.charCodeAt(i) >= 48 && rawAfterEdit.charCodeAt(i) <= 57) {
      digitsBefore++;
    }
  }
  if (digitsBefore === 0) return 0;
  let seen = 0;
  for (let i = 0; i < formattedNew.length; i++) {
    if (formattedNew.charCodeAt(i) >= 48 && formattedNew.charCodeAt(i) <= 57) {
      seen++;
      if (seen === digitsBefore) return i + 1;
    }
  }
  return formattedNew.length;
}

/* ──────────────────────────────────────────────────────────────
 * <CurrencyInput />
 *
 * İki kullanım modu:
 *  - Controlled:   `value={amount} onValueChange={setAmount}` —
 *                  parent state'i tutar, hidden input render edilmez.
 *  - Form (default):  `name="budget" defaultValue={0}` — bileşen kendi
 *                     iç state'ini tutar, FormData'ya raw integer'ı
 *                     hidden input ile yollar.
 *
 * Live binlik ayraç (TR/EN locale uyumlu), imleç koruma, max clamp ve
 * paste'ı içerir. Sembol input'un sağında suffix olarak gösterilir.
 *
 * Backend kontratı bozulmadı: hidden input `name` ile mevcut server
 * action'a **ham integer string'i** ("10000000") gönderir;
 * `optionalDecimal` regex'i bunu zaten kabul eder.
 * ────────────────────────────────────────────────────────────── */

export type CurrencyInputProps = {
  /** Controlled mode için ham integer değer. */
  value?: number;
  /** Controlled mode'da değer değiştiğinde tetiklenir. */
  onValueChange?: (n: number) => void;
  /** Form mode için input adı — hidden input bu name ile gönderilir. */
  name?: string;
  /** Form mode için başlangıç değeri. */
  defaultValue?: number;
  id?: string;
  placeholder?: string;
  currency?: CurrencyCode;
  className?: string;
  /** Üst sınır; aşılırsa son geçerli değere clamp edilir. */
  max?: number;
  /** "tr-TR" (default) veya "en-US" gibi. */
  locale?: string;
  disabled?: boolean;
};

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  function CurrencyInput(
    {
      value: controlledValue,
      onValueChange,
      name,
      defaultValue = 0,
      id,
      placeholder,
      currency = "TRY",
      className,
      max,
      locale = "tr-TR",
      disabled,
    },
    forwardedRef,
  ) {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = React.useState<number>(defaultValue);
    const value = isControlled ? (controlledValue as number) : internalValue;

    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    // Format sonrası uygulanacak caret konumu. `useLayoutEffect` ile DOM
    // yansıtmadan önce setSelectionRange çağırıyoruz ki kullanıcı flicker
    // hissetmesin. Set sonrası null'a çekiyoruz.
    const [pendingCaret, setPendingCaret] = React.useState<number | null>(null);

    const display = formatCurrencyInput(value, locale);

    React.useLayoutEffect(() => {
      if (pendingCaret !== null && inputRef.current) {
        try {
          inputRef.current.setSelectionRange(pendingCaret, pendingCaret);
        } catch {
          // Bazı input tipleri setSelectionRange desteklemez — sessizce geç.
        }
        setPendingCaret(null);
      }
    }, [pendingCaret, display]);

    const commit = (next: number) => {
      if (isControlled) {
        onValueChange?.(next);
      } else {
        setInternalValue(next);
        onValueChange?.(next);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawAfter = e.target.value;
      const posInRaw = e.target.selectionStart ?? rawAfter.length;
      let next = parseCurrencyInput(rawAfter);
      if (max !== undefined && next > max) next = value;
      const formattedNew = formatCurrencyInput(next, locale);
      const newPos = calculateCursorPosition(rawAfter, formattedNew, posInRaw);
      setPendingCaret(newPos);
      commit(next);
    };

    const symbol = CURRENCY_SYMBOLS[currency];

    return (
      <div className={cn("relative", className)}>
        <Input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onChange={handleChange}
          disabled={disabled}
          className="pr-10"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground"
        >
          {symbol}
        </span>
        {/* Form submit'inde sunucuya giden ham integer. Controlled mode'da
            parent kendi hidden input/state yönetimini yapar — bu yüzden
            `name` verilmediyse hidden input render etmiyoruz. */}
        {name ? (
          <input
            type="hidden"
            name={name}
            value={value ? String(value) : ""}
            readOnly
          />
        ) : null}
      </div>
    );
  },
);

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
