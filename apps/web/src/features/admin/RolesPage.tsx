import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RoleRow } from '@lms/shared-types';
import { PERMISSIONS } from '@lms/shared-types';
import { Card, Loading, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { toast } from '../../store/toast.store';

/** The permission matrix. Each tick saves immediately. The Admin role is locked. Changes reach a user at their next login or token refresh. */
export function RolesPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['roles'], queryFn: () => api.get<{ roles: RoleRow[] }>('/roles') });
  const save = useMutation({
    mutationFn: ({ role, keys }: { role: RoleRow; keys: string[] }) => api.put<{ roles: RoleRow[] }>(`/roles/${role.id}/permissions`, { permissionKeys: keys }),
    onSuccess: (r) => { queryClient.setQueryData(['roles'], r); toast('Permission saved'); },
    onError: (e) => toast(errMsg(e)),
  });
  if (!data) return <Loading />;

  const toggle = (role: RoleRow, key: string) => {
    const has = role.permissionKeys.includes(key);
    save.mutate({ role, keys: has ? role.permissionKeys.filter((k) => k !== key) : [...role.permissionKeys, key] });
  };

  return (
    <>
      <PageTitle title="Roles and permissions" sub="The server checks these on every request. Admin is a system role and cannot be changed." />
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-mut">
              <th className="px-4 py-3">Permission</th>
              {data.roles.map((r) => <th key={r.id} className="px-4 py-3">{r.name}</th>)}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((p) => (
              <tr key={p.key} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><b>{p.key}</b><div className="text-xs text-mut">{p.description}</div></td>
                {data.roles.map((r) => (
                  <td key={r.id} className="px-4 py-3">
                    <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" aria-label={`${r.name}: ${p.key}`} checked={r.permissionKeys.includes(p.key)} disabled={r.name === 'Admin'} onChange={() => toggle(r, p.key)} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
