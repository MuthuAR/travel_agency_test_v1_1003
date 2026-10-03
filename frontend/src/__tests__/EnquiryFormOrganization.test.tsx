import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnquiryForm } from '../components/enquiry/EnquiryForm';
import { enquiryService } from '../services/enquiryService';
import { makeEnquiry, renderWithProviders } from './testUtils';

vi.mock('../services/enquiryService', () => ({
  enquiryService: { create: vi.fn(), list: vi.fn(), get: vi.fn() },
}));

type UserEventInstance = ReturnType<typeof userEvent.setup>;

function fillTripFields(): void {
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2099-01-10' } });
  fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2099-01-15' } });
  fireEvent.change(screen.getByLabelText('Pickup location'), { target: { value: 'Chennai' } });
  fireEvent.change(screen.getByLabelText('Drop location'), { target: { value: 'Madurai' } });
  fireEvent.change(screen.getByLabelText('Travel routes'), {
    target: { value: 'Chennai - Trichy - Madurai' },
  });
}

async function fillEmployee(
  user: UserEventInstance,
  position: number,
  name: string,
  mobile: string,
): Promise<void> {
  const card = within(screen.getByRole('group', { name: `Employee ${position}` }));
  await user.type(card.getByLabelText('Name'), name);
  await user.type(card.getByLabelText('Mobile number'), mobile);
  await user.selectOptions(card.getByLabelText('Gender'), 'male');
  await user.click(card.getByLabelText('Tamil'));
  await user.click(card.getByLabelText('WhatsApp'));
}

describe('EnquiryForm for organization accounts', () => {
  beforeEach(() => {
    vi.mocked(enquiryService.create).mockReset();
  });

  it('shows a Travellers section instead of Adults and Kids', () => {
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="organization" />);

    expect(screen.getByText('Travellers')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Employee 1' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Adults')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Kids')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Additional travellers (count only)')).toHaveValue(0);
    expect(
      screen.getByText(/Travellers whose details you are not entering above/),
    ).toBeInTheDocument();
    expect(screen.getByText('Total travellers: 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove employee 1' })).not.toBeInTheDocument();
  });

  it('adds and removes employees and updates the total', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="organization" />);

    await user.click(screen.getByRole('button', { name: 'Add another employee' }));
    expect(screen.getByRole('group', { name: 'Employee 2' })).toBeInTheDocument();
    expect(screen.getByText('Total travellers: 2')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Additional travellers (count only)'), {
      target: { value: '3' },
    });
    expect(screen.getByText('Total travellers: 5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove employee 2' }));
    expect(screen.queryByRole('group', { name: 'Employee 2' })).not.toBeInTheDocument();
    expect(screen.getByText('Total travellers: 4')).toBeInTheDocument();
  });

  it('validates required employee fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="organization" />);
    fillTripFields();

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByText('Mobile number is required')).toBeInTheDocument();
    expect(screen.getByText('Select a gender')).toBeInTheDocument();
    expect(screen.getByText('Select or enter at least one language')).toBeInTheDocument();
    expect(screen.getByText('Select at least one communication medium')).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid employee mobile number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="organization" />);
    fillTripFields();
    await fillEmployee(user, 1, 'Ravi Kumar', '12345');

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText(/Enter a valid mobile number/)).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('rejects a total above 100 travellers', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="organization" />);
    fillTripFields();
    await fillEmployee(user, 1, 'Ravi Kumar', '9123456780');
    fireEvent.change(screen.getByLabelText('Additional travellers (count only)'), {
      target: { value: '100' },
    });

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    expect(await screen.findByText('Total travellers cannot exceed 100')).toBeInTheDocument();
    expect(enquiryService.create).not.toHaveBeenCalled();
  });

  it('submits passengers and the additional count without adults or kids', async () => {
    const user = userEvent.setup();
    const created = makeEnquiry({ id: 7 });
    vi.mocked(enquiryService.create).mockResolvedValue(created);
    const onCreated = vi.fn();
    renderWithProviders(<EnquiryForm onCreated={onCreated} accountType="organization" />);
    fillTripFields();

    await fillEmployee(user, 1, '  Ravi Kumar ', '91234 56780');
    await user.type(
      within(screen.getByRole('group', { name: 'Employee 1' })).getByLabelText(
        'Other languages (comma separated)',
      ),
      'Urdu',
    );
    await user.click(screen.getByRole('button', { name: 'Add another employee' }));
    await fillEmployee(user, 2, 'Meena S', '+919876543210');
    fireEvent.change(screen.getByLabelText('Additional travellers (count only)'), {
      target: { value: '3' },
    });

    await user.click(screen.getByRole('button', { name: /submit enquiry/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(enquiryService.create).toHaveBeenCalledWith({
      start_date: '2099-01-10',
      end_date: '2099-01-15',
      pickup_location: 'Chennai',
      drop_location: 'Madurai',
      travel_routes: 'Chennai - Trichy - Madurai',
      vehicle_preference: 'No preference',
      passengers: [
        {
          name: 'Ravi Kumar',
          mobile: '9123456780',
          gender: 'male',
          spoken_languages: ['Tamil', 'Urdu'],
          communication_mediums: ['whatsapp'],
        },
        {
          name: 'Meena S',
          mobile: '+919876543210',
          gender: 'male',
          spoken_languages: ['Tamil'],
          communication_mediums: ['whatsapp'],
        },
      ],
      additional_travellers_count: 3,
    });
    const sent = vi.mocked(enquiryService.create).mock.calls[0][0];
    expect('adults_count' in sent).toBe(false);
    expect('kids_count' in sent).toBe(false);
  });
});

describe('EnquiryForm for personal accounts', () => {
  it('keeps Adults and Kids and shows no travellers section', () => {
    renderWithProviders(<EnquiryForm onCreated={vi.fn()} accountType="personal" />);

    expect(screen.getByLabelText('Adults')).toBeInTheDocument();
    expect(screen.getByLabelText('Kids')).toBeInTheDocument();
    expect(screen.queryByText('Travellers')).not.toBeInTheDocument();
    expect(screen.queryByText(/Total travellers/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add another employee' })).not.toBeInTheDocument();
  });
});
