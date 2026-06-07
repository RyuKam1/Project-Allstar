"use client";

import React from "react";
import Link from "next/link";
import styles from "./primitives.module.css";

export default function Button({
  children,
  variant = "primary",
  href,
  className = "",
  fullWidth = false,
  size,
  loading = false,
  disabled,
  type = "button",
  ...props
}) {
  const classes = [
    styles.button,
    styles[variant] || styles.primary,
    fullWidth ? styles.fullWidth : "",
    size === "small" ? styles.small : "",
    loading ? styles.loading : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const isDisabled = disabled || loading;
  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span className={loading ? styles.loadingLabel : undefined}>{children}</span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
}
