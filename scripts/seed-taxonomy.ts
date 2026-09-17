import { db } from "@/lib/db";
import { seedTaxonomy } from "../prisma/taxonomy-seed";

async function main() {
  const { created, updated } = await seedTaxonomy(db);
  const byKind = await db.taxonomyTerm.groupBy({ by: ["kind"], _count: { _all: true } });

  console.log(`Taxonomy seeded: ${created} created, ${updated} updated.`);
  for (const row of byKind) console.log(`  ${row.kind.padEnd(11)} ${row._count._all}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
