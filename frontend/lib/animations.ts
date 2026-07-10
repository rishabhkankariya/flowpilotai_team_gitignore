import type { Variants, Transition } from 'framer-motion';

// ─── Transition presets ───────────────────────────────────────────────────────
export const transitions = {
  quick: { duration: 0.15, ease: 'easeOut' } satisfies Transition,
  normal: { duration: 0.25, ease: 'easeOut' } satisfies Transition,
  slow: { duration: 0.4, ease: 'easeOut' } satisfies Transition,
  spring: { type: 'spring', damping: 28, stiffness: 300 } satisfies Transition,
  springBouncy: { type: 'spring', damping: 20, stiffness: 400 } satisfies Transition,
} as const;

// ─── Fade ─────────────────────────────────────────────────────────────────────
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.quick },
};

// ─── Slide ────────────────────────────────────────────────────────────────────
export const slideUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: -8, transition: transitions.quick },
};

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
  exit: { opacity: 0, y: 8, transition: transitions.quick },
};

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0, transition: transitions.spring },
  exit: { opacity: 0, x: -16, transition: transitions.quick },
};

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -24 },
  visible: { opacity: 1, x: 0, transition: transitions.spring },
  exit: { opacity: 0, x: 16, transition: transitions.quick },
};

// ─── Scale ────────────────────────────────────────────────────────────────────
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.spring },
  exit: { opacity: 0, scale: 0.95, transition: transitions.quick },
};

// ─── Stagger container ────────────────────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.normal },
};

// ─── Page transition ──────────────────────────────────────────────────────────
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeInOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeInOut' } },
};
