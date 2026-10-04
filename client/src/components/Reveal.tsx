import type { ReactNode } from 'react';
import { m } from 'motion/react';

interface Props {
  children: ReactNode;
  delay?: number;
  className?: string;
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Subtle fade-and-rise entrance. Disabled automatically for users who prefer reduced motion. */
export function Reveal({ children, delay = 0, className }: Props) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </m.div>
  );
}
