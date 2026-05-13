import type { Variants, Transition } from "framer-motion";

/** 对齐 ORDERS_FULL_EXPORT / 设计文档：cubic-bezier(0.22, 1, 0.36, 1) */
const DOC_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const ease: Transition = {
  ease: DOC_EASE,
  duration: 0.35,
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: DOC_EASE } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: DOC_EASE } },
};

export function stagger(gap = 0.04): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: gap,
        delayChildren: 0.05,
      },
    },
  };
}

export const cardHover = {
  rest: { y: 0, transition: { duration: 0.2, ease: DOC_EASE } },
  hover: { y: -2, transition: { duration: 0.2, ease: DOC_EASE } },
};

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: DOC_EASE } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.2, ease: DOC_EASE } },
};
