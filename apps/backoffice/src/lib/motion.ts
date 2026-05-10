import type { Variants, Transition } from "framer-motion";

export const ease: Transition = {
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.4,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export function stagger(gap = 0.05): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: gap,
      },
    },
  };
}

export const cardHover = {
  y: -2,
  transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] } },
};
