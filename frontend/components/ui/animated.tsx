'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  fadeIn,
  slideUp,
  slideDown,
  slideLeft,
  slideRight,
  scaleIn,
  staggerContainer,
  staggerItem,
} from '@/lib/animations';

// ─── FadeIn ───────────────────────────────────────────────────────────────────
interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={fadeIn}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SlideIn ──────────────────────────────────────────────────────────────────
type Direction = 'up' | 'down' | 'left' | 'right';
const SLIDE_VARIANTS = { up: slideUp, down: slideDown, left: slideLeft, right: slideRight };

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  className?: string;
  delay?: number;
}

export function SlideIn({ children, direction = 'up', className, delay = 0 }: SlideInProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={SLIDE_VARIANTS[direction]}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── ScaleIn ──────────────────────────────────────────────────────────────────
interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScaleIn({ children, className, delay = 0 }: ScaleInProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={scaleIn}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerList ──────────────────────────────────────────────────────────────
interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export function StaggerList({ children, className, as: Tag = 'div' }: StaggerListProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  const MotionTag = motion(Tag);

  return (
    <MotionTag
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

// ─── StaggerItem ──────────────────────────────────────────────────────────────
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div variants={staggerItem} className={className}>
      {children}
    </motion.div>
  );
}
