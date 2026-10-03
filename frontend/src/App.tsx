import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { SessionTimeoutManager } from './components/auth/SessionTimeoutManager';
import { FullPageSpinner } from './components/layout/FullPageSpinner';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NewEnquiryPage = lazy(() => import('./pages/NewEnquiryPage'));
const EnquiryDetailPage = lazy(() => import('./pages/EnquiryDetailPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const AdminEnquiriesPage = lazy(() => import('./pages/AdminEnquiriesPage'));
const AdminEnquiryDetailPage = lazy(() => import('./pages/AdminEnquiryDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Customer (authenticated) */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/enquiries/new" element={<ProtectedRoute><NewEnquiryPage /></ProtectedRoute>} />
        <Route path="/enquiries/:id" element={<ProtectedRoute><EnquiryDetailPage /></ProtectedRoute>} />

        {/* Admin only */}
        <Route path="/admin" element={<Navigate to="/admin/enquiries" replace />} />
        <Route path="/admin/enquiries" element={<AdminRoute><AdminEnquiriesPage /></AdminRoute>} />
        <Route path="/admin/enquiries/:id" element={<AdminRoute><AdminEnquiryDetailPage /></AdminRoute>} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
