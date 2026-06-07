"use client";

import React from "react";
import ModalDismissButton from "./ModalDismissButton";

export default function Modal({
  open,
  title,
  children,
  onClose,
  closeLabel = "Close dialog",
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 11000,
        background: "rgba(0, 0, 0, 0.55)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{ width: "min(640px, 100%)", padding: "20px", position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <h3 style={{ margin: 0 }}>{title}</h3>
          <ModalDismissButton onClick={onClose} label={closeLabel} />
        </div>
        {children}
      </div>
    </div>
  );
}
