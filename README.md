# LMS

Learning management system with three roles (Admin, Instructor, Student).
Nx monorepo with pnpm, TypeScript everywhere, Node 22.

- **Web** (`apps/web`): React 19, Vite, React Router, Tailwind CSS v4 (tokens in `src/styles/tokens.css`), Zustand, TanStack Query, React Hook Form + Zod, one `fetch` API client.
- **API** (`apps/api`): Express 5, Prisma 6, MySQL 8, JWT + refresh cookie, bcryptjs, helmet, express-rate-limit, Pino, Zod on every request.
- **Shared** (`libs/shared/*`): `types`, `validation` (Zod), `constants`, `utils`. Imported by both apps so nothing is written twice.
- Tests: Vitest. Lint: ESLint + Prettier.

## First run

```bash
nvm use                      # Node 22
corepack enable && pnpm install
# Install MySQL 8 locally and create an empty database:  CREATE DATABASE lms;
cp apps/api/.env.example apps/api/.env   # then set your MySQL password in DATABASE_URL
pnpm prisma:generate
pnpm prisma:migrate          # name the migration "init"
pnpm prisma:seed             # roles, permissions, admin@lms.local
pnpm dev                     # API on :3333, web on :4200
```

Open http://localhost:4200 and log in with a demo account below. Run `pnpm test` and `pnpm lint` too.

## Demo logins (created by the seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@lms.local | Admin@12345 |
| Instructor | meera@lms.local | Demo@12345 |
| Student | arun@lms.local | Demo@12345 |

The demo course "Python Programming" has 6 weeks, 3 lessons per week and a 10-question quiz per week.
In the demo quizzes the correct answer is always the first option ("Correct answer").

## Try the full flow

1. Student: Browse courses, Enroll (pick 6 months), Payments, Pay now. Week 1 opens.
2. Student: My courses, Open, take the Week 1 quiz, pick the first option every time. Week 1 is complete.
3. Repeat pay and quiz for all 6 weeks.
4. Instructor (meera): Dashboard, the certificate request appears. Approve.
5. Student: Certificates, Download PDF.
6. Admin: Certificates (template, revoke), Payments, Roles, Audit log.

## Learn the code

Read `STUDY_GUIDE.md` (7 steps, each tied to files).
