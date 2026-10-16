import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PERMISSIONS, SYSTEM_ROLE_NAMES } from '@lms/shared-types';
import { SYSTEM_ROLE_DEFAULT_GRANTS } from '@lms/shared-constants';
import { prisma } from '../src/lib/prisma.js';

const WEEK_TITLES = ['Fundamentals of Python', 'Control flow and functions', 'Data structures', 'Object-oriented concepts', 'Files, errors and modules', 'Mini project'];

async function user(name: string, email: string, password: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash: await bcrypt.hash(password, 12), roleId: role.id },
  });
}

async function main() {
  // 1. permissions and the three system roles
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key: p.key }, update: { resource: p.resource, description: p.description }, create: { key: p.key, resource: p.resource, description: p.description } });
  }
  const allPermissions = await prisma.permission.findMany();
  for (const name of SYSTEM_ROLE_NAMES) {
    const role = await prisma.role.upsert({ where: { name }, update: {}, create: { name, isSystem: true } });
    const grants = SYSTEM_ROLE_DEFAULT_GRANTS[name];
    const wanted = grants === 'ALL' ? allPermissions : allPermissions.filter((p) => grants.some((k) => k === p.key));
    for (const perm of wanted) {
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } }, update: {}, create: { roleId: role.id, permissionId: perm.id } });
    }
  }

  // 2. demo accounts
  await user('Site Admin', 'admin@lms.local', 'Admin@12345', 'Admin');
  const meera = await user('Meera Rao', 'meera@lms.local', 'Demo@12345', 'Instructor');
  await user('Arun Kumar', 'arun@lms.local', 'Demo@12345', 'Student');

  // 3. certificate template
  await prisma.certificateTemplate.upsert({ where: { id: 1 }, update: {}, create: { id: 1, institute: 'Your Academy Name', signatory: 'Meera Rao, Director' } });

  // 4. one published demo course: 6 weeks, 3 lessons each, a 10-question quiz per week
  if ((await prisma.course.count()) === 0) {
    const course = await prisma.course.create({
      data: { title: 'Python Programming', description: 'Learn Python from the basics to a small project in 6 weeks.', fee: 40000, status: 'PUBLISHED', instructorId: meera.id },
    });
    for (let w = 0; w < WEEK_TITLES.length; w++) {
      const week = await prisma.week.create({ data: { courseId: course.id, number: w + 1, title: WEEK_TITLES[w] } });
      await prisma.lesson.createMany({
        data: (['VIDEO', 'PDF', 'SLIDES'] as const).map((type, i) => ({ weekId: week.id, title: `Week ${w + 1} lesson ${i + 1}`, type, url: 'https://example.com/lesson', position: i + 1 })),
      });
      const quiz = await prisma.quiz.create({ data: { weekId: week.id } });
      // Demo questions: the correct answer is always option A. Instructors replace them in the quiz editor.
      await prisma.question.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          quizId: quiz.id,
          position: i + 1,
          text: `Week ${w + 1}, question ${i + 1}: pick the correct option`,
          options: ['Correct answer', 'Wrong answer 1', 'Wrong answer 2', 'Wrong answer 3'],
          correctIndex: 0,
        })),
      });
    }
  }

  console.log('Seeded. Logins: admin@lms.local / Admin@12345, meera@lms.local (Instructor) and arun@lms.local (Student) / Demo@12345');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
