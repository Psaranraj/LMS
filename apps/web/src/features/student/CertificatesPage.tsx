import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EnrollmentSummary } from '@lms/shared-types';
import { Card, Empty, Loading, PageTitle, Pill } from '../../components/ui';
import { api, downloadFile } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

const Check = ({ ok, children }: { ok: boolean; children: string }) => (
  <div className="flex items-center gap-3 border-b border-line py-3 text-sm last:border-0">
    <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs ${ok ? 'border-ok bg-ok-bg text-ok' : 'border-line text-transparent'}`}>✓</span>
    {children}
  </div>
);

/** The certificate request is created by the system once everything is done. Students only wait, download, or ask again. */
export function CertificatesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['enrollments'], queryFn: () => api.get<{ enrollments: EnrollmentSummary[] }>('/learning/enrollments') });
  const again = useMutation({
    mutationFn: (id: number) => api.post(`/certificates/${id}/request-again`),
    onSuccess: () => {
      toast('Request sent again');
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (e) => toast(errMsg(e)),
  });

  if (isLoading || !data) return <Loading />;
  return (
    <>
      <PageTitle title="Certificates" sub="Unlocks when every weekly quiz is passed and every installment is paid. Your instructor then approves it." />
      {data.enrollments.length === 0 && <Empty>Join a course to earn a certificate.</Empty>}
      <div className="grid items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.enrollments.map((e) => {
          const c = e.certificate;
          const label = c ? { REQUESTED: 'Waiting for instructor', ISSUED: 'Issued', REJECTED: 'Not approved', REVOKED: 'Revoked' }[c.status] : 'Locked';
          const tone = c?.status === 'ISSUED' ? 'ok' : c?.status === 'REQUESTED' || c?.status === 'REJECTED' ? 'warn' : 'mut';
          return (
            <Card key={e.id}>
              <div className="mb-2 flex items-start justify-between gap-2"><b>{e.courseTitle}</b><Pill tone={tone}>{label}</Pill></div>
              <Check ok={e.weeksPassed === e.weekCount && e.weekCount > 0}>{`Weekly quizzes: ${e.weeksPassed} of ${e.weekCount} passed`}</Check>
              <Check ok={e.paidCount === e.installments.length}>{`Payments: ${e.paidCount} of ${e.installments.length} installments paid`}</Check>
              <Check ok={c?.status === 'ISSUED'}>Instructor approval</Check>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                {!c && <span className="text-mut">Pass every quiz and pay every installment. The request goes to your instructor automatically.</span>}
                {c?.status === 'REQUESTED' && <span className="text-mut">Request sent. It shows here after your instructor approves it.</span>}
                {c?.status === 'REJECTED' && (
                  <>
                    <span className="text-mut">Instructor note: {c.reason}</span>
                    <div><button className="btn-primary" onClick={() => again.mutate(c.id)}>Request again</button></div>
                  </>
                )}
                {c?.status === 'REVOKED' && <span className="text-mut">This certificate was revoked. Please contact the academy.</span>}
                {c?.status === 'ISSUED' && (
                  <>
                    <div><button className="btn-primary" onClick={() => downloadFile(`/certificates/${c.id}/pdf`, `certificate-${c.code}.pdf`).catch((err) => toast(errMsg(err)))}>Download PDF</button></div>
                    <span className="text-mut">Certificate ID {c.code}</span>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
