import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoleRow, UserRow } from '@lms/shared-types';
import { createUserSchema } from '@lms/shared-validation';
import { Card, ErrorText, Field, Loading, PageTitle, Pill, Table } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';

/** Admin creates accounts (this is how instructors are made) and can disable or enable them. */
export function UsersPage() {
  const queryClient = useQueryClient();
  const canManage = useAuthStore((s) => s.hasPermission('users.manage'));
  const users = useQuery({ queryKey: ['users'], queryFn: () => api.get<{ users: UserRow[] }>('/users') });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => api.get<{ roles: RoleRow[] }>('/roles') });
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: 0 });
  const [error, setError] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['users'] });
  const add = useMutation({
    mutationFn: () => {
      const parsed = createUserSchema.safeParse({ ...form, roleId: form.roleId || roles.data?.roles[1]?.id });
      if (!parsed.success) throw new Error('Enter a name, a valid email and a password of 8+ characters');
      return api.post('/users', parsed.data);
    },
    onSuccess: () => { setError(''); setForm({ name: '', email: '', password: '', roleId: 0 }); toast('User created'); void refresh(); },
    onError: (e) => setError(errMsg(e)),
  });
  const toggle = useMutation({
    mutationFn: (u: UserRow) => api.patch(`/users/${u.id}/active`, { active: !u.active }),
    onSuccess: () => void refresh(),
    onError: (e) => toast(errMsg(e)),
  });

  if (!users.data) return <Loading />;
  return (
    <>
      <PageTitle title="Users" sub="Create instructors, disable accounts. Students register themselves." />
      <div className="grid items-start gap-5 lg:grid-cols-[3fr_2fr]">
        <Table head={['Name', 'Email', 'Role', 'Status', '']}>
          {users.data.users.map((u) => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><Pill tone="info">{u.roleName}</Pill></td>
              <td><Pill tone={u.active ? 'ok' : 'warn'}>{u.active ? 'Active' : 'Disabled'}</Pill></td>
              <td>{canManage && <button className="btn-ghost min-h-9 px-3" onClick={() => toggle.mutate(u)}>{u.active ? 'Disable' : 'Enable'}</button>}</td>
            </tr>
          ))}
        </Table>
        {canManage && (
          <Card className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Add user</h2>
            <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Role">
              <select className="input" value={form.roleId || roles.data?.roles[1]?.id} onChange={(e) => setForm({ ...form, roleId: Number(e.target.value) })}>
                {roles.data?.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Temporary password" hint="At least 8 characters. The user can change it in Settings."><input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
            {error && <ErrorText>{error}</ErrorText>}
            <div><button className="btn-primary" disabled={add.isPending} onClick={() => add.mutate()}>Create user</button></div>
          </Card>
        )}
      </div>
    </>
  );
}
