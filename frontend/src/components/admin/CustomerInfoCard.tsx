import { Box, SimpleGrid, Text } from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { formatMediums } from '../../lib/validation';
import type { CustomerProfile } from '../../types';

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

interface CustomerInfoCardProps {
  customer: CustomerProfile | null;
}

export function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  return (
    <GlassCard whileHover={{ scale: 1.0, y: 0 }}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Customer
      </Text>
      {customer ? (
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Field
            label="Account type"
            value={customer.account_type === 'organization' ? 'Organization' : 'Personal'}
          />
          {customer.account_type === 'organization' && (
            <Field label="Organization name" value={customer.organization_name ?? '-'} />
          )}
          <Field
            label={customer.account_type === 'organization' ? 'Staff name' : 'Name'}
            value={customer.name}
          />
          {customer.gender && <Field label="Gender" value={customer.gender} />}
          <Field label="Mobile" value={customer.mobile} />
          <Field label="Email" value={customer.email ?? '-'} />
          {customer.spoken_languages.length > 0 && (
            <Field label="Spoken languages" value={customer.spoken_languages.join(', ')} />
          )}
          {customer.communication_mediums.length > 0 && (
            <Field
              label="Preferred communication"
              value={formatMediums(customer.communication_mediums)}
            />
          )}
          <Field label="Address" value={customer.address} />
        </SimpleGrid>
      ) : (
        <Text color="gray.600">Customer profile not available.</Text>
      )}
    </GlassCard>
  );
}
