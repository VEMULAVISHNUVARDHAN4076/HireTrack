import { STATUS_LABELS, STATUS_STYLES } from '../utils/format';

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-green-200 bg-green-50 text-green-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  return (
    <div role={type === 'error' ? 'alert' : 'status'} className={`animate-fade-in rounded-lg border px-4 py-3 text-sm ${styles[type]}`}>
      {children}
    </div>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h3 className="text-base font-medium text-slate-800">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || 'bg-slate-100'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function StatCard({ label, value }) {
  return (
    <div className="card card-lift animate-scale-in">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

export function Field({ label, htmlFor, error, hint, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function Pagination({ meta, onChange }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-sm">
      <button className="btn-secondary" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        Previous
      </button>
      <span className="text-slate-600">Page {meta.page} of {meta.pages} · {meta.total} results</span>
      <button className="btn-secondary" disabled={meta.page >= meta.pages} onClick={() => onChange(meta.page + 1)}>
        Next
      </button>
    </nav>
  );
}

export function Chip({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    amber: 'bg-amber-100 text-amber-900',
  };
  return <span className={`mr-1.5 mb-1.5 inline-flex rounded-md px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function ScoreBar({ score }) {
  const value = score ?? 0;
  const color = value >= 70 ? 'bg-green-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
        <div className={`h-full origin-left animate-grow-x ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-sm font-medium text-slate-800">{score == null ? '—' : `${value}%`}</span>
    </div>
  );
}
