/**
 * KPI form action'ları için ortak form-state tipi ve başlangıç değeri.
 *
 * Bu dosya `"use server"` DEĞİL — çünkü Next.js 16+ `"use server"` modülünden
 * non-async export (const, type alias dışındaki değer) yasaklıyor. Tip ve
 * sabiti ayrı tutuyoruz; `actions.ts` ve client form'ları buradan import
 * ediyor.
 */
export type KpiFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};

export const KPI_FORM_INITIAL: KpiFormState = { ok: true };
