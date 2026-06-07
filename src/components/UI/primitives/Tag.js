"use client";

import React from "react";
import styles from "./primitives.module.css";

export default function Tag({ children, className = "", accent = false, ...props }) {
  return (
    <span
      className={`${accent ? "tape-tag" : styles.tag} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
