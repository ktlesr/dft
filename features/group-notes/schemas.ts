import { z } from "zod";

const required = (max: number) => z.string().trim().min(2, "Çok kısa.").max(max);

export const groupNoteSchema = z.object({
  kind: z.enum(["ADVISOR_NOTE", "KS_NOTE"]),
  title: required(200),
  body: required(5000),
});

export type GroupNoteInput = z.infer<typeof groupNoteSchema>;
