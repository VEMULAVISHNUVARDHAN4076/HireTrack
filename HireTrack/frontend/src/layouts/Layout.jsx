import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PUBLIC_NAV = [
  ['Browse jobs', '/jobs'],
  ['About', '/about'],
];

const ROLE_NAV = {
  candidate: [
    ['Dashboard', '/candidate'],
    ['My profile', '/candidate/profile'],
    ['My resumes', '/candidate/resumes'],
    ['Applications', '/candidate/applications'],
    ['Recommendations', '/candidate/recommendations'],
    ['Saved jobs', '/candidate/saved'],
    ['Browse jobs', '/jobs'],
    ['Notifications', '/notifications'],
    ['Settings', '/settings'],
  ],
  recruiter: [
    ['Dashboard', '/recruiter'],
    ['Company profile', '/recruiter/company'],
    ['Manage jobs', '/recruiter/jobs'],
    ['Post a job', '/recruiter/jobs/new'],
    ['Notifications', '/notifications'],
    ['Settings', '/settings'],
  ],
  admin: [
    ['Admin dashboard', '/admin'],
    ['Notifications', '/notifications'],
    ['Settings', '/settings'],
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = user ? ROLE_NAV[user.role] : PUBLIC_NAV;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="text-lg font-bold text-brand-700">HireTrack</Link>
          <nav aria-label="Primary" className="hidden items-center gap-5 md:flex">
            {!user && PUBLIC_NAV.map(([label, to]) => (
              <NavLink key={to} to={to} className={({ isActive }) =>
                `text-sm ${isActive ? 'font-semibold text-brand-700' : 'text-slate-600 hover:text-slate-900'}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="hidden text-sm text-slate-600 sm:inline">{user.full_name}</span>
                <button className="btn-secondary" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">Log in</Link>
                <Link to="/register" className="btn-primary">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        {user && (
          <aside className="hidden w-56 shrink-0 md:block" aria-label="Sidebar">
            <nav className="sticky top-24 space-y-1">
              {links.map(([label, to]) => (
                <NavLink key={to} to={to} end
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100'}`}>
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}
        <main className="min-w-0 flex-1">
          {user && (
            <nav aria-label="Mobile" className="mb-4 flex gap-2 overflow-x-auto pb-2 md:hidden">
              {links.map(([label, to]) => (
                <NavLink key={to} to={to} className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs">
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        HireTrack · Academic project · AI scores are estimates and never make hiring decisions.
      </footer>
    </div>
  );
}
