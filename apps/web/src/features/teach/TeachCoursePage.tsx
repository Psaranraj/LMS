import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import type { LessonType, TeachWeek } from '@lms/shared-types';
import { LESSON_TYPES } from '@lms/shared-types';
import { Card, ErrorText, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

/** Weeks, their lessons (links to video, PDF or slides) and the weekly quiz. */
export function TeachCoursePage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const key = ['teach-course', id];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get<{ course: { id: number; title: string }; weeks: TeachWeek[] }>(`/teach/courses/${id}`) });
  const [form, setForm] = useState<Record<number, { title: string; type: LessonType; url: string }>>({});
  const [weekTitle, setWeekTitle] = useState('');
  const [error, setError] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const run = (fn: () => Promise<unknown>, done: string) => fn().then(() => { setError(''); toast(done); void refresh(); }).catch((e) => setError(errMsg(e)));
  const addWeek = useMutation({ mutationFn: () => api.post(`/teach/courses/${id}/weeks`, { title: weekTitle }), onSuccess: () => { setWeekTitle(''); void refresh(); }, onError: (e) => setError(errMsg(e)) });

  if (isLoading || !data) return <Loading />;
  const f = (weekId: number) => form[weekId] ?? { title: '', type: 'VIDEO' as LessonType, url: '' };

  return (
    <>
      <PageTitle title={data.course.title} sub="Add lessons for each week and write the 10-question quiz." />
      {error && <ErrorText>{error}</ErrorText>}
      {data.weeks.map((w) => (
        <Card key={w.id} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Week {w.number} · {w.title}</h2>
            <div className="flex items-center gap-2">
              <Pill tone={w.quizReady ? 'ok' : 'warn'}>{w.quizReady ? 'Quiz ready (10 MCQ)' : 'Quiz not ready'}</Pill>
              <Link to={`/teach/weeks/${w.id}/quiz`} className="btn-ghost">Edit quiz</Link>
            </div>
          </div>
          {w.lessons.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 border-b border-line py-2 text-sm">
              <span>{l.title} <span className="text-mut">· {l.type}</span></span>
              <button className="btn-ghost min-h-9 px-3" onClick={() => run(() => api.delete(`/teach/lessons/${l.id}`), 'Lesson removed')}>Remove</button>
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]">
            <input className="input" placeholder="Lesson title" aria-label="Lesson title" value={f(w.id).title} onChange={(e) => setForm({ ...form, [w.id]: { ...f(w.id), title: e.target.value } })} />
            <select className="input" aria-label="Lesson type" value={f(w.id).type} onChange={(e) => setForm({ ...form, [w.id]: { ...f(w.id), type: e.target.value as LessonType } })}>
              {LESSON_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <input className="input" placeholder="Link (https://...)" aria-label="Lesson link" value={f(w.id).url} onChange={(e) => setForm({ ...form, [w.id]: { ...f(w.id), url: e.target.value } })} />
            <button className="btn-primary" onClick={() => run(async () => { await api.post(`/teach/weeks/${w.id}/lessons`, f(w.id)); setForm({ ...form, [w.id]: { title: '', type: 'VIDEO', url: '' } }); }, 'Lesson added')}>Add lesson</button>
          </div>
        </Card>
      ))}
      <Card className="flex flex-wrap gap-2">
        <input className="input min-w-48 flex-1" placeholder="New week title" aria-label="New week title" value={weekTitle} onChange={(e) => setWeekTitle(e.target.value)} />
        <button className="btn-primary" disabled={!weekTitle.trim()} onClick={() => addWeek.mutate()}>Add week</button>
      </Card>
    </>
  );
}
