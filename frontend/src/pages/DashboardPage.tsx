import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertIcon, Container, Flex, Spinner, Text } from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryList } from '../components/enquiry/EnquiryList';
import { Pagination } from '../components/admin/Pagination';
import { GradientButton } from '../components/ui/GradientButton';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import { useAuth } from '../hooks/useAuth';
import { enquiryService } from '../services/enquiryService';
import { profileService } from '../services/profileService';
import { getErrorMessage } from '../lib/errors';
import type { Enquiry, Paginated } from '../types';

const PAGE_SIZE = 10;

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<Paginated<Enquiry> | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    enquiryService
      .list(page, PAGE_SIZE)
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
  }, [page]);

  useEffect(() => {
    let cancelled = false;
    profileService
      .getProfile()
      .then((profile) => {
        if (!cancelled) setProfileName(profile.name.trim());
      })
      .catch(() => {
        // Fall back to the email/mobile greeting; a failed profile fetch is not user-facing.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profileName || (user ? (user.email ?? user.mobile) : '');
  const greeting = displayName ? `Welcome back, ${displayName}` : 'Welcome back';

  return (
    <PageWrapper>
      <AppHeader />
      <Container maxW="container.md" py={10}>
        <Flex justify="space-between" align="center" gap={4} wrap="wrap" mb={8}>
          <TextReveal text={greeting} size="lg" />
          <GradientButton type="button" onClick={() => navigate('/enquiries/new')}>
            New enquiry
          </GradientButton>
        </Flex>

        <Text fontSize="xl" fontWeight="bold" mb={4}>
          My enquiries
        </Text>

        {error && (
          <Alert status="error" rounded="xl" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading && !data ? (
          <Flex justify="center" py={12}>
            <Spinner size="lg" color="brand.500" />
          </Flex>
        ) : (
          data && (
            <>
              <EnquiryList enquiries={data.items} />
              {data.total > PAGE_SIZE && (
                <Pagination
                  page={data.page}
                  pageSize={data.page_size}
                  total={data.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )
        )}
      </Container>
    </PageWrapper>
  );
}
