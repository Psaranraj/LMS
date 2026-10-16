import type { ReactNode } from 'react';

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-mut">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = 'ok' | 'warn' | 'info' | 'mut';
const toneClass: Record<Tone, string> = { ok: 'pill-ok', warn: 'pill-warn', info: 'pill-info', mut: 'inline-block rounded-full bg-chip px-2.5 py-0.5 text-xs font-semibold text-mut' };
export const Pill = ({ tone = 'mut', children }: { tone?: Tone; children: ReactNode }) => <span className={toneClass[tone]}>{children}</span>;

export function Bar({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-chip" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

export const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => <div className={`card min-w-0 ${className}`}>{children}</div>;
export const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <Card>
    <div className="text-sm text-mut">{label}</div>
    <div className="mt-1 text-3xl font-bold">{value}</div>
  </Card>
);
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-4 text-mut">{children}</p>;
export const Loading = () => <p className="py-6 text-mut">Loading...</p>;
export const ErrorText = ({ children }: { children: ReactNode }) => <p role="alert" className="text-sm text-bad">{children}</p>;

/** A form row: label above the input. `children` is the input element. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-mut">{hint}</span>}
      {error && <span className="text-xs font-normal text-bad">{error}</span>}
    </label>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-mut">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-4 [&_td]:py-3">{children}</tbody>
      </table>
    </div>
  );
}

export function Avatar({ name, src, size = 36 }: { name: string; src: string | null; size?: number }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-chip font-bold text-info" style={{ width: size, height: size, fontSize: size / 2.3 }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}
