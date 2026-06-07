"use client";

import React from "react";
import styles from "./primitives.module.css";

export default function Badge({ children, className = "", variant = "default", ...props }) {
  return (
    <span
      className={`tape-tag ${styles.badge} ${styles[variant] || ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
