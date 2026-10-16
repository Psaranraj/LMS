import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { EnrollmentSummary } from '@lms/shared-types';
import { Bar, Card, Empty, Loading, PageTitle, Stat } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { inr, dateText } from '../../lib/format';
import { useAuthStore } from '../../store/auth.store';

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const { data, isLoading } = useQuery({ queryKey: ['enrollments'], queryFn: () => api.get<{ enrollments: EnrollmentSummary[] }>('/learning/enrollments') });
  if (isLoading || !data) return <Loading />;
  const list = data.enrollments;
  const due = list.flatMap((e) => e.installments.filter((i) => i.status === 'DUE').map((i) => ({ e, i }))).at(0);
  const current = list.find((e) => e.progress < 100) ?? list[0];

  return (
    <>
      <PageTitle title={`Welcome back, ${user.name.split(' ')[0]}`} sub="Pick up where you left off." />

      {due && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-bg p-4 text-warn">
          <div>
            <b>Installment {due.i.number} of {due.e.installments.length} is due {dateText(due.i.dueDate)}</b>
            <div className="text-sm">Pay {inr(due.i.amount)} to open Week {due.i.number} of {due.e.courseTitle}.</div>
          </div>
          <Link to="/payments" className="btn-primary">Go to Payments</Link>
        </div>
      )}
      {list.map((e) =>
        e.certificate?.status === 'ISSUED' ? (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ok-bg p-4 text-ok">
            <b>Your {e.courseTitle} certificate is ready</b>
            <Link to="/certificates" className="btn-primary">View certificate</Link>
          </div>
        ) : e.certificate?.status === 'REJECTED' ? (
          <div key={e.id} className="rounded-2xl bg-warn-bg p-4 text-warn"><b>Certificate not approved yet.</b> Instructor note: {e.certificate.reason}</div>
        ) : e.certificate?.status === 'REQUESTED' ? (
          <div key={e.id} className="rounded-2xl bg-info-bg p-4 text-info"><b>Course complete.</b> Your certificate request is with your instructor.</div>
        ) : null,
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Courses enrolled" value={list.length} />
        <Stat label="Courses completed" value={list.filter((e) => e.progress === 100).length} />
        <Stat label="Certificates issued" value={list.filter((e) => e.certificate?.status === 'ISSUED').length} />
      </div>

      <Card className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Continue learning</h2>
        {current ? (
          <>
            <div className="font-semibold">{current.courseTitle}</div>
            <div className="text-sm text-mut">{current.progress}% complete · {current.weeksPassed} of {current.weekCount} weekly quizzes passed</div>
            <Bar value={current.progress} />
            <div><Link to={`/my-courses/${current.id}`} className="btn-primary">Continue</Link></div>
          </>
        ) : (
          <Empty>You have not joined a course yet. <Link to="/courses" className="font-semibold text-accent">Browse courses</Link></Empty>
        )}
      </Card>
    </>
  );
}
