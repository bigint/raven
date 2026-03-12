"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

interface FadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

const FadeIn = ({ children, delay = 0, ...props }: FadeInProps) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);

interface StaggerListProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const StaggerList = ({
  children,
  staggerDelay = 0.03,
  className,
}: StaggerListProps) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: staggerDelay } },
    }}
  >
    {children}
  </motion.div>
);

const StaggerItem = ({ children, ...props }: FadeInProps) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 8 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    {...props}
  >
    {children}
  </motion.div>
);

export { FadeIn, StaggerList, StaggerItem };
