"use client";

import React from "react";
import Icon from "@/components/UI/Icon";
import Button from "./Button";
import styles from "./primitives.module.css";

export default function EmptyState({
  icon = "search",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  children,
}) {
  return (
    <div className={`glass-panel ${styles.emptyState}`}>
      <div className={styles.emptyIcon}>
        <Icon name={icon} size={24} />
      </div>
      {title && <h3 className={styles.emptyTitle}>{title}</h3>}
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {children}
      {actionLabel && (actionHref || onAction) && (
        <Button variant="primary" href={actionHref} onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
