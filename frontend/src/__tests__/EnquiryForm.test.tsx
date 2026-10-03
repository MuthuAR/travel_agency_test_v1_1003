import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryForm } from '../components/enquiry/EnquiryForm';
import { enquiryService } from '../services/enquiryService';
import { makeEnquiry, renderWithProviders } from './testUtils';

vi.mock('../services/enquiryService', () => ({
  enquiryService: { create: vi.fn(), list: vi.fn(), get: vi.fn() },
}));

function fillValidForm(): void {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-01-10' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-15' } });
  fireEvent.change(screen.getByLabelText('Pickup location'), { target: { value: 'Chennai' } });
  fireEvent.change(screen.getByLabelText('Drop location'), { target: { value: 'Madurai' } });
  fireEvent.change(screen.getByLabelText('Travel routes'), {
    target: { value: 'Chennai - Trichy - Madurai' },
  });
}

describe('EnquiryForm', () => {
  beforeEach(() => {
    vi.mocked(enquiryService.create).mockReset();
  });

  it('shows required-field errors and does not submit an empty form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Start date is required')).toBeInTheDocument();
    expect(screen.getByText('Pickup location is required')).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('rejects a start date in the past', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2000-01-01' } });

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Start date cannot be in the past')).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('rejects an end date before the start date', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-05' } });

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(
      await screen.findByText('End date must be on or after the start date'),
    ).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('requires at least one passenger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} />);
    fillValidForm();
    fireEvent.change(screen.getByLabelText('Adults'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Kids'), { target: { value: '0' } });

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('At least one passenger is required')).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('submits a valid enquiry and reports the created record', async () => {
    const user = userEvent.setup();
    const created = makeEnquiry({ id: 42 });
    vi.mocked(enquiryService.create).mockResolvedValue(created);
    const onCreated = vi.fn();
    renderWithProviders(<EnquiryForm onCreated={onCreated} />);
    fillValidForm();

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(enquiryService.create).toHaveBeenCalledWith({
      start_date: '2099-01-10',
      end_date: '2099-01-15',
      pickup_location: 'Chennai',
      drop_location: 'Madurai',
      travel_routes: 'Chennai - Trichy - Madurai',
      adults_count: 1,
      kids_count: 0,
      vehicle_preference: 'No preference',
    });
  });

  it('shows a general error when the service fails', async () => {
    const user = userEvent.setup();
    vi.mocked(enquiryService.create).mockRejectedValue(new Error('Server exploded'));
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} />);
    fillValidForm();

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Server exploded')).toBeInTheDocument();
  });
});
