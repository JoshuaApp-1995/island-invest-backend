import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
import process from 'process';

async function main() {
  const hashedPassword = await bcrypt.hash('Admin123!', 12);
  
  // Seed Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });

  // Seed Homepage
  const home = await prisma.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      title: 'Home',
      slug: 'home',
    },
  });

  // Ensure the Home page has sections regardless of if it was just created or already existed
  const sectionCount = await prisma.section.count({ where: { pageId: home.id } });
  
  if (sectionCount === 0) {
    await prisma.section.createMany({
      data: [
        { 
          type: 'hero', 
          order: 0, 
          content: { title: 'Discover the Caribbean', subtitle: 'Invest in paradise' },
          pageId: home.id 
        },
        { 
          type: 'features', 
          order: 1, 
          content: { items: ['Secure', 'Expert Advice', 'Prime Locations'] },
          pageId: home.id
        }
      ]
    });
    console.log('✅ Default sections added to Homepage');
  }

  console.log('✅ Database seeding completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });