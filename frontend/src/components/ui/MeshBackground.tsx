import { Box } from '@chakra-ui/react';
import { MotionDiv } from './motionChakra';

export function MeshBackground() {
  return (
    <Box position="fixed" inset={0} zIndex={-1} overflow="hidden" aria-hidden="true">
      <Box position="absolute" inset={0} bgGradient="linear(to-br, brand.50, white, accent.50)" />
      <MotionDiv
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        position="absolute"
        top={0}
        left="25%"
        w="24rem"
        h="24rem"
        bg="brand.200"
        rounded="full"
        filter="blur(64px)"
      />
      <MotionDiv
        animate={{ opacity: [0.5, 0.3, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        position="absolute"
        bottom={0}
        right="25%"
        w="24rem"
        h="24rem"
        bg="accent.200"
        rounded="full"
        filter="blur(64px)"
      />
    </Box>
  );
}
