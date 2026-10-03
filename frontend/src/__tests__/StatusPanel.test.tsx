import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusPanel } from '../components/admin/StatusPanel';
import { adminService } from '../services/adminService';
import { makeAdminEnquiry, renderWithProviders } from './testUtils';
import type { AdminEnquiry } from '../types';

vi.mock('../services/adminService', () => ({
  adminService: {
    updateStatus: vi.fn(),
  },
}));

const updateStatus = vi.mocked(adminService.updateStatus);

interface HarnessProps {
  initial: AdminEnquiry;
}

function Harness({ initial }: HarnessProps) {
  const [enquiry, setEnquiry] = useState<AdminEnquiry>(initial);
  return <StatusPanel enquiry={enquiry} onUpdated={setEnquiry} />;
}

function optionLabels(): Array<string | null> {
  const select = screen.getByLabelText('Change status to');
  return within(select)
    .getAllByRole('option')
    .map((o) => o.textContent);
}

describe('StatusPanel', () => {
  beforeEach(() => {
    updateStatus.mockReset();
  });

  it('offers every non-new status except the current one', () => {
    renderWithProviders(<Harness initial={makeAdminEnquiry({ status: 'new' })} />);
    expect(optionLabels()).toEqual([
      'Select a status',
      'Acknowledged',
      'Confirmed',
      'Cancelled',
      'Completed',
    ]);
  });

  it('excludes the current status and never offers New', () => {
    renderWithProviders(<Harness initial={makeAdminEnquiry({ status: 'confirmed' })} />);
    const labels = optionLabels();
    expect(labels).not.toContain('Confirmed');
    expect(labels).not.toContain('New');
    expect(labels).toEqual(['Select a status', 'Acknowledged', 'Cancelled', 'Completed']);
  });

  it('disables Update until a status is selected, then calls the service', async () => {
    const user = userEvent.setup();
    updateStatus.mockResolvedValue(makeAdminEnquiry({ status: 'ack' }));
    renderWithProviders(<Harness initial={makeAdminEnquiry({ id: 4 })} />);

    const button = screen.getByRole('button', { name: 'Update status' });
    expect(button).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Change status to'), 'ack');
    expect(button).toBeEnabled();
    await user.click(button);

    expect(updateStatus).toHaveBeenCalledWith(4, 'ack');
  });

  it('requires confirming the dialog before cancelling', async () => {
    const user = userEvent.setup();
    updateStatus.mockResolvedValue(makeAdminEnquiry({ id: 4, status: 'cancelled' }));
    renderWithProviders(<Harness initial={makeAdminEnquiry({ id: 4 })} />);

    await user.selectOptions(screen.getByLabelText('Change status to'), 'cancelled');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByText('Cancel this enquiry?')).toBeInTheDocument();
    expect(updateStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Yes, cancel enquiry' }));
    expect(updateStatus).toHaveBeenCalledWith(4, 'cancelled');
  });

  it('does not cancel when the user goes back', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness initial={makeAdminEnquiry({ id: 4 })} />);

    await user.selectOptions(screen.getByLabelText('Change status to'), 'cancelled');
    await user.click(screen.getByRole('button', { name: 'Update status' }));
    await user.click(await screen.findByRole('button', { name: 'Go back' }));

    expect(updateStatus).not.toHaveBeenCalled();
  });

  it('refreshes the status and history after a successful update', async () => {
    const user = userEvent.setup();
    updateStatus.mockResolvedValue(
      makeAdminEnquiry({
        id: 4,
        status: 'confirmed',
        status_history: [
          {
            id: 1,
            from_status: 'new',
            to_status: 'confirmed',
            changed_at: '2026-10-02T09:30:00Z',
            changed_by_email: 'staff@example.com',
          },
        ],
      }),
    );
    renderWithProviders(<Harness initial={makeAdminEnquiry({ id: 4 })} />);

    await user.selectOptions(screen.getByLabelText('Change status to'), 'confirmed');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByText('Status updated to Confirmed')).toBeInTheDocument();
    expect(screen.getByText(/New to Confirmed, .*, by staff@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/^Submitted, /)).toBeInTheDocument();
    expect(optionLabels()).not.toContain('Confirmed');
  });

  it('shows an error alert when the update fails', async () => {
    const user = userEvent.setup();
    updateStatus.mockRejectedValue(new Error('Server exploded'));
    renderWithProviders(<Harness initial={makeAdminEnquiry({ id: 4 })} />);

    await user.selectOptions(screen.getByLabelText('Change status to'), 'completed');
    await user.click(screen.getByRole('button', { name: 'Update status' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
