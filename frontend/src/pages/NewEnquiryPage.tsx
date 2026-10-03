import { useNavigate } from 'react-router-dom';
import { Container, useToast } from '@chakra-ui/react';
import { AppHeader } from '../components/layout/AppHeader';
import { EnquiryForm } from '../components/enquiry/EnquiryForm';
import { GlassCard } from '../components/ui/GlassCard';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';
import type { Enquiry } from '../types';

export default function NewEnquiryPage() {
  const navigate = useNavigate();
  const toast = useToast();

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
          <EnquiryForm onCreated={handleCreated} />
        </GlassCard>
      </Container>
    </PageWrapper>
  );
}
