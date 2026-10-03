import { Link as RouterLink } from 'react-router-dom';
import { Flex, Link, Text } from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatEnquiryRef } from '../../lib/format';
import type { Enquiry } from '../../types';

interface EnquiryCardProps {
  enquiry: Enquiry;
}

export function EnquiryCard({ enquiry }: EnquiryCardProps) {
  const passengers = enquiry.adults_count + enquiry.kids_count;
  return (
    <Link
      as={RouterLink}
      to={`/enquiries/${enquiry.id}`}
      display="block"
      mb={4}
      _hover={{ textDecoration: 'none' }}
      aria-label={`Enquiry ${formatEnquiryRef(enquiry.enquiry_no ?? enquiry.id)}:${enquiry.pickup_location} to ${enquiry.drop_location}`}
    >
      <GlassCard>
        <Flex justify="space-between" align="start" gap={3} wrap="wrap">
          <Text fontWeight="bold" fontSize="lg" wordBreak="break-word">
            {enquiry.pickup_location} to {enquiry.drop_location}
          </Text>
          <StatusBadge status={enquiry.status} />
        </Flex>
        <Text color="gray.600" mt={2}>
          {formatDate(enquiry.start_date)} - {formatDate(enquiry.end_date)}
        </Text>
        <Text color="gray.500" fontSize="sm" mt={1}>
          {passengers} {passengers === 1 ? 'passenger' : 'passengers'} - {enquiry.vehicle_preference}
        </Text>
      </GlassCard>
    </Link>
  );
}
