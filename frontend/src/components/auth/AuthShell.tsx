import type { ReactNode } from 'react';
import { Box, Center, Text } from '@chakra-ui/react';
import { GlassCard } from '../ui/GlassCard';
import { MeshBackground } from '../ui/MeshBackground';
import { PageWrapper } from '../ui/PageWrapper';
import { TextReveal } from '../ui/TextReveal';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  maxW?: string;
  children: ReactNode;
}

/** Shared layout for the login, register and admin login pages. */
export function AuthShell({ title, subtitle, maxW = 'md', children }: AuthShellProps) {
  return (
    <PageWrapper>
      <MeshBackground />
      <Center minH="100vh" px={4} py={10}>
        <GlassCard w="full" maxW={maxW} whileHover={{ y: -2 }}>
          <Box mb={6} textAlign="center">
            <TextReveal text={title} as="h1" size="lg" />
            {subtitle && (
              <Text mt={2} color="gray.600">
                {subtitle}
              </Text>
            )}
          </Box>
          {children}
        </GlassCard>
      </Center>
    </PageWrapper>
  );
}
