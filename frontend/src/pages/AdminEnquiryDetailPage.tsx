import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, AlertIcon, Container, Flex, Link, Spinner, VStack } from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryDetail } from '../components/enquiry/EnquiryDetail';
import { CustomerInfoCard } from '../components/admin/CustomerInfoCard';
import { StatusPanel } from '../components/admin/StatusPanel';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import { adminService } from '../services/adminService';
import { getErrorMessage } from '../lib/errors';
import type { AdminEnquiry } from '../types';

export default function AdminEnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [enquiry, setEnquiry] = useState<AdminEnquiry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId < 1) {
      setError('Enquiry not found.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminService
      .getEnquiry(numericId)
      .then((res) => {
        if (!cancelled) setEnquiry(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError('Enquiry not found.');
        } else {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <PageWrapper>
      <AppHeader />
      <Container maxW="container.lg" py={10}>
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <TextReveal text="Enquiry details" size="lg" />
          <Link as={RouterLink} to="/admin/enquiries" color="brand.600" fontWeight="semibold">
            Back to all enquiries
          </Link>
        </Flex>
        {loading && (
          <Flex justify="center" py={12}>
            <Spinner size="lg" color="brand.500" />
          </Flex>
        )}
        {error && (
          <Alert status="error" rounded="xl">
            <AlertIcon />
            {error}
          </Alert>
        )}
        {!loading && !error && enquiry && (
          <VStack spacing={6} align="stretch">
            <EnquiryDetail enquiry={enquiry} variant="admin" />
            <StatusPanel enquiry={enquiry} onUpdated={setEnquiry} />
            <CustomerInfoCard customer={enquiry.customer} />
          </VStack>
        )}
      </Container>
    </PageWrapper>
  );
}
