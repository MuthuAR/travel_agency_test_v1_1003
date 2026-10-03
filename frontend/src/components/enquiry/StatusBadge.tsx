import { Badge } from '@chakra-ui/react';
import { STATUS_COLORS, isStatus, statusLabel } from '../../lib/status';
import type { EnquiryStatus } from '../../types';

interface StatusBadgeProps {
  status: EnquiryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorScheme: string = isStatus(status) ? STATUS_COLORS[status] : 'gray';
  return (
    <Badge colorScheme={colorScheme} rounded="full" px={3} py={1} textTransform="capitalize">
      {statusLabel(status)}
    </Badge>
  );
}
