import { useQuery } from '@tanstack/react-query';
import type { AdminPaymentRow } from '@lms/shared-types';
import { Loading, PageTitle, Pill, Stat, Table } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { dateText, inr } from '../../lib/format';

export function AllPaymentsPage() {
  const { data } = useQuery({ queryKey: ['all-payments'], queryFn: () => api.get<{ rows: AdminPaymentRow[]; collected: number; pending: number }>('/payments') });
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="Payments" sub="Every installment and its status." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Collected" value={inr(data.collected)} />
        <Stat label="Pending" value={inr(data.pending)} />
        <Stat label="Installments paid" value={data.rows.filter((r) => r.status === 'PAID').length} />
      </div>
      <Table head={['Student', 'Course', 'Installment', 'Due', 'Amount', 'Status']}>
        {data.rows.map((r) => (
          <tr key={r.id}>
            <td>{r.studentName}</td>
            <td>{r.courseTitle}</td>
            <td>{r.number} of {r.installmentCount}</td>
            <td>{dateText(r.dueDate)}</td>
            <td>{inr(r.amount)}</td>
            <td><Pill tone={r.status === 'PAID' ? 'ok' : r.status === 'DUE' ? 'warn' : 'mut'}>{r.status === 'PAID' ? 'Paid' : r.status === 'DUE' ? 'Due' : 'Upcoming'}</Pill></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
