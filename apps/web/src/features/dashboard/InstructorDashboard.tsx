import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CertificateDto, TeachCourse, TeachStudentRow } from '@lms/shared-types';
import { Card, Empty, ErrorText, Loading, PageTitle, Stat } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

export function InstructorDashboard() {
  const queryClient = useQueryClient();
  const [note, setNote] = useState<Record<number, string>>({});
  const [error, setError] = useState('');
  const pending = useQuery({ queryKey: ['cert-pending'], queryFn: () => api.get<{ certificates: CertificateDto[] }>('/certificates/pending') });
  const courses = useQuery({ queryKey: ['teach-courses'], queryFn: () => api.get<{ courses: TeachCourse[] }>('/teach/courses') });
  const students = useQuery({ queryKey: ['teach-students'], queryFn: () => api.get<{ students: TeachStudentRow[] }>('/teach/students') });

  const decide = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      api.post(`/certificates/${id}/${action}`, action === 'reject' ? { reason: note[id] ?? '' } : undefined),
    onSuccess: (_d, v) => {
      setError('');
      toast(v.action === 'approve' ? 'Certificate approved' : 'Student notified');
      void queryClient.invalidateQueries({ queryKey: ['cert-pending'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (pending.isLoading || !pending.data) return <Loading />;
  return (
    <>
      <PageTitle title="Instructor dashboard" sub="Certificate requests and how your students are doing." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="My courses" value={courses.data?.courses.length ?? 0} />
        <Stat label="Students" value={students.data?.students.length ?? 0} />
        <Stat label="Certificate requests" value={pending.data.certificates.length} />
      </div>
      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">Certificate requests</h2>
        {pending.data.certificates.length === 0 && <Empty>No pending requests. They appear when a student finishes every quiz and pays in full.</Empty>}
        {pending.data.certificates.map((c) => (
          <div key={c.id} className="flex flex-col gap-3 border-b border-line pb-4 last:border-0">
            <div><b>{c.studentName}</b><div className="text-sm text-mut">{c.courseTitle} · all quizzes passed · fully paid</div></div>
            <div className="flex flex-wrap items-center gap-2">
              <input className="input min-w-48 flex-1" placeholder="Note to student (needed to reject)" aria-label="Rejection note" value={note[c.id] ?? ''} onChange={(e) => setNote({ ...note, [c.id]: e.target.value })} />
              <button className="btn-ghost" onClick={() => decide.mutate({ id: c.id, action: 'reject' })}>Reject</button>
              <button className="btn-primary" onClick={() => decide.mutate({ id: c.id, action: 'approve' })}>Approve</button>
            </div>
          </div>
        ))}
        {error && <ErrorText>{error}</ErrorText>}
        <p className="text-sm text-mut">Approving creates the certificate automatically and sends it to the student.</p>
      </Card>
    </>
  );
}
