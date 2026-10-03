import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../components/auth/LoginForm';
import { makeAuth, makeUser, renderWithAuth } from './authTestUtils';

describe('LoginForm', () => {
  it('logs in with an email identifier', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    const onSuccess = vi.fn();
    renderWithAuth(<LoginForm onSuccess={onSuccess} />, { auth });

    await user.type(screen.getByLabelText('Email or mobile number'), 'jane@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(auth.login).toHaveBeenCalledWith('jane@example.com', 'secret123');
  });

  it('strips spaces and dashes from a mobile identifier', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<LoginForm onSuccess={vi.fn()} />, { auth });

    await user.type(screen.getByLabelText('Email or mobile number'), '+91 98765-43210');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('+919876543210', 'secret123'));
  });

  it('requires both fields', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<LoginForm onSuccess={vi.fn()} />, { auth });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter your email or mobile number')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('shows an error when login fails', async () => {
    const user = userEvent.setup();
    const auth = makeAuth({
      login: vi.fn<ReturnType<typeof makeAuth>['login']>().mockRejectedValue(new Error('Invalid credentials')),
    });
    const onSuccess = vi.fn();
    renderWithAuth(<LoginForm onSuccess={onSuccess} />, { auth });

    await user.type(screen.getByLabelText('Email or mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('rejects non-admin accounts when admin is required', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    const onSuccess = vi.fn();
    renderWithAuth(<LoginForm onSuccess={onSuccess} requireAdmin />, { auth });

    await user.type(screen.getByLabelText('Email or mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Not an admin account')).toBeInTheDocument();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('accepts admin accounts when admin is required', async () => {
    const user = userEvent.setup();
    const admin = makeUser({ role: 'admin' });
    const auth = makeAuth({
      login: vi.fn<ReturnType<typeof makeAuth>['login']>().mockResolvedValue(admin),
    });
    const onSuccess = vi.fn();
    renderWithAuth(<LoginForm onSuccess={onSuccess} requireAdmin />, { auth });

    await user.type(screen.getByLabelText('Email or mobile number'), 'admin@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(admin));
    expect(auth.logout).not.toHaveBeenCalled();
  });
});
