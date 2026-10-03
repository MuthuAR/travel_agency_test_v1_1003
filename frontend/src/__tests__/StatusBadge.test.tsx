import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { StatusBadge } from '../components/enquiry/StatusBadge';
import { renderWithProviders } from './testUtils';
import type { EnquiryStatus } from '../types';

describe('StatusBadge', () => {
  const cases: Array<[EnquiryStatus, string]> = [
    ['new', 'New'],
    ['ack', 'Acknowledged'],
    ['confirmed', 'Confirmed'],
    ['cancelled', 'Cancelled'],
    ['completed', 'Completed'],
  ];

  it.each(cases)('renders the label for %s', (status, label) => {
    renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
