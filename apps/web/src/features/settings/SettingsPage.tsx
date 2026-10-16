import { useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { AuthUser } from '@lms/shared-types';
import { changePasswordSchema, type ChangePasswordInput } from '@lms/shared-validation';
import { Avatar, Card, ErrorText, Field, PageTitle } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../../store/toast.store';

/** Same page for every role: photo, name, mobile number (email is the login and cannot change) and password. */
export function SettingsPage() {
  const user = useAuthStore((s) => s.user)!;
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile(extra: { avatarUrl?: string | null } = {}) {
    setError('');
    try {
      const data = await api.patch<{ user: AuthUser }>('/profile', { name, phone: phone || null, ...extra });
      useAuthStore.getState().setSession(useAuthStore.getState().accessToken!, data.user);
      toast('Profile saved');
    } catch (e) {
      setError(errMsg(e));
    }
  }

  function pickPhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 1_000_000) return setError('Photo must be under 1 MB');
    const reader = new FileReader();
    reader.onload = () => void saveProfile({ avatarUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  const pw = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const [pwError, setPwError] = useState('');
  async function changePassword(values: ChangePasswordInput) {
    setPwError('');
    try {
      await api.post('/profile/password', values);
      pw.reset();
      toast('Password updated');
    } catch (e) {
      setPwError(errMsg(e));
    }
  }

  return (
    <>
      <PageTitle title="Settings" sub="Manage your profile and password." />
      <div className="grid items-start gap-5 md:grid-cols-2">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-bold">Profile</h2>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={user.name} src={user.avatarUrl} size={72} />
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Change photo</button>
            {user.avatarUrl && <button className="btn-ghost" onClick={() => void saveProfile({ avatarUrl: null })}>Remove</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} aria-label="Choose profile photo" />
          </div>
          <Field label="Full name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email" hint="This is your login email. It cannot be changed here.">
            <input className="input opacity-70" value={user.email} readOnly />
          </Field>
          <Field label="Mobile number" hint="Optional. You can add it now or later.">
            <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Add your mobile number" />
          </Field>
          {error && <ErrorText>{error}</ErrorText>}
          <div><button className="btn-primary" onClick={() => void saveProfile()}>Save profile</button></div>
        </Card>

        <Card>
          <form onSubmit={pw.handleSubmit(changePassword)} className="flex flex-col gap-4" noValidate>
            <h2 className="text-lg font-bold">Change password</h2>
            <Field label="Current password" error={pw.formState.errors.currentPassword && 'Enter your current password'}>
              <input className="input" type="password" autoComplete="current-password" {...pw.register('currentPassword')} />
            </Field>
            <Field label="New password" hint="At least 8 characters." error={pw.formState.errors.newPassword && 'At least 8 characters'}>
              <input className="input" type="password" autoComplete="new-password" {...pw.register('newPassword')} />
            </Field>
            <Field label="Confirm new password" error={pw.formState.errors.confirmPassword?.message}>
              <input className="input" type="password" autoComplete="new-password" {...pw.register('confirmPassword')} />
            </Field>
            {pwError && <ErrorText>{pwError}</ErrorText>}
            <div><button className="btn-primary" disabled={pw.formState.isSubmitting}>Update password</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
