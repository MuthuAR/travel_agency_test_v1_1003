import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { StatusBadge } from '../components/enquiry/StatusBadge';
import { renderWithProviders } from './testUtils';
import type { EnquiryStatus } from '../types';

describe('StatusBadge', () => {
  const cases: Array<[EnquiryStatus, string]> = [
    ['new', 'New'],
    ['contacted', 'Contacted'],
    ['confirmed', 'Confirmed'],
    ['cancelled', 'Cancelled'],
    ['closed', 'Closed'],
  ];

  it.each(cases)('renders the label for %s', (status, label) => {
    renderWithProviders(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
