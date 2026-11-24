import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage, notificationsApi } from '../services/api';
import { Alert, EmptyState, Pagination, Spinner } from '../components/ui';
import { formatDateTime } from '../utils/format';

export default function Notifications() {
  const [state, setState] = useState({ items: null, meta: null, unreadCount: 0 });
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    notificationsApi.list({ page, per_page: 10, unread: unreadOnly ? 'true' : undefined })
      .then(setState)
      .catch((err) => setError(errorMessage(err)));
  };

  useEffect(load, [page, unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRead = async (id) => {
    await notificationsApi.markRead(id);
    load();
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Notifications {state.unreadCount > 0 && <span className="text-base text-brand-700">({state.unreadCount} unread)</span>}</h1>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => { setPage(1); setUnreadOnly((v) => !v); }}>
            {unreadOnly ? 'Show all' : 'Show unread'}
          </button>
          <button className="btn-secondary" onClick={markAll} disabled={state.unreadCount === 0}>Mark all read</button>
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {!state.items && !error && <Spinner label="Loading notifications" />}
      {state.items?.length === 0 && <EmptyState title="You're all caught up" description="New updates will appear here." />}
      <ul className="space-y-3">
        {state.items?.map((n) => (
          <li key={n.id} className={`card flex flex-wrap items-start justify-between gap-3 ${n.is_read ? '' : 'border-brand-200 bg-brand-50/40'}`}>
            <div>
              <p className="font-medium text-slate-900">{n.title}</p>
              <p className="text-sm text-slate-700">{n.message}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
            </div>
            <div className="flex gap-2">
              {n.link && <Link to={n.link} className="btn-secondary" onClick={() => !n.is_read && markRead(n.id)}>Open</Link>}
              {!n.is_read && <button className="btn-secondary" onClick={() => markRead(n.id)}>Mark read</button>}
            </div>
          </li>
        ))}
      </ul>
      <Pagination meta={state.meta} onChange={setPage} />
    </div>
  );
}
