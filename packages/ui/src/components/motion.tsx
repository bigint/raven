"use client";

import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

const FadeIn = ({ children, delay = 0, ...props }: FadeInProps) => {
  const isReduced = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={
        isReduced
          ? { duration: 0 }
          : { delay, duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      }
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface StaggerListProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const StaggerList = ({
  children,
  staggerDelay = 0.03,
  className
}: StaggerListProps) => {
  const isReduced = useReducedMotion();

  return (
    <motion.div
      animate="visible"
      className={className}
      initial={isReduced ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: isReduced ? 0 : staggerDelay }
        }
      }}
    >
      {children}
    </motion.div>
  );
};

const StaggerItem = ({ children, ...props }: FadeInProps) => {
  const isReduced = useReducedMotion();

  return (
    <motion.div
      transition={
        isReduced ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
      }
      variants={{
        hidden: isReduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
        visible: { opacity: 1, y: 0 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export { FadeIn, StaggerItem, StaggerList };
