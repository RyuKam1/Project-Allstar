"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import ModalDismissButton from "@/components/UI/primitives/ModalDismissButton";

const NotificationContext = createContext({
  notify: () => {},
  confirm: async () => false,
});

const TOAST_STYLES = {
  info: {
    border: "rgba(var(--color-primary-rgb), 0.5)",
    icon: "i",
    role: "status",
  },
  success: {
    border: "rgba(34, 197, 94, 0.55)",
    icon: "✓",
    role: "status",
  },
  warning: {
    border: "rgba(245, 158, 11, 0.65)",
    icon: "!",
    role: "alert",
  },
  error: {
    border: "rgba(239, 68, 68, 0.65)",
    icon: "×",
    role: "alert",
  },
};

export function NotificationCenter({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);

  const notify = useCallback((message, type = "info") => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message: String(message || ""), type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmState({
        message: String(message || "Are you sure?"),
        confirmLabel: options.confirmLabel || "Confirm",
        cancelLabel: options.cancelLabel || "Cancel",
        onResolve: resolve,
      });
    });
  }, []);

  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message) => notify(message, "info");

    return () => {
      window.alert = originalAlert;
    };
  }, [notify]);

  const contextValue = useMemo(
    () => ({ notify, confirm }),
    [notify, confirm],
  );

  const closeConfirm = (accepted) => {
    if (!confirmState?.onResolve) {
      setConfirmState(null);
      return;
    }
    confirmState.onResolve(Boolean(accepted));
    setConfirmState(null);
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "fixed",
          right: "16px",
          bottom: "calc(16px + var(--bottom-nav-height, 0px))",
          zIndex: 12000,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          (() => {
            const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            return (
              <div
                key={toast.id}
                role={style.role}
                style={{
                  pointerEvents: "auto",
                  maxWidth: "360px",
                  background: "var(--bg-card)",
                  color: "var(--text-main)",
                  border: `1px solid ${style.border}`,
                  borderRadius: "12px",
                  padding: "12px 14px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  transform: "translateY(0)",
                  opacity: 1,
                  transition: "transform 220ms cubic-bezier(0.23, 1, 0.32, 1), opacity 220ms ease-out",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    marginTop: "1px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `1px solid ${style.border}`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {style.icon}
                </span>
                <span style={{ flex: 1 }}>{toast.message}</span>
                <ModalDismissButton
                  onClick={() => dismissToast(toast.id)}
                  label="Dismiss notification"
                />
              </div>
            );
          })()
        ))}
      </div>

      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirm action"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 13000,
            background: "rgba(0, 0, 0, 0.55)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onClick={() => closeConfirm(false)}
        >
          <div
            style={{
              width: "min(420px, 100%)",
              borderRadius: "16px",
              border: "1px solid var(--border-glass)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
              padding: "18px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
              <p style={{ margin: 0, flex: 1 }}>{confirmState.message}</p>
              <ModalDismissButton
                onClick={() => closeConfirm(false)}
                label="Close confirmation dialog"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" className="btn-secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button type="button" className="btn-primary" onClick={() => closeConfirm(true)}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotificationCenter() {
  return useContext(NotificationContext);
}
