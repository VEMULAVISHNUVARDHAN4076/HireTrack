import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layouts/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth, HOME_BY_ROLE } from './context/AuthContext.jsx';

import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import BrowseJobs from './pages/BrowseJobs.jsx';
import JobDetail from './pages/JobDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import Notifications from './pages/Notifications.jsx';
import NotFound from './pages/NotFound.jsx';

import CandidateDashboard from './pages/candidate/CandidateDashboard.jsx';
import CandidateProfile from './pages/candidate/CandidateProfile.jsx';
import Resumes from './pages/candidate/Resumes.jsx';
import MyApplications from './pages/candidate/MyApplications.jsx';
import ApplicationDetail from './pages/candidate/ApplicationDetail.jsx';
import Recommendations from './pages/candidate/Recommendations.jsx';
import SavedJobs from './pages/candidate/SavedJobs.jsx';

import RecruiterDashboard from './pages/recruiter/RecruiterDashboard.jsx';
import CompanyProfile from './pages/recruiter/CompanyProfile.jsx';
import ManageJobs from './pages/recruiter/ManageJobs.jsx';
import JobForm from './pages/recruiter/JobForm.jsx';
import JobApplicants from './pages/recruiter/JobApplicants.jsx';

import AdminDashboard from './pages/admin/AdminDashboard.jsx';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to={HOME_BY_ROLE[user.role]} replace /> : <Home />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/about" element={<About />} />
        <Route path="/jobs" element={<BrowseJobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/applications/:id" element={<ProtectedRoute roles={['candidate', 'recruiter', 'admin']}><ApplicationDetail /></ProtectedRoute>} />

        <Route path="/candidate" element={<ProtectedRoute roles={['candidate']}><CandidateDashboard /></ProtectedRoute>} />
        <Route path="/candidate/profile" element={<ProtectedRoute roles={['candidate']}><CandidateProfile /></ProtectedRoute>} />
        <Route path="/candidate/resumes" element={<ProtectedRoute roles={['candidate']}><Resumes /></ProtectedRoute>} />
        <Route path="/candidate/applications" element={<ProtectedRoute roles={['candidate']}><MyApplications /></ProtectedRoute>} />
        <Route path="/candidate/recommendations" element={<ProtectedRoute roles={['candidate']}><Recommendations /></ProtectedRoute>} />
        <Route path="/candidate/saved" element={<ProtectedRoute roles={['candidate']}><SavedJobs /></ProtectedRoute>} />

        <Route path="/recruiter" element={<ProtectedRoute roles={['recruiter']}><RecruiterDashboard /></ProtectedRoute>} />
        <Route path="/recruiter/company" element={<ProtectedRoute roles={['recruiter']}><CompanyProfile /></ProtectedRoute>} />
        <Route path="/recruiter/jobs" element={<ProtectedRoute roles={['recruiter']}><ManageJobs /></ProtectedRoute>} />
        <Route path="/recruiter/jobs/new" element={<ProtectedRoute roles={['recruiter']}><JobForm /></ProtectedRoute>} />
        <Route path="/recruiter/jobs/:id/edit" element={<ProtectedRoute roles={['recruiter']}><JobForm /></ProtectedRoute>} />
        <Route path="/recruiter/jobs/:id/applicants" element={<ProtectedRoute roles={['recruiter']}><JobApplicants /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
