import { useAuthStore } from '../../store/auth.store';
import { AdminDashboard } from './AdminDashboard';
import { InstructorDashboard } from './InstructorDashboard';
import { StudentDashboard } from './StudentDashboard';

/** One URL, three dashboards. The user's permissions decide which one shows. */
export function DashboardPage() {
  const has = useAuthStore((s) => s.hasPermission);
  if (has('learning.access')) return <StudentDashboard />;
  if (has('certificates.approve')) return <InstructorDashboard />;
  return <AdminDashboard />;
}
