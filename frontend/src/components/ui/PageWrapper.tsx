import type { ReactNode } from 'react';
import { MotionDiv } from './motionChakra';

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
