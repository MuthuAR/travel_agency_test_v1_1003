import { Center, Spinner } from '@chakra-ui/react';

export function FullPageSpinner() {
  return (
    <Center minH="100vh">
      <Spinner size="xl" color="brand.500" thickness="4px" label="Loading" />
    </Center>
  );
}
