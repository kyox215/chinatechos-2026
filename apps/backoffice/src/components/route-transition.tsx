"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { pageTransition } from "@/lib/motion";

export function RouteTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}
