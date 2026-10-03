import { Box, Divider, Flex, SimpleGrid, Text } from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatEnquiryRef, formatGlobalEnquiryRef } from '../../lib/format';
import type { Enquiry } from '../../types';

interface FieldProps {
  label: string;
  value: string;
}

function Field({ label, value }: FieldProps) {
  return (
    <Box>
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="wide" color="gray.500">
        {label}
      </Text>
      <Text fontWeight="medium" whiteSpace="pre-wrap" wordBreak="break-word">
        {value}
      </Text>
    </Box>
  );
}

interface EnquiryDetailProps {
  enquiry: Enquiry;
  /** `admin` shows both the customer and global references; default `customer`. */
  variant?: 'customer' | 'admin';
}

/** Renders every field as plain text. */
export function EnquiryDetail({ enquiry, variant = 'customer' }: EnquiryDetailProps) {
  const isAdmin = variant === 'admin';
  return (
    <GlassCard whileHover={{ scale: 1.0, y: 0 }}>
      <Flex justify="space-between" align="center" gap={3} wrap="wrap" mb={4}>
        {isAdmin ? (
          <Text fontSize="xl" fontWeight="bold">
            Enquiry
          </Text>
        ) : (
          <Text fontSize="xl" fontWeight="bold">
            Enquiry {formatEnquiryRef(enquiry.enquiry_no ?? enquiry.id)}
          </Text>
        )}
        <StatusBadge status={enquiry.status} />
      </Flex>
      {isAdmin && (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
          <Field
            label="Customer ENQ"
            value={enquiry.enquiry_no != null ? formatEnquiryRef(enquiry.enquiry_no) : '-'}
          />
          <Field label="Global ENQ" value={formatGlobalEnquiryRef(enquiry.id)} />
        </SimpleGrid>
      )}
      <Divider mb={4} />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Start date" value={formatDate(enquiry.start_date)} />
        <Field label="End date" value={formatDate(enquiry.end_date)} />
        <Field label="Pickup location" value={enquiry.pickup_location} />
        <Field label="Drop location" value={enquiry.drop_location} />
        <Field label="Adults" value={String(enquiry.adults_count)} />
        <Field label="Kids" value={String(enquiry.kids_count)} />
        <Field label="Vehicle preference" value={enquiry.vehicle_preference} />
        <Field label="Submitted" value={formatDate(enquiry.created_at)} />
      </SimpleGrid>
      <Box mt={4}>
        <Field label="Travel routes" value={enquiry.travel_routes} />
      </Box>
      {enquiry.others && (
        <Box mt={4}>
          <Field label="Others" value={enquiry.others} />
        </Box>
      )}
    </GlassCard>
  );
}
