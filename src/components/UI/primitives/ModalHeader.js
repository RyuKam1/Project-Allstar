"use client";

import React from "react";
import ModalDismissButton from "./ModalDismissButton";
import styles from "./primitives.module.css";

export default function ModalHeader({
  title,
  onClose,
  closeLabel = "Close dialog",
  titleAs = "h2",
  className = "",
}) {
  const TitleTag = titleAs;

  return (
    <div className={`${styles.modalHeaderRow} ${className}`.trim()}>
      <TitleTag className={styles.modalHeaderTitle}>{title}</TitleTag>
      <ModalDismissButton onClick={onClose} label={closeLabel} />
    </div>
  );
}
