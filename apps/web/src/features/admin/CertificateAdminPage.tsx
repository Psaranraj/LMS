import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CertificateDto, CertificateTemplateDto } from '@lms/shared-types';
import { Card, Empty, ErrorText, Field, Loading, PageTitle, Pill } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

/** Admin sets how certificates look. The system fills in the rest and creates the PDF when an instructor approves. */
export function CertificateAdminPage() {
  const queryClient = useQueryClient();
  const template = useQuery({ queryKey: ['cert-template'], queryFn: () => api.get<CertificateTemplateDto>('/certificates/template') });
  const issued = useQuery({ queryKey: ['cert-issued'], queryFn: () => api.get<{ certificates: CertificateDto[] }>('/certificates') });
  const [form, setForm] = useState<CertificateTemplateDto>({ institute: '', signatory: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (template.data) setForm(template.data); }, [template.data]);

  const save = useMutation({
    mutationFn: () => api.put('/certificates/template', form),
    onSuccess: () => { setError(''); toast('Template saved'); void queryClient.invalidateQueries({ queryKey: ['cert-template'] }); },
    onError: (e) => setError(errMsg(e)),
  });
  const revoke = useMutation({
    mutationFn: (id: number) => api.post(`/certificates/${id}/revoke`),
    onSuccess: () => { toast('Certificate revoked'); void queryClient.invalidateQueries({ queryKey: ['cert-issued'] }); },
    onError: (e) => toast(errMsg(e)),
  });

  if (!template.data || !issued.data) return <Loading />;
  return (
    <>
      <PageTitle title="Certificates" sub="Admin sets the template. Instructors approve. The system creates the PDF." />
      <div className="grid items-start gap-5 md:grid-cols-2">
        <Card className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Certificate template</h2>
          <Field label="Institute name"><input className="input" value={form.institute} onChange={(e) => setForm({ ...form, institute: e.target.value })} /></Field>
          <Field label="Signatory name and title"><input className="input" value={form.signatory} onChange={(e) => setForm({ ...form, signatory: e.target.value })} /></Field>
          {error && <ErrorText>{error}</ErrorText>}
          <div><button className="btn-primary" onClick={() => save.mutate()}>Save template</button></div>
          <p className="text-sm text-mut">Every new certificate uses this template with the student name, course, date and a unique ID.</p>
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-bold">Issued certificates</h2>
          {issued.data.certificates.length === 0 && <Empty>None issued yet.</Empty>}
          {issued.data.certificates.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border-b border-line py-3 text-sm last:border-0">
              <div><b>{c.studentName}</b><div className="text-mut">{c.courseTitle} · {c.code}</div></div>
              {c.status === 'ISSUED' ? <button className="btn-ghost min-h-9 px-3" onClick={() => revoke.mutate(c.id)}>Revoke</button> : <Pill tone="warn">Revoked</Pill>}
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
