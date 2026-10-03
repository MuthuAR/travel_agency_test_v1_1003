import { Text, VStack } from '@chakra-ui/react';
import { AnimatedList } from '../ui/AnimatedList';
import { GlassCard } from '../ui/GlassCard';
import { EnquiryCard } from './EnquiryCard';
import type { Enquiry } from '../../types';

interface EnquiryListProps {
  enquiries: Enquiry[];
}

export function EnquiryList({ enquiries }: EnquiryListProps) {
  if (enquiries.length === 0) {
    return (
      <GlassCard textAlign="center" py={12}>
        <VStack spacing={2}>
          <Text fontSize="xl" fontWeight="bold">
            No enquiries yet
          </Text>
          <Text color="gray.600">Create your first enquiry and we will get back to you.</Text>
        </VStack>
      </GlassCard>
    );
  }

  return (
    <AnimatedList>
      {enquiries.map((enquiry) => (
        <EnquiryCard key={enquiry.id} enquiry={enquiry} />
      ))}
    </AnimatedList>
  );
}
