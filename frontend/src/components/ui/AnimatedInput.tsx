import { forwardRef, useId } from 'react';
import { Box, Text, chakra, shouldForwardProp } from '@chakra-ui/react';
import { isValidMotionProp, motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

const MotionInput = chakra(motion.input, {
  shouldForwardProp: (prop: string) => isValidMotionProp(prop) || shouldForwardProp(prop),
});

interface AnimatedInputProps extends HTMLMotionProps<'input'> {
  label?: string;
  error?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ label, error, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;

    return (
      <Box>
        {label && (
          <chakra.label htmlFor={inputId} display="block" fontSize="sm" fontWeight="medium" mb={1}>
            {label}
          </chakra.label>
        )}
        <MotionInput
          ref={ref}
          id={inputId}
          whileFocus={{ scale: 1.01 }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          w="full"
          px={4}
          py={3}
          rounded="xl"
          border="2px solid"
          borderColor={error ? 'red.500' : 'gray.200'}
          outline="none"
          bg="white"
          _focus={{ borderColor: 'brand.500' }}
          {...rest}
        />
        {error && (
          <Text id={errorId} role="alert" color="red.500" fontSize="sm" mt={1}>
            {error}
          </Text>
        )}
      </Box>
    );
  },
);

AnimatedInput.displayName = 'AnimatedInput';
