import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Table, TableContainer, Tbody, Td, Text, Th, Thead, Tr } from '@chakra-ui/react';
import { StatusBadge } from '../enquiry/StatusBadge';
import { formatDate, formatEnquiryRef, formatGlobalEnquiryRef } from '../../lib/format';
import type { AdminEnquiry } from '../../types';

interface EnquiryTableProps {
  enquiries: AdminEnquiry[];
}

export function EnquiryTable({ enquiries }: EnquiryTableProps) {
  if (enquiries.length === 0) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="gray.600">No enquiries match your filters.</Text>
      </Box>
    );
  }

  return (
    <TableContainer bg="whiteAlpha.800" rounded="2xl" boxShadow="md">
      <Table variant="simple" size="md">
        <Thead>
          <Tr>
            <Th>Global ENQ</Th>
            <Th>Customer ENQ</Th>
            <Th>Customer</Th>
            <Th>Mobile</Th>
            <Th>Route</Th>
            <Th>Dates</Th>
            <Th>Status</Th>
            <Th>Details</Th>
          </Tr>
        </Thead>
        <Tbody>
          {enquiries.map((enquiry) => (
            <Tr key={enquiry.id} _hover={{ bg: 'brand.50' }}>
              <Td>{formatGlobalEnquiryRef(enquiry.id)}</Td>
              <Td>{enquiry.enquiry_no != null ? formatEnquiryRef(enquiry.enquiry_no) : '-'}</Td>
              <Td>{enquiry.customer?.name ?? 'Unknown'}</Td>
              <Td>{enquiry.customer?.mobile ?? '-'}</Td>
              <Td whiteSpace="normal" wordBreak="break-word">
                {enquiry.pickup_location} to {enquiry.drop_location}
              </Td>
              <Td>
                {formatDate(enquiry.start_date)} - {formatDate(enquiry.end_date)}
              </Td>
              <Td>
                <StatusBadge status={enquiry.status} />
              </Td>
              <Td>
                <Link
                  as={RouterLink}
                  to={`/admin/enquiries/${enquiry.id}`}
                  color="brand.600"
                  fontWeight="semibold"
                  aria-label={`View enquiry ${enquiry.id}`}
                >
                  View
                </Link>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
