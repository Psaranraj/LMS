import type { ReactNode } from 'react';
import { Link, Navigate, createBrowserRouter } from 'react-router';
import type { PermissionKey } from '@lms/shared-types';
import { AppShell } from '../components/AppShell';
import { RequireAuth } from '../components/rbac/RequireAuth';
import { RequireRoutePermission } from '../components/rbac/RequireRoutePermission';
import { AllPaymentsPage } from '../features/admin/AllPaymentsPage';
import { AuditPage } from '../features/admin/AuditPage';
import { CertificateAdminPage } from '../features/admin/CertificateAdminPage';
import { ManageCoursesPage } from '../features/admin/ManageCoursesPage';
import { RolesPage } from '../features/admin/RolesPage';
import { UsersPage } from '../features/admin/UsersPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { HomePage } from '../features/home/HomePage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { BrowseCoursesPage } from '../features/student/BrowseCoursesPage';
import { CertificatesPage } from '../features/student/CertificatesPage';
import { CoursePage } from '../features/student/CoursePage';
import { MyCoursesPage } from '../features/student/MyCoursesPage';
import { PaymentsPage } from '../features/student/PaymentsPage';
import { QuizPage } from '../features/student/QuizPage';
import { QuizEditorPage } from '../features/teach/QuizEditorPage';
import { StudentsPage } from '../features/teach/StudentsPage';
import { TeachCoursePage } from '../features/teach/TeachCoursePage';
import { TeachCoursesPage } from '../features/teach/TeachCoursesPage';

/** Wraps a page so only users holding one of these permissions can open it (others go to /403). */
const guard = (anyOf: PermissionKey[], page: ReactNode) => <RequireRoutePermission anyOf={anyOf}>{page}</RequireRoutePermission>;

const Message = ({ title }: { title: string }) => (
  <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
    <h1 className="text-3xl font-bold">{title}</h1>
    <Link to="/" className="btn-primary">Go home</Link>
  </main>
);

export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/403', element: <Message title="You do not have access to this page" /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: guard(['dashboard.view'], <DashboardPage />) },
          { path: '/settings', element: <SettingsPage /> },

          // student
          { path: '/courses', element: guard(['learning.access'], <BrowseCoursesPage />) },
          { path: '/my-courses', element: guard(['learning.access'], <MyCoursesPage />) },
          { path: '/my-courses/:id', element: guard(['learning.access'], <CoursePage />) },
          { path: '/my-courses/:id/quiz/:weekId', element: guard(['quizzes.take'], <QuizPage />) },
          { path: '/payments', element: guard(['payments.pay'], <PaymentsPage />) },
          { path: '/certificates', element: guard(['certificates.view_own'], <CertificatesPage />) },

          // instructor
          { path: '/teach', element: guard(['lessons.manage'], <TeachCoursesPage />) },
          { path: '/teach/:id', element: guard(['lessons.manage'], <TeachCoursePage />) },
          { path: '/teach/weeks/:weekId/quiz', element: guard(['quizzes.manage'], <QuizEditorPage />) },
          { path: '/students', element: guard(['students.view'], <StudentsPage />) },

          // admin
          { path: '/users', element: guard(['users.view'], <UsersPage />) },
          { path: '/manage/courses', element: guard(['courses.manage'], <ManageCoursesPage />) },
          { path: '/all-payments', element: guard(['payments.view_all'], <AllPaymentsPage />) },
          { path: '/certificate-admin', element: guard(['certificates.manage_template'], <CertificateAdminPage />) },
          { path: '/roles', element: guard(['roles.manage'], <RolesPage />) },
          { path: '/audit', element: guard(['audit.view'], <AuditPage />) },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
