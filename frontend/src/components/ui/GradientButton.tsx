import type { HTMLMotionProps } from 'framer-motion';
import { MotionButton } from './motionChakra';

type GradientButtonProps = HTMLMotionProps<'button'>;

export function GradientButton({ children, ...rest }: GradientButtonProps) {
  return (
    <MotionButton
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      px={6}
      py={3}
      rounded="full"
      fontWeight="semibold"
      color="white"
      bgGradient="linear(to-r, brand.500, accent.400)"
      _hover={{ boxShadow: 'lg' }}
      _disabled={{ opacity: 0.6, cursor: 'not-allowed' }}
      {...rest}
    >
      {children}
    </MotionButton>
  );
}
