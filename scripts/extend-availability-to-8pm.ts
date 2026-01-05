import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();

const prisma = new PrismaClient();

const TARGET_END_TIME = '20:00';

async function main() {
  const shouldApply = process.argv.includes('--apply');

  console.log('🕗 Extend availability to 8:00 PM');
  console.log(`Target endTime: ${TARGET_END_TIME}`);
  console.log(`Mode: ${shouldApply ? 'APPLY' : 'DRY-RUN'} (use --apply to write changes)`);

  const candidates = await prisma.availability.findMany({
    where: {
      isAvailable: true,
      endTime: { lt: TARGET_END_TIME },
    },
    select: {
      id: true,
      barberId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
    orderBy: [{ barberId: 'asc' }, { dayOfWeek: 'asc' }],
  });

  console.log(`Found ${candidates.length} schedules ending before ${TARGET_END_TIME}.`);

  if (!shouldApply) {
    const sample = candidates.slice(0, 15);
    if (sample.length) {
      console.log('\nSample (first 15):');
      for (const row of sample) {
        console.log(`- ${row.barberId} ${row.dayOfWeek}: ${row.startTime} - ${row.endTime}`);
      }
    }

    console.log('\nNo changes applied. Re-run with --apply to update records.');
    return;
  }

  const result = await prisma.availability.updateMany({
    where: {
      isAvailable: true,
      endTime: { lt: TARGET_END_TIME },
    },
    data: {
      endTime: TARGET_END_TIME,
    },
  });

  console.log(`\n✅ Updated ${result.count} schedules to end at ${TARGET_END_TIME}.`);
}

main()
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
