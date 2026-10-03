import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Link } from '@chakra-ui/react';
import { ProfileForm } from '../components/profile/ProfileForm';
import { GlassCard } from '../components/ui/GlassCard';
import { MeshBackground } from '../components/ui/MeshBackground';
import { PageWrapper } from '../components/ui/PageWrapper';
import { TextReveal } from '../components/ui/TextReveal';

export default function ProfilePage() {
  return (
    <PageWrapper>
      <MeshBackground />
      <Container maxW="container.md" py={10}>
        <Link as={RouterLink} to="/dashboard" fontSize="sm" color="gray.600">
          Back to dashboard
        </Link>
        <Box mt={3} mb={6}>
          <TextReveal text="My profile" as="h1" size="xl" />
        </Box>
        <GlassCard whileHover={{ y: -2 }}>
          <ProfileForm />
        </GlassCard>
      </Container>
    </PageWrapper>
  );
}
