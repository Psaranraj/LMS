import { useQuery } from '@tanstack/react-query';
import type { TeachStudentRow } from '@lms/shared-types';
import { Empty, Loading, PageTitle, Table } from '../../components/ui';
import { api } from '../../lib/apiClient';

/** One column per weekly quiz. A tick means the student passed it (week complete). */
export function StudentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['teach-students'], queryFn: () => api.get<{ students: TeachStudentRow[] }>('/teach/students') });
  if (isLoading || !data) return <Loading />;
  const weeks = Math.max(0, ...data.students.map((s) => s.weekPassed.length));
  return (
    <>
      <PageTitle title="Students" sub="Students in your courses, with weekly quiz progress and payments." />
      {data.students.length === 0 ? (
        <Empty>No students yet.</Empty>
      ) : (
        <Table head={['Student', 'Course', ...Array.from({ length: weeks }, (_, i) => `W${i + 1}`), 'Progress', 'Payments']}>
          {data.students.map((s) => (
            <tr key={s.enrollmentId}>
              <td><b>{s.studentName}</b><div className="text-xs text-mut">{s.email}</div></td>
              <td>{s.courseTitle}</td>
              {Array.from({ length: weeks }, (_, i) => <td key={i}>{s.weekPassed[i] ? '✓' : '–'}</td>)}
              <td>{s.progress}%</td>
              <td>{s.paidCount} of {s.installmentCount}</td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
