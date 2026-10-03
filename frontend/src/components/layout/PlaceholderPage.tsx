import { Container, Text, VStack } from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { MeshBackground } from '../ui/MeshBackground';
import { PageWrapper } from '../ui/PageWrapper';
import { TextReveal } from '../ui/TextReveal';

interface PlaceholderPageProps {
  title: string;
  route: string;
}

/** Temporary page body used until each module's real page is built. */
export function PlaceholderPage({ title, route }: PlaceholderPageProps) {
  return (
    <PageWrapper>
      <MeshBackground />
      <Container maxW="container.md" py={16}>
        <GlassCard>
          <VStack align="start" spacing={3}>
            <TextReveal text={title} size="xl" />
            <Text color="gray.600">Placeholder for route {route}. Coming soon.</Text>
          </VStack>
        </GlassCard>
      </Container>
    </PageWrapper>
  );
}
