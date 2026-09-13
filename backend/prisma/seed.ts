import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured.');
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({ adapter });

const permissions = [
  ['item.view', 'View items'],
  ['item.create', 'Create items'],
  ['item.update', 'Update items'],
  ['item.archive', 'Archive items'],

  ['category.view', 'View categories'],
  ['category.create', 'Create categories'],
  ['category.update', 'Update categories'],
  ['category.delete', 'Delete categories'],

  ['supplier.view', 'View suppliers'],
  ['supplier.create', 'Create suppliers'],
  ['supplier.update', 'Update suppliers'],
  ['supplier.delete', 'Delete suppliers'],

  ['location.view', 'View locations'],
  ['location.create', 'Create locations'],
  ['location.update', 'Update locations'],
  ['location.delete', 'Delete locations'],

  ['stock.receive', 'Receive stock'],
  ['stock.issue', 'Issue stock'],
  ['stock.adjust', 'Adjust stock'],
  ['stock.transfer', 'Transfer stock'],
  ['stock.view_history', 'View stock history'],

  ['report.view', 'View reports'],
  ['report.export', 'Export reports'],

  ['user.view', 'View organization members'],
  ['user.invite', 'Invite organization members'],
  ['user.update_role', 'Change member roles'],
  ['user.disable', 'Disable organization members'],

  ['organization.update', 'Update organization settings'],
] as const;

const rolePermissions: Record<string, string[]> = {
  Owner: permissions.map(([code]) => code),

  Admin: permissions
    .filter(([code]) => code !== 'organization.update')
    .map(([code]) => code),

  Manager: [
    'item.view',
    'item.create',
    'item.update',
    'category.view',
    'category.create',
    'category.update',
    'supplier.view',
    'supplier.create',
    'supplier.update',
    'location.view',
    'location.create',
    'location.update',
    'stock.receive',
    'stock.issue',
    'stock.adjust',
    'stock.transfer',
    'stock.view_history',
    'report.view',
    'report.export',
  ],

  Staff: [
    'item.view',
    'category.view',
    'supplier.view',
    'location.view',
    'stock.receive',
    'stock.issue',
    'stock.transfer',
    'stock.view_history',
  ],

  Viewer: [
    'item.view',
    'category.view',
    'supplier.view',
    'location.view',
    'stock.view_history',
    'report.view',
  ],
};

async function main() {
  console.log('Seeding permissions...');

  for (const [code, description] of permissions) {
    await prisma.permission.upsert({
      where: { code },
      update: { description },
      create: {
        code,
        description,
      },
    });
  }

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`Found ${organizations.length} organization(s).`);

  for (const organization of organizations) {
    console.log(`Configuring roles for: ${organization.name}`);

    for (const [roleName, permissionCodes] of Object.entries(rolePermissions)) {
      const role = await prisma.role.upsert({
        where: {
          orgId_name: {
            orgId: organization.id,
            name: roleName,
          },
        },
        update: {},
        create: {
          orgId: organization.id,
          name: roleName,
          roleType: 'system',
        },
      });

      for (const permissionCode of permissionCodes) {
        const permission = await prisma.permission.findUnique({
          where: { code: permissionCode },
        });

        if (!permission) {
          throw new Error(
            `Permission ${permissionCode} was not found.`,
          );
        }

        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });
      }
    }
  }

  console.log('Permissions and roles seeded successfully.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
