import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { TeachCourse } from '@lms/shared-types';
import { Card, Empty, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';

export function TeachCoursesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['teach-courses'], queryFn: () => api.get<{ courses: TeachCourse[] }>('/teach/courses') });
  return (
    <>
      <PageTitle title="My courses" sub="The courses an admin assigned to you." />
      {isLoading && <Loading />}
      {data?.courses.length === 0 && <Empty>No course is assigned to you yet.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.courses.map((c) => (
          <Card key={c.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-bold">{c.title}</h2><Pill tone={c.status === 'PUBLISHED' ? 'ok' : 'warn'}>{c.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Pill></div>
            <p className="text-sm text-mut">{c.weekCount} weeks · {c.studentCount} students</p>
            <div><Link to={`/teach/${c.id}`} className="btn-primary">Manage weeks and quizzes</Link></div>
          </Card>
        ))}
      </div>
    </>
  );
}
