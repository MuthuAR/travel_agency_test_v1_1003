import { chakra, shouldForwardProp } from '@chakra-ui/react';
import { isValidMotionProp, motion } from 'framer-motion';
import type { ReactNode } from 'react';

const MotionDiv = chakra(motion.div, {
  shouldForwardProp: (prop: string) => isValidMotionProp(prop) || shouldForwardProp(prop),
});

interface PageWrapperProps {
  children: ReactNode;
}

export function PageWrapper({ children }: PageWrapperProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      minH="100vh"
    >
      {children}
    </MotionDiv>
  );
}
