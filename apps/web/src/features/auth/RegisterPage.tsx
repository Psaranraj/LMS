import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { LoginResponse } from '@lms/shared-types';
import { registerSchema, type RegisterInput } from '@lms/shared-validation';
import { ErrorText, Field } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { useAuthStore } from '../../store/auth.store';
import { AuthLayout } from './AuthLayout';

/** Public sign-up always creates a Student. Instructors are created by an admin. */
export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterInput) {
    setError('');
    try {
      const data = await api.post<LoginResponse>('/auth/register', values);
      useAuthStore.getState().setSession(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <AuthLayout title="Create your account" sub="Your email will be your login.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" error={formState.errors.name && 'Enter your name'}>
          <input className="input" autoComplete="name" {...register('name')} />
        </Field>
        <Field label="Email" error={formState.errors.email && 'Enter a valid email'}>
          <input className="input" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" hint="At least 8 characters." error={formState.errors.password && 'At least 8 characters'}>
          <input className="input" type="password" autoComplete="new-password" {...register('password')} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <button className="btn-primary justify-center" disabled={formState.isSubmitting}>Create account</button>
      </form>
      <p className="text-sm text-mut">Already registered? <Link to="/login" className="font-semibold text-accent">Log in</Link></p>
    </AuthLayout>
  );
}
