import { useQuery } from '@tanstack/react-query';
import type { AuditRow } from '@lms/shared-types';
import { Card, Loading, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { dateText } from '../../lib/format';

export function AuditPage() {
  const { data } = useQuery({ queryKey: ['audit'], queryFn: () => api.get<{ logs: AuditRow[] }>('/audit') });
  if (!data) return <Loading />;
  return (
    <>
      <PageTitle title="Audit log" sub="Who did what, newest first." />
      <Card>
        {data.logs.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
            <div><b>{l.actorName}</b><div className="text-mut">{l.action}</div></div>
            <span className="text-xs text-mut">{dateText(l.createdAt)}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
