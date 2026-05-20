import { z } from "zod";

const optional = (max = 3000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" ? undefined : v));

export const reportTemplateSchema = z
  .object({
    title: z.string().trim().min(2, "Başlık çok kısa.").max(200),
    description: optional(3000),
    scope: z.enum(["GENEL", "GROUPS"]),
    targetGroupIds: z.array(z.string()).default([]),
  })
  .refine(
    (v) => {
      if (v.scope === "GROUPS" && v.targetGroupIds.length === 0) {
        return false;
      }
      return true;
    },
    { path: ["targetGroupIds"], message: "En az bir hedef grup seçilmelidir." },
  );

export type ReportTemplateInput = z.infer<typeof reportTemplateSchema>;
export type ReportTemplateFormState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
};
