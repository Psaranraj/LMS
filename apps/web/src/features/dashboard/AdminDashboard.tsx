import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '@lms/shared-types';
import { Card, Empty, Loading, PageTitle, Stat } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { inr } from '../../lib/format';

export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-stats'], queryFn: () => api.get<AdminStats>('/stats') });
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="Admin dashboard" sub="Users, courses and payments across the platform." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users} />
        <Stat label="Courses" value={data.courses} />
        <Stat label="Fees collected" value={inr(data.collected)} />
        <Stat label="Fees pending" value={inr(data.pending)} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-bold">Recent payments</h2>
          {data.recentPayments.length === 0 && <Empty>No payments yet.</Empty>}
          {data.recentPayments.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-line py-2 text-sm last:border-0">
              <span><b>{p.studentName}</b> <span className="text-mut">· {p.courseTitle} {p.number}/{p.installmentCount}</span></span>
              <span>{inr(p.amount)}</span>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">Latest activity</h2>
          {data.recentActivity.map((a) => (
            <div key={a.id} className="border-b border-line py-2 text-sm last:border-0"><b>{a.actorName}</b><div className="text-mut">{a.action}</div></div>
          ))}
        </Card>
      </div>
    </>
  );
}
