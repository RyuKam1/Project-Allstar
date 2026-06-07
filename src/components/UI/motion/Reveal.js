"use client";

import React, { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 24,
  ...props
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px -5% 0px" });
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} ref={ref} {...props}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.45, delay, ease: [0.23, 1, 0.32, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
