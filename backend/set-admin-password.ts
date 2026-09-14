import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const email = 'admin@example.com';
  const newPassword = 'InventoryDBMS@2026';

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await prisma.user.update({
    where: {
      email,
    },
    data: {
      passwordHash,
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`Password updated for ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });