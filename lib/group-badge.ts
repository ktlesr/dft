import { cn } from "@/lib/utils";

const GROUP_BADGE_PALETTE = [
  "border-[#c7d2fe] bg-[#eef2ff] text-[#3730a3]", // indigo
  "border-[#bfdbfe] bg-[#eff6ff] text-[#1e3a8a]", // blue
  "border-[#bae6fd] bg-[#ecfeff] text-[#155e75]", // cyan
  "border-[#bbf7d0] bg-[#ecfdf5] text-[#166534]", // green
  "border-[#fef3c7] bg-[#fffbeb] text-[#92400e]", // amber
  "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]", // orange
  "border-[#fecdd3] bg-[#fff1f2] text-[#9f1239]", // rose
  "border-[#e9d5ff] bg-[#faf5ff] text-[#6b21a8]", // purple
  "border-[#e5e7eb] bg-[#f9fafb] text-[#374151]", // gray
];

const GROUP_BADGE_DEFAULT = "border-[#dbeafe] bg-[#f8fbff] text-[#1e3a8a]";

export function groupBadgeClass(code?: string | null, className?: string) {
  const palette = code ? GROUP_BADGE_PALETTE[hashCode(code) % GROUP_BADGE_PALETTE.length] : GROUP_BADGE_DEFAULT;
  return cn("border font-medium", palette, className);
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}
