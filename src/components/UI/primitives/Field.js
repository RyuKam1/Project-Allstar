"use client";

import React from "react";

export default function Field({
  id,
  label,
  error,
  helperText,
  required = false,
  children,
}) {
  return (
    <div style={{ display: "grid", gap: "6px" }}>
      {label && (
        <label htmlFor={id} style={{ fontWeight: 600 }}>
          {label} {required && <span aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {helperText && !error && (
        <small style={{ color: "var(--text-muted)" }}>{helperText}</small>
      )}
      {error && (
        <small role="alert" style={{ color: "#f87171" }}>
          {error}
        </small>
      )}
    </div>
  );
}
