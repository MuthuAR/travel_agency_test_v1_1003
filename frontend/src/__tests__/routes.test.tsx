import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AdminRoute } from '../components/auth/AdminRoute';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { makeAuth, makeUser, renderWithAuth } from './authTestUtils';

function TestRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<div>login page</div>} />
      <Route path="/admin/login" element={<div>admin login page</div>} />
      <Route path="/dashboard" element={<ProtectedRoute><div>customer area</div></ProtectedRoute>} />
      <Route path="/admin/enquiries" element={<AdminRoute><div>admin area</div></AdminRoute>} />
    </Routes>
  );
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users to /login', () => {
    renderWithAuth(<TestRoutes />, { route: '/dashboard' });
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children for a customer', () => {
    const auth = makeAuth({ user: makeUser() });
    renderWithAuth(<TestRoutes />, { route: '/dashboard', auth });
    expect(screen.getByText('customer area')).toBeInTheDocument();
  });

  it('sends admins to the admin area', () => {
    const auth = makeAuth({ user: makeUser({ role: 'admin' }) });
    renderWithAuth(<TestRoutes />, { route: '/dashboard', auth });
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });

  it('shows a spinner while the session loads', () => {
    const auth = makeAuth({ isLoading: true });
    renderWithAuth(<TestRoutes />, { route: '/dashboard', auth });
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.queryByText('customer area')).not.toBeInTheDocument();
  });
});

describe('AdminRoute', () => {
  it('redirects anonymous users to /admin/login', () => {
    renderWithAuth(<TestRoutes />, { route: '/admin/enquiries' });
    expect(screen.getByText('admin login page')).toBeInTheDocument();
  });

  it('redirects customers away from the admin area', () => {
    const auth = makeAuth({ user: makeUser() });
    renderWithAuth(<TestRoutes />, { route: '/admin/enquiries', auth });
    expect(screen.getByText('customer area')).toBeInTheDocument();
  });

  it('renders children for an admin', () => {
    const auth = makeAuth({ user: makeUser({ role: 'admin' }) });
    renderWithAuth(<TestRoutes />, { route: '/admin/enquiries', auth });
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });
});
