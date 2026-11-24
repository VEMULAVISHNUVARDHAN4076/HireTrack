export const STATUS_LABELS = {
  applied: 'Applied',
  under_review: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export const STATUS_STYLES = {
  applied: 'bg-blue-100 text-blue-800',
  under_review: 'bg-amber-100 text-amber-800',
  shortlisted: 'bg-indigo-100 text-indigo-800',
  interview: 'bg-purple-100 text-purple-800',
  offered: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-slate-200 text-slate-700',
};

export const EMPLOYMENT_LABELS = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export const SEEKER_WITHDRAWABLE = ['applied', 'under_review', 'shortlisted', 'interview'];
export const RECRUITER_STATUSES = ['applied', 'under_review', 'shortlisted', 'interview', 'offered', 'rejected'];

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function splitList(value) {
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function toYear(value) {
  return value === '' || value == null ? null : Number(value);
}
