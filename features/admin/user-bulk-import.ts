"use server";

import { revalidatePath } from "next/cache";

import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { MAX_BULK_IMPORT_BYTES, MAX_BULK_IMPORT_ROWS } from "@/lib/constants";
import { generateUniqueUsername } from "./username";
import type { Role } from "@prisma/client";

/**
 * Bulk member import — admin-only, all-or-nothing. Accepts CSV (text/csv,
 * UTF-8 + comma or semicolon) or XLSX.
 *
 * Şablon başlıkları (uyeler.csv ile uyumlu):
 *   - "Adı Soyadı"            → name (zorunlu)
 *   - "Kurum / Kuruluş"       → organization
 *   - "Akademik Ünvan"        → title
 *   - "Görevi"                → position
 *   - "İl"                    → city
 *   - "Cep Tel"               → phone
 *   - "E-Posta"               → email (zorunlu)
 *   - "Çalışma Grubu"         → group code (UAK / E2SC / DFSF / PGD / PA …)
 *   - "Rolü"                  → ek rol: "Üye" / "Raportör" / "Moderatör" / "Yönetici"
 *
 * Her satır için 10 karakterlik güçlü geçici şifre üretilir; oluşturulan
 * (e-posta, geçici şifre) çiftleri sonuçta admin'e bir CSV özet olarak
 * döner — admin bunu güvenli kanaldan üyelere iletir.
 */

export type BulkUserImportError = {
  row: number;
  column?: string;
  message: string;
};

export type BulkUserCredential = {
  email: string;
  username: string | null;
  name: string;
  password: string;
};

export type BulkUserImportState = {
  ok: boolean;
  message?: string;
  created?: number;
  errors?: BulkUserImportError[];
  credentials?: BulkUserCredential[];
};

const ACCEPTED_MIME_PREFIXES = new Set<string>([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // bazı tarayıcılar/proxy'ler boş bırakıyor
]);

// ── Header normalisation (Turkish-aware) ─────────────────────────
function tr(s: string): string {
  return s
    .toLowerCase()
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

type HeaderKey =
  | "name"
  | "organization"
  | "title"
  | "position"
  | "city"
  | "phone"
  | "email"
  | "username"
  | "groupCode"
  | "role"
  | "password"
  | "no";

const HEADER_MAP: Record<string, HeaderKey> = {
  "adi soyadi": "name",
  "ad soyad": "name",
  "isim": "name",
  "name": "name",
  "kurum kurulus": "organization",
  "kurum": "organization",
  "kurulus": "organization",
  "organization": "organization",
  "akademik unvan": "title",
  "unvan": "title",
  "akademic title": "title",
  "title": "title",
  "gorevi": "position",
  "gorev": "position",
  "position": "position",
  "il": "city",
  "sehir": "city",
  "city": "city",
  "cep tel": "phone",
  "telefon": "phone",
  "phone": "phone",
  "e posta": "email",
  "eposta": "email",
  "email": "email",
  "kullanici adi": "username",
  "kullaniciadi": "username",
  "username": "username",
  "calisma grubu": "groupCode",
  "grup": "groupCode",
  "group": "groupCode",
  "rolu": "role",
  "rol": "role",
  "role": "role",
  "sifre": "password",
  "parola": "password",
  "password": "password",
  "id": "no",
  "no": "no",
  "sira": "no",
};

// Kullanıcı adı şekil regex'i (auth ile aynı kural).
const USERNAME_RE = /^[a-z0-9](?:[a-z0-9.]{1,48}[a-z0-9])?$/;

// ── Role label → enum mapping ────────────────────────────────────
const ROLE_LABEL_TO_ENUM: Record<string, Role> = {
  uye: "USER",
  user: "USER",
  raportor: "RAPPORTEUR",
  rapporteur: "RAPPORTEUR",
  moderator: "MODERATOR",
  moderatör: "MODERATOR",
  yonetici: "ADMIN",
  admin: "ADMIN",
};

function emailValid(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * 10 karakterlik güçlü geçici şifre üretir; her sınıftan en az bir karakter
 * (büyük, küçük, rakam, sembol) içerir. Politikanın minimumudur.
 */
function generatePassword(): string {
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?+-";
  const all = lower + upper + digits + symbols;
  const randInt = (max: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % max;
  };
  const pick = (set: string) => set[randInt(set.length)]!;
  const out = [pick(lower), pick(upper), pick(digits), pick(symbols)];
  while (out.length < 10) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out.join("");
}

// ── CSV parser (minimal RFC4180, comma or semicolon) ─────────────
// Quoted fields supported; doubled quotes inside a quoted field unescape.
// Newlines inside quoted fields supported. BOM stripped.
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuote = false;
  let i = 0;
  // Strip UTF-8 BOM
  if (text.charCodeAt(0) === 0xfeff) i = 1;

  // Auto-detect delimiter from first 2 KB by majority vote.
  const sample = text.slice(i, i + 2048);
  const commas = (sample.match(/,/g) ?? []).length;
  const semis = (sample.match(/;/g) ?? []).length;
  const delim = semis > commas ? ";" : ",";

  while (i < text.length) {
    const c = text[i]!;
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuote = true;
      i++;
      continue;
    }
    if (c === delim) {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      out.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Flush
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    out.push(row);
  }
  return out;
}

// ── XLSX parser (uses ExcelJS) ───────────────────────────────────
async function parseXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const out: string[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const cells: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c++) {
      const v = row.getCell(c).value;
      cells.push(cellToString(v));
    }
    // Trim trailing empties
    while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    out.push(cells);
  }
  return out;
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (typeof v.text === "string") return v.text;
    if (typeof v.result === "string") return v.result;
    if (typeof v.result === "number") return String(v.result);
    if (Array.isArray(v.richText)) return v.richText.map((rt) => rt?.text ?? "").join("");
  }
  return "";
}

// ── Detect file kind ─────────────────────────────────────────────
function isXlsxFilename(name: string): boolean {
  return /\.xlsx$/i.test(name);
}
function isCsvFilename(name: string): boolean {
  return /\.csv$/i.test(name);
}

// ── The action ───────────────────────────────────────────────────
export async function bulkImportUsers(
  _prev: BulkUserImportState,
  fd: FormData,
): Promise<BulkUserImportState> {
  const admin = await requireAdmin();
  const ip = await getClientIp();
  const rl = await rateLimit(`user:bulk:${admin.id}:${ip}`, 20, 60 * 60_000);
  if (!rl.allowed) {
    const minutes = Math.ceil(rl.retryAfterSeconds / 60);
    return {
      ok: false,
      message: `Çok fazla toplu içe aktarma. Yaklaşık ${minutes} dakika sonra tekrar deneyin.`,
    };
  }

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Lütfen bir .csv veya .xlsx dosyası seçin." };
  }
  if (file.size > MAX_BULK_IMPORT_BYTES) {
    return { ok: false, message: "Dosya çok büyük (en fazla 5 MB)." };
  }

  const isXlsx = isXlsxFilename(file.name);
  const isCsv = isCsvFilename(file.name);
  if (!isXlsx && !isCsv) {
    return { ok: false, message: "Yalnızca .csv ve .xlsx dosyaları kabul edilir." };
  }

  // Light MIME guard. We rely primarily on extension + content shape since
  // both formats are reasonable for admin templates; the magic-byte check
  // for xlsx is implicit in ExcelJS's parser (rejects non-zip).
  if (file.type && !ACCEPTED_MIME_PREFIXES.has(file.type) && !file.type.startsWith("text/")) {
    return { ok: false, message: `Dosya türü desteklenmiyor: ${file.type}` };
  }

  let rows: string[][] = [];
  try {
    if (isXlsx) {
      rows = await parseXlsx(await file.arrayBuffer());
    } else {
      const text = await file.text();
      rows = parseCsv(text);
    }
  } catch {
    return { ok: false, message: "Dosya okunamadı veya bozuk." };
  }

  if (rows.length < 2) {
    return { ok: false, message: "Dosyada veri satırı bulunamadı." };
  }

  // Header indexing
  const header = rows[0]!;
  const colIndex: Partial<Record<HeaderKey, number>> = {};
  for (let c = 0; c < header.length; c++) {
    const key = HEADER_MAP[tr(header[c] ?? "")];
    if (key) colIndex[key] = c;
  }

  const required: HeaderKey[] = ["name", "email"];
  const missing = required.filter((k) => !(k in colIndex));
  if (missing.length > 0) {
    const labelFor: Record<HeaderKey, string> = {
      name: "Adı Soyadı",
      email: "E-Posta",
      username: "Kullanıcı Adı",
      organization: "Kurum / Kuruluş",
      title: "Akademik Ünvan",
      position: "Görevi",
      city: "İl",
      phone: "Cep Tel",
      groupCode: "Çalışma Grubu",
      role: "Rolü",
      password: "Şifre",
      no: "No",
    };
    return {
      ok: false,
      message: `Başlık satırında eksik sütun(lar): ${missing.map((k) => labelFor[k]).join(", ")}. Şablonu kullanın.`,
    };
  }

  // Lookup existing emails + groups upfront
  const allGroups = await prisma.group.findMany({ select: { id: true, code: true } });
  const groupByCode = new Map(allGroups.map((g) => [g.code.toUpperCase(), g]));

  const errors: BulkUserImportError[] = [];
  type RowDraft = {
    rowNum: number;
    name: string;
    email: string;
    organization?: string;
    title?: string;
    position?: string;
    city?: string;
    phone?: string;
    groupId?: string | null;
    extraRole?: Role;
    /** Admin tarafından CSV'de sağlanmış şifre; yoksa otomatik üretilir. */
    suppliedPassword?: string;
    /** Admin tarafından CSV'de sağlanmış kullanıcı adı; yoksa otomatik üretilir. */
    suppliedUsername?: string;
  };
  const drafts: RowDraft[] = [];
  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    const get = (k: HeaderKey) => {
      const idx = colIndex[k];
      if (idx === undefined) return "";
      return (row[idx] ?? "").trim();
    };

    const name = get("name");
    const email = get("email").toLowerCase();
    // Tamamen boş satırları atla.
    if (!name && !email) continue;

    const rowNum = r + 1; // 1-based + header

    if (drafts.length >= MAX_BULK_IMPORT_ROWS) {
      return {
        ok: false,
        message: `En fazla ${MAX_BULK_IMPORT_ROWS} satır içe aktarılabilir.`,
      };
    }

    if (!name || name.length < 2 || name.length > 100) {
      errors.push({ row: rowNum, column: "Adı Soyadı", message: "Geçersiz ad soyad." });
    }
    if (!email || !emailValid(email)) {
      errors.push({ row: rowNum, column: "E-Posta", message: "Geçersiz e-posta." });
      continue; // email yoksa devam etme
    }
    if (seenEmails.has(email)) {
      errors.push({ row: rowNum, column: "E-Posta", message: "Dosya içinde yinelenen e-posta." });
      continue;
    }
    seenEmails.add(email);

    let groupId: string | null = null;
    const groupRaw = get("groupCode");
    if (groupRaw) {
      const g = groupByCode.get(groupRaw.toUpperCase());
      if (!g) {
        errors.push({
          row: rowNum,
          column: "Çalışma Grubu",
          message: `Grup bulunamadı: "${groupRaw}". Önce yönetim panelinden grup oluşturun.`,
        });
        continue;
      }
      groupId = g.id;
    }

    let extraRole: Role | undefined;
    const roleRaw = get("role");
    if (roleRaw) {
      const code = ROLE_LABEL_TO_ENUM[tr(roleRaw)];
      if (!code) {
        errors.push({
          row: rowNum,
          column: "Rolü",
          message: `Bilinmeyen rol: "${roleRaw}". İzinli: Üye / Raportör / Moderatör / Yönetici.`,
        });
        continue;
      }
      // "Üye" zaten varsayılan; ekstra rol sadece USER dışı için.
      if (code !== "USER") extraRole = code;
    }

    // İsteğe bağlı Kullanıcı Adı sütunu — doluysa direkt kullanılır
    // (lower-case + trim + regex doğrulaması), boşsa adres adından
    // ad.soyad biçiminde otomatik üretilir.
    let suppliedUsername: string | undefined;
    const usernameRaw = get("username");
    if (usernameRaw) {
      const u = usernameRaw.toLowerCase();
      if (!USERNAME_RE.test(u)) {
        errors.push({
          row: rowNum,
          column: "Kullanıcı Adı",
          message:
            "Geçersiz kullanıcı adı. Yalnızca a-z, 0-9 ve nokta; baş/son nokta olamaz.",
        });
        continue;
      }
      if (seenUsernames.has(u)) {
        errors.push({
          row: rowNum,
          column: "Kullanıcı Adı",
          message: "Dosya içinde yinelenen kullanıcı adı.",
        });
        continue;
      }
      seenUsernames.add(u);
      suppliedUsername = u;
    }

    // İsteğe bağlı Şifre sütunu — boş bırakılırsa otomatik üretilir.
    // Sağlanmışsa min 8 karakter zorunludur (yalnız sayı / yalnız tek karakter
    // gibi açık zayıflıkları engeller). Sınıf zorunluluğu yok — admin CSV'sini
    // kendi belirlediği için politikaya bilinçli ekstra şart koymuyoruz.
    let suppliedPassword: string | undefined;
    const pwRaw = get("password");
    if (pwRaw) {
      if (pwRaw.length < 8) {
        errors.push({
          row: rowNum,
          column: "Şifre",
          message: "Şifre en az 8 karakter olmalı.",
        });
        continue;
      }
      if (pwRaw.length > 128) {
        errors.push({
          row: rowNum,
          column: "Şifre",
          message: "Şifre çok uzun (en fazla 128 karakter).",
        });
        continue;
      }
      suppliedPassword = pwRaw;
    }

    drafts.push({
      rowNum,
      name,
      email,
      organization: get("organization") || undefined,
      title: get("title") || undefined,
      position: get("position") || undefined,
      city: get("city") || undefined,
      phone: get("phone") || undefined,
      groupId,
      extraRole,
      suppliedPassword,
      suppliedUsername,
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      message: `${errors.length} hata bulundu. Hiçbir kayıt oluşturulmadı.`,
      errors: errors.slice(0, 200),
    };
  }
  if (drafts.length === 0) {
    return { ok: false, message: "Dosyada geçerli veri satırı bulunamadı." };
  }

  // E-posta benzersizliği DB'de
  const existingByEmail = await prisma.user.findMany({
    where: { email: { in: drafts.map((d) => d.email) } },
    select: { email: true },
  });
  if (existingByEmail.length > 0) {
    const set = new Set(existingByEmail.map((e) => e.email));
    for (const d of drafts) {
      if (set.has(d.email)) {
        errors.push({
          row: d.rowNum,
          column: "E-Posta",
          message: "Bu e-posta ile zaten bir hesap mevcut.",
        });
      }
    }
    return {
      ok: false,
      message: `${errors.length} kayıt zaten mevcut. Hiçbir kayıt oluşturulmadı.`,
      errors: errors.slice(0, 200),
    };
  }

  // CSV'den gelen kullanıcı adlarının DB benzersizliği
  const suppliedUsernames = drafts
    .map((d) => d.suppliedUsername)
    .filter((u): u is string => !!u);
  if (suppliedUsernames.length > 0) {
    const existingByUsername = await prisma.user.findMany({
      where: { username: { in: suppliedUsernames } },
      select: { username: true },
    });
    if (existingByUsername.length > 0) {
      const set = new Set(existingByUsername.map((e) => e.username!));
      for (const d of drafts) {
        if (d.suppliedUsername && set.has(d.suppliedUsername)) {
          errors.push({
            row: d.rowNum,
            column: "Kullanıcı Adı",
            message: "Bu kullanıcı adı zaten kayıtlı.",
          });
        }
      }
      return {
        ok: false,
        message: `${errors.length} kayıt zaten mevcut. Hiçbir kayıt oluşturulmadı.`,
        errors: errors.slice(0, 200),
      };
    }
  }

  // Şifreleri belirle: CSV'de verilmişse onu kullan, yoksa üret.
  // hashleme paralel.
  const passwords = drafts.map((d) => d.suppliedPassword ?? generatePassword());
  const hashes = await Promise.all(passwords.map((p) => hashPassword(p)));

  // Kullanıcı adı belirleme stratejisi:
  //  - Admin CSV'de yazmışsa → o değer
  //  - Yazılmamışsa → adres adından ad.soyad biçiminde üret
  // Aynı dosya içindeki çakışmaları `reserved` ile engelle.
  const reservedUsernames = new Set<string>(suppliedUsernames);
  const usernames: Array<string | null> = [];
  for (const d of drafts) {
    if (d.suppliedUsername) {
      usernames.push(d.suppliedUsername);
      continue;
    }
    usernames.push(await generateUniqueUsername(d.name, { reserved: reservedUsernames }));
  }

  const now = new Date();
  // Tek transaction; hata olursa hiçbiri yazılmaz.
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]!;
      const passwordHash = hashes[i]!;
      const roles: Role[] = d.extraRole ? ["USER", d.extraRole] : ["USER"];
      await tx.user.create({
        data: {
          email: d.email,
          username: usernames[i] ?? null,
          name: d.name,
          passwordHash,
          status: "ACTIVE",
          emailVerified: now,
          approvedById: admin.id,
          approvedAt: now,
          groupId: d.groupId ?? null,
          profile: {
            create: {
              organization: d.organization ?? null,
              title: d.title ?? null,
              position: d.position ?? null,
              city: d.city ?? null,
              phone: d.phone ?? null,
            },
          },
          roles: {
            createMany: {
              data: roles.map((role) => ({ role, grantedById: admin.id })),
            },
          },
        },
      });
    }
  });

  await audit({
    action: "USER_APPROVED",
    actorId: admin.id,
    targetType: "User",
    metadata: { bulk: true, count: drafts.length },
  });

  revalidatePath("/yonetim/kullanicilar");
  revalidatePath("/yonetim");

  const credentials: BulkUserCredential[] = drafts.map((d, i) => ({
    email: d.email,
    username: usernames[i] ?? null,
    name: d.name,
    password: passwords[i]!,
  }));

  return {
    ok: true,
    message: `${drafts.length} üye başarıyla eklendi.`,
    created: drafts.length,
    credentials,
  };
}
