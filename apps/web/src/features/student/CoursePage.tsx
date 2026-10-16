import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import type { EnrollmentDetail, LessonDto } from '@lms/shared-types';
import { Bar, Card, Empty, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';

/** Weeks on the left, the chosen lesson on the right. Locked weeks show which payment opens them. */
export function CoursePage() {
  const { id } = useParams();
  const [lessonId, setLessonId] = useState<number | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['enrollment', id], queryFn: () => api.get<{ enrollment: EnrollmentDetail }>(`/learning/enrollments/${id}`) });
  if (isLoading || !data) return <Loading />;
  const e = data.enrollment;

  const lessons = e.weeks.flatMap((w) => w.lessons.map((l) => ({ ...l, week: w })));
  const current: (LessonDto & { week: (typeof e.weeks)[number] }) | undefined = lessons.find((l) => l.id === lessonId) ?? lessons.find((l) => !l.week.passed) ?? lessons[0];

  return (
    <>
      <PageTitle title={e.courseTitle} sub="Pass each weekly quiz to complete the week. Weeks open as you pay." />
      <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="flex flex-col gap-3">
          <Bar value={e.progress} />
          <div className="text-sm text-mut">{e.progress}% complete · {e.weeksPassed} of {e.weekCount} weeks done</div>
          {e.weeks.map((w) => (
            <div key={w.id} className={`rounded-xl border border-line p-3 ${w.open ? '' : 'bg-bg'}`}>
              <div className="flex items-start justify-between gap-2">
                <b className="text-sm">Week {w.number} · {w.title}</b>
                {w.open && <Pill tone={w.passed ? 'ok' : 'info'}>{w.passed ? 'Week complete' : 'Quiz pending'}</Pill>}
              </div>
              {!w.open && (
                <p className="mt-1 text-sm text-warn">
                  Pay installment {w.number} to open this week. <Link to="/payments" className="font-semibold underline">Go to Payments</Link>
                </p>
              )}
              {w.open && w.lessons.map((l) => (
                <button key={l.id} onClick={() => setLessonId(l.id)} aria-current={current?.id === l.id} className={`mt-1 block min-h-11 w-full border-t border-line pt-2 text-left text-sm ${current?.id === l.id ? 'font-semibold text-accent' : ''}`}>
                  {l.title} <span className="text-mut">· {l.type}</span>
                </button>
              ))}
              {w.open && !w.passed && w.quizReady && (
                <Link to={`/my-courses/${e.id}/quiz/${w.id}`} className="btn-primary mt-2 w-full justify-center">Take the Week {w.number} quiz</Link>
              )}
              {w.open && !w.passed && !w.quizReady && <p className="mt-2 text-xs text-mut">The quiz is not ready yet.</p>}
            </div>
          ))}
        </Card>

        <Card className="flex flex-col gap-3">
          {current ? (
            <>
              <div className="flex aspect-video items-center justify-center rounded-xl bg-tx text-bg">{current.type}</div>
              <h2 className="text-xl font-bold">{current.title}</h2>
              <p className="text-sm text-mut">Week {current.week.number} · {current.type}</p>
              <div><a href={current.url} target="_blank" rel="noreferrer" className="btn-primary">Open lesson</a></div>
            </>
          ) : (
            <Empty>No lessons are open yet. Pay your first installment to open Week 1.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
