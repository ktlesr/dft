import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill migration for Project Application KPIs...");

  // 1. Delete legacy KPI_PROJECT_APPLICATION_TOTAL events if any exist
  const deleted = await prisma.kpiMetricEvent.deleteMany({
    where: {
      metricCode: "KPI_PROJECT_APPLICATION_TOTAL" as any,
    },
  });
  console.log(`Deleted ${deleted.count} legacy KPI_PROJECT_APPLICATION_TOTAL events.`);

  // 2. Fetch all active ProjectApplicationRecords
  const apps = await prisma.projectApplicationRecord.findMany({
    where: { deletedAt: null },
    include: {
      owner: { select: { groupId: true } },
    },
  });
  console.log(`Found ${apps.length} active Project Application records to migrate.`);

  // 3. Insert new events based on memberFunction
  let inserted = 0;
  for (const app of apps) {
    const groupId = app.owner?.groupId;
    if (!groupId) {
      console.warn(`Record ${app.id} (${app.projectName}) has owner with no group. Skipping KPI creation.`);
      continue;
    }

    const metricCode = app.memberFunction === "DANISMANLIK"
      ? "KPI_PROJECT_APPLICATION_GUIDANCE_TOTAL"
      : "KPI_PROJECT_APPLICATION_DIRECT_TOTAL";

    try {
      // Clean duplicate events for this specific source record to prevent duplicates
      await prisma.kpiMetricEvent.deleteMany({
        where: {
          sourceType: "PROJECT_APPLICATION",
          sourceId: app.id,
        },
      });

      await prisma.kpiMetricEvent.create({
        data: {
          metricCode: metricCode as any,
          groupId,
          actorUserId: app.ownerId,
          sourceType: "PROJECT_APPLICATION",
          sourceId: app.id,
          delta: 1,
          occurredAt: app.createdAt,
        },
      });
      inserted++;
    } catch (e: any) {
      console.error(`Failed to create KPI event for record ${app.id}: ${e.message}`);
    }
  }

  console.log(`Backfill finished. Created ${inserted} new KPI events.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
