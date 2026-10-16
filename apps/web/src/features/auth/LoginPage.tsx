import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import type { LoginResponse } from '@lms/shared-types';
import { loginSchema, type LoginInput } from '@lms/shared-validation';
import { ErrorText, Field } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { errMsg } from '../../lib/errors';
import { useAuthStore } from '../../store/auth.store';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // Request: POST /api/v1/auth/login  ->  Response: { accessToken, user } + refresh cookie
  async function onSubmit(values: LoginInput) {
    setError('');
    try {
      const data = await api.post<LoginResponse>('/auth/login', values);
      useAuthStore.getState().setSession(data.accessToken, data.user);
      navigate('/dashboard');
    } catch (e) {
      setError(errMsg(e));
    }
  }

  return (
    <AuthLayout title="Welcome back" sub="Log in with your email.">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <Field label="Email" error={formState.errors.email && 'Enter a valid email'}>
          <input className="input" type="email" autoComplete="email" {...register('email')} />
        </Field>
        <Field label="Password" error={formState.errors.password && 'Enter your password'}>
          <input className="input" type="password" autoComplete="current-password" {...register('password')} />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <button className="btn-primary justify-center" disabled={formState.isSubmitting}>Log in</button>
      </form>
      <p className="text-sm text-mut">New student? <Link to="/register" className="font-semibold text-accent">Create an account</Link></p>
    </AuthLayout>
  );
}
