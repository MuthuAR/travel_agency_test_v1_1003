import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Center,
  Container,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryForm } from '../components/enquiry/EnquiryForm';
import { GlassCard } from '../components/ui/GlassCard';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import { profileService } from '../services/profileService';
import { getErrorMessage } from '../lib/errors';
import type { AccountType, Enquiry } from '../types';

export default function NewEnquiryPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const profile = await profileService.getProfile();
        if (!cancelled) setAccountType(profile.account_type);
      } catch (error) {
        if (!cancelled) setLoadError(getErrorMessage(error));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreated = (enquiry: Enquiry): void => {
    toast({
      title: 'Enquiry submitted',
      description: 'We will contact you shortly.',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    navigate(`/enquiries/${enquiry.id}`);
  };

  return (
    <PageWrapper>
      <AppHeader />
      <Container maxW="container.md" py={10}>
        <TextReveal text="New enquiry" size="lg" mb={6} />
        <GlassCard whileHover={{ scale: 1.0, y: 0 }}>
          {loadError ? (
            <Alert status="error" rounded="xl">
              <AlertIcon />
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          ) : accountType === null ? (
            <Center py={10}>
              <Spinner size="lg" color="brand.500" label="Loading form" />
            </Center>
          ) : (
            <EnquiryForm onCreated={handleCreated} accountType={accountType} />
          )}
        </GlassCard>
      </Container>
    </PageWrapper>
  );
}
