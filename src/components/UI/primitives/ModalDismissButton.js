"use client";

import React from "react";
import Icon from "@/components/UI/Icon";
import styles from "./primitives.module.css";

export default function ModalDismissButton({
  onClick,
  label = "Close",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`${styles.modalDismiss} modal-dismiss-btn ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      <Icon name="close" size={18} />
    </button>
  );
}
