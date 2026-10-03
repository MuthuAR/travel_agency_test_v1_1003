import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { chakra, shouldForwardProp } from '@chakra-ui/react';
import type { ChakraProps } from '@chakra-ui/react';
import { isValidMotionProp, motion } from 'framer-motion';
import type { HTMLMotionProps } from 'framer-motion';

/**
 * Chakra style props and Framer Motion props both define `transition`
 * (and a few other keys) with incompatible types. These wrappers keep Chakra's
 * style props but let Framer Motion's definition win wherever the two overlap.
 */
type Merge<P, T> = Omit<P, keyof T> & T;

type MotionChakraComponent<
  Tag extends 'div' | 'button' | 'input',
  Element extends HTMLElement,
> = ForwardRefExoticComponent<Merge<ChakraProps, HTMLMotionProps<Tag>> & RefAttributes<Element>>;

const options = {
  shouldForwardProp: (prop: string): boolean => isValidMotionProp(prop) || shouldForwardProp(prop),
};

export const MotionDiv = chakra(motion.div, options) as unknown as MotionChakraComponent<
  'div',
  HTMLDivElement
>;

export const MotionButton = chakra(motion.button, options) as unknown as MotionChakraComponent<
  'button',
  HTMLButtonElement
>;

export const MotionInput = chakra(motion.input, options) as unknown as MotionChakraComponent<
  'input',
  HTMLInputElement
>;
