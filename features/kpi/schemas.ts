import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v !== "" ? new Date(v) : undefined))
  .refine((v) => v === undefined || !Number.isNaN(v.getTime()), "Geçersiz tarih.");

const optionalDecimal = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined))
  .refine((v) => v === undefined || /^-?\d+([.,]\d+)?$/.test(v), "Geçersiz sayı.")
  .transform((v) => (v ? v.replace(",", ".") : undefined));

export const createCustomKpiSchema = z
  .object({
    name: z.string().trim().min(2, "KPI adı en az 2 karakter olmalıdır.").max(160),
    description: optionalText,
    targetValue: optionalDecimal,
    targetDate: optionalDate,
    assigneeType: z.enum(["USER_SINGLE", "USER_MULTI", "GROUP"]),
    assigneeUserIds: z.array(z.string().min(1)).default([]),
    assigneeGroupId: optionalText,
  })
  .superRefine((v, ctx) => {
    if (!v.targetValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetValue"],
        message: "Hedef değer zorunludur.",
      });
    }
    if (!v.targetDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetDate"],
        message: "Hedef tarihi zorunludur.",
      });
    }

    if (v.assigneeType === "GROUP" && !v.assigneeGroupId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeGroupId"],
        message: "Grup seçimi zorunludur.",
      });
    }

    if (v.assigneeType === "USER_SINGLE" && v.assigneeUserIds.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeUserIds"],
        message: "Tek kişi seçmelisiniz.",
      });
    }

    if (v.assigneeType === "USER_MULTI" && v.assigneeUserIds.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeUserIds"],
        message: "En az bir sorumlu seçmelisiniz.",
      });
    }
  });

export type CreateCustomKpiInput = z.infer<typeof createCustomKpiSchema>;

export const setCustomKpiApprovalSchema = z.object({
  kpiId: z.string().min(1),
  decision: z.enum(["APPROVE", "REJECT"]),
  reason: optionalText,
});

export const reviseCustomKpiTargetSchema = z
  .object({
    kpiId: z.string().min(1),
    targetValue: optionalDecimal,
    targetDate: optionalDate,
    reason: optionalText,
  })
  .superRefine((v, ctx) => {
    if (!v.targetValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetValue"],
        message: "Hedef değer zorunludur.",
      });
    }
    if (!v.targetDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetDate"],
        message: "Hedef tarihi zorunludur.",
      });
    }
  });

export const reviseCustomKpiBaselineSchema = z
  .object({
    kpiId: z.string().min(1),
    baselineValue: optionalDecimal,
    baselineDate: optionalDate,
    reason: optionalText,
  })
  .superRefine((v, ctx) => {
    if (!v.baselineValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baselineValue"],
        message: "Baseline değer zorunludur.",
      });
    }
    if (!v.baselineDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["baselineDate"],
        message: "Baseline tarihi zorunludur.",
      });
    }
  });

export const completeCustomKpiSchema = z
  .object({
    kpiId: z.string().min(1),
    completionType: z.enum(["COMPLETED", "OVERACHIEVED"]),
    actualValue: optionalDecimal,
    note: optionalText,
  })
  .superRefine((v, ctx) => {
    if (!v.actualValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["actualValue"],
        message: "Gerçekleşen değer zorunludur.",
      });
    }
  });
