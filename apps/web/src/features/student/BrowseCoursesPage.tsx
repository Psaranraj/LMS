import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import type { CourseCard } from '@lms/shared-types';
import { PLAN_MONTHS } from '@lms/shared-constants';
import { Card, Empty, ErrorText, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { inr } from '../../lib/format';
import { toast } from '../../store/toast.store';

/** Student picks a course and a payment plan (1 month = pay in full). */
export function BrowseCoursesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [choosing, setChoosing] = useState<number | null>(null);
  const [plan, setPlan] = useState<number>(6);
  const [error, setError] = useState('');
  const courses = useQuery({ queryKey: ['courses'], queryFn: () => api.get<{ courses: CourseCard[] }>('/courses') });

  const enroll = useMutation({
    mutationFn: (courseId: number) => api.post('/learning/enrollments', { courseId, planMonths: plan }),
    onSuccess: () => {
      toast('Enrolled. Pay the first installment to open Week 1.');
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      navigate('/payments');
    },
    onError: (e) => setError(errMsg(e)),
  });

  return (
    <>
      <PageTitle title="Browse courses" sub="Choose a course and how you want to pay." />
      {courses.isLoading && <Loading />}
      {courses.data?.courses.length === 0 && <Empty>No courses are published yet.</Empty>}
      <div className="grid gap-4 md:grid-cols-2">
        {courses.data?.courses.map((c) => (
          <Card key={c.id} className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{c.title}</h2>
              {c.enrolled && <Pill tone="ok">Enrolled</Pill>}
            </div>
            <p className="text-sm text-mut">{c.description}</p>
            <p className="text-sm">{c.weekCount} weeks{c.instructorName ? ` · ${c.instructorName}` : ''}</p>
            <p className="text-2xl font-bold">{inr(c.fee)}</p>
            {!c.enrolled && choosing !== c.id && <div><button className="btn-primary" onClick={() => { setChoosing(c.id); setError(''); }}>Enroll</button></div>}
            {choosing === c.id && (
              <div className="flex flex-col gap-3 rounded-xl bg-bg p-3">
                <div className="text-sm font-semibold">Payment plan</div>
                <div className="flex flex-wrap gap-2">
                  {PLAN_MONTHS.map((m) => (
                    <button key={m} aria-pressed={plan === m} onClick={() => setPlan(m)} className={plan === m ? 'btn-primary' : 'btn-ghost'}>
                      {m === 1 ? 'Pay in full' : `${m} months`}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-mut">{plan === 1 ? `One payment of ${inr(c.fee)}.` : `${plan} installments of about ${inr(Math.floor(c.fee / plan))}. Each paid installment opens the next week.`}</p>
                {error && <ErrorText>{error}</ErrorText>}
                <div><button className="btn-primary" disabled={enroll.isPending} onClick={() => enroll.mutate(c.id)}>Confirm enrollment</button></div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
