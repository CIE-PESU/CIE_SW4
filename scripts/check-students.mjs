import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  const users = await p.user.findMany({ where: { role: 'STUDENT' }, select: { email: true, name: true } });
  console.log('Student count:', users.length);
  console.log(JSON.stringify(users, null, 2));
} catch(e) {
  console.error('DB error:', e.message);
} finally {
  await p.$disconnect();
}
