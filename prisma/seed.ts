/**
 * DFT Portal seed — demo data sufficient to drive Phase 3 UI.
 *
 * Creates (idempotently):
 *   - 5 fixed working groups (UAK, E2SC, DFSF, PGD, PA)
 *   - 1 admin (ACTIVE) in UAK
 *   - Each group: 1 moderator + 1 rapporteur + 2 members (all ACTIVE)
 *   - Sample board posts (general + group), events, dissemination,
 *     project application, successful project, documents.
 *
 * Re-running the seed is safe; it uses upserts and skips duplicate
 * content where possible.
 */
import { hash } from "@node-rs/argon2";
import { PrismaClient, Role, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const GROUPS: { code: string; name: string; description: string }[] = [
  { code: "UAK", name: "UAK", description: "Uluslararası ve Akademik Koordinasyon" },
  { code: "E2SC", name: "E2SC", description: "Education, Employment, Social & Community" },
  { code: "DFSF", name: "DFSF", description: "Digital, Finance, Services & Foresight" },
  { code: "PGD", name: "PGD", description: "Proje Geliştirme ve Değerlendirme" },
  { code: "PA", name: "PA", description: "Politika ve Araştırma" },
];

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

// Faz 9: seed kullanıcılarına da `ad.soyad` biçiminde username atanır;
// re-run sırasında eksik olanlar doldurulur (login akışı artık username
// tabanlı olduğu için backfill kritik).
function slugifyName(rawName: string): string {
  const translit: Record<string, string> = {
    ş: "s", Ş: "s", ı: "i", I: "i", İ: "i",
    ç: "c", Ç: "c", ğ: "g", Ğ: "g",
    ö: "o", Ö: "o", ü: "u", Ü: "u",
  };
  const ascii = rawName
    .split("")
    .map((c) => translit[c] ?? c)
    .join("")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const cleaned = ascii.replace(/[^a-z0-9\s]+/g, " ").trim();
  if (!cleaned) return "";
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0]!.slice(0, 50);
  return `${words[0]}.${words[words.length - 1]}`.slice(0, 50);
}

async function uniqueUsername(name: string): Promise<string | null> {
  const base = slugifyName(name);
  if (!base) return null;
  let candidate = base;
  let n = 1;
  while (n < 50) {
    const existing = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}.${n}`;
  }
  return null;
}

async function ensureUser(args: {
  email: string;
  name: string;
  password: string;
  groupId: string;
  roles: Role[];
  organization?: string;
}) {
  const passwordHash = await hash(args.password, ARGON2);
  // Kullanıcı zaten varsa ve username eksikse, eksiği bu çağrı dolduracak.
  const existing = await prisma.user.findUnique({
    where: { email: args.email },
    select: { id: true, username: true },
  });
  const usernameToSet =
    existing?.username ?? (await uniqueUsername(args.name));

  const user = await prisma.user.upsert({
    where: { email: args.email },
    update: {
      name: args.name,
      status: "ACTIVE",
      emailVerified: new Date(),
      groupId: args.groupId,
      // Yalnızca eksikse yaz — varsa dokunma (admin'in elle değiştirme ihtimalini koru).
      ...(existing?.username ? {} : { username: usernameToSet }),
    },
    create: {
      email: args.email,
      username: usernameToSet,
      name: args.name,
      passwordHash,
      status: "ACTIVE",
      emailVerified: new Date(),
      groupId: args.groupId,
      profile: { create: { organization: args.organization ?? null } },
    },
  });

  await Promise.all(
    args.roles.map((role) =>
      prisma.roleAssignment.upsert({
        where: { userId_role: { userId: user.id, role } },
        update: {},
        create: { userId: user.id, role },
      }),
    ),
  );

  return user;
}

async function main() {
  console.log("• Groups…");
  const groups = await Promise.all(
    GROUPS.map((g) =>
      prisma.group.upsert({
        where: { code: g.code },
        update: { name: g.name, description: g.description },
        create: g,
      }),
    ),
  );
  const byCode = new Map(groups.map((g) => [g.code, g]));
  const gid = (c: string) => {
    const g = byCode.get(c);
    if (!g) throw new Error(`missing group ${c}`);
    return g.id;
  };

  console.log("• Admin…");
  const admin = await ensureUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@dft.local",
    name: process.env.SEED_ADMIN_NAME ?? "DFT Admin",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin!2026Dev",
    groupId: gid("UAK"),
    roles: ["ADMIN", "USER"],
    organization: "DFT",
  });

  console.log("• Group moderators & rapporteurs & members…");
  type Created = { code: string; moderator: string; rapporteur: string; members: string[] };
  const pwd = "Uye!2026Dev";
  const created: Created[] = [];
  for (const g of GROUPS) {
    const lc = g.code.toLowerCase();
    const mod = await ensureUser({
      email: `${lc}.moderator@dft.local`,
      name: `${g.code} Moderatör`,
      password: pwd,
      groupId: gid(g.code),
      roles: ["MODERATOR", "USER"],
      organization: "DFT",
    });
    const rap = await ensureUser({
      email: `${lc}.raportor@dft.local`,
      name: `${g.code} Raportör`,
      password: pwd,
      groupId: gid(g.code),
      roles: ["RAPPORTEUR", "USER"],
      organization: "DFT",
    });
    const uye1 = await ensureUser({
      email: `${lc}.uye1@dft.local`,
      name: `${g.code} Üye 1`,
      password: pwd,
      groupId: gid(g.code),
      roles: ["USER"],
      organization: "DFT",
    });
    const uye2 = await ensureUser({
      email: `${lc}.uye2@dft.local`,
      name: `${g.code} Üye 2`,
      password: pwd,
      groupId: gid(g.code),
      roles: ["USER"],
      organization: "DFT",
    });
    created.push({ code: g.code, moderator: mod.id, rapporteur: rap.id, members: [uye1.id, uye2.id] });
  }

  // Skip if we already have demo board posts — the seed is idempotent.
  const existingPosts = await prisma.boardPost.count();
  if (existingPosts === 0) {
    console.log("• Board posts…");
    await prisma.boardPost.createMany({
      data: [
        {
          scope: "GENERAL",
          kind: "ANNOUNCEMENT",
          title: "DFT Kapalı Portalı yayına alındı",
          body: "DFT Portal'ın ilk sürümü kullanıma hazır. Kayıtlarınızı, toplantılarınızı ve belgelerinizi artık tek merkezde yönetebilirsiniz.",
          tags: ["portal", "duyuru"],
          pinned: true,
          authorId: admin.id,
        },
        {
          scope: "GENERAL",
          kind: "RESOURCE",
          title: "Yeni çağrı: Ufuk Avrupa 2026",
          body: "Ufuk Avrupa 2026 çağrıları yayımlandı. Portal üzerinde 'Proje Fikri' kaydı oluşturarak ön çalışmanızı başlatabilirsiniz.",
          tags: ["horizon", "cagri"],
          externalUrl: "https://ec.europa.eu/horizon",
          authorId: admin.id,
        },
      ],
    });

    for (const c of created) {
      await prisma.boardPost.create({
        data: {
          scope: "GROUP",
          groupId: gid(c.code),
          kind: "NEWS",
          title: `${c.code} grubu: ilk toplantı planlama`,
          body: `${c.code} çalışma grubu ilk koordinasyon toplantısı için takvim çalışıyor. Önerilerinizi grup panosuna bırakabilirsiniz.`,
          tags: ["ilk-toplanti"],
          authorId: c.moderator,
          pinned: true,
        },
      });
    }
  }

  // A handful of personal records for the admin so the dashboard is non-empty.
  const existingRecords = await prisma.projectApplicationRecord.count({ where: { ownerId: admin.id } });
  if (existingRecords === 0) {
    console.log("• Personal records for admin…");
    await prisma.projectApplicationRecord.create({
      data: {
        ownerId: admin.id,
        projectName: "Veri Yönetişimi Pilotu",
        program: "TÜBİTAK 1001",
        callName: "1001 — 2026/1",
        applicationDate: new Date("2026-03-15"),
        budget: new Prisma.Decimal("750000"),
        requestedSupport: new Prisma.Decimal("500000"),
        status: "BASVURULDU",
        kind: "DFT_ILE_BIRLIKTE",
        notes: "Ortak başvuru DFT üyeleriyle birlikte.",
      },
    });
    await prisma.successfulProjectRecord.create({
      data: {
        ownerId: admin.id,
        projectName: "Dijital Dönüşüm Yol Haritası",
        program: "Kalkınma Ajansı",
        callName: "2025-DKH",
        applicationDate: new Date("2025-09-10"),
        resultDate: new Date("2025-12-05"),
        totalBudget: new Prisma.Decimal("300000"),
        supportAmount: new Prisma.Decimal("225000"),
        role: "Yürütücü",
        summary: "Kamu kurumlarının dijital dönüşüm yol haritası çalışması.",
      },
    });
    await prisma.eventRecord.create({
      data: {
        ownerId: admin.id,
        name: "Veri Yönetişimi Çalıştayı",
        kind: "Çalıştay",
        date: new Date("2026-02-20"),
        location: "Ankara",
        role: "Konuşmacı",
        topic: "Açık veri ekosistemi",
        summary: "Bakanlık paydaşları ile yarım günlük çalıştay.",
      },
    });
    await prisma.disseminationRecord.create({
      data: {
        ownerId: admin.id,
        title: "Akademide Veri Okuryazarlığı",
        date: new Date("2026-01-30"),
        location: "Orta Doğu Teknik Üniversitesi",
        kind: "Seminer",
        audience: "Lisansüstü öğrenciler",
        participantCount: 85,
        relatedTopic: "Veri yönetişimi",
        summary: "Tez süreçlerinde veri etiği ve yönetişimi sunumu.",
      },
    });
  }

  // One upcoming meeting + one past meeting with a minute per group.
  const existingMeetings = await prisma.meeting.count();
  if (existingMeetings === 0) {
    console.log("• Meetings & minutes…");
    for (const c of created) {
      const upcoming = await prisma.meeting.create({
        data: {
          groupId: gid(c.code),
          title: `${c.code} aylık koordinasyon`,
          startAt: new Date(Date.now() + 7 * 86_400_000),
          location: "Ankara / DFT Ofis",
          onlineUrl: "https://meet.example.com/dft-" + c.code.toLowerCase(),
          description: "Genel durum değerlendirmesi ve önümüzdeki ay planı.",
          agenda: "1) Açılış\n2) Önceki ay özet\n3) Yeni çağrılar\n4) Proje fikirleri\n5) Kapanış",
          pinToBoard: true,
          createdById: c.moderator,
        },
      });

      const past = await prisma.meeting.create({
        data: {
          groupId: gid(c.code),
          title: `${c.code} kuruluş toplantısı`,
          startAt: new Date(Date.now() - 20 * 86_400_000),
          location: "Online",
          description: "Grup çalışma modeli üzerine mutabakat.",
          createdById: c.moderator,
        },
      });

      await prisma.meetingMinute.create({
        data: {
          meetingId: past.id,
          date: past.startAt,
          attendees: `${c.code} Moderatör\n${c.code} Raportör\n${c.code} Üye 1\n${c.code} Üye 2`,
          topics:
            "• Grubun kapsamı ve önceliklendirme\n• Çağrı takvimi\n• İletişim kanalı tercihi",
          decisions:
            "• Aylık toplantı ritmi kuruldu\n• Pazartesi 14:00 öntanım slotu\n• Yol haritası raporunun taslağı Raportör tarafından hazırlanacak",
          summary: "Grup çalışma modeli uzlaşıyla belirlendi.",
          authorId: c.rapporteur,
        },
      });

      void upcoming;
    }
  }

  // One Yol Haritası draft report per group.
  const existingReports = await prisma.groupReport.count();
  if (existingReports === 0) {
    console.log("• Roadmap reports…");
    for (const c of created) {
      await prisma.groupReport.create({
        data: {
          groupId: gid(c.code),
          kind: "YOL_HARITASI",
          title: `${c.code} Yol Haritası — Haziran-Ağustos 2026`,
          periodStart: new Date("2026-06-01"),
          periodEnd: new Date("2026-08-31"),
          summary: `${c.code} grubu 2026 yaz dönemi yol haritası taslağı.`,
          body:
            "1. Hedefler\n" +
            "  • Grup çalışma alanının tanımlanması\n" +
            "  • Kilit paydaş haritalaması\n" +
            "\n2. Takvim\n" +
            "  • Haziran: başlangıç çalıştayı\n" +
            "  • Temmuz: pilot çalışmaların başlatılması\n" +
            "  • Ağustos: ara değerlendirme ve rapor hazırlığı\n" +
            "\n3. Kaynaklar\n" +
            "  • İhtiyaç duyulan uzman desteği\n" +
            "  • Bilgi kaynakları ve literatür",
          outputs: "Grup odaklı ilk çıktılar ve önümüzdeki dönem önerileri.",
          authorId: c.rapporteur,
        },
      });
    }
  }

  // A couple of ortak / group documents so the Documents screen isn't empty.
  const existingDocs = await prisma.document.count();
  if (existingDocs === 0) {
    console.log("• Documents…");
    await prisma.document.create({
      data: {
        category: "ORTAK",
        title: "DFT Üye El Kitabı v1",
        description: "Üyelerin portalı ve süreçleri anlaması için hazırlanmış kılavuz.",
        tags: ["kilavuz", "el-kitabi"],
        uploadedById: admin.id,
      },
    });
    for (const c of created) {
      await prisma.document.create({
        data: {
          category: "GRUP",
          groupId: gid(c.code),
          title: `${c.code} Grubu Çalışma Şablonları`,
          description: `${c.code} grubu için toplantı gündemi, tutanak ve rapor şablonları.`,
          tags: ["sablon"],
          uploadedById: c.moderator,
        },
      });
    }
  }

  console.log("✓ Seed complete.");
  console.log("  Admin:", admin.email);
  console.log("  Her grupta: moderator, raportor, uye1, uye2 — şifre 'Uye!2026Dev'");
  console.log("  Grup örnekleri: uak.moderator@dft.local, e2sc.raportor@dft.local …");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
