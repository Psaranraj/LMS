# LMS study guide: follow these 7 steps with the code open

Read each step with the listed files open. Every step ends with a small task so you check yourself.

---

## Step 1. The root files (what `pnpm install` created and why)

| File | What it is for |
|---|---|
| `package.json` (root) | Project name, scripts (`pnpm dev`, `test`, `lint`, `prisma:*`) and the packages shared by the whole repo. |
| `apps/api/package.json`, `apps/web/package.json` | The packages each app needs. **dependencies** run in production. **devDependencies** are only for building and testing. |
| `pnpm-workspace.yaml` | Tells pnpm that `apps/*` and `libs/*` are one workspace, so `@lms/shared-types` resolves to the local folder (`workspace:*`). |
| `pnpm-lock.yaml` | Created by install. Locks exact versions so every machine installs the same thing. |
| `node_modules/` | Downloaded packages. Never edit, never commit. |
| `nx.json`, `apps/*/project.json` | Nx: the commands (`serve`, `build`, `test`, `lint`, `prisma-*`) of each project and how they are cached. |
| `tsconfig.base.json` and `tsconfig*.json` | TypeScript rules. The base file defines the import names like `@lms/shared-types`. |
| `eslint.config.mjs`, `.prettierrc` | Lint rules and code format. |
| `apps/api/.env` | Secrets (database URL, JWT secrets). Never commit. `.env.example` shows the keys. |
| `vitest.config.mts` | Test runner setup. |

Why each main package exists:

- **express**: the web server. **prisma / @prisma/client**: talks to MySQL with typed code.
- **jsonwebtoken**: makes and checks login tokens. **bcryptjs**: hashes passwords. **cookie-parser**: reads cookies. **helmet**: safe HTTP headers. **express-rate-limit**: stops password guessing. **pino**: logs. **cors**: lets the web app call the API. **pdfkit**: builds the certificate PDF.
- **react, react-router**: pages and URLs. **@tanstack/react-query**: loads and caches server data. **zustand**: the logged-in user in memory. **react-hook-form + @hookform/resolvers**: forms. **tailwindcss**: styling. **zod**: validation on both sides.

Task: open `apps/web/vite.config.mts`. Find the `/api` proxy. This is why the browser can call `/api/v1/...` on port 4200 and reach the API on 3333.

---

## Step 2. The shared libraries (`libs/shared/*`)

The big idea: **write it once, use it in web and API.**

| Lib | Contains | Used by |
|---|---|---|
| `types` | Permission keys (`permissions.ts`), role names, enums, and the response shapes (`domain.ts`, `auth.ts`) | both |
| `validation` | Zod schemas: `loginSchema`, `registerSchema`, `enrollSchema`, `quizEditSchema`... | API checks every request with them. Web forms use the same ones. |
| `constants` | `QUIZ_QUESTION_COUNT = 10`, `PLAN_MONTHS`, default role grants (`rbac-defaults.ts`) | both, and the seed |
| `utils` | Money and date helpers | both |

Task: open `libs/shared/validation/src/auth.ts`. Search the repo for `loginSchema`. You will find it in `LoginPage.tsx` (form) and `auth/router.ts` (server). Same rule, two places.

---

## Step 3. The database (`apps/api/prisma/schema.prisma`)

Read the models in this order:

1. **Role, Permission, RolePermission, User**: role-based access. A user has one role. A role has many permissions.
2. **RefreshToken**: one row per login session (only a hash of the token is stored).
3. **Course, Week, Lesson, Quiz, Question**: what instructors build.
4. **Enrollment, Installment**: a student joins a course and gets a payment plan. `paidAt` null means unpaid.
5. **QuizAttempt**: every quiz try, with `passed`.
6. **Certificate, CertificateTemplate**: the certificate request and the admin template.
7. **AuditLog**: the admin log.

`prisma/seed.ts` fills the permissions, the 3 roles, three demo users and one demo course.

Task: in `libs/shared/constants/src/rbac-defaults.ts` find what the Student role may do. Then in the Roles page (as Admin) tick one more permission and watch the audit log.

---

## Step 4. Backend: how a request travels

Start: `apps/api/src/main.ts` then `app/app.ts`.

```
HTTP request
  -> helmet, cors, express.json, cookieParser, pino   (app.ts)
  -> router        apps/api/src/modules/<feature>/router.ts
       validateBody(schema)   check the body with Zod
       authenticate           read "Authorization: Bearer <token>", set req.user
       requirePermission(k)   403 if the token has no such permission
  -> controller / handler     take req, call the service, send res
  -> service                  business rules + Prisma (database)
  <- JSON response            or an AppError caught by middleware/errorHandler.ts
```

`auth` has all three layers (`router.ts`, `controller.ts`, `service.ts`). The other modules keep their small handlers inside `router.ts` and put the logic in `service.ts`.

Errors: services throw `UnauthorizedError`, `ForbiddenError`, `NotFoundError`... (`lib/errors.ts`). One `errorHandler` turns them into `{ error: { code, message } }`.

Task: open `modules/learning/router.ts` and `service.ts`. Follow `POST /learning/enrollments/:id/pay` from the router to the `payNext` function.

---

## Step 5. Frontend: how a screen gets data

Start: `main.tsx` then `app/app.tsx` then `app/routes.tsx`.

```
URL change
  -> routes.tsx matches a path, guards run (RequireAuth, RequireRoutePermission)
  -> AppShell (top bar, menu from config/nav.ts) wraps the page
  -> Page component (features/<area>/...Page.tsx)
       useQuery(['key'], () => api.get('/path'))     READ
       useMutation(() => api.post('/path', body))    WRITE, then invalidate the key
  -> lib/apiClient.ts: adds the access token, sends fetch('/api/v1/path')
  <- JSON -> React Query cache -> the page re-renders
```

Rule of thumb: **read = useQuery, write = useMutation, forms = react-hook-form + Zod, shared state = Zustand.**

Task: open `features/student/PaymentsPage.tsx`. Find the `useQuery` (request out, list comes back) and the `useMutation` (Pay now, then the list refreshes).

---

## Step 6. Login, refresh, logout and role-based access

**Login**

1. `LoginPage.tsx` validates with `loginSchema`, then `api.post('/auth/login')`.
2. `modules/auth/router.ts` rate limits, validates, calls `controller.login` then `service.login`.
3. `service.login` checks the email, the lock, the password (bcrypt), then `issueSession`.
4. The response has **two parts**:
   - JSON `{ accessToken, user }`. The token lasts 15 minutes and contains `permissions`.
   - A **httpOnly cookie** `refresh_token` (30 days). JavaScript cannot read it.
5. `LoginPage` stores the token and user in the Zustand store (`store/auth.store.ts`). **Memory only**, never localStorage.

**Every later request**: `apiClient.ts` adds `Authorization: Bearer <accessToken>`. `middleware/authenticate.ts` verifies it.

**Token expired (401)**: `apiClient.ts` calls `POST /auth/refresh` once. The server checks the cookie, rotates it, and returns a new access token. The original request is repeated.

**Page reload**: the access token was only in memory, so `app/app.tsx` calls `/auth/refresh` first. If the cookie is valid you stay logged in. `RequireAuth` waits for this (`hydrated`).

**Logout**: `AppShell.tsx` calls `POST /auth/logout`. The server revokes the refresh token and clears the cookie. The store and the query cache are cleared.

**Role-based access, two layers**

| Layer | Files | Purpose |
|---|---|---|
| Server (real security) | `requirePermission('quizzes.take')` in each router | Even if someone calls the API directly, it is blocked. |
| Web (convenience) | `config/nav.ts` (menu), `RequireRoutePermission` in `routes.tsx`, `PermissionGate`, `useHasPermission` | Hides what you cannot use. |

Dashboard: `DashboardPage.tsx` shows the student, instructor or admin dashboard depending on **permissions**, not on a role name.

Task: log in as a student. In the browser Network tab, find `login` (look at the response and the Set-Cookie header) and then any call and its `Authorization` header.

---

## Step 7. The business flows, file by file

**A. Course set-up**: Admin creates a course (`ManageCoursesPage` -> `POST /courses`) and picks an instructor. The instructor adds lessons (`TeachCoursePage` -> `POST /teach/weeks/:id/lessons`) and writes the 10-question quiz (`QuizEditorPage` -> `PUT /teach/weeks/:id/quiz`, validated by `quizEditSchema`). Admin publishes.

**B. Enroll and pay**: `BrowseCoursesPage` -> `POST /learning/enrollments` (`service.enroll` creates the installments). `PaymentsPage` -> `POST /learning/enrollments/:id/pay` (`service.payNext` marks the next installment paid).

**C. Weeks unlock**: `openWeekCount()` in `learning/service.ts`. Each paid installment opens the next week. The last installment opens all. Locked weeks are sent without lessons.

**D. Quiz and progress**: `QuizPage` -> `GET /learning/weeks/:id/quiz` (no answers sent) -> `POST` (the **server** grades). 10 of 10 = `QuizAttempt.passed`. Progress % = passed weeks / total weeks (`summary()` in `learning/service.ts`).

**E. Certificate**: after every payment and every pass, `requestIfComplete()` (`certificates/service.ts`) checks "all quizzes passed and all paid". If yes it creates a `REQUESTED` certificate. The instructor dashboard lists it (`GET /certificates/pending`) and approves or rejects. Approval -> `ISSUED`. The student downloads `GET /certificates/:id/pdf` (`sendPdf`, built with pdfkit and the admin template). Admin can revoke.

**F. Settings**: `SettingsPage` -> `PATCH /profile` (name, phone, photo) and `POST /profile/password`.

### Endpoint map

| Method and path | Permission | Handled in |
|---|---|---|
| POST /auth/register, /login, /refresh, /logout; GET /auth/me | public / token | modules/auth |
| PATCH /profile, POST /profile/password | any user | modules/profile |
| GET /public/courses | public | modules/courses |
| GET /courses | courses.view | modules/courses |
| GET, POST, PATCH /courses/manage, /courses, /courses/:id | courses.manage | modules/courses |
| GET, POST, PATCH /users | users.view / users.manage | modules/users |
| GET, PUT /roles | roles.manage | modules/roles |
| GET /payments, /audit, /stats | payments.view_all, audit.view, users.view | modules/admin |
| /teach/courses, weeks, lessons | lessons.manage | modules/teach |
| /teach/weeks/:id/quiz | quizzes.manage | modules/teach |
| GET /teach/students | students.view | modules/teach |
| /learning/enrollments... | learning.access, payments.pay | modules/learning |
| /learning/weeks/:id/quiz | quizzes.take | modules/learning |
| /certificates/pending, approve, reject | certificates.approve | modules/certificates |
| /certificates, template, revoke | certificates.manage_template | modules/certificates |
| /certificates/:id/request-again | certificates.view_own | modules/certificates |
| GET /certificates/:id/pdf | owner or staff | modules/certificates |

### Who is responsible for what

- **Student**: registers, enrolls, pays, learns, passes weekly quizzes, downloads the certificate.
- **Instructor**: builds weeks, lessons and quizzes, sees own students, approves or rejects certificates.
- **Admin**: creates instructors and courses, sees all payments, edits roles, sets the certificate template, revokes certificates, reads the audit log.

### Known limits (to improve later)

- Payments are in **test mode** (no real gateway). Add Razorpay or similar in `payNext`.
- Lessons are **links** (YouTube, Drive...). No file upload yet.
- The Assignments tab from the design is not built.
- Role changes reach a user at the next token refresh (up to 15 minutes).
