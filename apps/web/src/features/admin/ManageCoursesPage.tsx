import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CourseCard, UserRow } from '@lms/shared-types';
import { createCourseSchema } from '@lms/shared-validation';
import { Card, ErrorText, Field, Loading, PageTitle, Pill, Table } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { inr } from '../../lib/format';
import { toast } from '../../store/toast.store';

type ManageRow = CourseCard & { status: 'DRAFT' | 'PUBLISHED'; instructorId: number | null };

/** Admin creates courses, assigns an instructor and publishes. Instructors then fill in weeks, lessons and quizzes. */
export function ManageCoursesPage() {
  const queryClient = useQueryClient();
  const courses = useQuery({ queryKey: ['manage-courses'], queryFn: () => api.get<{ courses: ManageRow[] }>('/courses/manage') });
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ users: UserRow[] }>('/users') });
  const instructors = users.data?.users.filter((u) => u.roleName === 'Instructor' && u.active) ?? [];
  const [form, setForm] = useState({ title: '', description: '', fee: '', weekCount: '6', instructorId: '' });
  const [error, setError] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['manage-courses'] });
  const create = useMutation({
    mutationFn: () => {
      const parsed = createCourseSchema.safeParse({
        title: form.title,
        description: form.description,
        fee: Number(form.fee),
        weekCount: Number(form.weekCount),
        instructorId: form.instructorId ? Number(form.instructorId) : null,
      });
      if (!parsed.success) throw new Error('Enter a title, a fee and the number of weeks');
      return api.post('/courses', parsed.data);
    },
    onSuccess: () => { setError(''); setForm({ title: '', description: '', fee: '', weekCount: '6', instructorId: '' }); toast('Course created'); void refresh(); },
    onError: (e) => setError(errMsg(e)),
  });
  const update = useMutation({
    mutationFn: ({ id, ...body }: { id: number; status?: string; instructorId?: number | null }) => api.patch(`/courses/${id}`, body),
    onSuccess: () => void refresh(),
    onError: (e) => toast(errMsg(e)),
  });

  if (!courses.data) return <Loading />;
  return (
    <>
      <PageTitle title="Courses" sub="Create a course, assign an instructor, then publish it." />
      <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        <Table head={['Course', 'Instructor', 'Fee', 'Weeks', 'Status']}>
          {courses.data.courses.map((c) => (
            <tr key={c.id}>
              <td>{c.title}</td>
              <td>
                <select className="input w-auto" aria-label={`Instructor for ${c.title}`} value={c.instructorId ?? ''} onChange={(e) => update.mutate({ id: c.id, instructorId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">Not assigned</option>
                  {instructors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </td>
              <td>{inr(c.fee)}</td>
              <td>{c.weekCount}</td>
              <td>
                <button className="btn-ghost min-h-9 px-3" onClick={() => update.mutate({ id: c.id, status: c.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' })}>
                  <Pill tone={c.status === 'PUBLISHED' ? 'ok' : 'warn'}>{c.status === 'PUBLISHED' ? 'Published' : 'Draft'}</Pill>
                </button>
              </td>
            </tr>
          ))}
        </Table>
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Add course</h2>
          <Field label="Title"><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Fee (₹)"><input className="input" type="number" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></Field>
          <Field label="Number of weeks"><input className="input" type="number" value={form.weekCount} onChange={(e) => setForm({ ...form, weekCount: e.target.value })} /></Field>
          <Field label="Instructor">
            <select className="input" value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
              <option value="">Assign later</option>
              {instructors.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <div><button className="btn-primary" disabled={create.isPending} onClick={() => create.mutate()}>Create course</button></div>
        </Card>
      </div>
    </>
  );
}
