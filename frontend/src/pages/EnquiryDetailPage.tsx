import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import axios from 'axios';
import { Alert, AlertIcon, Container, Flex, Link, Spinner } from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryDetail } from '../components/enquiry/EnquiryDetail';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import { enquiryService } from '../services/enquiryService';
import { getErrorMessage } from '../lib/errors';
import type { Enquiry } from '../types';

export default function EnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
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
    enquiryService
      .get(numericId)
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
      <Container maxW="container.md" py={10}>
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={3}>
          <TextReveal text="Enquiry details" size="lg" />
          <Link as={RouterLink} to="/dashboard" color="brand.600" fontWeight="semibold">
            Back to my enquiries
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
        {!loading && !error && enquiry && <EnquiryDetail enquiry={enquiry} />}
      </Container>
    </PageWrapper>
  );
}
