import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { EnrollmentDetail, EnrollmentSummary } from '@lms/shared-types';
import { Card, Empty, ErrorText, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { dateText, inr } from '../../lib/format';
import { toast } from '../../store/toast.store';

type Method = 'UPI' | 'CARD' | 'NET_BANKING';

/** Next installment with Pay now, the full EMI schedule, and everything already paid. */
export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState<Method>('UPI');
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['enrollments'], queryFn: () => api.get<{ enrollments: EnrollmentSummary[] }>('/learning/enrollments') });

  const pay = useMutation({
    mutationFn: (enrollmentId: number) => api.post<{ enrollment: EnrollmentDetail }>(`/learning/enrollments/${enrollmentId}/pay`, { method }),
    onSuccess: (r) => {
      setError('');
      toast(r.enrollment.paidCount < r.enrollment.installments.length ? `Paid. Week ${r.enrollment.paidCount} is now open.` : 'Paid. Every week is open.');
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  if (isLoading || !data) return <Loading />;
  const paid = data.enrollments.flatMap((e) => e.installments.filter((i) => i.paidAt).map((i) => ({ e, i })));

  return (
    <>
      <PageTitle title="Payments" sub="Pay your installments and see everything you have paid." />
      {data.enrollments.length === 0 && <Empty>You have no payments yet. <Link to="/courses" className="font-semibold text-accent">Browse courses</Link></Empty>}
      {data.enrollments.map((e) => {
        const next = e.installments.find((i) => i.status === 'DUE');
        return (
          <div key={e.id} className="grid items-start gap-5 md:grid-cols-[3fr_2fr]">
            <div className="flex flex-col gap-5">
              <Card className="flex flex-col gap-3">
                {next ? (
                  <>
                    <div className="text-sm text-mut">Next installment · {e.courseTitle} · {next.number} of {e.installments.length}</div>
                    <div className="text-4xl font-bold">{inr(next.amount)}</div>
                    <div className="text-sm text-warn">Due {dateText(next.dueDate)}. Paying this opens {e.paidCount + 1 >= e.installments.length ? 'the remaining weeks' : `Week ${next.number}`}.</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select className="input w-auto" aria-label="Payment method" value={method} onChange={(ev) => setMethod(ev.target.value as Method)}>
                        <option value="UPI">UPI</option>
                        <option value="CARD">Card</option>
                        <option value="NET_BANKING">Net banking</option>
                      </select>
                      <button className="btn-primary" disabled={pay.isPending} onClick={() => pay.mutate(e.id)}>Pay now (test mode)</button>
                    </div>
                    {error && <ErrorText>{error}</ErrorText>}
                  </>
                ) : (
                  <><b>All installments paid for {e.courseTitle}.</b><span className="text-mut">Every week is open.</span></>
                )}
              </Card>
              <Card>
                <h2 className="mb-2 text-lg font-bold">EMI schedule · {e.courseTitle}</h2>
                {e.installments.map((i) => (
                  <div key={i.number} className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
                    <div><b>Installment {i.number} of {e.installments.length}</b><div className="text-mut">{dateText(i.dueDate)} · opens Week {i.number}</div></div>
                    <div className="flex items-center gap-3">{inr(i.amount)}<Pill tone={i.status === 'PAID' ? 'ok' : i.status === 'DUE' ? 'warn' : 'mut'}>{i.status === 'PAID' ? 'Paid' : i.status === 'DUE' ? 'Due' : 'Upcoming'}</Pill></div>
                  </div>
                ))}
              </Card>
            </div>
            {e === data.enrollments[0] && (
              <Card>
                <h2 className="mb-2 text-lg font-bold">Payment history</h2>
                {paid.length === 0 && <Empty>Nothing paid yet.</Empty>}
                {paid.map(({ e: en, i }) => (
                  <div key={`${en.id}-${i.number}`} className="flex justify-between border-b border-line py-3 text-sm last:border-0">
                    <div><b>{en.courseTitle} · {i.number} of {en.installments.length}</b><div className="text-mut">{dateText(i.paidAt!)}</div></div>
                    <span>{inr(i.amount)}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        );
      })}
    </>
  );
}
