import { useEffect, useState } from 'react';
import { Alert, AlertIcon, Container, Flex, Spinner, Text } from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryTable } from '../components/admin/EnquiryTable';
import { EMPTY_FILTERS, FilterBar } from '../components/admin/FilterBar';
import type { EnquiryFilterValues } from '../components/admin/FilterBar';
import { Pagination } from '../components/admin/Pagination';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../lib/errors';
import type { AdminEnquiry, AdminEnquiryFilters, Paginated } from '../types';

const PAGE_SIZE = 10;

function toQuery(filters: EnquiryFilterValues, page: number): AdminEnquiryFilters {
  const query: AdminEnquiryFilters = { page, page_size: PAGE_SIZE };
  if (filters.status) query.status = filters.status;
  if (filters.search) query.search = filters.search;
  if (filters.start_date_from) query.start_date_from = filters.start_date_from;
  if (filters.start_date_to) query.start_date_to = filters.start_date_to;
  return query;
}

export default function AdminEnquiriesPage() {
  const [filters, setFilters] = useState<EnquiryFilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<Paginated<AdminEnquiry> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminService
      .listEnquiries(toQuery(filters, page))
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, page]);

  const handleApply = (next: EnquiryFilterValues): void => {
    setPage(1);
    setFilters(next);
  };

  return (
    <PageWrapper>
      <AppHeader />
      <Container maxW="container.xl" py={10}>
        <TextReveal text="All enquiries" size="lg" mb={6} />
        <FilterBar initial={filters} onApply={handleApply} />

        {error && (
          <Alert status="error" rounded="xl" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading && !data && (
          <Flex justify="center" py={12}>
            <Spinner size="lg" color="brand.500" />
          </Flex>
        )}

        {data && (
          <>
            <Text color="gray.600" mb={3}>
              {data.total} {data.total === 1 ? 'enquiry' : 'enquiries'} found
            </Text>
            <EnquiryTable enquiries={data.items} />
            <Pagination
              page={data.page}
              pageSize={data.page_size}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Container>
    </PageWrapper>
  );
}
