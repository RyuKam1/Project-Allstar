"use client";

import React from "react";

export default function Card({
  as: Component = "section",
  className = "",
  variant = "glass",
  children,
  ...props
}) {
  const base =
    variant === "ticket"
      ? "glass-panel court-frame ticket-card"
      : "glass-panel court-frame";

  return (
    <Component className={`${base} ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
