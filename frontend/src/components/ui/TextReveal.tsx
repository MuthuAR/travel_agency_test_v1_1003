import { Heading, chakra, shouldForwardProp } from '@chakra-ui/react';
import type { HeadingProps } from '@chakra-ui/react';
import { isValidMotionProp, motion } from 'framer-motion';
import type { Variants } from 'framer-motion';

const MotionSpan = chakra(motion.span, {
  shouldForwardProp: (prop: string) => isValidMotionProp(prop) || shouldForwardProp(prop),
});

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

interface TextRevealProps extends Omit<HeadingProps, 'children'> {
  text: string;
}

export function TextReveal({ text, ...rest }: TextRevealProps) {
  const words = text.split(' ');
  return (
    <Heading {...rest} aria-label={text}>
      <MotionSpan
        display="inline-block"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        aria-hidden="true"
      >
        {words.map((word, i) => (
          <MotionSpan key={`${word}-${i}`} display="inline-block" mr="0.25em" variants={wordVariants}>
            {word}
          </MotionSpan>
        ))}
      </MotionSpan>
    </Heading>
  );
}
