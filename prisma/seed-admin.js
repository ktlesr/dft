/**
 * One-shot admin bootstrapping script.
 *
 * Runs inside the production runner image in plain CommonJS — no tsx or
 * TypeScript transpilation needed. Designed to be invoked once from the
 * Dokploy container terminal (or `docker compose exec`) right after the
 * first successful deploy.
 *
 * Usage (set the env vars inline, then exec):
 *
 *   docker compose exec \
 *     -e NEW_ADMIN_EMAIL=admin@dft.ktlsr.com \
 *     -e NEW_ADMIN_PASSWORD='StrongP@ssw0rd!2026' \
 *     -e NEW_ADMIN_NAME='DFT Admin' \
 *     -e NEW_ADMIN_GROUP=UAK \
 *     app node /app/prisma/seed-admin.js
 *
 * Idempotent — safe to re-run:
 *   • ensures all 5 fixed working groups (UAK, E2SC, DFSF, PGD, PA) exist,
 *   • upserts the user row (email is the unique key),
 *   • **re-hashes the password on every run** → effectively a
 *     password-reset when you run it a second time,
 *   • adds ADMIN + USER role assignments if not already present.
 *
 * Modules pulled from `require` below (`@prisma/client`, `@node-rs/argon2`)
 * are shipped by Next.js standalone tracing into /app/node_modules, so no
 * extra install is required in the runner image.
 */

const { PrismaClient } = require("@prisma/client");
const { hash } = require("@node-rs/argon2");

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

const GROUPS = [
  { code: "UAK", name: "UAK", description: "Uluslararası ve Akademik Koordinasyon" },
  { code: "E2SC", name: "E2SC", description: "Education, Employment, Social & Community" },
  { code: "DFSF", name: "DFSF", description: "Digital, Finance, Services & Foresight" },
  { code: "PGD", name: "PGD", description: "Proje Geliştirme ve Değerlendirme" },
  { code: "PA", name: "PA", description: "Politika ve Araştırma" },
];

async function main() {
  const email = (process.env.NEW_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.NEW_ADMIN_PASSWORD || "";
  const name = process.env.NEW_ADMIN_NAME || "DFT Admin";
  const groupCode = (process.env.NEW_ADMIN_GROUP || "UAK").toUpperCase();

  if (!email || !password) {
    console.error("✗ NEW_ADMIN_EMAIL and NEW_ADMIN_PASSWORD are required.");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("✗ Password must be at least 10 characters.");
    process.exit(1);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    console.error(
      "✗ Password must contain lowercase, uppercase, a digit and a special character.",
    );
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("• Ensuring 5 working groups…");
    const groups = await Promise.all(
      GROUPS.map((g) =>
        prisma.group.upsert({
          where: { code: g.code },
          update: { name: g.name, description: g.description },
          create: g,
        }),
      ),
    );
    const target = groups.find((g) => g.code === groupCode) || groups[0];
    console.log(`  → admin group: ${target.code}`);

    const passwordHash = await hash(password, ARGON2);

    // Faz 9: username atama — eksikse `ad.soyad` üret.
    const slugify = (raw) => {
      const map = { ş: "s", Ş: "s", ı: "i", I: "i", İ: "i", ç: "c", Ç: "c", ğ: "g", Ğ: "g", ö: "o", Ö: "o", ü: "u", Ü: "u" };
      const ascii = String(raw)
        .split("")
        .map((c) => map[c] ?? c)
        .join("")
        .normalize("NFKD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      const cleaned = ascii.replace(/[^a-z0-9\s]+/g, " ").trim();
      if (!cleaned) return "";
      const words = cleaned.split(/\s+/).filter(Boolean);
      if (words.length === 0) return "";
      if (words.length === 1) return words[0].slice(0, 50);
      return `${words[0]}.${words[words.length - 1]}`.slice(0, 50);
    };
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { username: true },
    });
    let usernameToSet = existing?.username ?? null;
    if (!usernameToSet) {
      const base = slugify(name);
      let candidate = base;
      let n = 1;
      while (base && n < 50) {
        const clash = await prisma.user.findUnique({
          where: { username: candidate },
          select: { id: true },
        });
        if (!clash) {
          usernameToSet = candidate;
          break;
        }
        n += 1;
        candidate = `${base}.${n}`;
      }
    }

    console.log(`• Upserting admin ${email}…`);
    const admin = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
        groupId: target.id,
        failedLoginCount: 0,
        lockedUntil: null,
        ...(existing?.username ? {} : { username: usernameToSet }),
      },
      create: {
        email,
        username: usernameToSet,
        name,
        passwordHash,
        status: "ACTIVE",
        emailVerified: new Date(),
        groupId: target.id,
        profile: { create: {} },
      },
    });

    // Ensure ADMIN + USER role assignments exist (idempotent).
    for (const role of ["ADMIN", "USER"]) {
      await prisma.roleAssignment.upsert({
        where: { userId_role: { userId: admin.id, role } },
        update: {},
        create: { userId: admin.id, role },
      });
    }

    console.log("");
    console.log("✓ Admin ready:");
    console.log(`    email:    ${admin.email}`);
    console.log(`    username: ${admin.username ?? "(yok)"}`);
    console.log(`    id:       ${admin.id}`);
    console.log(`    group:    ${target.code}`);
    console.log(`    roles:    ADMIN, USER`);
    console.log("");
    console.log("  Open https://<your-domain>/giris and sign in.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
