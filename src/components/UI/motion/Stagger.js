"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.23, 1, 0.32, 1] },
  },
};

export default function Stagger({
  children,
  className = "",
  stagger = 0.04,
  max = 8,
  ...props
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  }

  const items = React.Children.toArray(children).slice(0, max);

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-6% 0px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      {...props}
    >
      {items.map((child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
      {React.Children.count(children) > max
        ? React.Children.toArray(children).slice(max)
        : null}
    </motion.div>
  );
}
