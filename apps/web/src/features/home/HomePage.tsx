import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import type { CourseCard } from '@lms/shared-types';
import { Card, Empty, Loading } from '../../components/ui';
import { api } from '../../lib/apiClient';
import { inr } from '../../lib/format';
import { useAuthStore } from '../../store/auth.store';

/** Public landing page: no login needed. */
export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const courses = useQuery({ queryKey: ['public-courses'], queryFn: () => api.get<{ courses: CourseCard[] }>('/public/courses') });

  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <span className="text-xl font-bold text-accent">LMS</span>
        <div className="flex gap-2">
          {user ? (
            <Link to="/dashboard" className="btn-primary">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary">Register</Link>
            </>
          )}
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-5 pb-16">
        <section className="py-10">
          <h1 className="max-w-2xl text-4xl font-bold sm:text-5xl">Learn step by step. Pay month by month.</h1>
          <p className="mt-3 max-w-xl text-lg text-mut">Each week opens as you pay. Pass the weekly quiz to complete the week, and earn a certificate at the end.</p>
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Courses</h2>
          {courses.isLoading && <Loading />}
          {courses.data?.courses.length === 0 && <Empty>No courses are published yet.</Empty>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data?.courses.map((c) => (
              <Card key={c.id}>
                <h3 className="text-lg font-bold">{c.title}</h3>
                <p className="mt-1 text-sm text-mut">{c.description}</p>
                <p className="mt-3 text-sm">{c.weekCount} weeks{c.instructorName ? ` · ${c.instructorName}` : ''}</p>
                <p className="text-xl font-bold">{inr(c.fee)}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
