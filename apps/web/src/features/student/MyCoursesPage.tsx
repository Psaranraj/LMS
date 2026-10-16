import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { EnrollmentSummary } from '@lms/shared-types';
import { Bar, Card, Empty, Loading, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';

export function MyCoursesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['enrollments'], queryFn: () => api.get<{ enrollments: EnrollmentSummary[] }>('/learning/enrollments') });
  return (
    <>
      <PageTitle title="My courses" sub="Your courses and your progress." />
      {isLoading && <Loading />}
      {data?.enrollments.length === 0 && <Empty>You have not joined a course yet. <Link to="/courses" className="font-semibold text-accent">Browse courses</Link></Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.enrollments.map((e) => (
          <Card key={e.id} className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">{e.courseTitle}</h2>
            <div className="text-sm text-mut">{e.instructorName ?? 'No instructor yet'} · {e.weeksPassed} of {e.weekCount} weeks done</div>
            <Bar value={e.progress} />
            <div className="text-sm">{e.progress}% complete</div>
            <div><Link to={`/my-courses/${e.id}`} className="btn-primary">Open</Link></div>
          </Card>
        ))}
      </div>
    </>
  );
}
