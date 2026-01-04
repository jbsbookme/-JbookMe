import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupOldPosts() {
  const THIRTY_DAYS_AGO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.post.deleteMany({
    where: {
      isActive: false,
      updatedAt: { lt: THIRTY_DAYS_AGO },
    },
  });
  console.log(`Deleted ${deleted.count} posts older than 30 days.`);
}

cleanupOldPosts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
