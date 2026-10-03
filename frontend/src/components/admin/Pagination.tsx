import { Button, Flex, Text } from '@chakra-ui/react';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Flex as="nav" aria-label="Pagination" justify="center" align="center" gap={4} mt={6}>
      <Button
        variant="outline"
        onClick={() => onPageChange(page - 1)}
        isDisabled={page <= 1}
        aria-label="Previous page"
      >
        Previous
      </Button>
      <Text aria-live="polite">
        Page {page} of {totalPages}
      </Text>
      <Button
        variant="outline"
        onClick={() => onPageChange(page + 1)}
        isDisabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
      </Button>
    </Flex>
  );
}
