import { Badge } from '@chakra-ui/react';
import type { EnquiryStatus } from '../../types';

interface StatusStyle {
  label: string;
  colorScheme: string;
}

const STATUS_STYLES: Record<EnquiryStatus, StatusStyle> = {
  new: { label: 'New', colorScheme: 'blue' },
  contacted: { label: 'Contacted', colorScheme: 'orange' },
  confirmed: { label: 'Confirmed', colorScheme: 'green' },
  cancelled: { label: 'Cancelled', colorScheme: 'red' },
  closed: { label: 'Closed', colorScheme: 'gray' },
};

interface StatusBadgeProps {
  status: EnquiryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style: StatusStyle = STATUS_STYLES[status] ?? { label: status, colorScheme: 'gray' };
  return (
    <Badge colorScheme={style.colorScheme} rounded="full" px={3} py={1} textTransform="capitalize">
      {style.label}
    </Badge>
  );
}
