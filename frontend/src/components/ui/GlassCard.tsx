import type { ComponentProps } from 'react';
import { chakra, shouldForwardProp } from '@chakra-ui/react';
import { isValidMotionProp, motion } from 'framer-motion';

const MotionDiv = chakra(motion.div, {
  shouldForwardProp: (prop: string) => isValidMotionProp(prop) || shouldForwardProp(prop),
});

type GlassCardProps = ComponentProps<typeof MotionDiv>;

export function GlassCard({ children, ...rest }: GlassCardProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -5 }}
      p={6}
      rounded="2xl"
      bg="whiteAlpha.700"
      backdropFilter="blur(16px)"
      border="1px solid"
      borderColor="whiteAlpha.800"
      boxShadow="xl"
      {...rest}
    >
      {children}
    </MotionDiv>
  );
}
