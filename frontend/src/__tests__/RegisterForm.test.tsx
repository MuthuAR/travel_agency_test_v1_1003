import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RegisterForm } from '../components/auth/RegisterForm';
import { makeAuth, renderWithAuth } from './authTestUtils';

type UserEventInstance = ReturnType<typeof userEvent.setup>;

async function fillValidForm(user: UserEventInstance): Promise<void> {
  await user.type(screen.getByLabelText('Mobile number'), '98765 43210');
  await user.type(screen.getByLabelText('Full name'), 'Jane Doe');
  await user.selectOptions(screen.getByLabelText('Gender'), 'female');
  await user.click(screen.getByLabelText('Tamil'));
  await user.click(screen.getByLabelText('WhatsApp'));
  await user.type(screen.getByLabelText('Address'), '12 Beach Road');
  await user.type(screen.getByLabelText('Password'), 'secret123');
  await user.type(screen.getByLabelText('Confirm password'), 'secret123');
}

describe('RegisterForm', () => {
  it('shows validation errors for an empty form and does not submit', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<RegisterForm onSuccess={vi.fn()} />, { auth });

    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Mobile number is required')).toBeInTheDocument();
    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Select a gender')).toBeInTheDocument();
    expect(screen.getByText('Select or enter at least one language')).toBeInTheDocument();
    expect(screen.getByText('Select at least one communication medium')).toBeInTheDocument();
    expect(screen.getByText('Address is required')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('rejects an invalid mobile number, bad email and weak password', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<RegisterForm onSuccess={vi.fn()} />, { auth });

    await user.type(screen.getByLabelText('Mobile number'), '12345');
    await user.type(screen.getByLabelText('Email (optional)'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'onlyletters');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Enter a valid mobile number/)).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must contain at least one letter and one digit')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('requires matching passwords', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<RegisterForm onSuccess={vi.fn()} />, { auth });

    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm password'), 'secret124');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('submits a normalized payload and omits an empty email', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    const onSuccess = vi.fn();
    renderWithAuth(<RegisterForm onSuccess={onSuccess} />, { auth });

    await fillValidForm(user);
    await user.type(screen.getByLabelText('Other languages (comma separated)'), 'Urdu, Tamil');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(auth.register).toHaveBeenCalledWith({
      mobile: '9876543210',
      password: 'secret123',
      name: 'Jane Doe',
      gender: 'female',
      spoken_languages: ['Tamil', 'Urdu'],
      communication_mediums: ['whatsapp'],
      address: '12 Beach Road',
    });
  });

  it('submits several communication mediums as an array', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    const onSuccess = vi.fn();
    renderWithAuth(<RegisterForm onSuccess={onSuccess} />, { auth });

    await fillValidForm(user);
    await user.click(screen.getByLabelText('Email'));
    await user.click(screen.getByLabelText('SMS'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(auth.register).toHaveBeenCalledWith(
      expect.objectContaining({ communication_mediums: ['whatsapp', 'sms', 'email'] }),
    );
  });

  it('blocks submit when no communication medium is selected', async () => {
    const user = userEvent.setup();
    const auth = makeAuth();
    renderWithAuth(<RegisterForm onSuccess={vi.fn()} />, { auth });

    await fillValidForm(user);
    await user.click(screen.getByLabelText('WhatsApp'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Select at least one communication medium')).toBeInTheDocument();
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('only offers English, Tamil and Hindi as language checkboxes', () => {
    renderWithAuth(<RegisterForm onSuccess={vi.fn()} />);

    expect(screen.getByLabelText('English')).toBeInTheDocument();
    expect(screen.getByLabelText('Tamil')).toBeInTheDocument();
    expect(screen.getByLabelText('Hindi')).toBeInTheDocument();
    expect(screen.queryByLabelText('Telugu')).not.toBeInTheDocument();
  });
});
